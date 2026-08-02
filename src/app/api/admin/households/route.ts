import { NextResponse } from 'next/server';
import { db } from '@/db';
import { households, users } from '@/db/schema';
import { eq, isNull, count } from 'drizzle-orm';
import { getSiteAdminContext } from '@/auth/site-admin';

export async function GET(req: Request) {
  const sa = await getSiteAdminContext(req);
  if (!sa) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const rows = await db
    .select({ id: households.id, name: households.name, baseCurrency: households.baseCurrency, createdAt: households.createdAt })
    .from(households)
    .orderBy(households.createdAt);
  const memberCounts = await db
    .select({ householdId: users.householdId, c: count() })
    .from(users).where(isNull(users.deletedAt)).groupBy(users.householdId);
  const map = new Map(memberCounts.map((m) => [m.householdId, Number(m.c)]));
  return NextResponse.json({ households: rows.map((h) => ({ ...h, members: map.get(h.id) ?? 0 })) });
}

export async function DELETE(req: Request) {
  const sa = await getSiteAdminContext(req);
  if (!sa) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  // Cascading FKs remove members, categories, transactions, etc.
  await db.delete(households).where(eq(households.id, id));
  return NextResponse.json({ ok: true });
}
