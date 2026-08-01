import { db } from '../db';
import { categories } from '../db/schema';

// Sensible default categories seeded when a Household is created (ADR glossary:
// "Seeded with defaults on Household creation"). No subcategories are seeded, so
// the subcategory field stays optional until the Owner adds some (required-when-exist).
export const DEFAULT_CATEGORIES = [
  'Housing', 'Food', 'Transport', 'Utilities', 'Insurance',
  'Entertainment', 'Health', 'Shopping', 'Other Expense',
  'Salary', 'Other Income',
];

export async function seedDefaultCategories(householdId: string): Promise<void> {
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((name) => ({ householdId, name, isDefault: true })),
  );
}
