-- Optional street / purok line for citizen addressing (alongside barangay).
ALTER TABLE "user_profiles" ADD COLUMN "street_purok" TEXT;
