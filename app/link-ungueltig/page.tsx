import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Topbar } from '@/components/Topbar';

export const metadata = { title: 'Link ungültig', robots: { index: false } };

export default function InvalidLink() {
  return (
    <>
      <Topbar />
      <main className="wrap">
        <div className="card center mt-l">
          <div style={{ fontSize: 44 }} aria-hidden>
            🧦
          </div>
          <h1 className="mt-s">Dieser Link passt nicht</h1>
          <p className="muted mt-s">
            Vielleicht wurde neu ausgelost, die Gruppe gelöscht oder der Link ist unvollständig. Nimm den Link aus der neuesten Wichtel-Mail
            oder frag bei deiner Orga nach.
          </p>
          <Link href="/" className="btn btn-soft mt-m">
            Zur Startseite
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
