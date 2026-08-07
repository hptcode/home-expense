import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, households, invites, authTokens } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { hashPassword } from '@/lib/password';
import { createSession, SESSION_COOKIE } from '@/lib/session';
import { sendVerifyEmail } from '@/lib/email';
import { seedDefaultCategories } from '@/lib/seed';
import { randomToken, sha256Hex } from '@/lib/ids';

export async function POST(req: Request) {
  try {
  let { email, password, householdName, inviteToken } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'email+password required' }, { status: 400 });
  email = email.toLowerCase().trim();

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return NextResponse.json({ error: 'email already registered' }, { status: 409 });

  let hhId: string;
  let userRole: 'owner' | 'member' = 'owner';
  // If signing up via invite, place user directly in the invitor's household.
  if (inviteToken) {
    const [inv] = await db.select().from(invites).where(eq(invites.token, inviteToken)).limit(1);
    if (!inv) return NextResponse.json({ error: 'Invite not found' }, { status: 400 });
    if (inv.acceptedAt) return NextResponse.json({ error: 'Invite already used' }, { status: 400 });
    if (inv.email.toLowerCase() !== email) return NextResponse.json({ error: 'This invite was sent to a different email' }, { status: 400 });
    if (!inv.expiresAt || inv.expiresAt < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 400 });
    hhId = inv.householdId;
    userRole = 'member';
    // Mark invite as accepted now (we'll finalize below).
    await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.token, inviteToken));
  } else {
    const [hh] = await db.insert(households).values({ name: householdName ?? 'My Household', baseCurrency: 'CAD' }).returning({ id: households.id });
    await seedDefaultCategories(hh.id);
    hhId = hh.id;
  }
  const [u] = await db.insert(users).values({ householdId: hhId, email, passwordHash: await hashPassword(password), role: userRole }).returning({ id: users.id });

  const vt = randomToken(32);
  await db.insert(authTokens).values({ userId: u.id, kind: 'email_verify', tokenHash: await sha256Hex(vt), expiresAt: new Date(Date.now() + 86_400_000) });
  await sendVerifyEmail(email, vt);

  const token = await createSession(u.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
  } catch (e) {
    console.error('signup error', e);
    return NextResponse.json({ error: 'signup service error: ' + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
