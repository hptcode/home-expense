import { db } from '@/db';
import { categories, subcategories } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export type CleanLine = {
  categoryId: string;
  subcategoryId: string | null;
  amount: number;
};

// Validates raw line input against the household's categories/subcategories and
// returns clean lines (categoryId + subcategoryId + integer cents).
// Throws Error with a user-facing message on any validation failure.
export async function validateAndBuildLines(lines: any, householdId: string): Promise<CleanLine[]> {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('at least one line is required');
  }
  const cats = await db
    .select()
    .from(categories)
    .where(and(eq(categories.householdId, householdId), isNull(categories.deletedAt)));
  const subs = await db
    .select()
    .from(subcategories)
    .where(and(eq(subcategories.householdId, householdId), isNull(subcategories.deletedAt)));

  const catIds = new Set(cats.map((c) => c.id));
  const subsByCat = new Map<string, string[]>();
  for (const s of subs) {
    const arr = subsByCat.get(s.categoryId) ?? [];
    arr.push(s.id);
    subsByCat.set(s.categoryId, arr);
  }

  const clean: CleanLine[] = [];
  for (const ln of lines) {
    const catId = ln.categoryId;
    if (!catIds.has(catId)) throw new Error('invalid category');

    const hasSubs = (subsByCat.get(catId)?.length ?? 0) > 0;
    let subId: string | null = ln.subcategoryId ?? null;
    // Required-when-exist: if the category has subcategories, one must be chosen.
    if (hasSubs && !subId) throw new Error('category requires a subcategory');
    if (subId && !subs.some((s) => s.id === subId && s.categoryId === catId)) {
      throw new Error('invalid subcategory for category');
    }

    const amount = Number(ln.amount);
    if (!Number.isInteger(amount)) throw new Error('amount must be integer minor units (cents)');

    clean.push({ categoryId: catId, subcategoryId: subId, amount });
  }
  return clean;
}
