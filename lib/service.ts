import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db, groups, participants, exclusions, wishes, messages, type Group, type Participant } from './db';
import { decrypt, encrypt, randomToken, sha256 } from './crypto';
import { appUrl, DELETE_AFTER_EVENT_DAYS, DELETE_WITHOUT_DATE_DAYS } from './env';
import { chains, drawAssignments } from './draw';
import { sendMail, sendMany } from './mail';
import { drawMail, messageMail, reminderMail, revealMail, wishesUpdateMail } from './emails';

export type LinkTarget = 'kind' | 'wuensche' | 'chat' | 'admin';

export function newToken() {
  const token = randomToken(24);
  return { token, tokenHash: sha256(token), tokenEnc: encrypt(token) };
}

export function personalLink(p: Pick<Participant, 'tokenEnc'>, next?: LinkTarget): string {
  return `${appUrl()}/l/${decrypt(p.tokenEnc)}${next ? `?next=${next}` : ''}`;
}

export function targetPath(slug: string, next?: string | null): string {
  switch (next) {
    case 'kind':
      return `/g/${slug}/kind`;
    case 'wuensche':
      return `/g/${slug}#wuensche`;
    case 'chat':
      return `/g/${slug}#nachrichten`;
    case 'admin':
      return `/g/${slug}/admin`;
    default:
      return `/g/${slug}`;
  }
}

export async function findByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const rows = await db
    .select({ p: participants, group: groups })
    .from(participants)
    .innerJoin(groups, eq(groups.id, participants.groupId))
    .where(eq(participants.tokenHash, sha256(token)))
    .limit(1);
  return rows[0] ?? null;
}

export async function santaOf(recipientId: string): Promise<Participant | null> {
  return (await db.query.participants.findFirst({ where: eq(participants.assignedToId, recipientId) })) ?? null;
}

export async function wishesOf(participantId: string) {
  return db
    .select()
    .from(wishes)
    .where(eq(wishes.participantId, participantId))
    .orderBy(desc(wishes.favorite), asc(wishes.createdAt));
}

export async function markSeen(id: string) {
  await db
    .update(participants)
    .set({ lastSeenAt: new Date(), firstSeenAt: sql`coalesce(${participants.firstSeenAt}, now())` })
    .where(eq(participants.id, id));
}

// --------------------------------------------------------------------------- Auslosung

export async function performDraw(groupId: string): Promise<{ error?: string; sent?: number; failed?: number }> {
  const res = await db.transaction(async (tx) => {
    const [group] = await tx.select().from(groups).where(eq(groups.id, groupId)).for('update');
    if (!group) return { error: 'Gruppe nicht gefunden.' };
    if (group.status !== 'setup') return { error: 'Es wurde bereits ausgelost.' };
    const players = await tx
      .select()
      .from(participants)
      .where(and(eq(participants.groupId, groupId), eq(participants.plays, true)));
    if (players.length < 3) return { error: 'Für die Auslosung braucht ihr mindestens 3 Mitwichtel.' };
    const ex = await tx.select().from(exclusions).where(eq(exclusions.groupId, groupId));
    const assign = drawAssignments(
      players.map((p) => p.id),
      ex.map((e) => [e.aId, e.bId] as const),
      group.avoidMutual,
    );
    if (!assign) {
      return { error: 'Mit diesen Ausschlüssen geht die Auslosung nicht auf. Entferne bitte einen oder mehrere Ausschlüsse.' };
    }
    for (const [giver, recipient] of assign) {
      await tx
        .update(participants)
        .set({ assignedToId: recipient, drawMailSentAt: null, drawMailError: null, giftDoneAt: null })
        .where(eq(participants.id, giver));
    }
    await tx
      .update(groups)
      .set({ status: 'drawn', drawCount: group.drawCount + 1, drawnAt: new Date(), revealedAt: null })
      .where(eq(groups.id, groupId));
    // Bereits eingetragene Wünsche stehen in der Auslosungs-Mail → nicht zusätzlich melden
    await tx
      .update(wishes)
      .set({ notifiedAt: new Date() })
      .where(and(isNull(wishes.notifiedAt), inArray(wishes.participantId, players.map((p) => p.id))));
    return { ok: true };
  });
  if ('error' in res) return res;
  return sendDrawMails(groupId);
}

