import { NextResponse } from 'next/server';
import { baseManifest } from '@/app/manifest';

/** Eigenes Manifest pro Gruppe: „Zum Home-Bildschirm“ öffnet direkt diese Gruppe. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]{4,32}$/.test(slug)) return new NextResponse('Nicht gefunden', { status: 404 });
  return NextResponse.json(
    { ...baseManifest, id: `/g/${slug}`, start_url: `/g/${slug}`, scope: '/' },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
}
