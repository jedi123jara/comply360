# 🏛️ Plan "Nivel Dios" — Excelencia de Comply360

> Generado en la sesión autónoma 2026-06-18/19. Objetivo del dueño: **sin features
> nuevas**, llevar la plataforma a que **funcione correctamente, robusta y mantenible**.
> Este plan parte de DOS auditorías multi-agente profundas (seguridad/multi-tenant y
> correctitud función-por-función) con verificación adversarial de cada hallazgo.

---

## 0. Lo que YA quedó hecho y verificado (esta sesión)

Todo aplicado en el working tree, **sin commitear** (tú decides), con `tsc` 0 errores,
**327 tests del motor legal + suites de pagos/crons en verde, 0 fallos de aserción**.

**Correctitud de cálculos legales (dinero real):**
- CTS: ya no sobrepaga ~14 días en semestre completo + bug de zona horaria corregido.
- Vacaciones truncas: escalan por régimen (MYPE/doméstico 15 días) — fin del sobrepago 2×.
- Liquidación (el módulo más débil) — 6 fixes: fechas TZ-safe, CTS trunca acotada por
  ingreso, vacaciones truncas y no-gozadas por régimen, gratificación trunca acotada por
  ingreso, e indemnización con treintavos por días. +3 tests que bloquean la regresión.
- `calcularPeriodoLaboral` (helper compartido): corregido el off-by-one de zona horaria
  que afectaba liquidación, vacaciones e indemnización.
- EsSalud agrario alineado a 6% (Ley 31110, fuente de verdad).

**Integridad / atomicidad (anti pérdida de datos):**
- Voto del Comité SST (portal trabajador + admin): lectura-escritura atómica con
  `SELECT … FOR UPDATE` → ya no se pierden votos ni hay doble voto bajo concurrencia.
- Firma de contrato y aceptación de boleta: `updateMany` condicional → no se duplica el
  audit trail ni la cascada/evento ante doble-tap.
- Código de denuncia: reintento ante colisión de `@unique` (antes 500 + denuncia perdida).

**Seguridad / multi-tenant:**
- Portal Contador: fuga cross-tenant cerrada (altas pendientes de consentimiento).
- `workflows/execute` valida la org del workflow; `sunat-sol/receive` sin fallback peligroso.
- 7 crons cross-org endurecidos (fail-closed + `runUnsafeBypass`).
- Pagos: idempotencia anti-doble-cobro; EMPRESA superset de PRO; `check-trials` robusto.
- Validación de montos en la liquidación de cese (no acepta negativos/NaN).

**Hygiene:** voseo corregido en copy de UI; secretos de `DEPLOY-STATUS.md` redactados
(+ checklist de rotación en `docs/security/ROTACION-SECRETOS-2026-06-18.md`); scripts
debug de la raíz eliminados; `DEFECTS.md` actualizado.

---

## 1. Pendientes confirmados por la auditoría (priorizados)

### P0 — Acción del dueño (no puedo hacerlo yo)
1. **Rotar secretos comprometidos** + purgar historial git. Ver `docs/security/ROTACION-SECRETOS-2026-06-18.md`.
2. **Neutralizar relaciones consultor ya activas**: `UPDATE consultor_clients SET is_active=false;` en Supabase, y luego construir el flujo de consentimiento real (migración `status`/`acceptedAt` + aceptación por la empresa cliente).
3. **Activar RLS en producción** (`RLS_ENFORCED=true`) una vez verificado que todas las tablas tenant tienen `ENABLE ROW LEVEL SECURITY` + policy. Hoy la única defensa es el filtrado por `orgId` en el código; RLS es la red de seguridad. Ya dejé los crons cross-org listos para ese modo.

