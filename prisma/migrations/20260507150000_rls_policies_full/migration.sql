-- =============================================
-- FIX #7.C — RLS + tenant_isolation policy en tablas tenant-scoped
-- =============================================
-- Esta migración aplica policies reales, idempotentes y seguras para
-- `prisma migrate deploy`. Si una tabla todavía no existe o no tiene
-- columna `org_id`, se omite para mantener compatibilidad con entornos
-- parcialmente migrados.
--
-- Las policies se enforcement cuando la app use un rol Postgres sin
-- BYPASSRLS y emita `SET LOCAL app.current_org_id` (ver prisma-rls.ts).

DROP FUNCTION IF EXISTS _comply360_apply_tenant_rls(text, boolean);

CREATE FUNCTION _comply360_apply_tenant_rls(_table text, _nullable_org_id boolean)
RETURNS void AS $$
DECLARE
  _predicate text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = _table
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = _table
      AND column_name = 'org_id'
  ) THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _table);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', _table);
  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', _table);

  IF _nullable_org_id THEN
    _predicate := format('(%I IS NULL OR %I = current_setting(%L, true))', 'org_id', 'org_id', 'app.current_org_id');
  ELSE
    _predicate := format('(%I = current_setting(%L, true))', 'org_id', 'app.current_org_id');
  END IF;

  EXECUTE format(
    'CREATE POLICY tenant_isolation ON public.%I USING %s WITH CHECK %s',
    _table,
    _predicate,
    _predicate
  );
END;
$$ LANGUAGE plpgsql;

-- Tablas con org_id nullable por diseño.
SELECT _comply360_apply_tenant_rls('ai_usage', true);
SELECT _comply360_apply_tenant_rls('gamification_events', true);
SELECT _comply360_apply_tenant_rls('sunat_query_cache', true);
SELECT _comply360_apply_tenant_rls('attendance_attempts', true);
SELECT _comply360_apply_tenant_rls('rh_invoices', true);

-- Tablas tenant-scoped no-null.
SELECT _comply360_apply_tenant_rls('accidentes', false);
SELECT _comply360_apply_tenant_rls('ai_budget_counters', false);
SELECT _comply360_apply_tenant_rls('attendance', false);
SELECT _comply360_apply_tenant_rls('attendance_approvals', false);
SELECT _comply360_apply_tenant_rls('attendance_evidence', false);
SELECT _comply360_apply_tenant_rls('attendance_justifications', false);
SELECT _comply360_apply_tenant_rls('attendance_qr_sessions', false);
SELECT _comply360_apply_tenant_rls('audit_logs', false);
SELECT _comply360_apply_tenant_rls('bulk_contract_jobs', false);
SELECT _comply360_apply_tenant_rls('calculations', false);
SELECT _comply360_apply_tenant_rls('certificates', false);
SELECT _comply360_apply_tenant_rls('cese_records', false);
SELECT _comply360_apply_tenant_rls('comites_sst', false);
SELECT _comply360_apply_tenant_rls('compliance_diagnostics', false);
SELECT _comply360_apply_tenant_rls('compliance_scores', false);
SELECT _comply360_apply_tenant_rls('compliance_tasks', false);
SELECT _comply360_apply_tenant_rls('complaints', false);
SELECT _comply360_apply_tenant_rls('consentimientos_ley_29733', false);
SELECT _comply360_apply_tenant_rls('consultor_clients', false);
SELECT _comply360_apply_tenant_rls('contract_validations', false);
SELECT _comply360_apply_tenant_rls('contract_versions', false);
SELECT _comply360_apply_tenant_rls('contracts', false);
SELECT _comply360_apply_tenant_rls('document_acknowledgments', false);
SELECT _comply360_apply_tenant_rls('emo', false);
SELECT _comply360_apply_tenant_rls('enrollments', false);
SELECT _comply360_apply_tenant_rls('geofences', false);
SELECT _comply360_apply_tenant_rls('hallazgos_field_audit', false);
SELECT _comply360_apply_tenant_rls('inspecciones_en_vivo', false);
SELECT _comply360_apply_tenant_rls('integration_credentials', false);
SELECT _comply360_apply_tenant_rls('investigaciones_accidente', false);
SELECT _comply360_apply_tenant_rls('invitations', false);
SELECT _comply360_apply_tenant_rls('iperc_bases', false);
SELECT _comply360_apply_tenant_rls('iperc_filas', false);
SELECT _comply360_apply_tenant_rls('lesson_progress', false);
SELECT _comply360_apply_tenant_rls('merkle_anchors', false);
SELECT _comply360_apply_tenant_rls('miembros_comite', false);
SELECT _comply360_apply_tenant_rls('norm_alerts', false);
SELECT _comply360_apply_tenant_rls('nps_feedback', false);
SELECT _comply360_apply_tenant_rls('org_alerts', false);
SELECT _comply360_apply_tenant_rls('org_assignments', false);
SELECT _comply360_apply_tenant_rls('org_chart_drafts', false);
SELECT _comply360_apply_tenant_rls('org_chart_snapshots', false);
SELECT _comply360_apply_tenant_rls('org_compliance_roles', false);
SELECT _comply360_apply_tenant_rls('org_compliance_seals', false);
SELECT _comply360_apply_tenant_rls('org_documents', false);
SELECT _comply360_apply_tenant_rls('org_positions', false);
SELECT _comply360_apply_tenant_rls('org_structure_change_logs', false);
SELECT _comply360_apply_tenant_rls('org_templates', false);
SELECT _comply360_apply_tenant_rls('org_units', false);
SELECT _comply360_apply_tenant_rls('payslips', false);
SELECT _comply360_apply_tenant_rls('puestos_trabajo', false);
SELECT _comply360_apply_tenant_rls('scheduled_reports', false);
SELECT _comply360_apply_tenant_rls('sedes', false);
SELECT _comply360_apply_tenant_rls('service_providers', false);
SELECT _comply360_apply_tenant_rls('sindical_records', false);
SELECT _comply360_apply_tenant_rls('solicitudes_arco', false);
SELECT _comply360_apply_tenant_rls('sst_records', false);
SELECT _comply360_apply_tenant_rls('terceros', false);
SELECT _comply360_apply_tenant_rls('vacation_records', false);
SELECT _comply360_apply_tenant_rls('visitas_field_audit', false);
SELECT _comply360_apply_tenant_rls('webhook_deliveries', false);
SELECT _comply360_apply_tenant_rls('webhook_subscriptions', false);
SELECT _comply360_apply_tenant_rls('worker_alerts', false);
SELECT _comply360_apply_tenant_rls('worker_contracts', false);
SELECT _comply360_apply_tenant_rls('worker_dependents', false);
SELECT _comply360_apply_tenant_rls('worker_documents', false);
SELECT _comply360_apply_tenant_rls('worker_history_events', false);
SELECT _comply360_apply_tenant_rls('worker_requests', false);
SELECT _comply360_apply_tenant_rls('workers', false);
SELECT _comply360_apply_tenant_rls('workflow_runs', false);
SELECT _comply360_apply_tenant_rls('workflows', false);

DROP FUNCTION _comply360_apply_tenant_rls(text, boolean);
