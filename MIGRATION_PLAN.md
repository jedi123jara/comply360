# MIGRATION_PLAN — Auditoría 2026-05-07

> Plan de remediación post-auditoría. 102 hallazgos en 8 olas. ~10 semanas full-time o ~5 con 2 devs en paralelo.
> Branch base: `audit/remediation`.

## ESTADO POST-SESIÓN (2026-05-07, segundo bloque)

**Cerrados: 50 hallazgos** (~50% del audit total).

| Ola | Cerrados | Pendientes principales |
|---|---|---|
| 0 | 10/10 ✅ | — |
| 1 | 5/5 ✅ | — |
| 2 | 6/9 (B,D,E1-4) | 2.A decimal.js, 2.C 12 regímenes, 2.F tests |
| 3 | 5/5 ✅ | (3.A apply masivo a 258 rutas — script de detección listo) |
| 4 | 6/8 (A,B,E,G,H,I) | 4.C download server, 4.D stream re-validate, 4.F /verify, 4.J UI |
| 5 | 6/8 (A×4 crons,B×3,E,H) | 5.A 14 crons, 5.C Redis, 5.D magic bytes, 5.F logger, 5.G CSP |
| 6 | 7/8 (A,B,C,E,F,G,H) | 6.D bulk import streaming |
| 7 | 4/8 (A,E,G,H) | 7.B 28 modelos huérfanos, 7.C 39 RLS, 7.D AuditLog hash, 7.F |
| 8 | 0/3 | tests integración + observabilidad |

**Migrations aplicadas a la DB real:**
- `20260507120000_audit_remediation_schema` — workers RESTRICT + eval_score Decimal
- `20260507130000_audit_indexes_and_fk` — leads/calculations indexes

**Tests:** 1949 verdes. Smoke contra DB real: 32/32.

**Pendientes que requieren refactor mayor (próxima sesión):**
- 2.A `decimal.js` migration (13 calculadoras)
- 2.C 12 regímenes en costo-empleador/vacaciones/boleta/liquidacion
- 3.A `withPlanGate` apply masivo a 258 rutas
- 4.J UI WebAuthn (cablear `tryStrongBiometricCeremony` en BiometricCeremonyModal)
- 5.C migrar rate-limit a Upstash Redis
- 7.B agregar relación `organization` a 28 modelos huérfanos
- 7.C policies RLS para 39 tablas faltantes
- 7.D AuditLog hash chain

## Principios

1. Severidad: legal > seguridad > datos > UX > performance.
2. Fail closed siempre.
3. Cada fix abre PR pequeño con test que reproduce el bug.
4. Cada PR cita ID del hallazgo: `fix(workers): #9 import token HMAC`.
5. Sin merge sin `pnpm build` + `pnpm typecheck` + `pnpm test` verdes.

## Estado por ola

| Ola | Tema | Estado | Hallazgos |
|---|---|---|---|
| 0 | Hotfix express | 🟡 EN CURSO | 10 |
| 1 | Seguridad crítica | ⏳ pendiente | 5 críticos |
| 2 | Legal engine | ⏳ pendiente | 7C + 8A |
| 3 | Auth + plan gate | ⏳ pendiente | 4C + 5A |
| 4 | SST + IA + portal | ⏳ pendiente | 5C + 8A |
| 5 | Infra + crons + email | ⏳ pendiente | 4C + 4A |
| 6 | Workers + legajo | ⏳ pendiente | 5C + 8A |
| 7 | DB hardening | ⏳ pendiente | 3C + 4A |
| 8 | Tests + observabilidad | ⏳ pendiente | gaps cobertura |

## OLA 0 — Hotfix express ✅ CERRADA

| # | Hallazgo | Archivo | Estado |
|---|---|---|---|
| 0.1 | Bucket Supabase público → boletas/DNI accesibles | `src/lib/storage/upload.ts:98,171` | ✅ |
| 0.2 | PUT /complaints sin filtro orgId | `src/app/api/complaints/route.ts:244-282` | ✅ |
| 0.3 | POST /complaints orgId arbitrario | `src/app/api/complaints/route.ts:36,154-166` | ✅ |
| 0.4 | Plan expirado → STARTER (debe ser FREE) | `src/lib/plan-gate.ts:104` | ✅ |
| 0.5 | CTS basura silenciosa fuera de cortes legales | `src/lib/legal-engine/calculators/cts.ts:30-48` | ✅ |
| 0.6 | Liquidación off-by-one ene-abr | `src/lib/legal-engine/calculators/liquidacion.ts:64-75` | ✅ |
| 0.7 | numberToWords sueldoEnLetras roto | `src/lib/templates/org-template-engine.ts:245-279` | ✅ |
| 0.8 | Webhook Culqi no valida monto | `src/app/api/payments/webhook/route.ts:212-260` | ✅ |
| 0.9 | XSS en email templates | `src/lib/email/templates.ts` | ✅ |
| 0.10 | Vacaciones MYPE devuelve 30 días | `src/lib/legal-engine/calculators/vacaciones.ts:47-65` | ✅ |

