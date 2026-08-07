import { NextResponse } from 'next/server';
import { db } from '@/db';
import { households, users, transactions, transactionLines, recurringRules, invites, authTokens, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isSiteAdmin } from '@/lib/admin-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;
  try {
    // Delete order matters to avoid FK restrict violations:
    // 1) transactionLines (restrict on categoryId/subcategoryId)
    // 2) recurring rules (restrict on userId)
    // 3) transactions (restrict on userId)
    // 4) users (restrict on householdId)
    // 5) household (cascade: categories, budgets, invites, audit)
    await db.delete(transactionLines).where(eq(transactionLines.householdId, id));
    await db.delete(recurringRules).where(eq(recurringRules.householdId, id));
    await db.delete(invites).where(eq(invites.householdId, id));
    const householdUsers = await db.select({ id: users.id }).from(users).where(eq(users.householdId, id));
    for (const u of householdUsers) {
      await db.delete(authTokens).where(eq(authTokens.userId, u.id));
      await db.delete(sessions).where(eq(sessions.userId, u.id));
    }
    await db.delete(transactions).where(eq(transactions.householdId, id));
    await db.delete(users).where(eq(users.householdId, id));
    await db.delete(households).where(eq(households.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
