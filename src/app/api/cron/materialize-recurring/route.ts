import { NextResponse } from 'next/server';
import { db } from '@/db';
import { recurringRules, transactions, transactionLines } from '@/db/schema';
import { eq, and, lte, gte, isNull } from 'drizzle-orm';

// Frequency multipliers (in days)
const FREQ_DAYS: Record<string, number> = {
  daily: 1, weekly: 7, monthly: 30, yearly: 365,
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = new URL(req.url).searchParams.get('secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const due = await db
    .select()
    .from(recurringRules)
    .where(and(
      eq(recurringRules.isActive, true),
      lte(recurringRules.anchorDate, todayStr),
      isNull(recurringRules.deletedAt),
    ));

  let created = 0;
  for (const rule of due) {
    if (rule.endDate && rule.endDate < todayStr) {
      await db.update(recurringRules).set({ isActive: false }).where(eq(recurringRules.id, rule.id));
      continue;
    }

    const nextStr = advanceDate(rule.anchorDate, rule.frequency, rule.intervalN);
    if (rule.endDate && nextStr > rule.endDate) {
      await db.update(recurringRules).set({ isActive: false }).where(eq(recurringRules.id, rule.id));
      continue;
    }

    // Create the transaction at the anchor date
    const [tx] = await db.insert(transactions).values({
      householdId: rule.householdId,
      userId: rule.userId,
      direction: rule.direction,
      merchant: rule.merchant ?? '(recurring)',
      transactedAt: new Date(rule.anchorDate),
    }).returning();

    await db.insert(transactionLines).values({
      transactionId: tx.id,
      householdId: rule.householdId,
      categoryId: rule.categoryId,
      subcategoryId: rule.subcategoryId,
      amount: rule.amount,
    });

    await db.update(recurringRules).set({
      lastMaterializedAt: new Date(),
      anchorDate: nextStr,
    }).where(eq(recurringRules.id, rule.id));
    created++;
  }

  return NextResponse.json({ ok: true, created });
}
