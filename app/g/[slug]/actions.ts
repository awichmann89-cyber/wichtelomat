'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, count, eq, inArray } from 'drizzle-orm';
import { db, exclusions, groups, messages, participants, wishes } from '@/lib/db';
import { encrypt, hashPassword, randomCode, safeEqual, sha256, verifyPassword } from '@/lib/crypto';
import { fail, isUuid, ok, type FormState } from '@/lib/form';
import { sendMail } from '@/lib/mail';
import { codeMail } from '@/lib/emails';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import {
  findByToken,
  newToken,
  notifyMessage,
  performDraw,
  personalLink,
  resetDraw,
  revealGroup,
  santaOf,
  sendDrawMails,
  sendReminders,
  targetPath,
} from '@/lib/service';
import { clearSession, getContext, requireAdmin, requireMember, setSession } from '@/lib/session';
import {
  cleanMultiline,
  cleanText,
  isIsoDate,
  normalizeEmail,
  normalizeGroupPassword,
  normalizeUrl,
  parseBulk,
} from '@/lib/validate';

const MAX_PARTICIPANTS = 100;
const MAX_WISHES = 50;

const refresh = (slug: string) => revalidatePath(`/g/${slug}`, 'layout');

// =========================================================================== Anmeldung

export async function loginWithToken(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const found = await findByToken(String(fd.get('token') ?? ''));
  if (!found || found.group.slug !== slug) return fail('Dieser Link ist ungültig.');
  if (!(await rateLimit(`pw:${found.group.id}:${await clientKey()}`, 10, 900))) {
    return fail('Zu viele Versuche. Bitte warte 15 Minuten.');
  }
  if (!(await verifyPassword(normalizeGroupPassword(fd.get('password')), found.group.passwordHash))) {
    return fail('Das Gruppenpasswort stimmt leider nicht.');
  }
  await setSession(slug, found.p);
  redirect(targetPath(slug, String(fd.get('next') ?? '')));
}

export async function requestCode(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getContext(slug);
  if (!ctx) return fail('Diese Gruppe gibt es nicht (mehr).');
  const { group } = ctx;
  const email = normalizeEmail(fd.get('email'));
  if (!email) return fail('Bitte gib deine E-Mail-Adresse an.');
  if (!(await rateLimit(`codereq:${group.id}:${await clientKey()}`, 8, 3600))) {
    return fail('Zu viele Versuche. Bitte warte eine Weile.');
  }
  if (!(await verifyPassword(normalizeGroupPassword(fd.get('password')), group.passwordHash))) {
    return fail('Das Gruppenpasswort stimmt leider nicht.');
  }
  const p = await db.query.participants.findFirst({
    where: and(eq(participants.groupId, group.id), eq(participants.email, email)),
  });
  if (!p) return fail('Diese E-Mail-Adresse ist nicht in der Gruppe. Frag bei der Orga nach, mit welcher Adresse du eingetragen bist.');
  const code = randomCode();
  await db
    .update(participants)
    .set({ loginCodeHash: sha256(`${p.id}:${code}`), loginCodeExpiresAt: new Date(Date.now() + 15 * 60_000) })
    .where(eq(participants.id, p.id));
  try {
    await sendMail({ to: p.email, ...codeMail({ group, toName: p.name, code, link: personalLink(p) }) });
  } catch (err) {
    console.error('[code] Mail fehlgeschlagen', err);
    return fail('Die Mail konnte gerade nicht verschickt werden. Bitte versuch es später nochmal.');
  }
  return { step: 'code', email, ok: `Code ist unterwegs an ${email}.`, at: Date.now() };
}

export async function verifyCode(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getContext(slug);
  if (!ctx) return fail('Diese Gruppe gibt es nicht (mehr).');
  const email = normalizeEmail(fd.get('email'));
  const code = String(fd.get('code') ?? '').replace(/\D/g, '');
  const keep = { step: 'code' as const, email: email ?? '' };
  const p = email
    ? await db.query.participants.findFirst({ where: and(eq(participants.groupId, ctx.group.id), eq(participants.email, email)) })
    : null;
  if (!p || code.length !== 6) return { ...keep, error: 'Bitte gib den 6-stelligen Code ein.', at: Date.now() };
  if (!(await rateLimit(`code:${p.id}`, 6, 900))) return { ...keep, error: 'Zu viele Versuche. Bitte fordere in 15 Minuten einen neuen Code an.', at: Date.now() };
  if (
    !p.loginCodeHash ||
    !p.loginCodeExpiresAt ||
    p.loginCodeExpiresAt < new Date() ||
    !safeEqual(p.loginCodeHash, sha256(`${p.id}:${code}`))
  ) {
    return { ...keep, error: 'Der Code stimmt nicht oder ist abgelaufen.', at: Date.now() };
  }
  await db.update(participants).set({ loginCodeHash: null, loginCodeExpiresAt: null }).where(eq(participants.id, p.id));
  await setSession(slug, p);
  redirect(`/g/${slug}`);
}

