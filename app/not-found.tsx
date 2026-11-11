import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Topbar } from '@/components/Topbar';

export default function NotFound() {
  return (
    <>
      <Topbar />
      <main className="wrap">
        <div className="card center mt-l">
          <div style={{ fontSize: 44 }} aria-hidden>
            🎄
          </div>
          <h1 className="mt-s">Nichts gefunden</h1>
          <p className="muted mt-s">Diese Seite oder Wichtelgruppe gibt es nicht (mehr). Gruppen werden nach dem Wichteln automatisch gelöscht.</p>
          <Link href="/" className="btn btn-soft mt-m">
            Zur Startseite
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
