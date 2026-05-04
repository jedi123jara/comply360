# Deployment runbook — SST Premium (Fase 5)

> **Audiencia**: ops/dev de COMPLY360 que prepara el módulo SST para producción.
> **Estado del módulo**: 20 sprints implementados, 186 tests verdes, build OK.
> **Pendiente**: aplicar el schema en la DB compartida (acción humana, destructive).

---

## 1. Pre-deployment — chequeo de salud

```bash
cd legaliapro-platform

# 1.1 — Schema válido
npx prisma validate

# 1.2 — Cliente generado
npx prisma generate

# 1.3 — Tests SST verdes (186 esperados)
npx vitest run src/lib/sst/

# 1.4 — Build de producción limpio
npm run build
```

Si cualquier paso falla, resolver **antes** de tocar la DB.

---

## 2. Aplicar la migración Prisma

La DB Supabase tiene una migration previa fallida (`20260502003000_add_orgchart_draft_change_types`)
que bloquea `prisma migrate deploy`. Hay que **resolverla primero**.

### 2.1 Diagnóstico

```bash
# Ver el estado de migrations en la DB
npx prisma migrate status
```

### 2.2 Resolver la migration fallida

Si la migración fallida YA está aplicada manualmente (revisaron y los cambios
están en la DB):

```bash
npx prisma migrate resolve --applied 20260502003000_add_orgchart_draft_change_types
```

Si NO se aplicó (rollback):

```bash
npx prisma migrate resolve --rolled-back 20260502003000_add_orgchart_draft_change_types
```

### 2.3 Aplicar las migrations pendientes (incluye SST Premium)

```bash
npx prisma migrate deploy
```

Esperado: aplica `20260503004137_add_sst_premium_schema` con todos los modelos
SST + extensión `pgcrypto`.

---

## 3. Aplicar Row Level Security

```bash
psql "$DIRECT_URL" -f prisma/rls-policies.sql
```

Verificación:

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('sedes','puestos_trabajo','iperc_bases','iperc_filas',
  'accidentes','investigaciones_accidente','comites_sst','miembros_comite',
  'visitas_field_audit','hallazgos_field_audit','emo','consentimientos_ley_29733',
  'solicitudes_arco');
-- Todas deben tener rowsecurity = true.
```

`colaboradores_sst`, `catalogo_peligros`, `catalogo_controles` quedan SIN RLS
(globales por diseño).

---

# 4. Variables de entorno

> [!CAUTION]
> **SEGURIDAD**: Las claves generadas inicialmente durante la sesión de despliegue del 2026-05-04 quedaron comprometidas en el log del chat. Fueron rotadas inmediatamente el mismo día por llaves con entropía independiente. Las claves actuales NO aparecen en logs ni chats.

```bash
# 4.1 — MEDICAL_VAULT_KEY (Ley 29733)
# Generar clave aleatoria independiente:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Copiar el valor y agregarlo a:
#   - Vercel: Settings → Environment Variables → MEDICAL_VAULT_KEY
#   - .env local del equipo dev (NO commitear)