export async function logout(slug: string) {
  await clearSession(slug);
  redirect('/');
}

// =========================================================================== Wünsche

async function wishlistLocked(participantId: string) {
  const santa = await santaOf(participantId);
  return Boolean(santa?.giftDoneAt);
}

function readWish(fd: FormData): { error?: string; values?: { title: string; url: string | null; note: string | null; favorite: boolean } } {
  const title = cleanText(fd.get('title'), 160);
  const url = normalizeUrl(fd.get('url'));
  const note = cleanMultiline(fd.get('note'), 500) || null;
  if (!title) return { error: 'Was wünschst du dir? Der Wunsch braucht einen Namen.' };
  if (url === undefined) return { error: 'Der Link sieht nicht richtig aus.' };
  return { values: { title, url, note, favorite: fd.get('favorite') === 'on' } };
}

export async function addWish(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const { group, me } = await requireMember(slug);
  if (await wishlistLocked(me.id)) return fail('Dein Wichtel hat schon ein Geschenk besorgt – die Liste ist geschlossen.');
  const w = readWish(fd);
  if (!w.values) return fail(w.error!);
  const [{ n }] = await db.select({ n: count() }).from(wishes).where(eq(wishes.participantId, me.id));
  if (n >= MAX_WISHES) return fail(`Mehr als ${MAX_WISHES} Wünsche gehen nicht – dein Wichtel dankt.`);
  await db.insert(wishes).values({ participantId: me.id, ...w.values });
  await db.update(participants).set({ wishesChangedAt: new Date() }).where(eq(participants.id, me.id));
  refresh(slug);
  return ok(group.status === 'drawn' ? 'Gespeichert! Dein Wichtel bekommt in ein paar Minuten gebündelt Bescheid.' : 'Gespeichert!');
}

export async function updateWish(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const { me } = await requireMember(slug);
  const id = fd.get('id');
  if (!isUuid(id)) return fail('Wunsch nicht gefunden.');
  if (await wishlistLocked(me.id)) return fail('Dein Wichtel hat schon ein Geschenk besorgt – die Liste ist geschlossen.');
  const w = readWish(fd);
  if (!w.values) return fail(w.error!);
  await db
    .update(wishes)
    .set({ ...w.values, notifiedAt: null, updatedAt: new Date() })
    .where(and(eq(wishes.id, id), eq(wishes.participantId, me.id)));
  await db.update(participants).set({ wishesChangedAt: new Date() }).where(eq(participants.id, me.id));
  refresh(slug);
  return ok('Geändert.');
}

export async function deleteWish(slug: string, fd: FormData) {
  const { me } = await requireMember(slug);
  const id = fd.get('id');
  if (!isUuid(id) || (await wishlistLocked(me.id))) return;
  await db.delete(wishes).where(and(eq(wishes.id, id), eq(wishes.participantId, me.id)));
  refresh(slug);
}

export async function setGiftDone(slug: string, fd: FormData) {
  const { me } = await requireMember(slug);
  if (!me.assignedToId) redirect(`/g/${slug}`);
  const done = fd.get('done') === '1';
  await db.update(participants).set({ giftDoneAt: done ? new Date() : null }).where(eq(participants.id, me.id));
  redirect(`/g/${slug}/kind?m=${done ? 'gift-done' : 'gift-undone'}`);
}

// =========================================================================== Anonyme Nachrichten

