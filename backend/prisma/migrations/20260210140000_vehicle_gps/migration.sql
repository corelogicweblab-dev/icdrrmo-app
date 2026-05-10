-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "latitude" DECIMAL(10,7),
ADD COLUMN "longitude" DECIMAL(10,7),
ADD COLUMN "last_location_at" TIMESTAMP(3);
