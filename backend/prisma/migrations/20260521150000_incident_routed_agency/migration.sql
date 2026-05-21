-- CreateEnum
CREATE TYPE "RoutedAgency" AS ENUM ('BFP', 'PNP', 'ICDRRMO_MEDICAL', 'ICDRRMO_OPS');

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN "routed_agency" "RoutedAgency",
ADD COLUMN "routed_agency_override" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "incidents_routed_agency_status_idx" ON "incidents"("routed_agency", "status");
