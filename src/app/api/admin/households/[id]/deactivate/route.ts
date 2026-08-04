import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { isSiteAdmin } from '@/lib/admin-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;
  await db.update(users).set({ deletedAt: new Date() }).where(and(eq(users.householdId, id), isNull(users.deletedAt)));
  return NextResponse.json({ ok: true });
}
