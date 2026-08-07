import { NextResponse } from 'next/server';
import { db } from '@/db';
import { recurringRules, transactions, transactionLines } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

function advanceDate(iso: string, frequency: string, intervalN: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  if (frequency === 'daily') d.setUTCDate(d.getUTCDate() + intervalN);
  else if (frequency === 'weekly') d.setUTCDate(d.getUTCDate() + 7 * intervalN);
  else if (frequency === 'monthly') d.setUTCMonth(d.getUTCMonth() + intervalN);
  else if (frequency === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + intervalN);
  return d.toISOString().slice(0, 10);
}

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
  // Backfill: materialize all missed occurrences from start date up to today.
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const startStr = body.anchorDate || todayStr;
  const start = new Date(startStr);
  start.setHours(0, 0, 0, 0);
  let created = 0;
  let nextDate = new Date(start);
  while (nextDate <= today) {
    const dateStr = nextDate.toISOString().slice(0, 10);
    // Skip if this date is past the end date
    if (body.endDate && dateStr > body.endDate) break;
    const [tx] = await db.insert(transactions).values({
      householdId: rule.householdId,
      userId: rule.userId,
      direction: rule.direction,
      merchant: rule.merchant ?? '(recurring)',
      transactedAt: new Date(dateStr),
    }).returning();
    await db.insert(transactionLines).values({
      transactionId: tx.id,
      householdId: rule.householdId,
      categoryId: body.categoryId,
      subcategoryId: body.subcategoryId || null,
      amount: rule.amount,
    });
    created++;
    nextDate = new Date(advanceDate(nextDate.toISOString().slice(0, 10), body.frequency, body.intervalN || 1) + 'T00:00:00Z');
  }
  // Update anchorDate to the next future occurrence.
  if (created > 0) {
    const nextStr = nextDate.toISOString().slice(0, 10);
    await db.update(recurringRules).set({ anchorDate: nextStr }).where(eq(recurringRules.id, rule.id));
  }
  return NextResponse.json({ rule, created });
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
