import { NextResponse } from 'next/server';
import { and, eq, gte, lte, isNull, inArray } from 'drizzle-orm';
import { db } from '../../../db';
import { transactions, transactionLines, categories, budgets } from '../../../db/schema';
import { getAuthContext } from '../../../auth/current-user';

// Reporting aggregate. All money returned in integer minor units (cents).
// - totals / byCategory / byPeriod use the requested [from, to] range.
// - budgets compare against the CURRENT calendar month (budgets are monthly).
export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const hid = ctx.householdId;
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  // Validate / default the range to the current calendar month.
  const now = new Date();
  const defFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const defTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const fromStr = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : defFrom;
  const toStr = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : defTo;
  const fromDt = new Date(fromStr + 'T00:00:00Z');
  const toDt = new Date(toStr + 'T23:59:59Z');

  // Current month window for budget-vs-actual.
  const cmFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const cmTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

  // --- transactions in range ---
  const txns = await db
    .select({ id: transactions.id, direction: transactions.direction, transactedAt: transactions.transactedAt })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, hid),
        isNull(transactions.deletedAt),
        gte(transactions.transactedAt, fromDt),
        lte(transactions.transactedAt, toDt),
      ),
    );

  const txnDir = new Map(txns.map((t) => [t.id, t.direction]));
  const txnMonth = new Map(txns.map((t) => [t.id, (t.transactedAt as Date).toISOString().slice(0, 7)]));

  const ids = txns.map((t) => t.id);
  const lines = ids.length
    ? await db
        .select({ transactionId: transactionLines.transactionId, categoryId: transactionLines.categoryId, amount: transactionLines.amount })
        .from(transactionLines)
        .where(and(eq(transactionLines.householdId, hid), isNull(transactionLines.deletedAt), inArray(transactionLines.transactionId, ids)))
    : [];

  // --- category names ---
  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.householdId, hid), isNull(categories.deletedAt)));
  const catName = new Map(cats.map((c) => [c.id, c.name]));

  // --- aggregate totals / byCategory / byPeriod ---
  let income = 0;
  let expense = 0;
  const catMap = new Map<string, number>();
  const periodMap = new Map<string, { income: number; expense: number }>();

  for (const l of lines) {
    const dir = txnDir.get(l.transactionId);
    const month = txnMonth.get(l.transactionId) ?? 'unknown';
    const bucket = periodMap.get(month) ?? { income: 0, expense: 0 };
    if (dir === 'income') {
      income += l.amount;
      bucket.income += l.amount;
    } else {
      expense += l.amount;
      bucket.expense += l.amount;
      catMap.set(l.categoryId, (catMap.get(l.categoryId) ?? 0) + l.amount);
    }
    periodMap.set(month, bucket);
  }

  const byCategory = [...catMap.entries()]
    .map(([categoryId, amount]) => ({ categoryId, category: catName.get(categoryId) ?? '(unknown)', amount }))
    .sort((a, b) => b.amount - a.amount);

  const byPeriod = [...periodMap.entries()]
    .map(([period, v]) => ({ period, income: v.income, expense: v.expense, net: v.income - v.expense }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // --- budgets vs actual (current month) ---
  const cmTxns = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.householdId, hid), isNull(transactions.deletedAt), gte(transactions.transactedAt, cmFrom), lte(transactions.transactedAt, cmTo)));
  const cmIds = cmTxns.map((t) => t.id);
  const cmLines = cmIds.length
    ? await db
        .select({ categoryId: transactionLines.categoryId, amount: transactionLines.amount })
        .from(transactionLines)
        .where(and(eq(transactionLines.householdId, hid), isNull(transactionLines.deletedAt), inArray(transactionLines.transactionId, cmIds)))
    : [];
  const spentMap = new Map<string, number>();
  for (const l of cmLines) {
    spentMap.set(l.categoryId, (spentMap.get(l.categoryId) ?? 0) + l.amount);
  }

  const bList = await db
    .select({ id: budgets.id, categoryId: budgets.categoryId, monthlyLimit: budgets.monthlyLimit })
    .from(budgets)
    .where(eq(budgets.householdId, hid));
  const budgetRows = bList
    .map((b) => {
      const spent = spentMap.get(b.categoryId) ?? 0;
      const limit = b.monthlyLimit;
      return {
        categoryId: b.categoryId,
        category: catName.get(b.categoryId) ?? '(unknown)',
        monthlyLimit: limit,
        spent,
        remaining: limit - spent,
        pct: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      };
    })
    .sort((a, b) => b.pct - a.pct);


  // --- yearly aggregates (mirror old dashboard: yearly trend + by category) ---
  // Honor the requested year (the selected year from the UI), not the server clock.
  const reqYear = new Date(fromStr + 'T00:00:00Z').getUTCFullYear();
  const yearFrom = new Date(Date.UTC(reqYear, 0, 1));
  const yearTo = new Date(Date.UTC(reqYear, 11, 31, 23, 59, 59));
  const yTxns = await db
    .select({ id: transactions.id, direction: transactions.direction, transactedAt: transactions.transactedAt })
    .from(transactions)
    .where(and(eq(transactions.householdId, hid), isNull(transactions.deletedAt), gte(transactions.transactedAt, yearFrom), lte(transactions.transactedAt, yearTo)));
  const yIds = yTxns.map((t) => t.id);
  const yLines = yIds.length
    ? await db.select({ transactionId: transactionLines.transactionId, categoryId: transactionLines.categoryId, amount: transactionLines.amount })
        .from(transactionLines)
        .where(and(eq(transactionLines.householdId, hid), isNull(transactionLines.deletedAt), inArray(transactionLines.transactionId, yIds)))
    : [];
  const yDir = new Map(yTxns.map((t) => [t.id, t.direction]));
  const monthlyBuckets = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
  const yCat = new Map();
  for (const l of yLines) {
    const dir = yDir.get(l.transactionId);
    const t = yTxns.find((x) => x.id === l.transactionId);
    if (!t) continue;
    const m = (t.transactedAt as Date).getUTCMonth();
    if (dir === 'income') monthlyBuckets[m].income += l.amount;
    else { monthlyBuckets[m].expense += l.amount; yCat.set(l.categoryId, (yCat.get(l.categoryId) ?? 0) + l.amount); }
  }
  const yearlyTrend = monthlyBuckets.map((b, i) => ({ month: i + 1, income: b.income, expense: b.expense }));
  const yearlyByCategory = [...yCat.entries()]
    .map(([categoryId, amount]) => ({ categoryId, category: catName.get(categoryId) ?? '(unknown)', amount }))
    .sort((a, b) => b.amount - a.amount);
  return NextResponse.json({
    range: { from: fromStr, to: toStr },
    totals: { income, expense, net: income - expense },
    byCategory,
    byPeriod,
    budgets: budgetRows,
    yearlyTrend,
    yearlyByCategory,
  });
}
