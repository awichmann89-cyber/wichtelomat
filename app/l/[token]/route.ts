import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { findByToken, targetPath } from '@/lib/service';
import { getContext, setSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Persönlicher Link aus der Mail.
 * - Ist das Gerät für diese Gruppe schon angemeldet (Gruppenpasswort bekannt) → direkt rein.
 * - Sonst → Passwortabfrage. GET verändert nichts, damit Link-Scanner von Mailprogrammen harmlos bleiben.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const next = req.nextUrl.searchParams.get('next') ?? '';
  const found = await findByToken(token);
  if (!found) redirect('/link-ungueltig');
  const slug = found.group.slug;
  const ctx = await getContext(slug);
  if (ctx?.me) {
    if (ctx.me.id !== found.p.id) await setSession(slug, found.p);
    redirect(targetPath(slug, next));
  }
  const qs = new URLSearchParams({ t: token, ...(next ? { next } : {}) });
  redirect(`/g/${slug}/login?${qs}`);
}
