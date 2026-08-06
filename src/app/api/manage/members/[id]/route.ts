import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the household owner' }, { status: 403 });
  const { id } = await params;
  if (id === ctx.userId) return NextResponse.json({ error: 'cannot delete yourself' }, { status: 400 });
  // Soft-delete the user so their data stays, but they can't log in.
  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}