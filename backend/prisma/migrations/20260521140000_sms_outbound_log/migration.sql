CREATE TYPE "SmsOutboundStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'DEAD_LETTER');

CREATE TABLE "sms_outbound_logs" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT,
    "to_phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SmsOutboundStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "gateway_response" TEXT,
    "last_error" TEXT,
    "job_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "sms_outbound_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sms_outbound_logs_incident_id_created_at_idx" ON "sms_outbound_logs"("incident_id", "created_at" DESC);
CREATE INDEX "sms_outbound_logs_status_created_at_idx" ON "sms_outbound_logs"("status", "created_at" DESC);

ALTER TABLE "sms_outbound_logs" ADD CONSTRAINT "sms_outbound_logs_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
