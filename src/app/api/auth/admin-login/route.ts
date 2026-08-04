import { NextResponse } from 'next/server';
import { signAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';

export async function POST(req: Request) {
  const { secret } = await req.json();
  if (!secret || typeof secret !== 'string') {
    return NextResponse.json({ error: 'secret required' }, { status: 400 });
  }
  const envSecret = process.env.SITE_ADMIN_SECRET;
  if (!envSecret || secret !== envSecret) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 401 });
  }
  const cookieValue = await signAdminToken(envSecret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, cookieValue, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 });
  return res;
}
