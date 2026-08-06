import { NextResponse } from 'next/server';
import { getAuthContext } from '@/auth/current-user';
import { db } from '@/db';
import { users } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const householdMembers = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(and(eq(users.householdId, ctx.householdId), isNull(users.deletedAt)))
    .orderBy(users.createdAt);
  return NextResponse.json({ userId: ctx.userId, email: ctx.email, role: ctx.role, householdId: ctx.householdId, householdMembers });
}
