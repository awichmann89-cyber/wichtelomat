import Link from 'next/link';
import type { ReactNode } from 'react';

export function Topbar({ title, href = '/', right }: { title?: string; href?: string; right?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href={href} className="topbar-brand" aria-label="Zur Übersicht">
          <img src="/icons/icon.svg" alt="" width={34} height={34} />
          <span className="truncate">{title ?? 'Wichtelomat'}</span>
        </Link>
        {right && <div className="topbar-right">{right}</div>}
      </div>
    </header>
  );
}
