# Smoke Test 01 — Flow funcional completo SST Premium

> **Objetivo**: validar que los 7 dominios del módulo SST funcionan end-to-end con datos reales en staging antes del primer cliente.
>
> **Tiempo estimado**: 90-120 minutos.
> **Ambiente**: staging (NO producción real, NO dev local).
> **Quién lo ejecuta**: tú (founder) o un dev con acceso admin.
> **Resultado**: este archivo lleno con ✅ / ❌ por cada paso, errores anotados, capturas guardadas en `docs/smoke-tests/screenshots/01/`.

---

## Pre-requisitos

- [ ] Migración `add_sst_premium_schema` aplicada en la DB
- [ ] RLS policies aplicadas (`prisma/rls-policies.sql` ejecutado)
- [ ] `MEDICAL_VAULT_KEY` configurada en Vercel + Bitwarden + papel
- [ ] `CRON_SECRET` configurada en Vercel
- [ ] `DEEPSEEK_API_KEY` configurada
- [ ] Seed ejecutado (80 peligros + 40 controles confirmados)
- [ ] Una organización de pruebas con al menos 5 trabajadores activos en staging
- [ ] Un colaborador SST creado vía `/admin/colaboradores-sst`

**Datos de la org de prueba**:

```
Org ID:        [completar]
Razón social:  [completar]
RUC:           [completar]
Tu user:       [completar]
URL staging:   https://staging.comply360.pe   (o tu dominio de staging)
```

---

## Test 1 — Sede + Puesto + IPERC con LLM

### 1.1 Crear sede

- [ ] Ir a `/dashboard/sst/sedes/nueva`
- [ ] Llenar:
  - Nombre: "Sede de Prueba Smoke Test"
  - Tipo: OFICINA
  - Dirección: "Av. Smoke Test 123"
  - Ubigeo: 150131 (San Isidro Lima)
  - Departamento/Provincia/Distrito: Lima / Lima / San Isidro
- [ ] Click "Crear sede"
- [ ] **Esperado**: redirige a detalle, badge "Activa" verde

**Resultado**: ⬜ OK | ⬜ FALLA

**Si falla, anotar**:
- URL al momento del error: `_______________`
- Mensaje de error: `_______________`
- Network tab response del POST `/api/sst/sedes`: `_______________`

---

### 1.2 Crear puesto en la sede

- [ ] En el detalle de la sede, click "Nuevo puesto"
- [ ] Llenar:
  - Nombre: "Operario de prueba"
  - Tareas: `Operación de máquina X\nMantenimiento preventivo`
  - Marcar flags: ✅ Físico, ✅ Mecánico (alturas), ✅ Ergonómico
- [ ] Click "Crear puesto"
- [ ] **Esperado**: el puesto aparece en la lista de la sede

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 1.3 Crear IPERC v1

- [ ] En el detalle de la sede, click "Crear nueva versión IPERC"
- [ ] **Esperado**: redirect automático a `/dashboard/sst/iperc-bases/[id]` con badge "Borrador"

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 1.4 Sugerencias con IA (DeepSeek)

- [ ] Click "Sugerir con IA"
- [ ] Seleccionar el puesto creado
- [ ] Click "Generar sugerencias"
- [ ] **Esperado**:
  - Latencia 5-30s (DeepSeek V4 1M)
  - 4-8 sugerencias devueltas
  - Cada una con clasificación coloreada (Trivial/Tolerable/Moderado/Importante/Intolerable)
  - Cada una con peligro del catálogo `[FIS-001]`, `[MEC-001]`, etc.
  - Justificación de 1 línea en cursiva
- [ ] Marcar 3 sugerencias y click "Aplicar 3 filas"
- [ ] **Esperado**: las 3 filas aparecen en la matriz con sus índices y NR calculado

**Resultado**: ⬜ OK | ⬜ FALLA

**Métricas a capturar**:
- Latencia LLM (segundos): `_______________`
- Sugerencias devueltas: `_______________`
- Sugerencias descartadas (whitelist): `_______________`

---

### 1.5 Aprobar IPERC

