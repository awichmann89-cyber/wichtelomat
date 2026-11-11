import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { eq } from 'drizzle-orm';
import { db, groups } from '@/lib/db';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let name = 'Wichtelgruppe';
  try {
    const g = await db.query.groups.findFirst({ where: eq(groups.slug, slug), columns: { name: true } });
    if (g) name = g.name;
  } catch {
    /* egal */
  }
  return {
    title: name,
    manifest: `/g/${slug}/manifest.webmanifest`,
    robots: { index: false, follow: false },
  };
}

export default function GroupLayout({ children }: { children: ReactNode }) {
  return children;
}
