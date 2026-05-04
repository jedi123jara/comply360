-- =============================================
-- ADVERTENCIA OPERACIONAL — 2026-05-04
-- =============================================
-- Estas policies están aplicadas pero NO se ejecutan en queries Prisma
-- del backend porque el rol de la conexión bypassa RLS.
-- El aislamiento de tenant real lo hace withAuth() + filter orgId en código.
--
-- RLS aquí cumple 3 funciones:
--   1. Protección si alguien usa el cliente Supabase JS directo.
--   2. Documentación viva de la intención de aislamiento.
--   3. Activación futura cuando se separe el rol de aplicación.
-- =============================================

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
-- FASE 5 — SST PREMIUM
-- =============================================
-- Tablas tenant-scoped (RLS habilitado). Se omiten:
--   - colaboradores_sst (global COMPLY360, gestionada por super-admin)
--   - catalogo_peligros (catálogo seed global)
--   - catalogo_controles (catálogo seed global)

ALTER TABLE sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE puestos_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE iperc_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE iperc_filas ENABLE ROW LEVEL SECURITY;
ALTER TABLE accidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigaciones_accidente ENABLE ROW LEVEL SECURITY;
ALTER TABLE comites_sst ENABLE ROW LEVEL SECURITY;
ALTER TABLE miembros_comite ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas_field_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE hallazgos_field_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE emo ENABLE ROW LEVEL SECURITY;
ALTER TABLE consentimientos_ley_29733 ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_arco ENABLE ROW LEVEL SECURITY;

-- ── SEDES ─────────────────────────────────────────────────────────────
CREATE POLICY sedes_org_isolation ON sedes
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── PUESTOS DE TRABAJO ────────────────────────────────────────────────
CREATE POLICY puestos_org_isolation ON puestos_trabajo
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── IPERC BASES ───────────────────────────────────────────────────────
CREATE POLICY iperc_bases_org_isolation ON iperc_bases
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── IPERC FILAS (vía join con iperc_bases) ────────────────────────────
CREATE POLICY iperc_filas_org_isolation ON iperc_filas
  USING (
    EXISTS (
      SELECT 1 FROM iperc_bases ib
      WHERE ib.id = iperc_filas.iper_base_id
      AND ib.org_id = current_setting('app.current_org_id', true)
    )
  );

-- ── ACCIDENTES ────────────────────────────────────────────────────────
CREATE POLICY accidentes_org_isolation ON accidentes
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── INVESTIGACIONES ACCIDENTE (vía join con accidentes) ───────────────
CREATE POLICY investigaciones_org_isolation ON investigaciones_accidente
  USING (
    EXISTS (
      SELECT 1 FROM accidentes a
      WHERE a.id = investigaciones_accidente.accidente_id
      AND a.org_id = current_setting('app.current_org_id', true)
    )
  );

-- ── COMITÉS SST ───────────────────────────────────────────────────────
CREATE POLICY comites_sst_org_isolation ON comites_sst
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── MIEMBROS COMITÉ (vía join con comites_sst) ────────────────────────
CREATE POLICY miembros_comite_org_isolation ON miembros_comite
  USING (
    EXISTS (
      SELECT 1 FROM comites_sst c
      WHERE c.id = miembros_comite.comite_id
      AND c.org_id = current_setting('app.current_org_id', true)
    )
  );

-- ── VISITAS FIELD AUDIT ───────────────────────────────────────────────
CREATE POLICY visitas_field_audit_org_isolation ON visitas_field_audit
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── HALLAZGOS FIELD AUDIT (vía join con visitas_field_audit) ──────────
CREATE POLICY hallazgos_field_audit_org_isolation ON hallazgos_field_audit
  USING (
    EXISTS (
      SELECT 1 FROM visitas_field_audit v
      WHERE v.id = hallazgos_field_audit.visita_id
      AND v.org_id = current_setting('app.current_org_id', true)
    )
  );

-- ── EMO (sub-schema médico, Ley 29733) ────────────────────────────────
CREATE POLICY emo_org_isolation ON emo
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── CONSENTIMIENTOS LEY 29733 ─────────────────────────────────────────
CREATE POLICY consentimientos_org_isolation ON consentimientos_ley_29733
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- ── SOLICITUDES ARCO ──────────────────────────────────────────────────
CREATE POLICY solicitudes_arco_org_isolation ON solicitudes_arco
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

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
