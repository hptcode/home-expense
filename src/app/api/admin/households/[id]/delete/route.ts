import { NextResponse } from 'next/server';
import { db } from '@/db';
import { households, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isSiteAdmin } from '@/lib/admin-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;
  // Delete all users first (bypass onDelete: restrict), then household (cascade deletes everything else).
  await db.delete(users).where(eq(users.householdId, id));
  await db.delete(households).where(eq(households.id, id));
  return NextResponse.json({ ok: true });
}
