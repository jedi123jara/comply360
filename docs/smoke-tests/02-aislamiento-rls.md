# Smoke Test 02 — Aislamiento entre organizaciones

> **Objetivo**: confirmar que un usuario de la org A NO puede ver datos SST de la org B, ni por API ni por queries directas.
>
> **Por qué importa**: este es el smoke test crítico antes de cualquier cliente real. Si esto falla, hay una brecha de aislamiento de datos entre clientes.
>
> **Tiempo estimado**: 30-45 minutos.
> **Pre-requisito**: Test 01 completado en verde.

---

## Setup — crear dos organizaciones de prueba

### Org A (la víctima)

- [ ] Sign up con email `smoke-org-a@comply360.test`
- [ ] Crear org con razón social "Empresa Smoke A S.A.C."
- [ ] RUC ficticio: 20111111111
- [ ] Crear sede: "Sede A — confidencial"
- [ ] Crear EMO con restricciones: "DATO SECRETO ORG A — no debe verse desde otra org"

**Datos**:
- Org ID A: `_______________`
- User A email: `_______________`
- Sede ID A: `_______________`
- EMO ID A: `_______________`

---

### Org B (el atacante)

- [ ] Sign up con email diferente `smoke-org-b@comply360.test`
- [ ] Crear org con razón social "Empresa Smoke B S.A.C."
- [ ] RUC ficticio: 20222222222
- [ ] Crear su propia sede para que el dashboard no esté vacío

**Datos**:
- Org ID B: `_______________`
- User B email: `_______________`
- Sede ID B: `_______________`

---

## Test A — Aislamiento por API (HTTP)

### A.1 GET /api/sst/sedes desde org B

Logueado como User B:

- [ ] Abrir `/dashboard/sst/sedes` en el navegador
- [ ] **Esperado**: solo se ve la sede B. La sede A NO aparece.

**Resultado**: ⬜ OK | ⬜ FALLA — cantidad de sedes visibles: `___`

---

### A.2 GET directo del ID de sede A

Logueado como User B, pegar en la barra de direcciones:

```
/dashboard/sst/sedes/[ID_SEDE_A]
```

**Esperado**: error 404 "Sede no encontrada".

**Resultado**: ⬜ OK | ⬜ FALLA · status code: `___`

---

### A.3 Llamar API directamente con curl

Capturar la cookie de sesión de User B (DevTools → Application → Cookies → buscar `__session` o `__clerk_session`):

```bash
curl -X GET "https://staging.comply360.pe/api/sst/sedes" \
  -H "Cookie: __session=[COOKIE_USER_B]" \
  | jq '.sedes | length'
```

**Esperado**: 1 (solo sede B). NO 2.

**Resultado**: ⬜ OK | ⬜ FALLA · count: `___`

---

### A.4 Acceso directo al EMO de Org A

```bash
curl -X GET "https://staging.comply360.pe/api/sst/emo/[ID_EMO_A]" \
  -H "Cookie: __session=[COOKIE_USER_B]"
```

**Esperado**: 404.

**Resultado**: ⬜ OK | ⬜ FALLA · status: `___`

---

### A.5 Intento de descifrado cross-tenant

```bash
curl -X GET "https://staging.comply360.pe/api/sst/emo/[ID_EMO_A]?descifrar=1" \
  -H "Cookie: __session=[COOKIE_USER_B]"
```

**Esperado**: 404 sin filtrar el contenido.

**Resultado**: ⬜ OK | ⬜ FALLA · ¿devolvió las restricciones de A?: ⬜ NO / ⬜ SÍ (BRECHA CRÍTICA)

---

### A.6 Intento de listar EMO de Org A vía workerId

Si Worker X pertenece a Org A:

```bash
curl -X GET "https://staging.comply360.pe/api/sst/emo?workerId=[WORKER_X_DE_ORG_A]" \
  -H "Cookie: __session=[COOKIE_USER_B]"
```

**Esperado**: lista vacía (`{ "emos": [], "total": 0 }`).

**Resultado**: ⬜ OK | ⬜ FALLA · cantidad devuelta: `___`

---

### A.7 IPERC, accidentes, comité, visitas — similares

Repetir el mismo patrón para los 6 endpoints SST principales:

| Endpoint | URL probada | Resultado esperado | OK / FALLA |
|---|---|---|---|
| GET /api/sst/iperc-bases | con cookie B | sedes B vacías o con sus IPERC, NO los de A | ⬜ |
| GET /api/sst/iperc-bases/[ID_IPERC_A] | con cookie B | 404 | ⬜ |
| GET /api/sst/accidentes | con cookie B | sin accidentes de A | ⬜ |
| GET /api/sst/accidentes/[ID_ACC_A] | con cookie B | 404 | ⬜ |
| GET /api/sst/comites | con cookie B | sin comité de A | ⬜ |
| GET /api/sst/visitas | con cookie B | sin visitas de A | ⬜ |
| GET /api/sst/score | con cookie B | score solo de B | ⬜ |

---

## Test B — Sello QR público (sin auth)

El endpoint `/api/verify/sst/[slug]` es público por diseño. Aquí queremos verificar que **expone solo metadata mínima**, no datos sensibles.

### B.1 Generar sello del IPERC de Org A

Logueado como User A, descargar el sello QR del IPERC de A. Anotar:
- Slug: `_______________`
- URL pública: `_______________`

---

### B.2 Verificar desde incógnito

- [ ] Abrir ventana incógnito (sin sesión)
- [ ] Pegar la URL pública

