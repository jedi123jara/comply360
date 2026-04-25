-- CreateEnum
CREATE TYPE "ComplaintSeverity" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "ComplaintUrgency" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'INMEDIATA');

-- AlterTable
ALTER TABLE "complaints"
  ADD COLUMN "severity_ai" "ComplaintSeverity",
  ADD COLUMN "urgency_ai" "ComplaintUrgency",
  ADD COLUMN "triage_json" JSONB,
  ADD COLUMN "triaged_at" TIMESTAMP(3),
  ADD COLUMN "triage_version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "complaints_org_id_severity_ai_idx" ON "complaints"("org_id", "severity_ai");
