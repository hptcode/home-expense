import { NextResponse } from 'next/server';
import { db } from '@/db';
import { households, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isSiteAdmin } from '@/lib/admin-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;
  try {
    // Delete all users first (bypass onDelete: restrict), then household (cascade deletes everything else).
    const deletedUsers = await db.delete(users).where(eq(users.householdId, id));
    const deletedHh = await db.delete(households).where(eq(households.id, id));
    console.error('[admin delete] deleted users:', deletedUsers, 'households:', deletedHh);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin delete] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
