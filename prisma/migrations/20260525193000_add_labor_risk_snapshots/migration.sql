-- Historial canonico de Riesgo Laboral: permite medir tendencia, reduccion de
-- exposicion y estado documental sin recalcular versiones antiguas.
CREATE TABLE "labor_risk_snapshots" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'full',
  "score_overall" INTEGER NOT NULL,
  "score_sunafil_ready" INTEGER NOT NULL,
  "score_sst" INTEGER NOT NULL,
  "score_evidence" INTEGER NOT NULL,
  "score_closure" INTEGER NOT NULL,
  "potential_fine_soles" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "potential_fine_uit" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "estimated_after_subsanation_soles" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "avoidable_amount_soles" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "avoidable_reduction_percent" INTEGER NOT NULL DEFAULT 0,
  "total_findings" INTEGER NOT NULL DEFAULT 0,
  "critical_findings" INTEGER NOT NULL DEFAULT 0,
  "high_findings" INTEGER NOT NULL DEFAULT 0,
  "evidence_open_docs" INTEGER NOT NULL DEFAULT 0,
  "evidence_critical_docs" INTEGER NOT NULL DEFAULT 0,
  "open_tasks" INTEGER NOT NULL DEFAULT 0,
  "unresolved_alerts" INTEGER NOT NULL DEFAULT 0,
  "snapshot_json" JSONB NOT NULL,
  "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "labor_risk_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "labor_risk_snapshots_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "labor_risk_snapshots_org_id_calculated_at_idx"
  ON "labor_risk_snapshots"("org_id", "calculated_at");

CREATE INDEX "labor_risk_snapshots_org_id_score_overall_idx"
  ON "labor_risk_snapshots"("org_id", "score_overall");