## OLA 1 — Seguridad crítica ✅ CERRADA

- 1.A ✅ WebAuthn fuerte: nueva función `tryStrongBiometricCeremony()` que usa `credentials.get()` + verifyAndUpdateAuthentication. UI rollout en Ola 4.
- 1.B ✅ RLS: `$queryRaw` con `set_config()` parametrizado. `RLS_ENFORCED=true` para prod.
- 1.C ✅ orgId opaco con `randomUUID()`. Reuse del orgId existente en concurrencia.
- 1.D ✅ Import token con HMAC-SHA256 + IMPORT_TOKEN_SECRET, timingSafeEqual, tope 1000 filas.
- 1.E ✅ Voto Comité: validar `ctx.userId===voter.userId` o `manualTranscription` flag de admin.

**Pendiente Ola 4 (UI):** cablear `tryStrongBiometricCeremony` en `BiometricCeremonyModal` y endpoints `/firmar`/`/aceptar` para que verifiquen credential server-side. Activar `WEBAUTHN_STRICT_VERIFY=true` cuando los workers existentes hayan registrado credenciales.

## OLA 2 — Legal engine

- 2.A Migrar acumuladores a `decimal.js`.
- 2.B Reconciliar dos motores de multa SUNAFIL (usar solo el granular).
- 2.C Soporte completo 12 regímenes en costo-empleador, vacaciones, boleta, liquidación.
- 2.D Aplicar Ley CAS_2026.
- 2.E Otros fixes: indemnización plazo fijo warning, horas extras diarias, asig fam validación, renta 5ta excluir bonif 9%.
- 2.F Tests de calculadoras (gratificación trunca, comisiones, fronteras CTS).

## OLA 3 — Auth + plan gate

- 3.A Plan gate enforcement universal en /api/sst/*, /api/payslips/*, /api/contracts/*, etc.
- 3.B Downgrade enforcement (workers FROZEN_BY_PLAN).
- 3.C Endpoint cancelación cliente + handlers refund/dispute.
- 3.D Race checkout↔webhook + idempotency real con event.id.
- 3.E Resto: $executeRaw tagged, validar assignedTo, /api/sst/colaboradores → withSuperAdmin.

## OLA 4 — SST + IA + portal

- 4.A IA cost control: reset hourly + cablear checkCapacity.
- 4.B PII redaction en chat (callAIRedacted).
- 4.C Document verifier: descargar server-side, no URL pública a OpenAI.
- 4.D Stream SSE re-validación sesión.
- 4.E Medical vault: Vault rotación + detector recursivo + dev fallback hard guard.
- 4.F /verify/sst/[slug]: indexar fingerprint, rate limit, reducir info expuesta.
- 4.G SAT deadline + feriados peruanos.
- 4.H Cascade onboarding atómico.

## OLA 5 — Infra + crons + email

- 5.A claimCronRun en 17 crons restantes.
- 5.B verifyRecaptcha en /complaints, /leads, /portal-empleado.
- 5.C Rate limit en Upstash/Vercel KV.
- 5.D Storage upload magic bytes + tope tamaño.
- 5.E Push notifications payload genérico.
- 5.F Logger sanitization automática.
- 5.G CSP unificada.
- 5.H Webhooks-out jitter.

## OLA 6 — Workers + legajo

- 6.A DNI dígito verificador, fechaCese ≥ fechaIngreso, edad ≥14, email lowercase.
- 6.B Alert engine atómico + unique constraint.
- 6.C Alert engine batch fetch (sin N+1).
- 6.D Bulk import: 1000 filas hard, exceljs streaming.
- 6.E Vacaciones doble/triple automático.
- 6.F Document reject = REJECTED.
- 6.G PII a VIEWER (mascarar DNI, ocultar sueldo).
- 6.H Soft delete cascade + transacciones.

## OLA 7 — DB hardening

- 7.A Worker.organization onDelete: Restrict.
- 7.B 28 modelos huérfanos: agregar `organization Organization @relation`.
- 7.C RLS policies completas (39 tablas faltantes).
- 7.D AuditLog hash chain.
- 7.E Índices faltantes timeline.
- 7.F Migrations cleanup timestamps.
- 7.G Float → Decimal en AiUsage.evalScore.
- 7.H Seed normAlert con upsert.

## OLA 8 — Tests + observabilidad

- 8.A Cobertura faltante: medical-vault, scoring, traceability, calendar-engine, score-calculator, culqi, contract-review, generators.
- 8.B Tests integración con DB real en CI.
- 8.C Sentry residency + métricas custom + alertas internas.
