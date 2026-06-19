-- RLS: cubre las 18 tablas con org_id que estaban SIN política (auditoría jun-2026).
-- Mismo patron que las otras 67 tablas: aislamiento por org_id vs
-- current_setting('app.current_org_id'). El rol del backend bypassa RLS, asi que
-- esto NO altera las queries actuales; protege ante acceso directo (Supabase JS),
-- documenta la intencion y deja todo listo para activar RLS_ENFORCED=true.
-- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE.

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'complaint_documents', 'compliance_task_evidences', 'cuadro_categorias',
    'diagnostic_auto_answers', 'disciplinary_actions', 'document_requirements',
    'labor_risk_snapshots', 'simulacros', 'sindicatos', 'subscriptions',
    'sunafil_expediente_exports', 'users', 'worker_capacitaciones_sst',
    'worker_challenge_progress', 'worker_challenges', 'worker_epp',
    'worker_pulse_events', 'worker_pulse_reactions'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_org_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (org_id = current_setting(''app.current_org_id'', true)) WITH CHECK (org_id = current_setting(''app.current_org_id'', true))',
      t || '_org_isolation', t
    );
  END LOOP;
END $$;
