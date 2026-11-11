import Link from 'next/link';
import type { ReactNode } from 'react';

export function Footer({ children }: { children?: ReactNode }) {
  const impressum = process.env.IMPRESSUM_URL;
  return (
    <footer className="footer">
      {children}
      <div className="footer-links">
        <Link href="/">Wichtelomat</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        {impressum && (
          <a href={impressum} target="_blank" rel="noopener noreferrer">
            Impressum
          </a>
        )}
      </div>
    </footer>
  );
}