### P1 — Correctitud que aún falta (yo puedo hacerlo; requieren dato o decisión)
4. **AFP — tope de Remuneración Máxima Asegurable (RMA)** en el seguro de invalidez/sobrevivencia (`aportes-previsionales.ts:90`). Hoy se cobra 1.84% sobre toda la remuneración; legalmente solo hasta la RMA que publica la SBS trimestralmente (~S/ 13k). **Necesito el valor RMA 2026 vigente** para agregar la constante y el `min(rem, RMA)`. Afecta boletas de sueldos altos.
5. **Indemnización MYPE** en liquidación (`liquidacion.ts`): usa siempre 1.5 sueldos/año (régimen general). MYPE_MICRO = 10 rem diarias/año, MYPE_PEQUENA = 20 (Ley 32353, constantes ya existen en `peru-labor.ts`). Ramificar por régimen con su tope. (Sobrevalúa la indemnización MYPE.)
6. **Liquidación — horas extras 25%/35%**: paga todo al 25%. El input es un escalar sin distribución diaria, así que el fix correcto es exigir distribución diaria o documentar que se usa el mínimo 25%. Decidir contrato del input.

### P1 — Robustez/atomicidad que puedo hacer ya (bajo riesgo)
7. **Aprobación de solicitud de trabajador** (`workers/requests/route.ts`): check-then-act no atómico → `updateMany({ where: { id, status: 'PENDIENTE' } })`. (1 línea.)
8. **Certificado E-Learning** (`courses/[id]/exam/route.ts`): code por `count()` colisiona + falta idempotencia (doble certificado). Mismo patrón de reintento + verificar `enrollment.certificateId` previo, todo en `$transaction`.
9. **Validación de input con zod** en rutas mutadoras: `workers` (alta/PATCH: fechas/enums sin validar → 500), `vacaciones` (días sin validar → balance corrupto), `payslips/batch` (workerIds sin validar). Adoptar un schema zod por ruta (capa compartida).
10. **Vinculación contrato-trabajador** (`contracts/[id]/link-worker`): `WorkerDocument 'contrato_trabajo'` findFirst-then-create sin unique → documentos duplicados. Usar upsert por `(workerId, documentType)`.

### P2 — Performance (correcto pero lento; cosmético para "perfección")
11. **N+1 restantes**: `calendar/extended-sources.ts:237` (worker.count invariante en bucle + counts por doc → 1 query + `groupBy`); `mi-portal/calendar/route.ts:151` (findUnique de ack por doc → 1 findMany + Set).
12. **Paginación real**: `workers/[id]/history` (carga todo y pagina en memoria; PRO `historial_infinito` sin tope), `compliance/pay-equity` y `export` (findMany sin take).

### P3 — Pulido legal (LOW; varios requieren confirmar criterio con abogado)
13. Horas extras: jornada fija 240h/mes ignora part-time/jornada distinta; **sobretasa nocturna 35% definida pero nunca aplicada**.
14. Utilidades: tope de 18 remuneraciones divide siempre entre 12 (distorsiona para <12 meses trabajados).
15. Renta 5ta: bonificación habitual del mes se proyecta como evento único anual (subdeclara si es recurrente). Documentar el contrato del campo `bonificaciones`.
16. Indemnización plazo fijo: redondea cualquier fracción de día a un mes completo.
17. `multa-sunafil.ts:123`: comentario obsoleto dice "tope 52.53 UIT" pero el código aplica 200 UIT (correcto). Corregir el comentario.

---

## 2. Mejoras arquitectónicas "nivel dios" por subsistema

### A. Motor legal (`src/lib/legal-engine`)
- **Eliminar la duplicación de cálculo** (CLAUDE.md §7): `liquidacion.ts` reimplementa CTS/grati/vacaciones/indemnización en vez de reusar las calculadoras dedicadas — fue la causa raíz de casi todos los bugs de esta auditoría. Refactor objetivo: que `liquidacion` **delegue** en `calcularVacaciones`/`calcularGratificacion`/`calcularIndemnizacion` (ya régimen-aware y testeadas), dejando en liquidación solo la orquestación + CTS trunca. Esto previene que los bugs reaparezcan.
- **Centralizar el manejo de fechas civiles**: extraer un único `parseCivilDate`/`calcularPeriodoLaboral` TZ-safe (ya corregido) y prohibir `new Date(dateOnly).getMonth()/getDate()` en el engine (lint rule custom en `src/eslint-rules`).
- **Tabla de constantes versionada por año** (RMV, UIT, RMA, topes, tasas AFP): hoy están dispersas; un único `PERU_LABOR_2026` con citas legales y un test que valide coherencia (p.ej. EsSalud agrario = constante, no magic number).