export async function sendMessage(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const { group, me } = await requireMember(slug);
  if (group.status !== 'drawn') return fail('Nachrichten gehen nur zwischen Auslosung und Auflösung.');
  const body = cleanMultiline(fd.get('body'), 1000);
  if (!body) return fail('Schreib erst etwas.');
  if (!(await rateLimit(`msg:${me.id}`, 30, 3600))) return fail('Puh, viele Nachrichten! Bitte warte ein bisschen.');

  const toKind = fd.get('to') === 'kind';
  const santa = toKind ? me : await santaOf(me.id);
  const recipient = toKind
    ? me.assignedToId
      ? await db.query.participants.findFirst({ where: eq(participants.id, me.assignedToId) })
      : null
    : me;
  if (!santa || !recipient) return fail('Hier gibt es (noch) niemanden zum Schreiben.');

  const [msg] = await db
    .insert(messages)
    .values({ groupId: group.id, santaId: santa.id, recipientId: recipient.id, fromSanta: toKind, body })
    .returning();
  try {
    await notifyMessage({ group, santa, recipient, fromSanta: toKind, body, messageId: msg.id });
  } catch (err) {
    console.error('[message] Mail fehlgeschlagen', err);
  }
  refresh(slug);
  return ok(toKind ? 'Anonym verschickt.' : 'Verschickt.');
}

// =========================================================================== Admin: Teilnehmende

export async function addParticipants(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const { group } = await requireAdmin(slug);
  if (group.status !== 'setup') return fail('Nach der Auslosung erst „Auslosung zurücksetzen“, dann Personen hinzufügen.');

  let people: { name: string; email: string }[] = [];
  let invalid: string[] = [];
  const bulk = String(fd.get('bulk') ?? '').trim();
  if (bulk) {
    ({ people, invalid } = parseBulk(bulk));
  } else {
    const name = cleanText(fd.get('name'), 60);
    const email = normalizeEmail(fd.get('email'));
    if (!name) return fail('Bitte einen Namen eintragen.');
    if (!email) return fail('Die E-Mail-Adresse sieht nicht gültig aus.');
    people = [{ name, email }];
  }
  if (!people.length) return fail(invalid.length ? `Keine gültige Adresse gefunden: ${invalid.slice(0, 3).join(', ')}` : 'Nichts zum Hinzufügen.');

  const existing = await db.select({ email: participants.email }).from(participants).where(eq(participants.groupId, group.id));
  const seen = new Set(existing.map((e) => e.email));
  const fresh = people.filter((p) => (seen.has(p.email) ? false : (seen.add(p.email), true)));
  if (existing.length + fresh.length > MAX_PARTICIPANTS) return fail(`Maximal ${MAX_PARTICIPANTS} Personen pro Gruppe.`);

  if (fresh.length) {
    await db.insert(participants).values(
      fresh.map((p) => {
        const t = newToken();
        return { groupId: group.id, name: p.name, email: p.email, tokenHash: t.tokenHash, tokenEnc: t.tokenEnc };
      }),
    );
  }
  refresh(slug);
  const dup = people.length - fresh.length;
  const parts = [`${fresh.length} ${fresh.length === 1 ? 'Person' : 'Personen'} hinzugefügt.`];
  if (dup) parts.push(`${dup} schon dabei.`);
  if (invalid.length) parts.push(`Nicht erkannt: ${invalid.slice(0, 3).join(', ')}`);
  return fresh.length ? ok(parts.join(' ')) : fail(parts.join(' '));
}

export async function updateParticipant(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const { group } = await requireAdmin(slug);
  const id = fd.get('id');
  if (!isUuid(id)) return fail('Person nicht gefunden.');
  const p = await db.query.participants.findFirst({ where: and(eq(participants.id, id), eq(participants.groupId, group.id)) });
  if (!p) return fail('Person nicht gefunden.');
  const name = cleanText(fd.get('name'), 60);
  const email = normalizeEmail(fd.get('email'));
  if (!name || !email) return fail('Name und gültige E-Mail-Adresse bitte.');
  if (email !== p.email) {
    const clash = await db.query.participants.findFirst({ where: and(eq(participants.groupId, group.id), eq(participants.email, email)) });
    if (clash) return fail('Diese Adresse ist schon in der Gruppe.');
  }
  await db.update(participants).set({ name, email }).where(eq(participants.id, p.id));
  let note = '';
  if (email !== p.email && p.assignedToId && group.status === 'drawn') {
    const r = await sendDrawMails(group.id, p.id);
    note = r.sent ? ' Auslosungs-Mail an die neue Adresse verschickt.' : ' Mail an die neue Adresse ist fehlgeschlagen.';
  }
  refresh(slug);
  return ok(`Gespeichert.${note}`);
}

export async function removeParticipant(slug: string, fd: FormData) {
  const { group, me } = await requireAdmin(slug);
  const id = fd.get('id');
  if (group.status !== 'setup' || !isUuid(id) || id === me.id) return;
  await db.delete(participants).where(and(eq(participants.id, id), eq(participants.groupId, group.id)));
  refresh(slug);
}

