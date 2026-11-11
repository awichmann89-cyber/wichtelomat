import { appUrl } from '@/lib/env';
import { getContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** Bescherung als Ganztagstermin – iPhone öffnet direkt „Zum Kalender hinzufügen“. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getContext(slug);
  if (!ctx?.me || !ctx.group.eventDate) return new Response('Nicht gefunden', { status: 404 });
  const { group } = ctx;
  const d = group.eventDate!.replace(/-/g, '');
  const next = new Date(`${group.eventDate}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const dEnd = next.toISOString().slice(0, 10).replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const desc = [group.budget ? `Budget: ${group.budget}` : '', `${appUrl()}/g/${slug}`].filter(Boolean).join('\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wichtelomat//DE',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${group.id}@wichtelomat`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${dEnd}`,
    `SUMMARY:${icsEscape(`Wichteln: ${group.name}`)}`,
    group.eventLocation ? `LOCATION:${icsEscape(group.eventLocation)}` : '',
    `DESCRIPTION:${icsEscape(desc)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P3D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Wichtelgeschenk schon besorgt?',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="wichteln-${slug}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