- [ ] Click "Aprobar IPERC"
- [ ] Confirmar diálogo
- [ ] **Esperado**:
  - Badge cambia a "Vigente" verde
  - Botón "Sello QR" aparece
  - Botón "PDF oficial" aparece
  - Banner ámbar "Esta matriz está VIGENTE y no admite cambios" se muestra

**Resultado**: ⬜ OK | ⬜ FALLA

---

## Test 2 — Sello QR + Verificación pública

### 2.1 Generar sello

- [ ] En el IPERC vigente, click "Sello QR"
- [ ] **Esperado**: modal con QR + URL pública + hash SHA-256

**Resultado**: ⬜ OK | ⬜ FALLA

**Datos del sello generado**:
- Hash: `_______________`
- Slug: `_______________`
- URL: `_______________`

---

### 2.2 Descargar PDF oficial

- [ ] Click "PDF oficial"
- [ ] **Esperado**: descarga `iperc-v1-Sede de Prueba.pdf`
- [ ] Abrir el PDF y verificar:
  - [ ] Header con razón social + RUC
  - [ ] Datos generales de la sede
  - [ ] Resumen por clasificación con barras coloreadas
  - [ ] Tabla con las 3 filas + columnas P/Pr/C/E/IP/S/NR
  - [ ] Sección "Sello criptográfico" con QR + hash + URL pública
  - [ ] Espacio de firmas al pie

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 2.3 Verificación pública en incógnito

- [ ] Abrir ventana de incógnito (sin sesión Clerk)
- [ ] Pegar la URL pública del sello
- [ ] **Esperado** en `/verify/sst/[slug]`:
  - [ ] Banner verde "Sello válido"
  - [ ] Tipo de recurso: "Matriz IPERC"
  - [ ] Empresa + RUC visible
  - [ ] Hash SHA-256 mostrado
  - [ ] **NO** aparecen datos de trabajadores ni descripciones detalladas

**Resultado**: ⬜ OK | ⬜ FALLA

### 2.4 Verificación negativa (slug inválido)

- [ ] Misma ventana incógnito
- [ ] Cambiar 1 caracter del slug en la URL → recargar
- [ ] **Esperado**: banner rojo "Sello no válido"

**Resultado**: ⬜ OK | ⬜ FALLA

---

## Test 3 — EMO con cifrado y revelado auditado

### 3.1 Crear EMO

- [ ] Ir a `/dashboard/sst/emo/nuevo`
- [ ] Seleccionar trabajador
- [ ] Llenar:
  - Tipo: PERIODICO
  - Fecha: hoy
  - Centro médico: "Centro de Prueba S.A."
  - Aptitud: APTO_CON_RESTRICCIONES
  - Restricciones: "Evitar cargas mayores a 10kg por 60 días"
  - Próximo examen: 1 año desde hoy
  - ✅ Confirmo consentimiento Ley 29733
- [ ] Click "Registrar EMO"

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 3.2 Confirmar cifrado en BD

Conectarse a la DB con `psql` o cliente Postgres:

```sql
SELECT id, aptitud, octet_length(restricciones_cifrado) as bytes_cifrados
FROM emo
WHERE worker_id = '[ID_DEL_WORKER]'
ORDER BY created_at DESC LIMIT 1;
```

**Esperado**: `restricciones_cifrado` tiene > 50 bytes (no es texto plano).

**Resultado**: ⬜ OK | ⬜ FALLA · `bytes_cifrados`: `___`

---

### 3.3 Revelar restricciones

- [ ] En el detalle del EMO, click "Revelar"
- [ ] **Esperado**: aparece "Evitar cargas mayores a 10kg por 60 días"

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 3.4 Audit log del descifrado

```sql
SELECT user_id, action, entity_id, created_at
FROM audit_logs
WHERE action = 'sst.emo.restricciones.read'
ORDER BY created_at DESC LIMIT 5;
```

**Esperado**: 1 fila con tu userId y timestamp reciente.

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 3.5 Test de campo médico prohibido (regresión)

Desde la consola del navegador (con sesión activa):

