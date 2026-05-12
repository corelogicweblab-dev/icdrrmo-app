-- EOC-set flood / red-zone flags for citizen push alerts
ALTER TABLE "barangays" ADD COLUMN "ops_flood_active" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "barangays" ADD COLUMN "ops_flood_message" TEXT;
ALTER TABLE "barangays" ADD COLUMN "ops_red_zone_active" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "barangays" ADD COLUMN "ops_red_zone_message" TEXT;
ALTER TABLE "barangays" ADD COLUMN "ops_hazard_updated_at" TIMESTAMP(3);
