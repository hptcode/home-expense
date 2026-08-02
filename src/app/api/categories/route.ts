import { NextResponse } from 'next/server';
import { db } from '@/db';
import { categories, subcategories } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.householdId, ctx.householdId), isNull(categories.deletedAt)))
    .orderBy(asc(categories.name));
  const subRows = await db
    .select()
    .from(subcategories)
    .where(and(eq(subcategories.householdId, ctx.householdId), isNull(subcategories.deletedAt)))
    .orderBy(asc(subcategories.name));
  const byCat = new Map<string, any[]>();
  for (const s of subRows) {
    const arr = byCat.get(s.categoryId) ?? [];
    arr.push(s);
    byCat.set(s.categoryId, arr);
  }
  const cats = rows.map((c) => ({ ...c, subcategories: byCat.get(c.id) ?? [] }));
  return NextResponse.json({ categories: cats });
}

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
