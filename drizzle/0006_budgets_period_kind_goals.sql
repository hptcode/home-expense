-- Extend budgets: monthly/yearly period, limit/goal kind, nullable category (savings goals),
-- and rename monthly_limit -> amount.
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS "period" varchar(12) NOT NULL DEFAULT 'monthly';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS "kind" varchar(12) NOT NULL DEFAULT 'limit';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS "amount" integer NOT NULL DEFAULT 0;
UPDATE public.budgets SET "amount" = COALESCE("monthly_limit", 0) WHERE "amount" = 0;
ALTER TABLE public.budgets ALTER COLUMN "category_id" DROP NOT NULL;
ALTER TABLE public.budgets DROP COLUMN IF EXISTS "monthly_limit";
