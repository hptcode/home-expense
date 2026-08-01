import { NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions, transactionLines } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';
import { validateAndBuildLines } from '@/lib/transaction-lines';

// Both handlers scope strictly by householdId so a user can never touch another
// household's transaction (ADR-0001). The row must also not be soft-deleted.

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { id } = await params;
  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.householdId, ctx.householdId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = await req.json();
  if (body.direction !== undefined && body.direction !== 'income' && body.direction !== 'expense') {
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

  // Replace lines atomically: soft-delete old lines, insert new ones.
  try {
    await db.transaction(async (tx) => {
    await tx
      .update(transactionLines)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(transactionLines.transactionId, id),
          eq(transactionLines.householdId, ctx.householdId),
          isNull(transactionLines.deletedAt),
        ),
      );
    await tx
      .insert(transactionLines)
      .values(cleanLines.map((l) => ({ ...l, transactionId: id, householdId: ctx.householdId })));
    await tx
      .update(transactions)
      .set({
        direction: body.direction ?? undefined,
        merchant: body.merchant ?? null,
        transactedAt: body.transactedAt ? new Date(body.transactedAt) : undefined,
        receiptTotal,
        note: body.note ?? null,
      })
      .where(eq(transactions.id, id));
    });
  } catch (e: any) {
    console.error('PATCH /api/transactions/[id] failed:', e);
    return NextResponse.json({ error: e?.message || 'update failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { id } = await params;
  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.householdId, ctx.householdId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Soft delete (ADR glossary): set deletedAt on header + lines; audit log the action.
  await db.transaction(async (tx) => {
    await tx
      .update(transactionLines)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(transactionLines.transactionId, id),
          eq(transactionLines.householdId, ctx.householdId),
          isNull(transactionLines.deletedAt),
        ),
      );
    await tx
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(eq(transactions.id, id));
    await tx.insert(auditLog).values({
      householdId: ctx.householdId,
      actorUserId: ctx.userId,
      action: 'transaction.delete',
      detail: { transactionId: id },
    });
  });

  return NextResponse.json({ ok: true });
}

// local import to avoid circular concerns at top
import { auditLog } from '@/db/schema';
