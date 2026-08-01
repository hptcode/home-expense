import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, households, authTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/password';
import { createSession, SESSION_COOKIE } from '@/lib/session';
import { sendVerifyEmail } from '@/lib/email';
import { seedDefaultCategories } from '@/lib/seed';
import { randomToken, sha256Hex } from '@/lib/ids';

export async function POST(req: Request) {
  const { email, password, householdName } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'email+password required' }, { status: 400 });

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return NextResponse.json({ error: 'email already registered' }, { status: 409 });

  const [hh] = await db.insert(households).values({ name: householdName ?? 'My Household', baseCurrency: 'CAD' }).returning();
  await seedDefaultCategories(hh.id);
  const [u] = await db.insert(users).values({ householdId: hh.id, email, passwordHash: await hashPassword(password), role: 'owner' }).returning();

  const vt = randomToken(32);
  await db.insert(authTokens).values({ userId: u.id, kind: 'email_verify', tokenHash: await sha256Hex(vt), expiresAt: new Date(Date.now() + 86_400_000) });
  await sendVerifyEmail(email, vt);

  const token = await createSession(u.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
