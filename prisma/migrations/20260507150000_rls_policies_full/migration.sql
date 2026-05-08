-- =============================================
-- FIX #7.C — RLS + tenant_isolation policy en 47 tablas tenant-scoped
-- =============================================
-- Detección: scripts/audit-smoke/find-missing-rls.ts
-- Aplicación: scripts/audit-smoke/apply-rls-policies.ts
--
-- Política aplicada:
--   - ENABLE + FORCE Row Level Security en cada tabla
--   - CREATE POLICY tenant_isolation: org_id matches current_setting
--   - Tablas con org_id nullable usan: org_id IS NULL OR org_id = current_setting
--
-- Estado operacional:
--   Las policies están creadas pero el rol Postgres actual (`postgres`)
--   tiene BYPASSRLS=true. Las queries actuales no se afectan. El día que
--   se cree un rol `app_user` sin BYPASSRLS y se conecte con él,
--   automaticamente se enforcan estas policies.
--
-- Para activar:
--   1. CREATE ROLE app_user LOGIN PASSWORD '...' NOBYPASSRLS;
--   2. GRANT USAGE ON SCHEMA public TO app_user;
--   3. GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES TO app_user;
--   4. Cambiar DATABASE_URL a usar app_user.
--   5. Setear RLS_ENFORCED=true.
--   6. Refactorizar handlers críticos a `runWithOrgScope(orgId, fn)`.

-- Ver scripts/audit-smoke/apply-rls-policies.ts para el detalle por tabla.
-- Esta migration es informativa — la aplicación real se hizo via tsx
-- script y queda registrada en _prisma_migrations.

-- (Las 47 ALTER TABLE / CREATE POLICY statements ejecutadas via script
-- son idempotentes con DROP POLICY IF EXISTS + CREATE POLICY.)

SELECT 'RLS migration placeholder — applied via tsx script' AS note;
