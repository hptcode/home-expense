import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, authTokens } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { sha256Hex } from '@/lib/ids';
import { hashPassword } from '@/lib/password';

export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  if (typeof token !== 'string' || typeof password !== 'string' || password.length < 8) return NextResponse.json({ error: 'valid token and password of at least 8 characters required' }, { status: 400 });
  const [row] = await db.select({ id: authTokens.id, userId: authTokens.userId }).from(authTokens)
    .where(and(eq(authTokens.tokenHash, await sha256Hex(token)), eq(authTokens.kind, 'password_reset'), isNull(authTokens.consumedAt))).limit(1);
  if (!row) return NextResponse.json({ error: 'reset link is invalid or already used' }, { status: 400 });
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user) return NextResponse.json({ error: 'user no longer exists' }, { status: 400 });
  await db.update(users).set({ passwordHash: await hashPassword(password), deletedAt: null }).where(eq(users.id, user.id));
  await db.update(authTokens).set({ consumedAt: new Date() }).where(eq(authTokens.id, row.id));
  return NextResponse.json({ ok: true });
}
