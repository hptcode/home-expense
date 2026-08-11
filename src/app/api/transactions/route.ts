import { NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions, transactionLines, categories } from '@/db/schema';
import { eq, and, isNull, inArray, desc, sql } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';
import { validateAndBuildLines } from '@/lib/transaction-lines';

export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const txns = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.householdId, ctx.householdId), isNull(transactions.deletedAt)))
    .orderBy(desc(transactions.createdAt))
    .limit(100);

  const ids = txns.map((t) => t.id);
  // Ignore soft-deleted lines (e.g. after an edit replaces them).
  const lines = ids.length
    ? await db
        .select()
        .from(transactionLines)
        .where(
          and(
            eq(transactionLines.householdId, ctx.householdId),
            inArray(transactionLines.transactionId, ids),
            isNull(transactionLines.deletedAt),
          ),
        )
    : [];

  const byTx: Record<string, any[]> = {};
  for (const l of lines) (byTx[l.transactionId] ??= []).push(l);

  // Sum of line amounts (cents) per transaction, plus the first line's category.
  const summary = ids.length
    ? await db
        .select({
          transactionId: transactionLines.transactionId,
          total: sql<number>`coalesce(sum(${transactionLines.amount}),0)`,
          categoryName: categories.name,
        })
        .from(transactionLines)
        .leftJoin(categories, eq(transactionLines.categoryId, categories.id))
        .where(and(eq(transactionLines.householdId, ctx.householdId), inArray(transactionLines.transactionId, ids), isNull(transactionLines.deletedAt)))
        .groupBy(transactionLines.transactionId, categories.name)
    : [];
  const sumById: Record<string, { total: number; categoryName: string }> = {};
  for (const r of summary) {
    const cur = sumById[r.transactionId] ?? { total: 0, categoryName: '' };
    cur.total += Number(r.total);
    if (!cur.categoryName && r.categoryName) cur.categoryName = r.categoryName;
    sumById[r.transactionId] = cur;
  }

  const data = txns.map((t) => ({
    ...t,
    lines: byTx[t.id] ?? [],
    total: sumById[t.id]?.total ?? 0,
    categoryName: sumById[t.id]?.categoryName ?? '',
  }));
  return NextResponse.json({ transactions: data });
}

export async function POST(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json();
  const direction = body.direction;
  if (direction !== 'income' && direction !== 'expense') {
    return NextResponse.json({ error: 'direction must be income|expense' }, { status: 400 });
  }

  let cleanLines;
  try {
    cleanLines = await validateAndBuildLines(body.lines, ctx.householdId);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const receiptTotal = body.receiptTotal == null ? null : Number(body.receiptTotal);
  if (receiptTotal != null && !Number.isInteger(receiptTotal)) {
    return NextResponse.json({ error: 'receiptTotal must be integer minor units' }, { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    const [txn] = await tx
      .insert(transactions)
      .values({
        householdId: ctx.householdId,
        userId: ctx.userId,
        direction,
        merchant: body.merchant ?? null,
        transactedAt: body.transactedAt ? new Date(body.transactedAt) : new Date(),
        receiptTotal,
        note: body.note ?? null,
      })
      .returning();
    await tx
      .insert(transactionLines)
      .values(cleanLines.map((l) => ({ ...l, transactionId: txn.id, householdId: ctx.householdId })));
    return txn;
  });

  return NextResponse.json({ ok: true, id: result.id });
}
