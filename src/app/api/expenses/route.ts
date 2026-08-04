import { NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions, transactionLines, categories, subcategories } from '@/db/schema';
import { eq, and, isNull, gte, lte, inArray } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

// Returns every transaction LINE (so subcategory + line type are visible),
// optionally filtered to a year (required) and month (optional=whole year).
export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const hid = ctx.householdId;
  const url = new URL(req.url);
  const year = Number(url.searchParams.get('year'));
  const month = url.searchParams.get('month'); // 1-12 or null=whole year
  if (!year || isNaN(year)) return NextResponse.json({ error: 'year required' }, { status: 400 });

  const from = new Date(Date.UTC(year, month ? Number(month) - 1 : 0, 1));
  const to = new Date(Date.UTC(year, month ? Number(month) : 12, 0, 23, 59, 59));

  const txns = await db
    .select({ id: transactions.id, direction: transactions.direction, merchant: transactions.merchant, transactedAt: transactions.transactedAt })
    .from(transactions)
    .where(and(eq(transactions.householdId, hid), isNull(transactions.deletedAt), gte(transactions.transactedAt, from), lte(transactions.transactedAt, to)))
    .orderBy(transactions.transactedAt);

  const ids = txns.map((t) => t.id);
  const lines = ids.length
    ? await db
        .select({
          transactionId: transactionLines.transactionId,
          categoryId: transactionLines.categoryId,
          subcategoryId: transactionLines.subcategoryId,
          amount: transactionLines.amount,
        })
        .from(transactionLines)
        .where(and(eq(transactionLines.householdId, hid), isNull(transactionLines.deletedAt), inArray(transactionLines.transactionId, ids)))
    : [];

  const catIds = [...new Set(lines.map((l) => l.categoryId))];
  const subIds = [...new Set(lines.map((l) => l.subcategoryId).filter(Boolean) as string[])];
  const catMap = new Map<string, string>();
  const subMap = new Map<string, string>();
  if (catIds.length) {
    const cs = await db.select({ id: categories.id, name: categories.name }).from(categories).where(inArray(categories.id, catIds));
    cs.forEach((c) => catMap.set(c.id, c.name));
  }
  if (subIds.length) {
    const ss = await db.select({ id: subcategories.id, name: subcategories.name }).from(subcategories).where(inArray(subcategories.id, subIds));
    ss.forEach((s) => subMap.set(s.id, s.name));
  }

  const rows = lines.map((l) => {
    const tx = txns.find((t) => t.id === l.transactionId)!;
    return {
      id: l.transactionId + '_' + l.categoryId,
      transactionId: l.transactionId,
      transactedAt: tx.transactedAt,
      merchant: tx.merchant,
      direction: tx.direction,
      category: catMap.get(l.categoryId) ?? '(unknown)',
      subcategory: l.subcategoryId ? subMap.get(l.subcategoryId) ?? '' : '',
      amount: l.amount,
    };
  }).sort((a, b) => (a.transactedAt < b.transactedAt ? 1 : -1));

  const total = rows.filter((r) => r.direction === 'expense').reduce((s, r) => s + r.amount, 0);
  const incomeTotal = rows.filter((r) => r.direction === 'income').reduce((s, r) => s + r.amount, 0);

  return NextResponse.json({ rows, total, incomeTotal, year, month: month ? Number(month) : null });
}
