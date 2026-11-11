import type { MetadataRoute } from 'next';

export const baseManifest: MetadataRoute.Manifest = {
  name: 'Wichtelomat',
  short_name: 'Wichtelomat',
  description: 'Wichteln ohne Zettelchaos: auslosen, Wünsche teilen, anonym nachfragen.',
  lang: 'de',
  start_url: '/',
  display: 'standalone',
  background_color: '#f6f1e9',
  theme_color: '#14583a',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

export default function manifest(): MetadataRoute.Manifest {
  return baseManifest;
}
