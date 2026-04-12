-- CreateEnum
CREATE TYPE "DiagnosticType" AS ENUM ('FULL', 'EXPRESS', 'SIMULATION');

-- CreateTable
CREATE TABLE "compliance_diagnostics" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "type" "DiagnosticType" NOT NULL,
    "score_global" INTEGER NOT NULL,
    "score_by_area" JSONB NOT NULL,
    "total_multa_riesgo" DECIMAL(12,2) NOT NULL,
    "questions_json" JSONB NOT NULL,
    "gap_analysis" JSONB,
    "action_plan" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_diagnostics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_scores" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "score_global" INTEGER NOT NULL,
    "score_contratos" INTEGER,
    "score_sst" INTEGER,
    "score_documentos" INTEGER,
    "score_vencimientos" INTEGER,
    "score_planilla" INTEGER,
    "multa_evitada" DECIMAL(12,2),
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_diagnostics_org_id_created_at_idx" ON "compliance_diagnostics"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "compliance_scores_org_id_calculated_at_idx" ON "compliance_scores"("org_id", "calculated_at");

-- AddForeignKey
ALTER TABLE "compliance_diagnostics" ADD CONSTRAINT "compliance_diagnostics_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
