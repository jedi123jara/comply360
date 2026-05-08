-- =============================================
-- Audit indexes — FIX #7.E
-- =============================================
-- Índices para queries de timeline en el cockpit / reportes.

-- leads: convertedOrgId para reportes de conversión.
CREATE INDEX IF NOT EXISTS "leads_converted_org_id_idx"
  ON "leads"("converted_org_id");

-- calculations: orgId + createdAt para "últimos 30 días por org".
CREATE INDEX IF NOT EXISTS "calculations_org_id_created_at_idx"
  ON "calculations"("org_id", "created_at");
