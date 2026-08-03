-- Backfill direction for seeded income categories created before direction was tracked.
UPDATE public.categories SET "direction" = 'income'
WHERE "name" IN ('Salary', 'Other Income') AND "direction" <> 'income';