export async function sendDrawMails(groupId: string, onlyId?: string): Promise<{ sent: number; failed: number }> {
  const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
  if (!group || group.status === 'setup') return { sent: 0, failed: 0 };
  const all = await db.select().from(participants).where(eq(participants.groupId, groupId));
  const byId = new Map(all.map((p) => [p.id, p]));
  const admin = all.find((p) => p.isAdmin);
  const givers = all.filter((p) => p.plays && p.assignedToId && (!onlyId || p.id === onlyId));
  const recipientIds = givers.map((g) => g.assignedToId!);
  const allWishes = recipientIds.length
    ? await db
        .select()
        .from(wishes)
        .where(inArray(wishes.participantId, recipientIds))
        .orderBy(desc(wishes.favorite), asc(wishes.createdAt))
    : [];

  const results = await sendMany(givers, (g) => {
    const r = byId.get(g.assignedToId!)!;
    return {
      to: g.email,
      replyTo: admin?.email,
      ...drawMail({
        group,
        giverName: g.name,
        recipientName: r.name,
        kindLink: personalLink(g, 'kind'),
        wishesLink: personalLink(g, 'wuensche'),
        wishes: allWishes.filter((w) => w.participantId === r.id),
        adminName: admin?.name ?? 'der Orga',
        redraw: group.drawCount > 1,
      }),
    };
  });

  for (const r of results) {
    await db
      .update(participants)
      .set(r.error ? { drawMailError: r.error.slice(0, 300) } : { drawMailSentAt: new Date(), drawMailError: null })
      .where(eq(participants.id, r.item.id));
  }
  return { sent: results.filter((r) => !r.error).length, failed: results.filter((r) => r.error).length };
}

export async function resetDraw(groupId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(messages).where(eq(messages.groupId, groupId));
    await tx
      .update(participants)
      .set({ assignedToId: null, drawMailSentAt: null, drawMailError: null, giftDoneAt: null })
      .where(eq(participants.groupId, groupId));
    await tx.update(groups).set({ status: 'setup', revealedAt: null }).where(eq(groups.id, groupId));
  });
}

// --------------------------------------------------------------------------- Benachrichtigungen

const NOTIFY_DELAY_MINUTES = Number(process.env.NOTIFY_DELAY_MINUTES ?? 3);

/**
 * Bündelt neue/geänderte Wünsche: Erst wenn jemand ein paar Minuten nichts mehr geändert hat,
 * bekommt der Wichtel EINE Mail. Läuft per Vercel Cron und zusätzlich nebenbei bei Seitenaufrufen.
 */
export async function flushDueNotifications(): Promise<number> {
  const due = await db.execute<{ participant_id: string }>(sql`
    select distinct w.participant_id
    from wishes w
    join participants p on p.id = w.participant_id
    join groups g on g.id = p.group_id
    where w.notified_at is null
      and g.status = 'drawn'
      and p.wishes_changed_at < now() - make_interval(mins => ${NOTIFY_DELAY_MINUTES})
    limit 50
  `);
  let sent = 0;
  for (const { participant_id: pid } of due.rows) {
    // Atomar „beanspruchen“, damit parallele Läufe nicht doppelt senden
    const claimed = await db
      .update(wishes)
      .set({ notifiedAt: new Date() })
      .where(and(eq(wishes.participantId, pid), isNull(wishes.notifiedAt)))
      .returning();
    if (!claimed.length) continue;
    const recipient = await db.query.participants.findFirst({ where: eq(participants.id, pid) });
    const santa = await santaOf(pid);
    if (!recipient || !santa || santa.giftDoneAt) continue;
    const group = await db.query.groups.findFirst({ where: eq(groups.id, recipient.groupId) });
    if (!group) continue;
    const [{ n }] = await db.select({ n: count() }).from(wishes).where(eq(wishes.participantId, pid));
    try {
      await sendMail({
        to: santa.email,
        ...wishesUpdateMail({
          group,
          santaName: santa.name,
          recipientName: recipient.name,
          wishes: claimed,
          totalCount: n,
          kindLink: personalLink(santa, 'kind'),
        }),
      });
      sent++;
    } catch (err) {
      console.error('[notify] Mail fehlgeschlagen', err);
      await db.update(wishes).set({ notifiedAt: null }).where(inArray(wishes.id, claimed.map((w) => w.id)));
    }
  }
  return sent;
}

