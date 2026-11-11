import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Topbar } from '@/components/Topbar';
import { createCode } from '@/lib/env';
import { createGroup } from './actions';
import { CreateForm } from './CreateForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Neue Wichtelgruppe' };

export default function NewGroupPage() {
  return (
    <>
      <Topbar />
      <main className="wrap">
        <div className="mt-l" style={{ padding: '0 4px' }}>
          <h1>Neue Wichtelgruppe</h1>
          <p className="muted mt-s">Erst die Grunddaten – die Mitwichtel trägst du im nächsten Schritt ein.</p>
        </div>
        <div className="mt-m">
          <CreateForm action={createGroup} needsCode={Boolean(createCode())} />
        </div>
      </main>
      <Footer />
    </>
  );
}
