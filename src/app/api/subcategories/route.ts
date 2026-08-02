import { NextResponse } from 'next/server';
import { db } from '@/db';
import { subcategories, categories } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

export async function POST(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the owner can manage subcategories' }, { status: 403 });
  const body = await req.json();
  const { categoryId, name } = body;
  if (!categoryId || !name || !name.trim()) return NextResponse.json({ error: 'categoryId + name required' }, { status: 400 });
  // Default the subcategory's direction to its parent category's direction.
  const parent = await db.select({ direction: categories.direction }).from(categories).where(eq(categories.id, categoryId)).limit(1);
  const dir = (body.direction === 'income' || body.direction === 'expense')
    ? body.direction
    : (parent[0]?.direction ?? 'expense');
  try {
    const [s] = await db.insert(subcategories).values({
      householdId: ctx.householdId,
      categoryId,
      name: name.trim(),
      direction: dir,
    }).returning();
    return NextResponse.json({ subcategory: s });
  } catch {
    return NextResponse.json({ error: 'could not add subcategory' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the owner can manage subcategories' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.update(subcategories).set({ deletedAt: new Date() }).where(and(eq(subcategories.id, id), eq(subcategories.householdId, ctx.householdId)));
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the owner can manage subcategories' }, { status: 403 });
  const { id, name } = await req.json();
  if (!id || !name || !name.trim()) return NextResponse.json({ error: 'id + name required' }, { status: 400 });
  try {
    const [sub] = await db.update(subcategories).set({ name: name.trim() })
      .where(and(eq(subcategories.id, id), eq(subcategories.householdId, ctx.householdId))).returning();
    return NextResponse.json({ subcategory: sub });
  } catch {
    return NextResponse.json({ error: 'subcategory name already exists in this category' }, { status: 409 });
  }
}
