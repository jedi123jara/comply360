-- Generador de Contratos — Chunk 7: Generación masiva de contratos
-- Audit trail de cada bulk-generate. El proceso real corre síncrono;
-- el modelo existe para trazabilidad y para futuras corridas con BullMQ.

-- CreateEnum
CREATE TYPE "BulkJobStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "bulk_contract_jobs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "status" "BulkJobStatus" NOT NULL DEFAULT 'QUEUED',
    "contract_type" TEXT NOT NULL,
    "template_id" TEXT,
    "source_file_name" TEXT,
    "total_rows" INTEGER NOT NULL,
    "succeeded_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "zip_sha256" TEXT,
    "zip_byte_length" INTEGER,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_contract_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bulk_contract_jobs_org_id_status_idx" ON "bulk_contract_jobs"("org_id", "status");

-- CreateIndex
CREATE INDEX "bulk_contract_jobs_org_id_created_at_idx" ON "bulk_contract_jobs"("org_id", "created_at");
