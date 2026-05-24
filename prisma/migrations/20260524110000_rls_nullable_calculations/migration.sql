-- Calculations can be public demo records with org_id NULL.
-- The previous legacy policy required org_id = app.current_org_id, which blocks
-- anonymous calculator writes when the runtime role does not BYPASSRLS.

DROP POLICY IF EXISTS calculations_org_isolation ON public.calculations;
DROP POLICY IF EXISTS tenant_isolation ON public.calculations;

ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.calculations
  USING (org_id IS NULL OR org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id IS NULL OR org_id = current_setting('app.current_org_id', true));
