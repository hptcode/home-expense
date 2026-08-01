import { NextResponse } from 'next/server';
import { db } from '@/db';
import { categories, subcategories } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getAuthContext } from '@/auth/current-user';

export async function GET(req: Request) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const cats = await db
    .select()
    .from(categories)
    .where(and(eq(categories.householdId, ctx.householdId), isNull(categories.deletedAt)))
    .orderBy(categories.name);

  const subs = await db
    .select()
    .from(subcategories)
    .where(and(eq(subcategories.householdId, ctx.householdId), isNull(subcategories.deletedAt)));

  const data = cats.map((c) => ({
    id: c.id,
    name: c.name,
    subcategories: subs
      .filter((s) => s.categoryId === c.id)
      .map((s) => ({ id: s.id, name: s.name, type: s.type })),
  }));

  return NextResponse.json({ categories: data });
}
