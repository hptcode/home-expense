import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the household owner' }, { status: 403 });

  const rows = await db
    .select({ email: users.email, role: users.role })
    .from(users)
    .where(eq(users.householdId, ctx.householdId))
    .orderBy(users.createdAt);

  return NextResponse.json({ members: rows });
}