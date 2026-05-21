# Row-Level Security — COMPLY360

## Estado actual

- ✅ **Policies creadas en migración** `20260507150000_rls_policies_full` (idempotente, usa `DROP POLICY IF EXISTS` + `CREATE POLICY`).
- ✅ **RLS habilitado + FORCE RLS por tabla tenant-scoped** cuando la tabla existe y tiene `org_id`. La migración es defensiva para no romper entornos parcialmente migrados.
- ⚠️ **Enforcement operativo depende del rol de conexión**: si el rol Postgres actual tiene `BYPASSRLS`, las policies quedan instaladas pero no bloquean queries. Para enforcement real usar un rol `NOBYPASSRLS` y `RLS_ENFORCED=true`.
- ✅ **Helper aplicación** en [`src/lib/prisma-rls.ts`](../src/lib/prisma-rls.ts):
  - `runWithOrgScope(orgId, fn)` — abre tx + `SET LOCAL app.current_org_id` + ejecuta fn.
  - `runUnsafeBypass({reason}, fn)` — bypass legítimo (crons, super-admin) con AuditLog.
  - Feature flag `RLS_ENFORCED=true` controla si el `SET LOCAL` se emite. Off por default (no-op).
- ✅ **Tests unitarios** del helper en `src/lib/__tests__/prisma-rls.test.ts` (7 tests, validan SQLi defense + audit + tx pattern).
- ✅ **Defensa en profundidad capa 1**: preflight `check-multitenant.mjs` verifica que cada endpoint API tenga wrapper seguro y scope por `orgId`, `workerId` o whitelist documentada.

## Por qué importa

Las queries ya están 100% scoped por `orgId` a nivel app (validado en preflight). RLS es la **segunda línea de defensa** ante un futuro bug de código que olvide un filtro.

## Plan de rollout (4 fases)

### Fase A — staging dry-run (cuando hay DB de staging real)

```bash
# 1. Confirmar policies aplicadas en staging
psql $STAGING_DIRECT_URL -c "\d+ workers" | grep "Policies"

# 2. Migrar handlers críticos a runWithOrgScope (workers, contracts, payslips)
#    PR pequeño, ~10 endpoints clave

# 3. Crear/usar rol de app sin BYPASSRLS y setear RLS_ENFORCED=true
# 4. Smoke test: crear 2 orgs distintas, verificar aislamiento end-to-end
```

### Fase B — producción gradual

- Migrar todos los handlers a `runWithOrgScope` (PR por módulo).
- Cambiar `DATABASE_URL` a un rol `NOBYPASSRLS`.
- Setear `RLS_ENFORCED=true` en prod y monitorear Sentry.

### Fase C — bypass auditado

Para crons, webhooks, founder console: usar exclusivamente `runUnsafeBypass({reason})`. Cada llamada queda en `AuditLog` con `action='rls.bypass'`. Auditable mensual.

### Fase D — emergencia

Si algo se rompe en prod, desactivar RLS en una tabla específica:

```sql
ALTER TABLE x DISABLE ROW LEVEL SECURITY;
```

Las policies quedan pero no se aplican. Re-activar tras el fix.

## Diagnóstico

```sql
-- ¿Qué tablas tienen RLS activo?
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname='public' AND rowsecurity=true;

-- ¿Qué policies hay?
SELECT tablename, policyname FROM pg_policies WHERE schemaname='public';

-- ¿Qué tiene seteado mi sesión?
SHOW app.current_org_id;
```

## Tablas cubiertas

La migración cubre tablas tenant-scoped con `org_id` del core laboral, SST, organigrama, reportes, asistencia, workflows, webhooks y auditoría. Si una tabla todavía no existe o no tiene `org_id`, se omite de forma segura.