# 4.2 — CRON_SECRET (probablemente ya existe — los 17 crons previos lo usan)
# Generar clave aleatoria independiente:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Agregar como CRON_SECRET en Vercel.
```

**CRÍTICO**: si pierdes `MEDICAL_VAULT_KEY`, los datos cifrados (restricciones EMO,
texto consentimientos, detalle ARCO) son **irrecuperables**. Plan de respaldo:

- Backup de la clave en gestor de secretos enterprise (1Password Business, Vault).
- Documento sellado físico con la clave en oficina central como último recurso.
- **NO** rotar la clave sin re-cifrar todos los registros existentes.

---

## 5. Cargar seeds SST (catálogos)

```bash
npx prisma db seed
```

Verificación:

```sql
SELECT COUNT(*) FROM catalogo_peligros;       -- 80
SELECT COUNT(*) FROM catalogo_controles;       -- 40
SELECT COUNT(*) FROM colaboradores_sst WHERE dni='00000001';  -- 1 (solo NODE_ENV != production)
```

---

## 6. Validar el cron SST

```bash
# Local — probar manualmente con CRON_SECRET
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sst-daily
```

Esperado:

```json
{ "ok": true, "runAt": "...", "elapsedMs": 123, "orgs": 0, "creadas": 0, "actualizadas": 0, ... }
```

En Vercel, el cron correrá automáticamente diario a las 07:00 UTC = 02:00 PET
según `vercel.json`.

---

## 7. Smoke test funcional (humano)

Ejecutar manualmente en staging:

1. **Sede + Puesto + IPERC**:
   - Crear sede en `/dashboard/sst/sedes/nueva`
   - Crear puesto en el detalle de la sede (modal "Nuevo puesto")
   - Crear IPERC v1 → llegar al editor
   - Click **"Sugerir con IA"** → verificar que DeepSeek responde con filas
   - Aplicar 3 sugerencias
   - Aprobar IPERC → verificar que pasa a VIGENTE

2. **Sello QR**:
   - En el IPERC aprobado, click **"Sello QR"** → verificar que se genera el QR
   - Click en la URL pública → verificar que `/verify/sst/[slug]` muestra:
     - Empresa + RUC
     - Tipo + versión IPERC
     - Hash SHA-256
     - Sin datos sensibles

3. **EMO con cifrado**:
   - Crear EMO con `restricciones: "Evitar cargas mayores a 10kg"`
   - Verificar en DB: `SELECT restricciones_cifrado FROM emo;` retorna bytes opacos
   - En el detalle, click **"Revelar"** → texto descifrado se muestra
   - Verificar audit log: `SELECT * FROM audit_logs WHERE action='sst.emo.restricciones.read'`

4. **Accidente + SAT**:
   - Crear accidente NO_MORTAL → ver countdown del plazo
   - Click **"Descargar PDF"** del wizard SAT → PDF imprimible se genera
   - Registrar tracking SAT manual (número + fecha) → estado pasa a NOTIFICADO

5. **Comité SST**:
   - Instalar comité con fecha de hoy
   - Agregar 4 miembros (2 empleador + 2 trabajadores con presidente y secretario)
   - Verificar análisis = "Composición paritaria correcta"
   - Click **"Acta de instalación"** → PDF formal se genera

6. **Score SST**:
   - Ir a `/dashboard/sst/score`
   - Verificar score 0-100 + breakdown + exposición S/

7. **Calendarizador**:
   - Setear `proximoExamenAntes` en un EMO a hace 5 días
   - Disparar manualmente cron: `curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/sst-daily`
   - Verificar que se creó alerta `EMO_VENCIDO` en `WorkerAlert`

---

## 8. Smoke test de aislamiento (RLS)

Crear dos orgs separadas (A y B), cada una con un usuario admin.
Crear sede en org A. Iniciar sesión como user de org B y:

```bash
curl -H "Cookie: <session-de-B>" /api/sst/sedes
```

Esperado: lista vacía (no debe ver la sede de A).

```sql
-- Sin SET app.current_org_id, las queries deben fallar / retornar vacío
SELECT * FROM sedes;
```

---

## 9. Configurar el routing del LLM (DeepSeek)

```bash
# Asegurar que el feature 'doc-generator' (usado por iperc-llm.ts) está
# routed a DeepSeek en producción
echo "DOC_GENERATOR_AI_PROVIDER=deepseek" >> .env

