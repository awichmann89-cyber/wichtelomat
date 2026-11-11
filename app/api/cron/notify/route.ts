import { NextResponse, type NextRequest } from 'next/server';
import { cronAuthorized } from '@/lib/cron';
import { flushDueNotifications } from '@/lib/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sent = await flushDueNotifications();
  return NextResponse.json({ sent });
}
