-- CreateEnum
CREATE TYPE "ComplianceTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "InfracGravedad" AS ENUM ('LEVE', 'GRAVE', 'MUY_GRAVE');

-- CreateTable
CREATE TABLE "compliance_tasks" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "diagnostic_id" TEXT,
    "source_id" TEXT,
    "area" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "base_legal" TEXT,
    "gravedad" "InfracGravedad" NOT NULL DEFAULT 'LEVE',
    "multa_evitable" DECIMAL(12,2),
    "plazo_sugerido" TEXT,
    "due_date" TIMESTAMP(3),
    "assigned_to" TEXT,
    "status" "ComplianceTaskStatus" NOT NULL DEFAULT 'PENDING',
    "evidence_url" TEXT,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_tasks_org_id_status_idx" ON "compliance_tasks"("org_id", "status");

-- CreateIndex
CREATE INDEX "compliance_tasks_org_id_due_date_idx" ON "compliance_tasks"("org_id", "due_date");

-- CreateIndex
CREATE INDEX "compliance_tasks_diagnostic_id_idx" ON "compliance_tasks"("diagnostic_id");

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_diagnostic_id_fkey" FOREIGN KEY ("diagnostic_id") REFERENCES "compliance_diagnostics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