# DeepSeek API key — debería estar configurada
echo "DEEPSEEK_API_KEY=sk-xxxxx" >> .env
```

---

## 10. Monitoreo post-deploy (primeras 72 horas)

Métricas a vigilar:

| Métrica | Cómo medir | Alerta |
|---|---|---|
| Cron sst-daily | Vercel logs | Falla 2 días seguidos |
| LLM IPERC `/sugerir` | Sentry / logs `[sst/sugerir]` | Latencia > 30s o tasa de error > 10% |
| Audit log de descifrado médico | `SELECT count(*) FROM audit_logs WHERE action LIKE 'sst.%.read'` | Spike inusual = posible exfiltración |
| `MEDICAL_VAULT_KEY` falta | Errores `[medical-vault]` en Sentry | Cualquiera = bloquear y alertar founder |
| Sellos emitidos | `SELECT count(*) FROM audit_logs WHERE action='sst.seal.issued'` | Crecimiento positivo = adopción |

---

## 11. Rollback plan

Si algo sale mal después del deploy:

### 11.1 Rollback de la app

```bash
# Vercel UI → Deployments → último deploy verde → "Promote to Production"
```

### 11.2 Rollback de la migration

⚠️ **DESTRUCTIVE** — solo si NO hay datos SST persistidos:

```sql
-- Ver migration aplicada
SELECT * FROM "_prisma_migrations" WHERE migration_name LIKE '%sst_premium%';

-- Drop tablas SST (orden importa por FKs)
BEGIN;
DROP TABLE IF EXISTS solicitudes_arco CASCADE;
DROP TABLE IF EXISTS consentimientos_ley_29733 CASCADE;
DROP TABLE IF EXISTS emo CASCADE;
DROP TABLE IF EXISTS hallazgos_field_audit CASCADE;
DROP TABLE IF EXISTS visitas_field_audit CASCADE;
DROP TABLE IF EXISTS colaboradores_sst CASCADE;
DROP TABLE IF EXISTS miembros_comite CASCADE;
DROP TABLE IF EXISTS comites_sst CASCADE;
DROP TABLE IF EXISTS investigaciones_accidente CASCADE;
DROP TABLE IF EXISTS accidentes CASCADE;
DROP TABLE IF EXISTS iperc_filas CASCADE;
DROP TABLE IF EXISTS iperc_bases CASCADE;
DROP TABLE IF EXISTS puestos_trabajo CASCADE;
DROP TABLE IF EXISTS sedes CASCADE;
DROP TABLE IF EXISTS catalogo_controles CASCADE;
DROP TABLE IF EXISTS catalogo_peligros CASCADE;
-- Marcar migration como rolled-back
DELETE FROM "_prisma_migrations" WHERE migration_name LIKE '%add_sst_premium%';
COMMIT;
```

Si **HAY** datos SST persistidos: NO rollback. Resolver el bug en código y re-deploy.

---

## 12. Decisiones legales pre-launch

Antes de cobrarle al primer cliente real, **deben quedar firmadas**:

- [ ] Auditoría privacy externa con consultor especializado (Ley 29733).
- [ ] Validación legal del catálogo de 80 peligros + textos del IPERC con SST senior peruano.
- [ ] TyC del producto incluyen disclaimer del módulo SST (responsabilidad final del empleador).
- [ ] Contrato del DPO (interno o externo) firmado para cada org cliente.
- [ ] Backup del `MEDICAL_VAULT_KEY` en gestor enterprise + sello físico.
- [ ] Pentesting del endpoint público `/api/verify/sst/[slug]` (anti-enumeración).

---

## 13. Comandos de un solo golpe (cheat sheet)

```bash
# Deploy completo asumiendo que la migration previa ya está resuelta:
cd legaliapro-platform
npx prisma migrate deploy
psql "$DIRECT_URL" -f prisma/rls-policies.sql
npx prisma db seed
npx vitest run src/lib/sst/        # 186 tests verdes
npm run build                       # build sin errores
git push origin main                # CI/CD de Vercel toma el control
```

---

## 14. Soporte

- **Founder**: a.jaracarranza@gmail.com
- **Audit logs**: queries en `audit_logs` filtrando por `action LIKE 'sst.%'`
- **Sello inválido reportado**: pedir al usuario el slug + screenshot, validar
  contra DB con `SELECT * FROM iperc_bases WHERE id = '<id-extraído-del-payload>'`
