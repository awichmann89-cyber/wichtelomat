import { Footer } from '@/components/Footer';
import { Topbar } from '@/components/Topbar';
import { DELETE_AFTER_EVENT_DAYS, mailFrom } from '@/lib/env';

export const metadata = { title: 'Datenschutz' };
export const dynamic = 'force-dynamic';

export default function Privacy() {
  const operator = process.env.OPERATOR_NAME;
  const contact = process.env.OPERATOR_EMAIL || (mailFrom().match(/<([^>]+)>/)?.[1] ?? mailFrom());
  return (
    <>
      <Topbar />
      <main className="wrap">
        <article className="card mt-l stack">
          <h1>Datenschutz</h1>
          <p className="muted">Kurz und ehrlich: Der Wichtelomat speichert nur, was fürs Wichteln nötig ist – und löscht es danach wieder.</p>
          <div>
            <h3>Was gespeichert wird</h3>
            <p className="small mt-s">
              Name und E-Mail-Adresse der Mitwichtel (eingetragen von der Orga), das Ergebnis der Auslosung, eure Wünsche samt Links und
              Notizen sowie die anonymen Nachrichten zwischen Wichtel und Wichtelkind. Gruppenpasswörter werden verschlüsselt gespeichert.
            </p>
          </div>
          <div>
            <h3>Wofür</h3>
            <p className="small mt-s">
              Ausschließlich für die Durchführung des Wichtelns: Auslosung, Benachrichtigungen per E-Mail (Auslosung, neue Wünsche,
              Nachrichten, Erinnerungen) und die Anzeige in der App. Keine Werbung, kein Tracking, keine Analyse-Tools, keine Weitergabe.
            </p>
          </div>
          <div>
            <h3>Cookies</h3>
            <p className="small mt-s">
              Nur ein technisch notwendiges Cookie pro Gruppe, damit dein Gerät angemeldet bleibt (max. 120 Tage). Auf dem iPhone merkt
              sich die App außerdem lokal, ob du den Installations-Hinweis geschlossen hast.
            </p>
          </div>
          <div>
            <h3>Wie lange</h3>
            <p className="small mt-s">
              Gruppen werden automatisch {DELETE_AFTER_EVENT_DAYS} Tage nach dem Datum der Bescherung gelöscht – ohne Datum spätestens nach
              etwa einem Jahr. Die Orga kann die Gruppe jederzeit sofort löschen.
            </p>
          </div>
          <div>
            <h3>Technik</h3>
            <p className="small mt-s">
              Gehostet bei Vercel (Region Frankfurt), Datenbank bei Neon (EU). E-Mails werden über den Mailserver des Betreibers versendet.
            </p>
          </div>
          <div>
            <h3>Kontakt</h3>
            <p className="small mt-s">
              {operator ? `${operator} · ` : ''}
              <a href={`mailto:${contact}`}>{contact}</a>
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
