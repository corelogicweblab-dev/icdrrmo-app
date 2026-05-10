-- CreateEnum
CREATE TYPE "ProfileAvailabilityStatus" AS ENUM ('ACTIVE', 'STANDBY', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "availability_status" "ProfileAvailabilityStatus" NOT NULL DEFAULT 'ACTIVE';
