import { NextResponse } from 'next/server';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

export async function POST(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the owner can manage categories' }, { status: 403 });
  const { name } = await req.json();
  if (!name || !name.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  try {
    const [c] = await db.insert(categories).values({ householdId: ctx.householdId, name: name.trim() }).returning();
    return NextResponse.json({ category: c });
  } catch {
    return NextResponse.json({ error: 'category name already exists' }, { status: 409 });
  }
}

export async function DELETE(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the owner can manage categories' }, { status: 403 });
  const id = new URL(req.url).searchParams?.get('id') ?? new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  // Soft delete (respect tenant boundary).
  await db.update(categories).set({ deletedAt: new Date() }).where(and(eq(categories.id, id), eq(categories.householdId, ctx.householdId)));
  return NextResponse.json({ ok: true });
}
