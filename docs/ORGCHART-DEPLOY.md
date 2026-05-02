# Despliegue del módulo Organigrama

Pasos exactos para activar el módulo en staging y luego en producción. Hechos para ejecutar de arriba abajo sin pensar.

---

## 1. Variables de entorno

Agrega a `.env` local y a Vercel (Project → Settings → Environment Variables):

```bash
# Firma del Auditor Link (JWT HS256). Genera uno random de 32+ bytes.
# Ej: openssl rand -base64 32
JWT_SECRET="<genera_uno_propio_min_32_bytes>"

# URL base para construir Auditor Links públicos.
NEXT_PUBLIC_APP_URL="https://comply360.pe"

# Ya debería existir — si no, configúralo (lo usan TODOS los crons).
CRON_SECRET="<el_que_ya_usas>"
```

**Importante**: en local pon `NEXT_PUBLIC_APP_URL=http://localhost:3000` para que los Auditor Links generados en dev apunten a tu dev server.

---

## 2. Aplicar la migración

### Staging (recomendado primero)

```bash
# Apunta DATABASE_URL a tu schema de staging
export DATABASE_URL="postgresql://...staging..."

# Aplica solo la migración nueva (NO ejecutes migrate dev — eso resetea)
npx prisma migrate deploy
```

Verifica en Supabase Studio que existan las tablas:
- `org_units`
- `org_unit_closure`
- `org_positions`
- `org_assignments`
- `org_compliance_roles`
- `org_chart_snapshots`
- `org_chart_drafts`

### Producción

Mismos comandos pero con `DATABASE_URL` apuntando a prod. **Toma backup antes** (Supabase: Database → Backups → Manual backup).

---

## 3. Smoke test post-deploy

```bash
# 1. Sin auth → 307 (redirect a sign-in) o 401
curl -sI https://comply360.pe/dashboard/organigrama | head -1

# 2. API pública con token bogus → 401 con JSON
curl -s https://comply360.pe/api/public/orgchart/foo

# 3. Página de auditor con token bogus → 200 con notFound de Next
curl -sI https://comply360.pe/audit/orgchart/foo | head -1
```

---

## 4. Datos de prueba (seed demo)

Si necesitas una org de testing con 50 workers peruanos verosímiles:

```bash
npx tsx scripts/seed-orgchart-demo.ts
```

Crea o reutiliza una org "Demo Organigrama Retail SAC" en plan EMPRESA, con
50 workers en 10 departamentos típicos de PYME retail (gerencia, tiendas,
logística, RRHH, contabilidad, marketing, sistemas).

---

## 5. Test plan funcional (correr en staging antes de prod)

1. Login como ADMIN/OWNER de la org demo
2. Navegar a `/dashboard/organigrama` → debe mostrar empty state
3. Click "Auto-generar desde Trabajadores" → preview muestra ~10 áreas, ~25 cargos, ~50 asignaciones
4. Click "Generar organigrama" → tarda ~3s, snapshot inicial automático
5. Canvas renderiza el árbol completo, hover en nodo → muestra ocupantes
6. Click "Org Doctor" → corre diagnóstico, debe encontrar:
   - CRITICAL: Comité SST sin Presidente / Secretario / Representantes
   - CRITICAL: Comité Hostigamiento sin designar
   - HIGH: Empresa sin DPO (si tiene >100 trabajadores)
7. Click "Crear tareas" en Org Doctor → ir a `/dashboard/tareas` y verificar que aparecen
8. Click "Snapshot" → ingresar nombre → verificar en `/api/orgchart/snapshots` (GET)
9. Click "Auditor Link" → 48h, todo incluido → copiar URL → abrir en navegador anónimo:
   - Debe mostrar el organigrama
   - NO debe mostrar sueldos ni DNI
   - Debe mostrar el hash del snapshot en el header
10. En Supabase Studio: `SELECT action FROM audit_logs WHERE action LIKE 'orgchart.%' ORDER BY created_at DESC LIMIT 20;` — verificar que cada acción se registró

