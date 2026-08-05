-- Add new expense categories to all existing households (idempotent).
-- Existing categories with data are preserved; the user can delete unused ones from Manage.
INSERT INTO public.categories (household_id, name, direction, is_default, created_at)
SELECT h.id, c.name, 'expense'::direction, true, NOW()
FROM public.households h
CROSS JOIN (VALUES
  ('Dining'), ('Education'), ('Recreation'), ('Groceries'),
  ('Health'), ('Home Improvement'), ('Home Supplies'),
  ('Personal Finance'), ('Shopping'), ('Transport'),
  ('Utilities'), ('Gifts'), ('Other')
) AS c(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories cat
  WHERE cat.household_id = h.id AND cat.name = c.name
);
