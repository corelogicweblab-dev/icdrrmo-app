-- Recovery: ensure PNP/BFP exist if 20260521160000 failed mid-deploy on Render
-- prisma-migrate-disable-transaction
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'PNP'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'PNP';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'BFP'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'BFP';
  END IF;
END $$;
