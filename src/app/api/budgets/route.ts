import { NextResponse } from 'next/server';
import { and, eq, gte, lte, isNull, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { budgets, categories, subcategories, transactions, transactionLines } from '@/db/schema';
import { getAuthContext } from '@/auth/current-user';

// Budgets are monthly. We compute spent for the CURRENT calendar month
// (America/Los_Angeles), netting refund/income lines against the category.
function monthWindow(now: Date) {
  // Current month in PDT.
  const pdt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit' });
  const [y, m] = pdt.format(now).split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(y, m, 0, 23, 59, 59));
  return { from, to };
}

export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const hid = ctx.householdId;

  // direction maps (for netting income/refund lines)
  const cats = await db.select({ id: categories.id, name: categories.name, direction: categories.direction })
    .from(categories).where(and(eq(categories.householdId, hid), isNull(categories.deletedAt)));
  const subs = await db.select({ id: subcategories.id, direction: subcategories.direction })
    .from(subcategories).where(and(eq(subcategories.householdId, hid), isNull(subcategories.deletedAt)));
  const catDir = new Map(cats.map((c) => [c.id, c.direction]));
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const subDir = new Map(subs.map((s) => [s.id, s.direction]));

  // current-month transactions
  const now = new Date();
  const { from, to } = monthWindow(now);
  const txns = await db.select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.householdId, hid), isNull(transactions.deletedAt), gte(transactions.transactedAt, from), lte(transactions.transactedAt, to)));
  const ids = txns.map((t) => t.id);
  const lines = ids.length
    ? await db.select({ categoryId: transactionLines.categoryId, subcategoryId: transactionLines.subcategoryId, amount: transactionLines.amount })
      .from(transactionLines)
      .where(and(eq(transactionLines.householdId, hid), isNull(transactionLines.deletedAt), inArray(transactionLines.transactionId, ids)))
    : [];
  const spentMap = new Map<string, number>();
  for (const l of lines) {
    const d = (l.subcategoryId && subDir.get(l.subcategoryId)) ? subDir.get(l.subcategoryId)! : (catDir.get(l.categoryId) ?? 'expense');
    spentMap.set(l.categoryId, (spentMap.get(l.categoryId) ?? 0) + (d === 'income' ? -l.amount : l.amount));
  }

  const rows = await db.select({ id: budgets.id, categoryId: budgets.categoryId, monthlyLimit: budgets.monthlyLimit })
    .from(budgets).where(eq(budgets.householdId, hid));

  const result = rows
    .map((b) => {
      const spent = spentMap.get(b.categoryId) ?? 0;
      const limit = b.monthlyLimit;
      return {
        id: b.id,
        categoryId: b.categoryId,
        category: catName.get(b.categoryId) ?? '(unknown)',
        monthlyLimit: limit,
        spent,
        remaining: limit - spent,
        pct: limit > 0 ? Math.max(0, Math.round((spent / limit) * 100)) : 0,
        over: spent > limit,
      };
    })
    .sort((a, b) => b.pct - a.pct);

  return NextResponse.json({ budgets: result });
}

export async function POST(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the household owner can set budgets' }, { status: 403 });
  const { categoryId, monthlyLimit } = await req.json();
  if (!categoryId || typeof monthlyLimit !== 'number' || !Number.isInteger(monthlyLimit) || monthlyLimit < 0) {
    return NextResponse.json({ error: 'categoryId and a non-negative integer monthlyLimit (cents) are required' }, { status: 400 });
  }
  // Verify the category belongs to this household.
  const [cat] = await db.select({ id: categories.id }).from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.householdId, ctx.householdId), isNull(categories.deletedAt)))
    .limit(1);
  if (!cat) return NextResponse.json({ error: 'category not found' }, { status: 404 });

  // Upsert (one budget per category per household; unique constraint enforces it).
  const existing = await db.select({ id: budgets.id }).from(budgets)
    .where(and(eq(budgets.householdId, ctx.householdId), eq(budgets.categoryId, categoryId))).limit(1);
  if (existing.length) {
    const [u] = await db.update(budgets).set({ monthlyLimit, updatedAt: new Date() })
      .where(eq(budgets.id, existing[0].id)).returning();
    return NextResponse.json({ budget: u });
  }
  const [ins] = await db.insert(budgets).values({ householdId: ctx.householdId, categoryId, monthlyLimit }).returning();
  return NextResponse.json({ budget: ins });
}

export async function DELETE(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the household owner can manage budgets' }, { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.householdId, ctx.householdId)));
  return NextResponse.json({ ok: true });
}
