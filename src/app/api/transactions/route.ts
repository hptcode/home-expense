import { NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions, transactionLines, categories, subcategories } from '@/db/schema';
import { eq, and, isNull, inArray, desc } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

const LINE_TYPES = ['item', 'tax', 'discount', 'deposit'] as const;

export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const txns = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.householdId, ctx.householdId), isNull(transactions.deletedAt)))
    .orderBy(desc(transactions.transactedAt))
    .limit(100);

  const ids = txns.map((t) => t.id);
  const lines = ids.length
    ? await db
        .select()
        .from(transactionLines)
        .where(and(eq(transactionLines.householdId, ctx.householdId), inArray(transactionLines.transactionId, ids)))
    : [];

  const byTx: Record<string, any[]> = {};
  for (const l of lines) (byTx[l.transactionId] ??= []).push(l);

  const data = txns.map((t) => ({ ...t, lines: byTx[t.id] ?? [] }));
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

  const lines = body.lines;
  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: 'at least one line is required' }, { status: 400 });
  }

  // Load the household's categories + subcategories to validate against.
  const cats = await db
    .select()
    .from(categories)
    .where(and(eq(categories.householdId, ctx.householdId), isNull(categories.deletedAt)));
  const subs = await db
    .select()
    .from(subcategories)
    .where(and(eq(subcategories.householdId, ctx.householdId), isNull(subcategories.deletedAt)));

  const catIds = new Set(cats.map((c) => c.id));
  const subsByCat = new Map<string, string[]>();
  for (const s of subs) {
    const arr = subsByCat.get(s.categoryId) ?? [];
    arr.push(s.id);
    subsByCat.set(s.categoryId, arr);
  }

  const cleanLines: any[] = [];
  for (const ln of lines) {
    const catId: string = ln.categoryId;
    if (!catIds.has(catId)) return NextResponse.json({ error: 'invalid category' }, { status: 400 });

    const hasSubs = (subsByCat.get(catId)?.length ?? 0) > 0;
    let subId: string | null = ln.subcategoryId ?? null;

    // Required-when-exist rule (glossary): if the category has subcategories, one must be chosen.
    if (hasSubs && !subId) {
      return NextResponse.json({ error: `category requires a subcategory` }, { status: 400 });
    }
    if (subId && !subs.some((s) => s.id === subId && s.categoryId === catId)) {
      return NextResponse.json({ error: 'invalid subcategory for category' }, { status: 400 });
    }

    const amount = Number(ln.amount);
    if (!Number.isInteger(amount)) {
      return NextResponse.json({ error: 'amount must be integer minor units (cents)' }, { status: 400 });
    }

    const lineType = (ln.lineType ?? 'item') as string;
    if (!LINE_TYPES.includes(lineType as any)) {
      return NextResponse.json({ error: 'invalid line_type' }, { status: 400 });
    }

    cleanLines.push({ categoryId: catId, subcategoryId: subId, amount, lineType });
  }

  const receiptTotal = body.receiptTotal == null ? null : Number(body.receiptTotal);
  if (receiptTotal != null && !Number.isInteger(receiptTotal)) {
    return NextResponse.json({ error: 'receiptTotal must be integer minor units' }, { status: 400 });
  }

  // Insert header + lines atomically, both scoped to the household.
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
    await tx.insert(transactionLines).values(
      cleanLines.map((l) => ({ ...l, transactionId: txn.id, householdId: ctx.householdId })),
    );
    return txn;
  });

  return NextResponse.json({ ok: true, id: result.id });
}
