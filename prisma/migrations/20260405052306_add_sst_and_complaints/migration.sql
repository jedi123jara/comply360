-- CreateEnum
CREATE TYPE "SstRecordType" AS ENUM ('POLITICA_SST', 'IPERC', 'PLAN_ANUAL', 'CAPACITACION', 'ACCIDENTE', 'INCIDENTE', 'EXAMEN_MEDICO', 'ENTREGA_EPP', 'ACTA_COMITE', 'MAPA_RIESGOS', 'SIMULACRO_EVACUACION', 'MONITOREO_AGENTES');

-- CreateEnum
CREATE TYPE "SstStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM ('HOSTIGAMIENTO_SEXUAL', 'DISCRIMINACION', 'ACOSO_LABORAL', 'OTRO');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'INVESTIGATING', 'PROTECTION_APPLIED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "sst_records" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "type" "SstRecordType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB,
    "responsible_id" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" "SstStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sst_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ComplaintType" NOT NULL,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "reporter_name" TEXT,
    "reporter_email" TEXT,
    "reporter_phone" TEXT,
    "accused_name" TEXT,
    "accused_position" TEXT,
    "description" TEXT NOT NULL,
    "evidence_urls" TEXT[],
    "status" "ComplaintStatus" NOT NULL DEFAULT 'RECEIVED',
    "assigned_to" TEXT,
    "resolution" TEXT,
    "protection_measures" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_timeline" (
    "id" TEXT NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sst_records_org_id_type_idx" ON "sst_records"("org_id", "type");

-- CreateIndex
CREATE INDEX "sst_records_org_id_status_idx" ON "sst_records"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_code_key" ON "complaints"("code");

-- CreateIndex
CREATE INDEX "complaints_org_id_status_idx" ON "complaints"("org_id", "status");

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_timeline" ADD CONSTRAINT "complaint_timeline_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
