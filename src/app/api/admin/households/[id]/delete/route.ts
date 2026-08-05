import { NextResponse } from 'next/server';
import { db } from '@/db';
import { households, users, transactions, transactionLines } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isSiteAdmin } from '@/lib/admin-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;
  try {
    // Delete order matters to avoid FK restrict violations:
    // 1) transactionLines (restrict on categoryId/subcategoryId)
    // 2) transactions (restrict on userId)
    // 3) users (restrict on householdId)
    // 4) household (cascade: categories, budgets, recurring, invites, audit)
    await db.delete(transactionLines).where(eq(transactionLines.householdId, id));
    await db.delete(transactions).where(eq(transactions.householdId, id));
    await db.delete(users).where(eq(users.householdId, id));
    await db.delete(households).where(eq(households.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
