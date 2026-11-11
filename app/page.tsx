import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { Footer } from '@/components/Footer';
import { myGroups } from '@/lib/session';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, [string, string]> = {
  setup: ['Vorbereitung', 'badge-warn'],
  drawn: ['Ausgelost', 'badge-ok'],
  revealed: ['Aufgelöst', 'badge-bad'],
};

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  let mine: Awaited<ReturnType<typeof myGroups>> = [];
  try {
    mine = await myGroups();
  } catch {
    /* ohne Datenbank (z. B. beim ersten Deploy) trotzdem rendern */
  }

  return (
    <>
      <div className="snow" aria-hidden />
      <main className="wrap page-content">
        <section className="hero">
          <img src="/icons/icon.svg" className="hero-icon" alt="" width={116} height={116} />
          <h1>Wichtelomat</h1>
          <p className="lead">Wichteln ohne Zettelchaos. Auslosen, Wünsche teilen, Überraschung!</p>
          <Link href="/neu" className="btn btn-primary btn-xl btn-block mt-l">
            Wichtelgruppe erstellen
          </Link>
          <p className="small muted mt-s">Kostenlos · ohne Konto · in 2 Minuten fertig</p>
        </section>

        <Flash sp={sp} />

        {mine.length > 0 && (
          <section>
            <div className="section-head">
              <h2>Deine Gruppen</h2>
            </div>
            <div className="card card-tight">
              <ul className="list">
                {mine.map(({ group, me }) => (
                  <li key={group.id}>
                    <Link href={`/g/${group.slug}`} className="between" style={{ color: 'inherit', textDecoration: 'none' }}>
                      <span style={{ minWidth: 0 }}>
                        <span className="person-name truncate" style={{ display: 'block' }}>
                          {group.name}
                        </span>
                        <span className="small muted">
                          als {me.name}
                          {me.isAdmin ? ' · Orga' : ''}
                        </span>
                      </span>
                      <span className={`badge ${STATUS[group.status][1]}`}>{STATUS[group.status][0]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section>
          <div className="section-head">
            <h2>So geht’s</h2>
          </div>
          <div className="card">
            <ol className="steps">
              <li>
                <div>
                  <strong>Gruppe anlegen</strong>
                  <span className="small muted">
                    Du legst ein Gruppenpasswort fest und trägst alle Mitwichtel mit E-Mail-Adresse ein. Paare können sich gegenseitig
                    ausschließen.
                  </span>
                </div>
              </li>
              <li>
                <div>
                  <strong>Auslosen</strong>
                  <span className="small muted">
                    Ein Tipp – und alle bekommen eine Mail mit ihrem Wichtelkind. Nicht mal du als Orga siehst, wer wen gezogen hat.
                  </span>
                </div>
              </li>
              <li>
                <div>
                  <strong>Wünschen &amp; schenken</strong>
                  <span className="small muted">
                    Wunschliste mit Links anlegen, dein Wichtel wird automatisch benachrichtigt. Unklar, welche Größe? Frag anonym nach.
                  </span>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="features mt-m">
          <div className="feature">
            <span className="ico">🤫</span>
            <b>Streng geheim</b>Auch die Orga sieht die Ziehung nicht.
          </div>
          <div className="feature">
            <span className="ico">💌</span>
            <b>Anonym fragen</b>Wichtel und Wichtelkind können sich schreiben.
          </div>
          <div className="feature">
            <span className="ico">🎁</span>
            <b>„Schon besorgt“</b>Die Liste schließt sich, ohne etwas zu verraten.
          </div>
          <div className="feature">
            <span className="ico">📱</span>
            <b>Wie eine App</b>Einfach zum Home-Bildschirm hinzufügen.
          </div>
        </section>

        <p className="center small muted mt-l">
          Schon eingeladen? Tippe einfach auf den Link in deiner Wichtel-Mail.
        </p>
      </main>
      <Footer />
    </>
  );
}
