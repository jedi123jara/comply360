-- =============================================
-- Audit Remediation 2026-05-07 — schema fixes
-- =============================================
-- Fixes #7.A y #7.G del informe de auditoría.
--
-- #7.A workers.org_id ya estaba ON DELETE RESTRICT en DB. El schema decía
--      Cascade (drift histórico). Esta migration reconcilia: NO produce
--      cambio efectivo en la DB porque la constraint actual ya es RESTRICT.
--      Se incluye un statement defensivo idempotente para garantizar el
--      estado correcto independientemente del state real.
--
-- #7.G ai_usage.eval_score: DOUBLE PRECISION → DECIMAL(5,4). Único Float
--      del schema, score 0..1 con 4 decimales cubre cualquier eval.
-- =============================================

-- #7.A — Defensive: garantizar RESTRICT (idempotente).
-- Si la constraint ya está como RESTRICT, ALTER TABLE ... DROP CONSTRAINT +
-- ADD CONSTRAINT no falla y deja todo igual.
ALTER TABLE "workers" DROP CONSTRAINT IF EXISTS "workers_org_id_fkey";
ALTER TABLE "workers"
  ADD CONSTRAINT "workers_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- #7.G — eval_score Float → Decimal(5,4).
-- USING preserva los valores existentes (cast double → numeric).
ALTER TABLE "ai_usage"
  ALTER COLUMN "eval_score" TYPE DECIMAL(5,4)
  USING ("eval_score"::DECIMAL(5,4));
