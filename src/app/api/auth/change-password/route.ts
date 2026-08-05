import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '@/lib/password';
import { getAuthContext } from '@/auth/current-user';

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) return NextResponse.json({ error: 'current + new password required' }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ error: 'new password must be at least 8 characters' }, { status: 400 });

    const [u] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, ctx.userId)).limit(1);
    if (!u || !(await verifyPassword(u.passwordHash, currentPassword))) {
      return NextResponse.json({ error: 'current password is incorrect' }, { status: 403 });
    }
    await db.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, ctx.userId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
