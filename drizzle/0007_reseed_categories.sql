-- Add new expense categories + income categories to all existing households (idempotent).
-- Existing categories with data are preserved; the user can delete unused ones from Manage.
INSERT INTO public.categories (household_id, name, direction, is_default, created_at)
SELECT h.id, c.name, c.dir::direction, true, NOW()
FROM public.households h
CROSS JOIN (VALUES
  ('Dining', 'expense'), ('Education', 'expense'), ('Recreation', 'expense'), ('Groceries', 'expense'),
  ('Health', 'expense'), ('Home Improvement', 'expense'), ('Home Supplies', 'expense'),
  ('Personal Finance', 'expense'), ('Shopping', 'expense'), ('Transport', 'expense'),
  ('Utilities', 'expense'), ('Gifts', 'expense'), ('Other', 'expense'),
  ('Salary', 'income'), ('Other Income', 'income')
) AS c(name, dir)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories cat
  WHERE cat.household_id = h.id AND cat.name = c.name
);
