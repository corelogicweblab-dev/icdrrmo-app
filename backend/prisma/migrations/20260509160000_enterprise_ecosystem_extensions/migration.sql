-- Enterprise ecosystem extensions: GIS/evacuation, dispatch lifecycle, voice audit trail, push tokens, profile gender.

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('UNSPECIFIED', 'MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_SAY');

-- CreateEnum
CREATE TYPE "DispatchAssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VoiceProvider" AS ENUM ('WEBRTC', 'AGORA', 'PSTN_BRIDGE');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB', 'UNKNOWN');

-- AlterEnum (append — matches Prisma order OFF_DUTY then UNAVAILABLE)
ALTER TYPE "ResponderStatus" ADD VALUE 'UNAVAILABLE';

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "gender" "Gender" NOT NULL DEFAULT 'UNSPECIFIED';

-- CreateTable
CREATE TABLE "evacuation_centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barangay_id" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "capacity" INTEGER,
    "occupancy" INTEGER NOT NULL DEFAULT 0,
    "contact_phone" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "geometry_geojson" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evacuation_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_assignments" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "responder_id" TEXT,
    "vehicle_id" TEXT,
    "assigned_by_id" TEXT,
    "status" "DispatchAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "dispatched_at" TIMESTAMP(3),
    "arrived_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_call_logs" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT,
    "initiator_user_id" TEXT,
    "participant_user_id" TEXT,
    "provider" "VoiceProvider" NOT NULL DEFAULT 'WEBRTC',
    "room_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL DEFAULT 'UNKNOWN',
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "evacuation_centers_barangay_id_idx" ON "evacuation_centers"("barangay_id");

-- CreateIndex
CREATE INDEX "evacuation_centers_is_active_idx" ON "evacuation_centers"("is_active");

-- CreateIndex
CREATE INDEX "dispatch_assignments_incident_id_status_idx" ON "dispatch_assignments"("incident_id", "status");

-- CreateIndex
CREATE INDEX "dispatch_assignments_responder_id_idx" ON "dispatch_assignments"("responder_id");

-- CreateIndex
CREATE INDEX "voice_call_logs_incident_id_idx" ON "voice_call_logs"("incident_id");

-- CreateIndex
CREATE INDEX "voice_call_logs_room_id_idx" ON "voice_call_logs"("room_id");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "evacuation_centers" ADD CONSTRAINT "evacuation_centers_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_responder_id_fkey" FOREIGN KEY ("responder_id") REFERENCES "responders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_call_logs" ADD CONSTRAINT "voice_call_logs_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_call_logs" ADD CONSTRAINT "voice_call_logs_initiator_user_id_fkey" FOREIGN KEY ("initiator_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_call_logs" ADD CONSTRAINT "voice_call_logs_participant_user_id_fkey" FOREIGN KEY ("participant_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