/** Mail zur anonymen Nachricht – aber nicht bei jeder Nachricht eines schnellen Hin-und-Hers. */
export async function notifyMessage(o: { group: Group; santa: Participant; recipient: Participant; fromSanta: boolean; body: string; messageId: string }) {
  const [prev] = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.santaId, o.santa.id),
        eq(messages.recipientId, o.recipient.id),
        eq(messages.fromSanta, o.fromSanta),
        sql`${messages.id} <> ${o.messageId}`,
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(1);
  if (prev && !prev.readAt && prev.createdAt > new Date(Date.now() - 30 * 60_000)) return; // vorige noch ungelesen
  const to = o.fromSanta ? o.recipient : o.santa;
  await sendMail({
    to: to.email,
    ...messageMail({
      group: o.group,
      toName: to.name,
      fromSanta: o.fromSanta,
      recipientName: o.recipient.name,
      body: o.body,
      link: personalLink(to, o.fromSanta ? 'chat' : 'kind'),
    }),
  });
}

export async function sendReminders(group: Group): Promise<number> {
  const all = await db.select().from(participants).where(eq(participants.groupId, group.id));
  const admin = all.find((p) => p.isAdmin);
  const counts = await db
    .select({ pid: wishes.participantId, n: count() })
    .from(wishes)
    .innerJoin(participants, eq(participants.id, wishes.participantId))
    .where(eq(participants.groupId, group.id))
    .groupBy(wishes.participantId);
  const has = new Set(counts.map((c) => c.pid));
  const cutoff = Date.now() - 12 * 3600_000;
  const targets = all.filter(
    (p) => p.plays && !has.has(p.id) && (!p.remindedAt || p.remindedAt.getTime() < cutoff),
  );
  const res = await sendMany(targets, (p) => ({
    to: p.email,
    ...reminderMail({ group, toName: p.name, wishesLink: personalLink(p, 'wuensche'), adminName: admin?.name ?? 'der Orga' }),
  }));
  const ok = res.filter((r) => !r.error).map((r) => r.item.id);
  if (ok.length) await db.update(participants).set({ remindedAt: new Date() }).where(inArray(participants.id, ok));
  return ok.length;
}

export async function revealGroup(group: Group): Promise<number> {
  await db.update(groups).set({ status: 'revealed', revealedAt: new Date() }).where(eq(groups.id, group.id));
  const all = await db.select().from(participants).where(eq(participants.groupId, group.id));
  const byId = new Map(all.map((p) => [p.id, p]));
  const assign = new Map(all.filter((p) => p.assignedToId).map((p) => [p.id, p.assignedToId!]));
  const chainsText = chains(assign).map((c) => [...c, c[0]].map((id) => byId.get(id)?.name ?? '?').join(' → '));
  const res = await sendMany(all, (p) => {
    const santa = all.find((s) => s.assignedToId === p.id);
    return {
      to: p.email,
      ...revealMail({ group: { ...group, status: 'revealed' }, toName: p.name, santaName: santa?.name ?? null, chainsText, link: personalLink(p) }),
    };
  });
  return res.filter((r) => !r.error).length;
}

export async function cleanupOldGroups(): Promise<number> {
  const deleted = await db
    .delete(groups)
    .where(
      sql`(${groups.eventDate} is not null and ${groups.eventDate} < current_date - ${DELETE_AFTER_EVENT_DAYS}::int)
       or (${groups.eventDate} is null and ${groups.createdAt} < now() - make_interval(days => ${DELETE_WITHOUT_DATE_DAYS}))`,
    )
    .returning({ id: groups.id });
  await db.execute(sql`delete from rate_limits where reset_at < now() - interval '1 day'`);
  return deleted.length;
}

