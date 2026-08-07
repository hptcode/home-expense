import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, authTokens } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { randomToken, sha256Hex } from '@/lib/ids';
import { sendPasswordReset } from '@/lib/email';

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  const normalized = typeof email === 'string' ? email.toLowerCase().trim() : '';
  // Always return the same response to avoid revealing registered accounts.
  const generic = NextResponse.json({ ok: true, message: 'If that email is registered, a reset link has been sent.' });
  if (!normalized) return generic;
  const [user] = await db.select({ id: users.id, email: users.email }).from(users)
    .where(and(eq(users.email, normalized), isNull(users.deletedAt))).limit(1);
  if (!user) return generic;
  const token = randomToken(32);
  await db.insert(authTokens).values({ userId: user.id, kind: 'password_reset', tokenHash: await sha256Hex(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
  await sendPasswordReset(user.email, token);
  return generic;
}
