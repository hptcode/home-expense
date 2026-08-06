import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx || !ctx.householdId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const members = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(and(eq(users.householdId, ctx.householdId), isNull(users.deletedAt)))
    .orderBy(users.createdAt);

  return NextResponse.json({ members });
}
