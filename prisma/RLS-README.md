# Row-Level Security — COMPLY360

## Estado actual

- ✅ **Policies creadas en migración** `20260424100000_add_rls_policies` (idempotente, usa `DROP POLICY IF EXISTS` + `CREATE POLICY`).
- ⏸️ **RLS DESACTIVADO en cada tabla** por defecto. La migración crea la policy pero NO ejecuta `ENABLE ROW LEVEL SECURITY`. Activación es un paso manual cuando todo el equipo esté listo.
- ✅ **Helper aplicación** en [`src/lib/prisma-rls.ts`](../src/lib/prisma-rls.ts):
  - `runWithOrgScope(orgId, fn)` — abre tx + `SET LOCAL app.current_org_id` + ejecuta fn.
  - `runUnsafeBypass({reason}, fn)` — bypass legítimo (crons, super-admin) con AuditLog.
  - Feature flag `RLS_ENFORCED=true` controla si el `SET LOCAL` se emite. Off por default (no-op).
- ✅ **Tests unitarios** del helper en `src/lib/__tests__/prisma-rls.test.ts` (7 tests, validan SQLi defense + audit + tx pattern).
- ✅ **Defensa en profundidad capa 1**: preflight `check-multitenant.mjs` verifica que cada endpoint API tenga scope por `orgId` (213 handlers, 421 queries Prisma, cero leaks).

## Por qué importa

Las queries ya están 100% scoped por `orgId` a nivel app (validado en preflight). RLS es la **segunda línea de defensa** ante un futuro bug de código que olvide un filtro.

## Plan de rollout (4 fases)

### Fase A — staging dry-run (cuando hay DB de staging real)

```bash
# 1. Confirmar policies aplicadas en staging
psql $STAGING_DIRECT_URL -c "\d+ workers" | grep "Policies"

# 2. Migrar handlers críticos a runWithOrgScope (workers, contracts, payslips)
#    PR pequeño, ~10 endpoints clave

# 3. Activar RLS en staging
psql $STAGING_DIRECT_URL <<SQL
  ALTER TABLE workers, worker_documents, worker_alerts, contracts,
               worker_contracts, calculations, compliance_diagnostics,
               compliance_scores, sst_records, complaints, payslips,
               integration_credentials, audit_logs, vacation_records
    ENABLE ROW LEVEL SECURITY;
SQL

# 4. Setear RLS_ENFORCED=true en staging
# 5. Smoke test: crear 2 orgs distintas, verificar aislamiento end-to-end
```

### Fase B — producción gradual

- Migrar todos los handlers a `runWithOrgScope` (PR por módulo).
- Setear `RLS_ENFORCED=true` en prod.
- Habilitar RLS por tabla, una por una, monitoreando Sentry.

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

`workers`, `worker_documents`, `worker_alerts`, `vacation_records`, `contracts`, `worker_contracts`, `calculations`, `compliance_diagnostics`, `compliance_scores`, `sst_records`, `complaints`, `payslips`, `integration_credentials`, `audit_logs`.

Otras tablas con `org_id` que **no** tienen policy todavía (TODO): `org_alerts`, `norm_alerts`, `gamification_events`, `worker_requests`, `org_documents`, `service_providers`, `rh_invoices`, `consultor_clients`, `inspeccion_en_vivo`, `attendance`, `cese_records`, `terceros`, `sindical_records`, `enrollments`, `lesson_progress`, `certificates`, `workflows`, `workflow_runs`, `scheduled_reports`. Agregar en próxima migración cuando se decida activar.
