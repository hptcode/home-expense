import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, households } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { getSiteAdminContext } from '@/auth/site-admin';

export async function GET(req: Request) {
  const sa = await getSiteAdminContext(req);
  if (!sa) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const householdId = new URL(req.url).searchParams.get('householdId');
  const where = householdId
    ? and(eq(users.householdId, householdId), isNull(users.deletedAt))
    : isNull(users.deletedAt);
  const rows = await db
    .select({
      id: users.id, email: users.email, role: users.role, householdId: users.householdId,
      householdName: households.name, createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(households, eq(users.householdId, households.id))
    .where(where)
    .orderBy(users.createdAt);
  return NextResponse.json({ users: rows });
}

export async function DELETE(req: Request) {
  const sa = await getSiteAdminContext(req);
  if (!sa) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  // Soft-delete the user (keeps their household if others remain).
  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
