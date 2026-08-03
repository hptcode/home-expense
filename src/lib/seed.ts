import { db } from '../db';
import { categories } from '../db/schema';

// Sensible default categories seeded when a Household is created (ADR glossary:
// "Seeded with defaults on Household creation"). No subcategories are seeded, so
// the subcategory field stays optional until the Owner adds some (required-when-exist).
export const DEFAULT_CATEGORIES: { name: string; direction: 'income' | 'expense' }[] = [
  { name: 'Housing', direction: 'expense' },
  { name: 'Food', direction: 'expense' },
  { name: 'Transport', direction: 'expense' },
  { name: 'Utilities', direction: 'expense' },
  { name: 'Insurance', direction: 'expense' },
  { name: 'Entertainment', direction: 'expense' },
  { name: 'Health', direction: 'expense' },
  { name: 'Shopping', direction: 'expense' },
  { name: 'Other Expense', direction: 'expense' },
  { name: 'Salary', direction: 'income' },
  { name: 'Other Income', direction: 'income' },
];

// Names that are always income, used to backfill older households whose
// seeded categories were created before direction was tracked.
export const INCOME_CATEGORY_NAMES = new Set(['Salary', 'Other Income']);

export async function seedDefaultCategories(householdId: string): Promise<void> {
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((c) => ({ householdId, name: c.name, direction: c.direction, isDefault: true })),
  );
}
