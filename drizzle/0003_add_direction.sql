-- Add an Expense/Income direction to categories and subcategories so dropdowns
-- can be grouped expense-first, then income. Idempotent / safe to re-run.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS "direction" direction NOT NULL DEFAULT 'expense';

ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS "direction" direction NOT NULL DEFAULT 'expense';