// =========================================================================== Admin: Ausschlüsse

export async function addExclusion(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const { group } = await requireAdmin(slug);
  if (group.status !== 'setup') return fail('Ausschlüsse lassen sich nur vor der Auslosung ändern.');
  const a = fd.get('a');
  const b = fd.get('b');
  if (!isUuid(a) || !isUuid(b) || a === b) return fail('Bitte zwei verschiedene Personen auswählen.');
  const both = await db
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.groupId, group.id), inArray(participants.id, [a, b])));
  if (both.length !== 2) return fail('Person nicht gefunden.');
  const [x, y] = [a, b].sort();
  await db.insert(exclusions).values({ groupId: group.id, aId: x, bId: y }).onConflictDoNothing();
  refresh(slug);
  return ok('Gespeichert – die beiden ziehen sich nicht gegenseitig.');
}

export async function removeExclusion(slug: string, fd: FormData) {
  const { group } = await requireAdmin(slug);
  const id = fd.get('id');
  if (!isUuid(id) || group.status !== 'setup') return;
  await db.delete(exclusions).where(and(eq(exclusions.id, id), eq(exclusions.groupId, group.id)));
  refresh(slug);
}

// =========================================================================== Admin: Einstellungen

export async function updateSettings(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const { group, me } = await requireAdmin(slug);
  const name = cleanText(fd.get('name'), 80);
  const eventDate = String(fd.get('eventDate') ?? '').trim();
  if (!name) return fail('Die Gruppe braucht einen Namen.');
  if (eventDate && !isIsoDate(eventDate)) return fail('Das Datum ist ungültig.');

  const newPwDisplay = cleanText(fd.get('newPassword'), 60);
  const newPw = normalizeGroupPassword(newPwDisplay);
  if (newPwDisplay && newPw.length < 4) return fail('Das neue Passwort braucht mindestens 4 Zeichen.');

  await db
    .update(groups)
    .set({
      name,
      budget: cleanText(fd.get('budget'), 40) || null,
      eventDate: eventDate || null,
      eventLocation: cleanText(fd.get('eventLocation'), 120) || null,
      message: cleanMultiline(fd.get('message'), 1000) || null,
      passwordHint: cleanText(fd.get('passwordHint'), 120) || null,
      ...(group.status === 'setup' ? { avoidMutual: fd.get('avoidMutual') === 'on' } : {}),
      ...(newPwDisplay ? { passwordHash: await hashPassword(newPw), passwordEnc: encrypt(newPwDisplay) } : {}),
    })
    .where(eq(groups.id, group.id));

  if (group.status === 'setup') {
    await db.update(participants).set({ plays: fd.get('plays') === 'on' }).where(eq(participants.id, me.id));
  }
  refresh(slug);
  return ok(newPwDisplay ? 'Gespeichert – denk dran, allen das neue Passwort zu sagen.' : 'Gespeichert.');
}

// =========================================================================== Admin: Auslosung & Co.

export async function runDraw(slug: string, _: FormState, _fd: FormData): Promise<FormState> {
  const { group } = await requireAdmin(slug);
  const res = await performDraw(group.id);
  if (res.error) return fail(res.error);
  refresh(slug);
  redirect(`/g/${slug}/admin?m=drawn&s=${res.sent ?? 0}&f=${res.failed ?? 0}`);
}

export async function resendDrawMail(slug: string, fd: FormData) {
  const { group } = await requireAdmin(slug);
  const id = fd.get('id');
  if (!isUuid(id)) return;
  const r = await sendDrawMails(group.id, id);
  redirect(`/g/${slug}/admin?m=resent&f=${r.failed}`);
}

export async function remindAll(slug: string) {
  const { group } = await requireAdmin(slug);
  const n = await sendReminders(group);
  redirect(`/g/${slug}/admin?m=reminded&s=${n}`);
}

export async function resetDrawAction(slug: string) {
  const { group } = await requireAdmin(slug);
  await resetDraw(group.id);
  redirect(`/g/${slug}/admin?m=reset`);
}

export async function revealAction(slug: string) {
  const { group } = await requireAdmin(slug);
  if (group.status !== 'drawn') redirect(`/g/${slug}/admin`);
  await revealGroup(group);
  redirect(`/g/${slug}/admin?m=revealed`);
}

export async function deleteGroup(slug: string) {
  const { group } = await requireAdmin(slug);
  await db.delete(groups).where(eq(groups.id, group.id));
  await clearSession(slug);
  redirect('/?m=deleted');
}
