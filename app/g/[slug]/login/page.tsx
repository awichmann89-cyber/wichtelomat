import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { Footer } from '@/components/Footer';
import { Topbar } from '@/components/Topbar';
import { db, participants } from '@/lib/db';
import { firstName } from '@/lib/format';
import { findByToken } from '@/lib/service';
import { getContext } from '@/lib/session';
import { loginWithToken, requestCode, verifyCode } from '../actions';
import { CodeLogin, TokenLogin } from './LoginForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Anmelden' };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await getContext(slug);
  if (!ctx) notFound();
  const { group } = ctx;
  const t = typeof sp.t === 'string' ? sp.t : null;
  const next = typeof sp.next === 'string' ? sp.next : '';
  if (ctx.me && !t) redirect(`/g/${slug}`);

  const found = t ? await findByToken(t) : null;
  const person = found && found.group.id === group.id ? found.p : null;
  const admin = await db.query.participants.findFirst({
    where: and(eq(participants.groupId, group.id), eq(participants.isAdmin, true)),
    columns: { name: true },
  });
  const adminName = admin?.name ?? 'der Orga';

  const hint = (
    <p className="hint" style={{ marginTop: 10 }}>
      Das Passwort kennst du von {adminName}.{group.passwordHint ? ` Hinweis: ${group.passwordHint}` : ''}
    </p>
  );

  return (
    <>
      <Topbar title={group.name} href={`/g/${slug}/login`} />
      <main className="wrap">
        <div className="center mt-l">
          <img src="/icons/icon.svg" alt="" width={72} height={72} style={{ borderRadius: 18 }} />
          <h1 className="mt-s">{person ? `Hallo ${firstName(person.name)}!` : 'Anmelden'}</h1>
          <p className="muted mt-s">Wichtelgruppe „{group.name}“</p>
        </div>

        {t && !person && (
          <div className="notice warn">Dieser Link passt nicht (mehr). Melde dich einfach mit einem Code per Mail an.</div>
        )}

        {person ? (
          <>
            <div className="card mt-m">
              <p className="small">Einmal kurz das Gruppenpasswort – danach bleibt dieses Gerät angemeldet.</p>
              <div className="mt-m">
                <TokenLogin action={loginWithToken.bind(null, slug)} token={t!} next={next} />
              </div>
              {hint}
            </div>
            <details className="card mt-m">
              <summary>Nicht {firstName(person.name)}? Mit Code anmelden</summary>
              <CodeLogin request={requestCode.bind(null, slug)} verify={verifyCode.bind(null, slug)} />
            </details>
          </>
        ) : (
          <div className="card mt-m">
            <p className="small">
              Gib deine E-Mail-Adresse und das Gruppenpasswort ein – wir schicken dir einen Anmeldecode. Praktisch auch für neue Geräte
              oder die App auf dem Home-Bildschirm.
            </p>
            <div className="mt-m">
              <CodeLogin request={requestCode.bind(null, slug)} verify={verifyCode.bind(null, slug)} />
            </div>
            {hint}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
