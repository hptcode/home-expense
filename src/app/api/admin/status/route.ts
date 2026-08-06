import { NextResponse } from 'next/server';
import { isSiteAdmin } from '@/lib/admin-auth';

export async function GET(req: Request) {
  const admin = await isSiteAdmin(req);
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json({ ok: true, role: 'site_admin' });
}
