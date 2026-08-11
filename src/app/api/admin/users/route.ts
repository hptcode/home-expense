import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, households } from '@/db/schema';
import { isSiteAdmin } from '@/lib/admin-auth';
import { eq, isNull } from 'drizzle-orm';

export async function GET(req: Request) {
  const admin = await isSiteAdmin(req);
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const us = await db.select({
    id: users.id,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    deletedAt: users.deletedAt,
    householdId: users.householdId,
    householdName: households.name,
  })
  .from(users)
  .leftJoin(households, eq(households.id, users.householdId))
  .orderBy(users.createdAt);

  return NextResponse.json({ users: us });
}
