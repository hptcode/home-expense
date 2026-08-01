import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/password';
import { createSession, SESSION_COOKIE } from '@/lib/session';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u || u.deletedAt) return NextResponse.json({ error: 'invalid credentials' }, { status: 401 });
  if (!(await verifyPassword(u.passwordHash, password))) return NextResponse.json({ error: 'invalid credentials' }, { status: 401 });

  const token = await createSession(u.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
