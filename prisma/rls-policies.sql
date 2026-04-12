-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================
-- Second layer of defense: even if application code has a bug (missing orgId filter),
-- PostgreSQL will enforce that each user can only access their own org's data.
--
-- HOW TO APPLY:
--   1. Run this SQL against your PostgreSQL database
--   2. Set the session variable in your Prisma connection:
--      SET app.current_org_id = '<orgId>' at the start of each request
--
-- NOTE: Prisma doesn't natively support session variables per-query.
-- For full RLS, use Supabase's built-in RLS or a connection pool that sets session vars.
-- This file serves as DOCUMENTATION of the policies to apply when migrating to production.
-- =============================================

-- Enable RLS on all tables with org_id
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sst_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_records ENABLE ROW LEVEL SECURITY;

-- ── WORKERS ────────────────────────────────────────────────────────────
CREATE POLICY workers_org_isolation ON workers
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── WORKER DOCUMENTS ───────────────────────────────────────────────────
-- Uses worker.org_id through join
CREATE POLICY worker_documents_org_isolation ON worker_documents
  USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.id = worker_documents.worker_id
      AND w.org_id = current_setting('app.current_org_id', true)
    )
  );

-- ── WORKER ALERTS ──────────────────────────────────────────────────────
CREATE POLICY worker_alerts_org_isolation ON worker_alerts
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── CONTRACTS ──────────────────────────────────────────────────────────
CREATE POLICY contracts_org_isolation ON contracts
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── CALCULATIONS ───────────────────────────────────────────────────────
CREATE POLICY calculations_org_isolation ON calculations
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── COMPLIANCE DIAGNOSTICS ─────────────────────────────────────────────
CREATE POLICY diagnostics_org_isolation ON compliance_diagnostics
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── SST RECORDS ────────────────────────────────────────────────────────
CREATE POLICY sst_org_isolation ON sst_records
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── COMPLAINTS ─────────────────────────────────────────────────────────
CREATE POLICY complaints_org_isolation ON complaints
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── PAYSLIPS ───────────────────────────────────────────────────────────
CREATE POLICY payslips_org_isolation ON payslips
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── INTEGRATION CREDENTIALS ───────────────────────────────────────────
CREATE POLICY credentials_org_isolation ON integration_credentials
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── AUDIT LOGS ─────────────────────────────────────────────────────────
CREATE POLICY audit_logs_org_isolation ON audit_logs
  USING (org_id = current_setting('app.current_org_id', true));

-- =============================================
-- SUPER ADMIN BYPASS (for admin panel access)
-- =============================================
-- Create a role for super admin that bypasses RLS:
-- CREATE ROLE comply360_admin BYPASSRLS;
-- GRANT comply360_admin TO postgres;

-- =============================================
-- NOTES:
-- 1. These policies require setting `app.current_org_id` at connection start
-- 2. In Supabase, use: `ALTER ROLE authenticator SET app.current_org_id = ''`
-- 3. Prisma $executeRawUnsafe("SET app.current_org_id = $1", orgId) per request
-- 4. For serverless (Vercel), set at the start of each API handler
-- =============================================
