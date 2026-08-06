import { NextResponse } from 'next/server';
import { db } from '@/db';
import { recurringRules, transactions, transactionLines } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const rows = await db.select().from(recurringRules)
    .where(and(eq(recurringRules.householdId, ctx.householdId), isNull(recurringRules.deletedAt)));
  return NextResponse.json({ rules: rows });
}

export async function POST(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the owner' }, { status: 403 });
  const body = await req.json();
  if (!body.categoryId || !body.amount || !body.frequency) {
    return NextResponse.json({ error: 'categoryId, amount, frequency required' }, { status: 400 });
  }
  const [rule] = await db.insert(recurringRules).values({
    householdId: ctx.householdId,
    userId: ctx.userId,
    categoryId: body.categoryId,
    subcategoryId: body.subcategoryId || null,
    direction: body.direction || 'expense',
    amount: Math.round(parseFloat(body.amount) * 100),
    merchant: body.merchant || null,
    frequency: body.frequency,
    intervalN: body.intervalN || 1,
    anchorDate: body.anchorDate || new Date().toISOString().slice(0, 10),
    endDate: body.endDate || null,
  }).returning();
  // Immediately materialize the first occurrence.
  const today = new Date().toISOString().slice(0, 10);
  const startDate = body.anchorDate || today;
  if (startDate <= today) {
    const [tx] = await db.insert(transactions).values({
      householdId: rule.householdId,
      userId: rule.userId,
      direction: rule.direction,
      merchant: rule.merchant ?? '(recurring)',
      transactedAt: new Date(startDate),
    }).returning();
    await db.insert(transactionLines).values({
      transactionId: tx.id,
      householdId: rule.householdId,
      categoryId: body.categoryId,
      subcategoryId: body.subcategoryId || null,
      amount: rule.amount,
    });
  }
  return NextResponse.json({ rule });
}

export async function DELETE(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the owner' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.update(recurringRules).set({ deletedAt: new Date() }).where(eq(recurringRules.id, id));
  return NextResponse.json({ ok: true });
}
