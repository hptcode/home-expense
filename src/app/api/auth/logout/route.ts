import { NextResponse } from 'next/server';
import { destroySession, SESSION_COOKIE } from '@/lib/session';

export async function POST(req: Request) {
  const token = req.headers.get('cookie')?.split(`${SESSION_COOKIE}=`).pop()?.split(';')[0];
  if (token) await destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