---

## 6. Configuración del cron mensual

Ya está en `vercel.json`:

```json
{
  "path": "/api/cron/orgchart-snapshots",
  "schedule": "0 3 1 * *"
}
```

Corre el día 1 de cada mes a las 03:00 UTC (≈ 22:00 Lima del día anterior).
Genera snapshot automático a TODAS las orgs en plan EMPRESA, BUSINESS o
ENTERPRISE que tengan al menos 1 unidad. Se aísla por org — si una falla,
las demás siguen.

Para correr manualmente (debug):

```bash
curl -X GET https://comply360.pe/api/cron/orgchart-snapshots \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 7. Plan gating (resumen)

| Plan | Acceso |
|---|---|
| FREE / STARTER | Bloqueado (upgrade modal). |
| **PRO** (S/699) | CRUD completo + Compliance Mesh básico + snapshot manual + Export PDF/PNG. Feature key: `organigrama`. |
| **EMPRESA** (S/1,899) | Todo lo de PRO + **AI Org Doctor** + **Time Travel ilimitado** + cron de snapshots automáticos + **Auditor Link firmado**. Feature key: `organigrama_completo`. |
| BUSINESS / ENTERPRISE | Todo lo anterior + lo que ya tenían. |

Mapping en `src/lib/plan-features.ts`:
- `ROUTE_FEATURE_MAP['/dashboard/organigrama'] = 'organigrama'`

---

## 8. Rollback plan

Si algo sale mal en prod después del deploy:

```sql
-- 1. Revertir migración (perdiendo todos los datos del organigrama)
DROP TABLE IF EXISTS "org_chart_drafts" CASCADE;
DROP TABLE IF EXISTS "org_chart_snapshots" CASCADE;
DROP TABLE IF EXISTS "org_compliance_roles" CASCADE;
DROP TABLE IF EXISTS "org_assignments" CASCADE;
DROP TABLE IF EXISTS "org_positions" CASCADE;
DROP TABLE IF EXISTS "org_unit_closure" CASCADE;
DROP TABLE IF EXISTS "org_units" CASCADE;
DROP TYPE IF EXISTS "ComplianceRoleType";
DROP TYPE IF EXISTS "UnitKind";

-- 2. Borrar la migración aplicada
DELETE FROM "_prisma_migrations" WHERE migration_name = '20260501000000_add_orgchart';
```

Y en código: revertir el commit que agregó el item al hub Equipo (`src/lib/constants.ts`) y el `ROUTE_FEATURE_MAP` en `plan-features.ts`. Las API routes y la página dejan de ser accesibles desde la nav, aunque los archivos sigan en disco.

---

## 9. Checklist final pre-prod

- [ ] `JWT_SECRET` en Vercel (Production)
- [ ] `NEXT_PUBLIC_APP_URL` en Vercel (Production)
- [ ] `CRON_SECRET` ya existe
- [ ] Backup de Supabase tomado
- [ ] Migración aplicada en staging y verificada
- [ ] Test plan funcional ejecutado en staging sin errores
- [ ] `npx vitest run src/lib/orgchart` → 22/22 verde
- [ ] `npx tsc --noEmit` → exit 0
- [ ] `npx eslint` sobre `src/app/dashboard/organigrama src/lib/orgchart src/app/api/orgchart` → sin errores
- [ ] Migración aplicada en prod
- [ ] Smoke test post-deploy ejecutado
- [ ] Cron `orgchart-snapshots` visible en Vercel Dashboard → Crons

---

## 10. Métricas a monitorear post-launch

Primer mes:
- % de orgs EMPRESA+ que ejecutan el wizard de seed (target ≥ 60%)
- # de Auditor Links generados por semana
- # de findings CRITICAL/HIGH del Org Doctor que se convierten en `ComplianceTask`
- Tasa de error del cron mensual (esperar 0)
