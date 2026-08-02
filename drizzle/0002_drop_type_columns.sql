-- Drop now-unused columns/enums that the UI no longer writes or reads.
-- - subcategories.type (replaced by grouping on subcategory name)
-- - transaction_lines.line_type (expense is always a plain categorized amount)
-- Idempotent: safe to re-run (guards on column/type existence).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subcategories' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.subcategories DROP COLUMN "type";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transaction_lines' AND column_name = 'line_type'
  ) THEN
    ALTER TABLE public.transaction_lines DROP COLUMN "line_type";
  END IF;
END $$;

-- Drop the now-unused enums (only if nothing references them).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subcategory_type') THEN
    EXECUTE 'DROP TYPE IF EXISTS public.subcategory_type';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'line_type') THEN
    EXECUTE 'DROP TYPE IF EXISTS public.line_type';
  END IF;
END $$;
