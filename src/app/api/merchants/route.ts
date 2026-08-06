import { NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq, and, isNotNull, isNull } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const rows = await db
    .select({ merchant: transactions.merchant })
    .from(transactions)
    .where(and(eq(transactions.householdId, ctx.householdId), isNull(transactions.deletedAt), isNotNull(transactions.merchant)))
    .groupBy(transactions.merchant)
    .orderBy(transactions.merchant);

  const merchants = rows.map((r) => r.merchant).filter(Boolean) as string[];
  return NextResponse.json({ merchants });
}