```js
fetch('/api/sst/emo', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    workerId: '[ID]',
    tipoExamen: 'PERIODICO',
    fechaExamen: '2026-05-04',
    centroMedicoNombre: 'Test',
    aptitud: 'APTO',
    consentimientoLey29733: true,
    diagnostico: 'asma'  // ← campo prohibido
  })
}).then(r => r.json()).then(console.log)
```

**Esperado**: respuesta `400` con `code: 'FORBIDDEN_MEDICAL_FIELD'` y mensaje claro.

**Resultado**: ⬜ OK | ⬜ FALLA

---

## Test 4 — Accidente con tracking SAT manual

### 4.1 Crear accidente NO_MORTAL

- [ ] Ir a `/dashboard/sst/accidentes/nuevo`
- [ ] Tipo: ACCIDENTE NO MORTAL
- [ ] Sede: la creada en Test 1.1
- [ ] Trabajador: el del EMO
- [ ] Fecha y hora: hace 2 horas
- [ ] Descripción: "Smoke test — accidente de prueba con corte superficial en mano izquierda durante operación de máquina X. Atendido en tópico, no requirió descanso médico."
- [ ] Click "Registrar accidente"

**Esperado**: redirect a detalle del accidente con countdown del plazo SAT visible.

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 4.2 Descargar PDF SAT pre-llenado

- [ ] En el detalle, click "Descargar Formulario N° 3 — Accidente No Mortal"
- [ ] **Esperado**: PDF con:
  - [ ] Aviso legal "Este es un documento de apoyo"
  - [ ] Datos del empleador (RUC, razón social)
  - [ ] Datos de la sede
  - [ ] Datos del trabajador
  - [ ] Descripción del evento
  - [ ] Plazo legal según D.S. 006-2022-TR
  - [ ] Espacio de firma

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 4.3 Registrar tracking manual

- [ ] En el wizard SAT, llenar:
  - Número de cargo SAT: "SAT-2026-TEST-001"
  - Fecha de envío: hoy
- [ ] Click "Guardar tracking"
- [ ] **Esperado**:
  - Estado pasa de PENDIENTE a NOTIFICADO
  - Banner verde "Notificación SAT registrada"
  - Botón "Sello QR" aparece

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 4.4 Investigación de accidente

- [ ] Click "Nueva investigación"
- [ ] Llenar:
  - Fecha: hoy
  - Causa inmediata: "Acto inseguro · Operario no usó guantes de corte"
  - Causa básica: "Factor personal · No completó capacitación SST de la semana"
  - Acción correctiva: "Reforzar capacitación SST" · Responsable: "Jefe de SST" · Plazo: 1 semana
- [ ] Click "Guardar investigación"
- [ ] **Esperado**: aparece la investigación con 3 cards (causas inmediatas, básicas, acciones)

**Resultado**: ⬜ OK | ⬜ FALLA

---

## Test 5 — Comité SST

### 5.1 Instalar comité

- [ ] Ir a `/dashboard/sst/comite`
- [ ] Click "Instalar comité"
- [ ] Fecha de instalación: hoy
- [ ] Click "Crear comité"
- [ ] **Esperado**: vista de comité vigente con mandato 2 años + análisis "Composición incompleta (0 miembros)"

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 5.2 Agregar 4 miembros (paritario)

- [ ] Click "Agregar miembro" → seleccionar Worker A → cargo: PRESIDENTE → origen: REPRESENTANTE_EMPLEADOR
- [ ] Click "Agregar miembro" → Worker B → MIEMBRO → REPRESENTANTE_EMPLEADOR
- [ ] Click "Agregar miembro" → Worker C → SECRETARIO → REPRESENTANTE_TRABAJADORES
- [ ] Click "Agregar miembro" → Worker D → MIEMBRO → REPRESENTANTE_TRABAJADORES
- [ ] **Esperado**: análisis cambia a "Composición paritaria correcta" verde

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 5.3 Validación de cargo único

- [ ] Intentar agregar otro miembro con cargo PRESIDENTE
- [ ] **Esperado**: error "Ya existe un Presidente activo. Da de baja al actual antes de asignar uno nuevo."

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 5.4 Acta de instalación PDF

- [ ] Click "Acta de instalación"
- [ ] **Esperado**: PDF con:
  - [ ] Datos del comité (fechas mandato)
  - [ ] Lista de los 4 miembros con cargo y origen
  - [ ] Texto del acta citando R.M. 245-2021-TR
  - [ ] Espacio para firmas

