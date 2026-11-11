import { NextResponse, type NextRequest } from 'next/server';
import { cronAuthorized } from '@/lib/cron';
import { cleanupOldGroups } from '@/lib/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const deleted = await cleanupOldGroups();
  return NextResponse.json({ deleted });
}
