import { NextResponse } from 'next/server';
import { db } from '@/db';
import { categories, subcategories } from '@/db/schema';
import { INCOME_CATEGORY_NAMES } from '@/lib/seed';
import { eq, and, isNull, asc, sql } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const dirRank = (col: any) => sql`CASE WHEN ${col} = 'income' THEN 1 ELSE 0 END`;
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.householdId, ctx.householdId), isNull(categories.deletedAt)))
    .orderBy(dirRank(categories.direction), asc(categories.name));
  const subRows = await db
    .select()
    .from(subcategories)
    .where(and(eq(subcategories.householdId, ctx.householdId), isNull(subcategories.deletedAt)))
    .orderBy(dirRank(subcategories.direction), asc(subcategories.name));
  const byCat = new Map<string, any[]>();
  for (const s of subRows) {
    const arr = byCat.get(s.categoryId) ?? [];
    arr.push(s);
    byCat.set(s.categoryId, arr);
  }
  const cats = rows.map((c) => ({ id: c.id, name: c.name, direction: (INCOME_CATEGORY_NAMES.has(c.name) ? 'income' : c.direction), subcategories: (byCat.get(c.id) ?? []).map((s) => ({ id: s.id, name: s.name, direction: s.direction })) }));
  return NextResponse.json({ categories: cats });
}

export async function POST(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the owner can manage categories' }, { status: 403 });
  const body = await req.json();
  const name = body.name;
  if (!name || !name.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const dir = (body.direction === 'income' || body.direction === 'expense') ? body.direction : 'expense';
  const trimmed = name.trim();
  // If a soft-deleted category with this name exists, un-delete it instead of inserting new.
  const [deleted] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.householdId, ctx.householdId), eq(categories.name, trimmed)))
    .limit(1);
  if (deleted) {
    const [c] = await db.update(categories).set({ deletedAt: null, direction: dir }).where(eq(categories.id, deleted.id)).returning();
    return NextResponse.json({ category: c });
  }
  const [c] = await db.insert(categories).values({ householdId: ctx.householdId, name: trimmed, direction: dir }).returning();
  return NextResponse.json({ category: c });
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

export async function PUT(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (ctx.role !== 'owner') return NextResponse.json({ error: 'only the owner can manage categories' }, { status: 403 });
  const { id, name } = await req.json();
  if (!id || !name || !name.trim()) return NextResponse.json({ error: 'id + name required' }, { status: 400 });
  try {
    const [cat] = await db.update(categories).set({ name: name.trim() })
      .where(and(eq(categories.id, id), eq(categories.householdId, ctx.householdId))).returning();
    return NextResponse.json({ category: cat });
  } catch {
    return NextResponse.json({ error: 'category name already exists' }, { status: 409 });
  }
}
