import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { hashPassword } from '@/lib/password';
import { eq } from 'drizzle-orm';
import { isSiteAdmin } from '@/lib/admin-auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;
  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;
  const { role } = await req.json();
  if (!['owner', 'admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }
  await db.update(users).set({ role }).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}


export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSiteAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;
  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'password must be at least 8 characters' }, { status: 400 });
  }
  await db.update(users).set({ passwordHash: await hashPassword(password), deletedAt: null }).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
