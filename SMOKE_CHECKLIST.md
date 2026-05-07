# SMOKE CHECKLIST — Validación post-auditoría

> Branch: `audit/remediation` (8 commits sobre `main`).
> Antes de mergear a `main` y deployar, correr estos pasos en orden.
>
> Tiempo estimado: ~30 min.

## 0. Prerrequisitos

- [ ] `pnpm install` (por si hay deps nuevas — no las hay, pero confirmar lockfile sin diff).
- [ ] `.env.local` actualizado:
  - [ ] `IMPORT_TOKEN_SECRET=<openssl rand -base64 32>` (nueva, requerida para bulk import).
  - [ ] Verificar que `MEDICAL_VAULT_KEY` esté seteada si `VERCEL_ENV` también lo está (FIX #4.E es estricto).
  - [ ] `RLS_ENFORCED` puede quedar sin setear (default false; activar solo cuando se complete refactor handlers).
  - [ ] `WEBAUTHN_STRICT_VERIFY` puede quedar sin setear (default false; activar tras enrolment UI).
- [ ] Backup de la DB de producción/staging antes de aplicar migration.

## 1. Aplicar la migration

```bash
pnpm db:migrate
```

Lo que hace `prisma/migrations/20260507120000_audit_remediation_schema`:
- Reescribe `workers.org_id` FK con `ON DELETE RESTRICT` (defensivo — ya estaba así en DB pero el schema declaraba `Cascade`; reconcilia drift).
- Cambia `ai_usage.eval_score` de `DOUBLE PRECISION` a `DECIMAL(5,4)` con cast preservando valores.

**Si falla:** rollback con `pnpm prisma migrate resolve --rolled-back 20260507120000_audit_remediation_schema` y revisar logs. Los datos no se pierden (cast es non-destructive).

## 2. Build + tests automáticos

```bash
pnpm exec tsc --noEmit && pnpm test && pnpm build
```

Esperado: 1949 tests verdes, build exit 0.

## 3. Smoke manual (DEV server)

```bash
pnpm dev
```

### 3.1 — Storage privado (#0.1)

- [ ] Subir un documento a un worker (DNI, contrato, lo que sea).
- [ ] Inspeccionar la URL guardada: debe empezar con `supabase://worker-documents/...` (no URL pública directa).
- [ ] Pedir el documento desde el portal del trabajador → la URL devuelta es signed con `?token=...&expiresAt=...` y dura 1h.
- [ ] **Test negativo:** copiar la URL pública vieja (`https://<proyecto>.supabase.co/storage/v1/object/public/worker-documents/...`) e intentar abrirla en incógnito → 404 o 403 (bucket privado).

### 3.2 — Endpoint denuncias (#0.2 + #0.3)

- [ ] Abrir `/denuncias/<orgId-de-tu-empresa>` y enviar una denuncia → 200 con código `DENUNCIA-2026-XXX`.
- [ ] **Test negativo cross-tenant:** loguearse con user de orgA, abrir DevTools → Network y emitir:
  ```js
  fetch('/api/complaints', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: '<id-de-complaint-de-orgB>', status: 'DISMISSED' })
  })
  ```
  Esperado: **404 "Denuncia no encontrada"**. (Antes: 200 + denuncia ajena modificada).
- [ ] **Test negativo orgId arbitrario:**
  ```js
  fetch('/api/complaints', { method: 'POST', headers: {...}, body: JSON.stringify({type:'ACOSO_LABORAL', description:'x'.repeat(20), orgId:'foo'}) })
  ```
  Esperado: **400** (orgId va por query, no body).

### 3.3 — Calculadora CTS (#0.5)

- [ ] Llamar `calcularCTS({ fechaCorte: '2026-08-15', ... })` → debe lanzar error explícito.
- [ ] `calcularCTS({ fechaCorte: '2026-05-15', ... })` → cálculo correcto.

### 3.4 — Liquidación (#0.6)

- [ ] Liquidar un worker con cese `2026-01-31` → `mesesTruncos = 3` (nov + dic + ene). Antes: 2.

### 3.5 — Vacaciones por régimen (#0.10)

- [ ] Worker MYPE_MICRO con 2 años cumplidos sin gozar → `diasNoGozados = 30` (15 días/año × 2). Antes: 60.

### 3.6 — numberToWords (#0.7)

```ts
import { numberToWords } from '@/lib/templates/org-template-engine'
numberToWords(20)        // "VEINTE CON 00/100 SOLES"  (antes: "VEINTI")
numberToWords(21)        // "VEINTIUNO CON 00/100 SOLES"  (antes: "VEINTIuno")
numberToWords(1500.50)   // "MIL QUINIENTOS CON 50/100 SOLES"
numberToWords(1_500_000_000) // "MIL QUINIENTOS MILLONES CON 00/100 SOLES"
() => numberToWords(-1)  // throw
```

### 3.7 — Plan expirado (#0.4)

- [ ] Setear manualmente en DB `Organization.planExpiresAt` a fecha pasada con `plan: 'PRO'`.
- [ ] Llamar a un endpoint con `withPlanGate('asistente_ia', ...)` → **403** con `currentPlan: 'FREE'` (antes: STARTER).

### 3.8 — Webhook Culqi (#0.8)

- [ ] Simular webhook con `data.amount: 1000` y `metadata.planId: 'PRO'`.
- [ ] Esperado: 500 + DLQ en AuditLog. (Antes: 200 + plan upgrade gratis).

### 3.9 — Email XSS (#0.9)

- [ ] Setear `Organization.name = '<script>alert(1)</script>'`.
- [ ] Disparar `welcomeEmail()` y revisar HTML resultante: el `<script>` debe aparecer escapado como `&lt;script&gt;`.

### 3.10 — DNI validación (#6.A)

- [ ] POST `/api/workers` con `dni: '00000000'` → 400 "DNI inválido (patrón sospechoso)".
- [ ] POST con `dni: '12345678'` → 400.
- [ ] POST con `dni: '45678912'` (random válido) → 201.

### 3.11 — Worker PII para VIEWER (#6.G)

- [ ] Login con un user role VIEWER, GET `/api/workers/<id>`.
- [ ] Esperado: `dni: 'XXXX****'`, `sueldoBruto: null`, `address: null`, `phone: null`, `cuspp: null`, `birthDate: null`, `sueldoMaskedReason: 'VIEWER role — campos sensibles ocultos'`.
- [ ] Mismo GET con role MEMBER → todo visible.

### 3.12 — Voto comité SST (#1.E)

- [ ] Login con rol MEMBER, intentar votar en `/api/sst/comites/<id>/elecciones/voto` con `electorWorkerId` distinto al propio → **403** "VOTE_NOT_AUTHORIZED".
- [ ] Login admin con `manualTranscription: true` → 200, audit log con action `voto.transcrito`.

### 3.13 — Cron idempotency (#5.A)

- [ ] Disparar `GET /api/cron/daily-alerts` 2 veces en el mismo día (con header `Authorization: Bearer ${CRON_SECRET}`).
- [ ] Segunda llamada → respuesta `{ ok: true, duplicate: true, bucket: '...' }`.
- [ ] Verificar en DB que `cron_runs` tiene **1 sola** entrada para hoy.

## 4. Mergear a main

Si todo lo anterior pasó:

```bash
git checkout main
git merge audit/remediation --no-ff
git push origin main
```

## 5. Post-deploy

- [ ] Verificar en Vercel logs que `daily-alerts` y `morning-briefing` corran y devuelvan `duplicate:false` la primera vez del día y `duplicate:true` si Vercel reintenta.
- [ ] Monitor Sentry 24h por errores nuevos.
- [ ] Comunicar a usuarios existentes: "Mejora de seguridad. Storage de boletas ahora privado con URLs de 1h." (no detallar más).

## Olas pendientes (próximos sprints)

Ver `MIGRATION_PLAN.md` — quedan ~70 hallazgos sin atacar:
- Ola 2 (legal engine completo): bloquear antes de scale a clientes con planillas grandes.
- Ola 3.A (plan gate universal): script + apply.
- Ola 4 wiring (WebAuthn UI + RLS handlers).
- Olas 5/6/7/8 completas.
