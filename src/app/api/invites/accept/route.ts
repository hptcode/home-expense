import { NextResponse } from 'next/server';
import { getAuthContext } from '@/auth/current-user';
import { acceptInvite } from '@/lib/invites';

export async function POST(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });
  const res = await acceptInvite(token, ctx.userId);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
