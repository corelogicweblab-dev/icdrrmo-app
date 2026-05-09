-- CreateEnum
CREATE TYPE "VehicleFleetStatus" AS ENUM ('AVAILABLE', 'DEPLOYED', 'UNDER_MAINTENANCE');

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN "fleet_status" "VehicleFleetStatus" NOT NULL DEFAULT 'AVAILABLE';
