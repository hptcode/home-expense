import { NextResponse } from 'next/server';
import { getAuthContext } from '@/auth/current-user';
import { createInvite, listInvites } from '@/lib/invites';
import { sendInviteEmail } from '@/lib/email';

export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const rows = await listInvites(ctx.householdId);
  return NextResponse.json({ invites: rows.map((i) => ({ id: i.id, email: i.email, token: i.token, expiresAt: i.expiresAt })) });
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the household owner can invite' }, { status: 403 });
    const { email } = await req.json();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'a valid email is required' }, { status: 400 });
    }
    const token = await createInvite(ctx.householdId, ctx.userId, email);
    const link = `${process.env.APP_BASE_URL || ''}/invite?token=${token}`;
    await sendInviteEmail(email, link);
    return NextResponse.json({ ok: true, token, link });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('invite error:', msg);
    return NextResponse.json({ error: 'Failed to send invite: ' + msg }, { status: 500 });
  }
}
