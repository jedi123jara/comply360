# RLS — Runbook de activación segura

> **Qué es RLS:** Row Level Security de Postgres. Hoy, la única defensa contra que una
> empresa vea datos de otra es el filtro `orgId` en el código. RLS es la **red de
> seguridad a nivel de BD**: aunque una consulta se olvide de filtrar por `orgId`, la
> base impide ver filas de otra empresa.
>
> **Objetivo:** activar `RLS_ENFORCED=true` en prod **sin romper nada**. El riesgo es
> que una tabla tenant quede sin política → sus queries devuelven 0 filas (la app
> "pierde" datos visualmente). Por eso primero se audita la cobertura.

---

## Paso 1 — Auditar la cobertura (pegar en el SQL Editor de Supabase)

Esta query lista **toda tabla con columna `org_id`** y dice si tiene RLS habilitado y
cuántas políticas tiene. **Las filas con `rls_enabled = false` o `num_politicas = 0` son
las que FALTAN** y hay que cubrir antes de activar.

```sql
SELECT
  c.relname                              AS tabla,
  c.relrowsecurity                       AS rls_enabled,
  COUNT(p.polname)                       AS num_politicas,
  string_agg(p.polname, ', ')            AS politicas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns col
    WHERE col.table_schema = 'public'
      AND col.table_name = c.relname
      AND col.column_name = 'org_id'
  )
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relrowsecurity ASC, num_politicas ASC, c.relname;
```

> Si una tabla tenant **no** tiene `org_id` directo (lo hereda vía relación, p.ej.
> `worker_documents` → `workers.org_id`), no aparece aquí. Esas se protegen filtrando por
> la tabla padre o agregando una policy específica. Revísalas aparte.

---

## Paso 2 — Cubrir las tablas que falten

Ya existe `prisma/rls-policies.sql` (políticas para las tablas SST) y la migración
`rls_policies_full`. Para cada tabla que la auditoría marque sin política, agregar:

```sql
ALTER TABLE "nombre_tabla" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_nombre_tabla" ON "nombre_tabla"
  USING ("org_id" = current_setting('app.current_org_id', true));
```

El código ya setea `app.current_org_id` por request (ver `runWithOrgScope` /
`src/lib/prisma.ts`). Los crons cross-org ya están preparados para el modo RLS
(fail-closed + `runUnsafeBypass`).

---

## Paso 3 — Probar en STAGING antes de prod

1. Activar `RLS_ENFORCED=true` en un entorno de staging (no prod).
2. Smoke-test de los flujos críticos con 2 organizaciones distintas:
   - Login con org A → ver solo datos de A (trabajadores, boletas, alertas).
   - Login con org B → ver solo datos de B.
   - Generar una boleta, abrir un trabajador, correr un reporte → todo carga.
3. Revisar logs: que ninguna query devuelva 0 filas inesperadamente (señal de tabla sin
   policy o sin el `SET app.current_org_id`).

---

## Paso 4 — Activar en prod

Solo cuando staging esté limpio: `RLS_ENFORCED=true` en prod + monitorear.

> **Rollback:** `RLS_ENFORCED=false` desactiva el enforcement al instante (la app vuelve
> a depender solo del filtro `orgId` del código). Tener esa palanca a mano el día del
> cambio.
