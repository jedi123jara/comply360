# Resumen de la auditoría 2026-06 — punto por punto

> Guía de estudio de todo lo aplicado en la rama `fix/orgchart-hierarchy-view`
> (PR #34). 29 commits, 2039 tests en verde, tsc 0, 69 migraciones aplicadas.

---

## A. Correctitud de cálculos de DINERO (lo más importante)

**A1. Prima del seguro AFP: 1.84% → 1.37%.**
El motor cobraba 1.84% (tasa de 2023). La vigente es **1.37%** (licitación SISCO VIII,
2025–2026). Base: SBS. Afecta el neto de **toda boleta AFP**.

**A2. Tope de la prima en la RMA.**
La prima ahora se cobra **solo hasta la Remuneración Máxima Asegurable** que publica la
SBS cada trimestre (Q2 2026 = S/ 12,598.91), no sobre toda la remuneración. El aporte 10%
y la comisión NO se topan. Antes se sobrecobraba a sueldos altos. Base: SBS; D.S. 054-97-EF.

**A3. Comisión por flujo por AFP — la corrección más grande.**
Estaba ~1 punto baja (Prima 0.18% cuando lo real es 1.60%). Corregida a los valores SBS:
Habitat 1.47%, Integra 1.55%, Prima 1.60%, Profuturo 1.69%. Centralizada en `peru-labor.ts`
y usada por boletas **y** PLAME (antes divergían). Supuesto: esquema "comisión por flujo"
(no mixta) — a confirmar con asesor.

**A4. Indemnización MYPE por régimen (Ley 32353).**
La liquidación aplicaba siempre 1.5 sueldos/año (régimen general), también a MYPE,
sobrevaluando hasta ~4.5x. Corregido: MYPE_MICRO = 10 jornales/año (tope 90),
MYPE_PEQUENA = 20 jornales/año (tope 120).

**A5. Horas extras 25%/35% en liquidación.**
Pagaba todo al 25%. Ahora admite distribución por tramo (25% las 2 primeras h/día, 35%
las siguientes); sin distribución aplica el mínimo 25% documentado. Base: D.S. 007-2002-TR.

**A6. Jornada nocturna — piso RMV + 35% (feature nueva, end-to-end).**
La sobretasa nocturna del 35% es un **PISO de remuneración** (RMV + 35% = S/ 1,525.50),
**no un recargo** sobre el sueldo. Confirmado con Art. 8 D.S. 007-2002-TR y Cas. Lab.
14239-2015-Lima. Si un trabajador nocturno gana menos, sale un **aviso de cumplimiento**
(no se ajusta el pago solo). Incluye: campo `turnoNocturno` en el trabajador, checkbox en
alta/edición, y el aviso al generar la boleta.

**A7. Renta 5ta — bonificaciones habituales vs extraordinarias (feature nueva).**
Una bonificación recurrente se proyectaba como evento único → subdeclaraba la renta y
retenía de menos (el trabajador quedaba debiendo al cierre del año). Ahora: la **habitual**
se anualiza ×12; la **extraordinaria** se suma 1 vez. Dos campos en el form de boleta.
Base: Art. 40 Reglamento del IR.

**A8. CTS / vacaciones / gratificación / liquidación (correcciones varias).**
Fechas TZ-safe (corrige off-by-one de zona horaria), truncas acotadas por fecha de ingreso,
escaladas por régimen (MYPE/doméstico 15 días vacaciones), indemnización con treintavos por
días, EsSalud agrario al 6% (Ley 31110). Tope de utilidades por remuneración mensual real
(no total/12) — corrige el caso de quien trabajó <12 meses.

**A9. Comentario obsoleto multa-SUNAFIL.**
El comentario decía "tope 52.53 UIT"; el código aplica el tope vigente de 200 UIT
(correcto). Solo se aclaró el comentario.

---

## B. Integridad / atomicidad (anti pérdida de datos)

**B1.** Voto del Comité SST (portal + admin): lectura-escritura atómica con `SELECT … FOR
UPDATE` → ya no se pierden votos ni hay doble voto bajo concurrencia.

**B2.** Firma de contrato, aceptación de boleta, aprobación de solicitudes de trabajador:
`updateMany` condicional (check-and-set atómico) → no se duplica el audit trail ni la
cascada ante doble-tap; responde 409 si ya fue procesado.

**B3.** Código de denuncia y certificado E-Learning: reintento ante colisión de `@unique`
(antes 500 + dato perdido) + idempotencia (no doble certificado).

**B4.** Un solo `contrato_trabajo` por trabajador (#10): helper compartido + índice único
PARCIAL en la BD → elimina documentos duplicados ante doble request.

---

## C. Seguridad multi-tenant

**C1.** Portal Contador (consultor): fuga cross-tenant cerrada; luego la feature completa
fue **eliminada** (ver sección F).

**C2.** `workflows/execute` valida que el workflow pertenezca a la org; `sunat-sol/receive`
sin fallback peligroso; 7 crons cross-org endurecidos (fail-closed).

**C3.** Pagos: idempotencia anti doble-cobro; plan EMPRESA superset de PRO.

**C4.** Secretos versionados redactados de `DEPLOY-STATUS.md` (rotación pendiente del dueño).

**C5. RLS — cobertura 100%.** Auditoría contra Supabase encontró 18 de 85 tablas con
`org_id` sin política; se cubrieron todas. Ahora 85/85. Listo para activar `RLS_ENFORCED=true`
(ver runbook). Script reutilizable: `scripts/security/rls-audit.mjs`.

---

## D. Validación de entrada

**D1.** Schemas **zod** en rutas mutadoras (alta/edición de workers, vacaciones,
payslips/batch): valida enums/fechas/días → 400 estructurado en vez de 500 o datos
corruptos. Permisivo con los campos extra que ya manda el frontend.

---

## E. Performance

**E1.** N+1 eliminados: generación masiva de boletas (createMany), acuses de documentos,
patrones de asistencia, y los calendarios de acuses (groupBy / findMany + Set).

**E2.** Historial del trabajador: antes cargaba TODO en memoria para devolver una página;
ahora acota la carga a `skip+pageSize` por fuente (respuesta idéntica). Tope defensivo en
pay-equity. El export masivo se dejó sin cap a propósito (truncaría exports legítimos) →
follow-up: streaming.

---

## F. Eliminación del Portal Contador

Se removió por completo la feature del portal para contadores externos: rutas API, página,
landing de marketing, modelo Prisma `ConsultorClient` + relaciones, ruta pública, y la
tabla `consultor_clients` (dropeada). NO se tocaron los usos incidentales de "consultor"
(cargo en organigramas/plantillas) ni los campos de contacto del contador de la empresa.

---

## G. Verificación

**G1.** `tsc --noEmit`: 0 errores en cada paso.

**G2.** Suite de tests: 1991 → **2039** (se agregaron tests en cada fix). 0 fallos de
aserción. (18 archivos fallan al importar sin `DATABASE_URL` en el proceso de vitest —
preexistente, no es regresión.)

**G3. Smoke-test de dinero:** 6 escenarios reales de boleta (`boleta-escenarios-reales.test.ts`)
generados con el motor real, verificando AFP/prima/comisión/tope RMA/ONP/nocturna/renta
split. Todos los números cuadran.

---

## H. Migraciones de BD aplicadas esta sesión

1. `remove_consultor_portal` — dropea la tabla `consultor_clients`.
2. `add_worker_turno_nocturno` — campo de jornada nocturna.
3. `unique_contrato_trabajo_per_worker` — dedup + índice único parcial (#10).
4. `rls_cobertura_18_tablas` — RLS en las 18 tablas que faltaban.

---

## I. Lo que queda — acciones del DUEÑO

1. **Activar `RLS_ENFORCED=true`** (staging → prod, ver `docs/security/rls-activacion-runbook.md`).
   La cobertura ya está al 100%.
2. **Validar las tasas AFP con tu asesor** (ver `docs/validacion-asesor-afp-2026-06.md`) —
   confirmar prima 1.37%, comisiones, y el supuesto flujo-vs-mixta.
3. **Mergear el PR #34** a `main` con el OK del asesor.
4. **Rotar secretos** + purgar historial git cuando metas data real (ver
   `docs/security/ROTACION-SECRETOS-2026-06-18.md`).

---

## J. Notas de mantenimiento

- La **RMA cambia cada trimestre** y la **comisión AFP** puede cambiar mensualmente —
  actualizar las constantes en `src/lib/legal-engine/peru-labor.ts` (`PRIMA_SEGURO_SPP`,
  `REMUNERACION_MAXIMA_ASEGURABLE`, `COMISION_FLUJO_AFP`) cuando la SBS publique nuevos valores.
- Follow-ups técnicos abiertos: streaming del export masivo; surfacing del aviso de jornada
  nocturna en la vista de la boleta (hoy se muestra al generar); reconciliar el resto de
  constantes de PLAME con el motor si se requiere.
