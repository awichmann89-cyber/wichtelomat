import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import { db, groups, participants, type Group, type Participant } from './db';
import { hmac, safeEqual } from './crypto';

const PREFIX = 'wo_';
const MAX_AGE = 60 * 60 * 24 * 120; // 120 Tage

export const cookieName = (slug: string) => `${PREFIX}${slug}`;

function sign(slug: string, payload: string) {
  return hmac(`${slug}|${payload}`);
}

function parse(slug: string, value: string): { pid: string; ver: number } | null {
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const [pid, ver, exp, sig] = parts;
  if (!safeEqual(sig, sign(slug, `${pid}.${ver}.${exp}`))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  if (!/^[0-9a-f-]{36}$/.test(pid)) return null;
  return { pid, ver: Number(ver) };
}

export async function setSession(slug: string, p: Pick<Participant, 'id' | 'sessionVersion'>) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${p.id}.${p.sessionVersion}.${exp}`;
  (await cookies()).set(cookieName(slug), `${payload}.${sign(slug, payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearSession(slug: string) {
  (await cookies()).delete(cookieName(slug));
}

export type Ctx = { group: Group; me: Participant };

export async function getContext(slug: string): Promise<{ group: Group; me: Participant | null } | null> {
  if (!/^[a-z0-9]{4,32}$/.test(slug)) return null;
  const group = await db.query.groups.findFirst({ where: eq(groups.slug, slug) });
  if (!group) return null;
  const raw = (await cookies()).get(cookieName(slug))?.value;
  const s = raw ? parse(slug, raw) : null;
  if (!s) return { group, me: null };
  const me = await db.query.participants.findFirst({
    where: and(eq(participants.id, s.pid), eq(participants.groupId, group.id)),
  });
  if (!me || me.sessionVersion !== s.ver) return { group, me: null };
  return { group, me };
}

export async function requireMember(slug: string): Promise<Ctx> {
  const ctx = await getContext(slug);
  if (!ctx) notFound();
  if (!ctx.me) redirect(`/g/${slug}/login`);
  return ctx as Ctx;
}

export async function requireAdmin(slug: string): Promise<Ctx> {
  const ctx = await requireMember(slug);
  if (!ctx.me.isAdmin) redirect(`/g/${slug}`);
  return ctx;
}

/** Alle Gruppen, in denen dieses Gerät angemeldet ist (für die Startseite). */
export async function myGroups(): Promise<{ group: Group; me: Participant }[]> {
  const all = (await cookies()).getAll().filter((c) => c.name.startsWith(PREFIX));
  const valid = all
    .map((c) => ({ slug: c.name.slice(PREFIX.length), s: parse(c.name.slice(PREFIX.length), c.value) }))
    .filter((x): x is { slug: string; s: { pid: string; ver: number } } => Boolean(x.s));
  if (!valid.length) return [];
  const rows = await db
    .select({ group: groups, me: participants })
    .from(participants)
    .innerJoin(groups, eq(groups.id, participants.groupId))
    .where(inArray(participants.id, valid.map((v) => v.s.pid)));
  return rows.filter((r) => valid.some((v) => v.slug === r.group.slug && v.s.ver === r.me.sessionVersion));
}
