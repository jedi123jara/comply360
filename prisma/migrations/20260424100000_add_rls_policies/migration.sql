-- =============================================
-- ROW-LEVEL SECURITY POLICIES — versión idempotente
-- =============================================
-- Esta migración CREA las policies pero NO las habilita en las tablas.
-- Activar manualmente con `ALTER TABLE x ENABLE ROW LEVEL SECURITY` cuando se
-- haya validado que cada request setea `app.current_org_id` correctamente.
--
-- Para activarlas todas a la vez (cuando estés listo):
--   ALTER TABLE workers, worker_documents, worker_alerts, contracts,
--                worker_contracts, calculations, compliance_diagnostics,
--                compliance_scores, sst_records, complaints, payslips,
--                integration_credentials, audit_logs, vacation_records
--     ENABLE ROW LEVEL SECURITY;
--
-- Para desactivar de emergencia:
--   ALTER TABLE x DISABLE ROW LEVEL SECURITY;
--
-- En psql interactivo, antes de cada request:
--   SET LOCAL app.current_org_id = '<orgId>';
--
-- En código aplicación: usar `runWithOrgScope(orgId, fn)` de `src/lib/prisma-rls.ts`.
-- =============================================

-- ── WORKERS ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS workers_org_isolation ON workers;
CREATE POLICY workers_org_isolation ON workers
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── WORKER DOCUMENTS (vía join con workers) ────────────────────────────
DROP POLICY IF EXISTS worker_documents_org_isolation ON worker_documents;
CREATE POLICY worker_documents_org_isolation ON worker_documents
  USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.id = worker_documents.worker_id
        AND w.org_id = current_setting('app.current_org_id', true)
    )
  );

-- ── WORKER ALERTS ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS worker_alerts_org_isolation ON worker_alerts;
CREATE POLICY worker_alerts_org_isolation ON worker_alerts
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── VACATION RECORDS (vía join con workers) ────────────────────────────
DROP POLICY IF EXISTS vacation_records_org_isolation ON vacation_records;
CREATE POLICY vacation_records_org_isolation ON vacation_records
  USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.id = vacation_records.worker_id
        AND w.org_id = current_setting('app.current_org_id', true)
    )
  );

-- ── CONTRACTS ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS contracts_org_isolation ON contracts;
CREATE POLICY contracts_org_isolation ON contracts
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── WORKER CONTRACTS (vía join con workers) ────────────────────────────
DROP POLICY IF EXISTS worker_contracts_org_isolation ON worker_contracts;
CREATE POLICY worker_contracts_org_isolation ON worker_contracts
  USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.id = worker_contracts.worker_id
        AND w.org_id = current_setting('app.current_org_id', true)
    )
  );

-- ── CALCULATIONS ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS calculations_org_isolation ON calculations;
CREATE POLICY calculations_org_isolation ON calculations
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── COMPLIANCE DIAGNOSTICS ─────────────────────────────────────────────
DROP POLICY IF EXISTS diagnostics_org_isolation ON compliance_diagnostics;
CREATE POLICY diagnostics_org_isolation ON compliance_diagnostics
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── COMPLIANCE SCORES ──────────────────────────────────────────────────
DROP POLICY IF EXISTS scores_org_isolation ON compliance_scores;
CREATE POLICY scores_org_isolation ON compliance_scores
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── SST RECORDS ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS sst_org_isolation ON sst_records;
CREATE POLICY sst_org_isolation ON sst_records
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── COMPLAINTS ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS complaints_org_isolation ON complaints;
CREATE POLICY complaints_org_isolation ON complaints
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── PAYSLIPS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS payslips_org_isolation ON payslips;
CREATE POLICY payslips_org_isolation ON payslips
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── INTEGRATION CREDENTIALS ───────────────────────────────────────────
DROP POLICY IF EXISTS credentials_org_isolation ON integration_credentials;
CREATE POLICY credentials_org_isolation ON integration_credentials
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── AUDIT LOGS ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS audit_logs_org_isolation ON audit_logs;
CREATE POLICY audit_logs_org_isolation ON audit_logs
  USING (org_id = current_setting('app.current_org_id', true));

-- =============================================
-- ROL DE BYPASS para super-admin / crons
-- =============================================
-- Si necesitas acceso global desde crons o panel founder, conecta usando un
-- rol con BYPASSRLS o usa runUnsafeBypass() del helper de aplicación.
-- =============================================
