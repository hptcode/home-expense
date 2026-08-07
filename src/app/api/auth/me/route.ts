import { NextResponse } from 'next/server';
import { getAuthContext } from '@/auth/current-user';
import { db } from '@/db';
import { users, households } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  let householdName: string | null = null;
  let timezone = 'America/Los_Angeles';
  try {
    const [household] = await db.select({ name: households.name, timezone: households.timezone }).from(households).where(eq(households.id, ctx.householdId)).limit(1);
    householdName = household?.name ?? null;
    timezone = household?.timezone ?? timezone;
  } catch {
    // Keep auth and category dropdowns working while an older deployment is
    // waiting for migration 0008 to be run.
    const [household] = await db.select({ name: households.name }).from(households).where(eq(households.id, ctx.householdId)).limit(1);
    householdName = household?.name ?? null;
  }
  const householdMembers = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(and(eq(users.householdId, ctx.householdId), isNull(users.deletedAt)))
    .orderBy(users.createdAt);
  return NextResponse.json({ userId: ctx.userId, email: ctx.email, role: ctx.role, householdId: ctx.householdId, householdName, timezone, householdMembers });
}
