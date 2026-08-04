import { NextResponse } from 'next/server';
import { db } from '@/db';
import { households, users, transactions } from '@/db/schema';
import { isSiteAdmin } from '@/lib/admin-auth';
import { eq, and, count, isNull } from 'drizzle-orm';

export async function GET(req: Request) {
  const admin = await isSiteAdmin(req);
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const hs = await db.select({
    id: households.id,
    name: households.name,
    createdAt: households.createdAt,
    users: count(users.id),
  })
  .from(households)
  .leftJoin(users, eq(users.householdId, households.id))
  .groupBy(households.id)
  .orderBy(households.createdAt);

  const result = await Promise.all(hs.map(async (h) => {
    const t = await db.select({ n: count(transactions.id) })
      .from(transactions)
      .where(and(eq(transactions.householdId, h.id), isNull(transactions.deletedAt)));
    return { ...h, transactions: t[0]?.n ?? 0 };
  }));

  return NextResponse.json({ households: result });
}