**Resultado**: ⬜ OK | ⬜ FALLA

---

## Test 6 — Score SST + Exposición económica

### 6.1 Ver score

- [ ] Ir a `/dashboard/sst/score`
- [ ] **Esperado**:
  - [ ] Score global 0-100 visible (probablemente AMARILLO o VERDE con todo lo creado)
  - [ ] Breakdown por dimensión con barras
  - [ ] Si la org no tiene EMO para todos los workers, exposición S/ > 0
  - [ ] Recomendaciones priorizadas (CRITICAL → LOW)

**Resultado**: ⬜ OK | ⬜ FALLA

**Capturas a tomar**:
- Score global obtenido: `___ / 100`
- Semáforo: ⬜ VERDE / ⬜ AMARILLO / ⬜ ROJO
- Exposición S/: `S/ ___`

---

### 6.2 Click en una dimensión

- [ ] Click en la barra "Cobertura EMO"
- [ ] **Esperado**: redirige a `/dashboard/sst/emo`

**Resultado**: ⬜ OK | ⬜ FALLA

---

## Test 7 — Calendarizador / Cron SST

### 7.1 Setear EMO vencido

```sql
UPDATE emo
SET proximo_examen_antes = NOW() - INTERVAL '5 days'
WHERE id = '[ID_EMO_TEST_3]';
```

---

### 7.2 Disparar cron manualmente

```bash
# Reemplazar $CRON_SECRET por el real (NO pegarlo aquí)
curl -X GET https://staging.comply360.pe/api/cron/sst-daily \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Esperado**:

```json
{ "ok": true, "orgs": 1, "creadas": 1, ... }
```

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 7.3 Confirmar alerta creada

```sql
SELECT type, severity, title, due_date
FROM worker_alerts
WHERE org_id = '[ORG_ID]'
  AND type = 'EMO_VENCIDO'
ORDER BY created_at DESC LIMIT 5;
```

**Esperado**: 1 fila con `severity = HIGH` y `title` con el texto del calendar-engine.

**Resultado**: ⬜ OK | ⬜ FALLA

---

### 7.4 Auto-resolve

```sql
-- Restaurar el EMO
UPDATE emo SET proximo_examen_antes = NOW() + INTERVAL '1 year'
WHERE id = '[ID_EMO_TEST_3]';
```

```bash
# Re-disparar cron
curl -X GET https://staging.comply360.pe/api/cron/sst-daily \
  -H "Authorization: Bearer $CRON_SECRET"
```

```sql
SELECT resolved_at, resolved_by FROM worker_alerts
WHERE type = 'EMO_VENCIDO' AND org_id = '[ORG_ID]'
ORDER BY created_at DESC LIMIT 1;
```

**Esperado**: `resolved_at` con timestamp reciente y `resolved_by = 'sst-daily-cron'`.

**Resultado**: ⬜ OK | ⬜ FALLA

---

## Resumen final

```
Test 1 — Sede + Puesto + IPERC + LLM:           ⬜ OK / ⬜ FALLA
Test 2 — Sello QR + Verificación pública:       ⬜ OK / ⬜ FALLA
Test 3 — EMO con cifrado y revelado auditado:   ⬜ OK / ⬜ FALLA
Test 4 — Accidente + SAT manual + Investig.:    ⬜ OK / ⬜ FALLA
Test 5 — Comité SST + Acta PDF:                 ⬜ OK / ⬜ FALLA
Test 6 — Score SST + Exposición:                ⬜ OK / ⬜ FALLA
Test 7 — Cron + Auto-resolve:                   ⬜ OK / ⬜ FALLA
```

### Errores encontrados (lista)

| # | Test | Error | Severidad | Acción |
|---|---|---|---|---|
|   |   |   |   |   |
|   |   |   |   |   |

### Veredicto

⬜ Listo para Test 02 (aislamiento RLS) y luego para primer cliente
⬜ Hay bloqueadores — listar arriba y resolver antes de seguir

**Firmado**: `_______________`  **Fecha**: `_______________`