**Datos que SÍ deben aparecer** (público por diseño):
- ✅ Razón social + RUC de Org A
- ✅ Tipo de recurso (IPERC v1)
- ✅ Hash SHA-256

**Datos que NO deben aparecer**:
- ❌ Descripciones detalladas de las filas IPERC
- ❌ Valores específicos de los índices P×S
- ❌ Datos de trabajadores (DNI, nombres)
- ❌ Datos médicos
- ❌ Direcciones internas
- ❌ Cualquier información de la Org B (debería ser irrelevante)

**Resultado**: ⬜ OK | ⬜ FALLA · ¿qué datos sensibles aparecieron?: `_______________`

---

### B.3 Anti-enumeración

Probar slugs cercanos al real:

- [ ] Cambiar 1 caracter del slug → recargar
- [ ] Cambiar 2 caracteres → recargar
- [ ] Probar `/verify/sst/IXXXXXXXXXXX` aleatorio

**Esperado**: todos devuelven `valid: false` con el mismo mensaje genérico ("Sello no válido o registro no encontrado"). NO debe filtrar diferencias entre "no existe" y "tipo incorrecto".

**Resultado**: ⬜ OK | ⬜ FALLA

---

## Test C — Aislamiento por DB directa (queries SQL)

### C.1 Verificar RLS habilitado

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN (
  'sedes','puestos_trabajo','iperc_bases','iperc_filas',
  'accidentes','investigaciones_accidente','comites_sst',
  'miembros_comite','visitas_field_audit','hallazgos_field_audit',
  'emo','consentimientos_ley_29733','solicitudes_arco'
)
ORDER BY tablename;
```

**Esperado**: las 13 con `rowsecurity = true`.

**Resultado**: ⬜ OK | ⬜ FALLA · tablas sin RLS: `_______________`

---

### C.2 Confirmar BYPASSRLS del rol postgres (esperado)

```sql
SELECT rolname, rolbypassrls FROM pg_roles
WHERE rolname IN ('postgres', 'authenticator', 'service_role', 'authenticated', 'anon');
```

**Esperado** (ambiente Supabase normal):
- `postgres` → bypassrls=true
- `service_role` → bypassrls=true
- `authenticated` → bypassrls=false
- `anon` → bypassrls=false

**Esto confirma**: las policies funcionan SOLO si la conexión usa `authenticated` o `anon`. Las queries Prisma del backend (que usan `postgres`) bypassan RLS — el aislamiento real lo hace `withAuth()` + filter `orgId` en código.

**Resultado**: ⬜ OK | ⬜ FALLA — anotar lista real: `_______________`

---

### C.3 Test simulado de RLS efectivo

Simular cómo se vería si en el futuro se usa un rol restringido:

```sql
-- Crear rol temporal para test (solo para ESTE smoke test)
SET LOCAL ROLE authenticated;
SET LOCAL app.current_org_id = '[ORG_ID_B]';

-- Intentar leer sedes de Org A
SELECT count(*) FROM sedes WHERE org_id = '[ORG_ID_A]';
-- Esperado con RLS efectivo: 0
```

**Resultado**: ⬜ OK (count = 0) | ⬜ FALLA (count > 0)

```sql
-- Cleanup
RESET ROLE;
RESET app.current_org_id;
```

---

## Test D — Audit log no expone datos cross-tenant

### D.1 User B no debe ver audit logs de A

Logueado como User B, abrir la consola del navegador:

```js
fetch('/api/audit-logs').then(r => r.json()).then(j => {
  const ofA = (j.logs ?? []).filter(l => l.orgId === '[ORG_ID_A]')
  console.log('Logs de A vistos por B:', ofA.length)
})
```

(Si no existe ese endpoint, hacer la query directa a la DB con el rol `authenticated` simulado.)

**Esperado**: 0.

**Resultado**: ⬜ OK | ⬜ FALLA

---

## Resumen y veredicto

```
Test A — API HTTP cross-tenant:                 ⬜ OK / ⬜ FALLA
Test B — Sello público sin filtraciones:        ⬜ OK / ⬜ FALLA
Test C — RLS configurado (aunque bypaseado):    ⬜ OK / ⬜ FALLA
Test D — Audit logs sin cross-tenant:           ⬜ OK / ⬜ FALLA
```

### Si todo OK

✅ El módulo SST tiene aislamiento robusto de tenants. Defense-in-depth via `withAuth()` + filter `orgId` está funcionando correctamente.

Documentar en `DEPLOY-SST.md`: "Smoke test de aislamiento ejecutado el [FECHA] por [NOMBRE]. Resultado: PASA. Próxima ejecución antes del primer cliente enterprise o cada 3 meses, lo que ocurra primero."

### Si algo falla

🚨 **Detener todo deploy a producción real**. Las fallas de aislamiento son P0:

1. Identificar el endpoint exacto que filtró datos cross-tenant.
2. Revisar el código de ese endpoint — buscar la query Prisma sin `where: { orgId }`.
3. Fix inmediato + agregar test unitario que cubra el caso.
4. Re-ejecutar este smoke test completo.

---

### Cleanup post-test

Después de pasar el test, eliminar las orgs A y B de staging:

```sql
DELETE FROM organizations WHERE id IN ('[ORG_ID_A]', '[ORG_ID_B]');
-- Cascada borra todo lo asociado por las relaciones onDelete: Cascade
```

**Firmado**: `_______________`  **Fecha**: `_______________`
