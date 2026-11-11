import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { appUrl } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: 'Wichtelomat – Wichteln ohne Zettelchaos', template: '%s · Wichtelomat' },
  description: 'Wichtelgruppe anlegen, auslosen lassen, Wünsche teilen und anonym nachfragen. Jeder bekommt sein Wichtelkind per Mail.',
  applicationName: 'Wichtelomat',
  appleWebApp: { capable: true, title: 'Wichtelomat', statusBarStyle: 'default' },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: { title: 'Wichtelomat', description: 'Wichteln ohne Zettelchaos.', locale: 'de_DE', type: 'website' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f1e9' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1714' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