### B. Atomicidad / concurrencia
- **Patrón único "claim atómico"**: helper compartido para check-then-act (`updateMany` condicional → 409 si count 0). Aplicarlo a todas las mutaciones de estado (firma, aceptación, aprobación, voto). Ya aplicado en contrato/boleta/voto.
- **Votos del Comité como tabla relacional** con `@@unique([recordId, electorWorkerId])` (en vez de JSON): elimina de raíz el lost-update; el `FOR UPDATE` actual es la mitigación interina.
- **Idempotencia de pagos con tabla `PaymentAttempt`** (clave de idempotencia única) en vez del guard por ventana de AuditLog (interino). Cierra la ventana de carrera sub-50ms.

### C. Validación de entrada
- **Capa zod por ruta**: un `parse(req.json())` con schema en cada handler mutador, devolviendo 400 estructurado. Hoy muchas rutas confían en el body crudo → 500 o datos corruptos. Es el cambio de mayor impacto en robustez percibida.

### D. Observabilidad
- Asegurar Sentry en todos los `catch` de rutas API (varios solo `console.error`).
- Métricas de cron ya existen (`withCronIdempotency`); migrar los crons restantes que aún usan auth manual a ese wrapper para uniformar métricas + idempotencia.
- Log estructurado (no PII) en mutaciones de dinero/firma para auditoría.

### E. Testing (la red de seguridad)
- **Fijar `TZ` no-UTC en la config de tests** (`process.env.TZ='America/Lima'`) — habría atrapado todos los off-by-one de fecha. Riesgo: puede surfacear fallos latentes en tests que asumen UTC; hacerlo y triagear.
- **Matriz de régimen** en los tests de cálculo (GENERAL/MYPE/DOMÉSTICO/AGRARIO), no solo GENERAL.
- **Tests de concurrencia** para las mutaciones atómicas (dos requests simultáneos).
- **Hermeticidad**: 18 archivos `.test.ts` fallan sin `DATABASE_URL` (no mockean Prisma). Decidir: mockear Prisma o moverlos a `vitest.integration.config.ts`.
- **Tests de integración de pagos y firma** (hoy inexistentes para el flujo end-to-end).

### F. Seguridad (más allá de lo ya hecho)
- Rate-limit de `complaints`: hoy se llavea por IP porque lee el param `orgId`/header `x-org-id` pero la ruta usa el param `org` → revisar `getOrgId`.
- Revisar CSP (`proxy.ts`) — `'unsafe-inline'`/`'unsafe-eval'` en script-src; endurecer con nonces si es viable.
- Tokens de extensión Chrome por-org (hoy `EXTENSION_TOKEN` es compartido).

---

## 3. Roadmap sugerido

| Fase | Items | Por qué primero |
|---|---|---|
| **Ahora (tú)** | P0: rotar secretos, neutralizar consultor, plan RLS | Seguridad viva; solo tú tienes acceso |
| **Sprint 1 (correctitud)** | P1 #4-#10 + refactor liquidación (A) + zod (C) | Cierra los últimos cálculos errados y la robustez de input |
| **Sprint 2 (integridad)** | Tabla votos relacional + `PaymentAttempt` (B) | Elimina de raíz los lost-update/doble-cobro |
| **Sprint 3 (calidad)** | Testing (E) + observabilidad (D) + N+1 (P2) | Red de seguridad + performance |
| **Continuo** | P3 pulido legal con tu abogado | Requiere criterio jurídico |

> Puedo ejecutar cualquier ítem P1/P2 marcado como "puedo hacerlo ya" cuando me digas.
> Los que requieren un dato (RMA 2026) o decisión (criterio horas extras, RLS) los dejo
> señalados para que los confirmes.
