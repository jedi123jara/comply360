# Validación con asesor laboral — Cambios AFP en planilla (jun-2026)

> **Para qué es esto:** Comply360 corrigió las tasas previsionales (AFP) que usaba el
> motor de boletas. Estos cambios afectan el **neto de toda boleta de afiliado AFP** y
> el PLAME. Antes de emitir boletas reales, necesitamos tu confirmación en **3 puntos**.
> Todo está respaldado por la SBS; abajo dejamos las fuentes y un ejemplo concreto.

---

## Los 3 cambios

### 1. Prima del seguro de invalidez/sobrevivencia: 1.84% → **1.37%**
El sistema cobraba **1.84%** (tasa de 2023). La vigente es **1.37%**, resultado de la
licitación **SISCO VIII**, válida del **1-ene-2025 al 31-dic-2026** (igual para todas las AFP).
- Fuente: SBS — comisiones y prima del SPP.

### 2. Tope de la prima en la Remuneración Máxima Asegurable (RMA)
La prima ahora se cobra **solo hasta la RMA** que publica la SBS **cada trimestre**, no
sobre toda la remuneración. Valor vigente **Q2 2026 (abr–jun) = S/ 12,598.91**.
(Q1 2026 = S/ 12,209.11; Jul–Sep 2025 = S/ 12,184.88.)
- El **aporte obligatorio (10%)** y la **comisión** NO se topan: van sobre la remuneración completa.
- Fuente: SBS — Remuneración Máxima Asegurable (se actualiza trimestralmente).

### 3. Comisión por flujo por AFP — **CORRECCIÓN MÁS IMPORTANTE**
El sistema tenía valores **claramente errados** (ej. Prima 0.18%). Se corrigieron a los
valores SBS vigentes (jun-2026):

| AFP | Comisión por flujo |
|---|---|
| Habitat | **1.47%** |
| Integra | **1.55%** |
| Prima | **1.60%** |
| Profuturo | **1.69%** |

- Fuente: SBS — comisiones del SPP (mensual).

---

## ⚠️ EL PUNTO #1 A RESOLVER — esquema de comisión (flujo vs saldo)

La **comisión mixta se extinguió en feb-2023**. Hoy coexisten dos esquemas:

- **Comisión por flujo:** % sobre la remuneración bruta mensual → **se descuenta en la
  boleta** (los valores 1.47%–1.69% de arriba).
- **Comisión por saldo:** % anual sobre el fondo acumulado → **NO se descuenta del sueldo**
  (se cobra contra el fondo). Sobre el sueldo mensual es **0%**.
- **Los afiliados NUEVOS van por defecto a "comisión por saldo".** Pueden pedir pasarse a flujo.

**Cómo lo trata el sistema hoy:** asume que **TODOS** pagan comisión **por flujo** (descuenta
1.47–1.69% en cada boleta). **Para un trabajador en "por saldo", la boleta SOBRE-DESCUENTA**
esa comisión — no debería aparecer en el sueldo mensual.

> Nota técnica: el modelo `Worker` ya tiene un campo `afpComisionTipo`, pero la calculadora
> de boleta todavía no lo usa para decidir si aplica o no la comisión sobre el sueldo.

**Preguntas clave para el asesor / RRHH:**
- [ ] ¿Tus trabajadores están mayormente en **comisión por flujo** o **por saldo**?
- [ ] ¿Quieres que el sistema **respete el esquema por trabajador** (comisión sobre el sueldo
      solo para los de "flujo"; 0% para los de "saldo")? → es un ajuste que podemos hacer.

---

## Ejemplo concreto (boleta real generada por el motor)

**Trabajador AFP Prima, sueldo S/ 3,000, sin asignación familiar, abril:**

| Concepto | Monto | Tasa |
|---|---|---|
| Aporte obligatorio | S/ 300.00 | 10% |
| Prima seguro | S/ 41.10 | 1.37% |
| Comisión (Prima) | S/ 48.00 | 1.60% |
| Renta 5ta (retención) | S/ 31.11 | escala (proyecta 12 sueldos + 2 gratif) |
| **Neto a pagar** | **S/ 2,579.79** | |

**Sueldo alto S/ 20,000 (muestra el tope RMA):**
- Prima = **S/ 172.61** (= 12,598.91 × 1.37%, **topada en la RMA**, no 20,000 × 1.37%).
- Aporte = S/ 2,000 (10% sin tope) · Comisión = S/ 320 (1.60% sin tope).

---

## Checklist para el asesor

- [ ] **Prima 1.37%** (SISCO VIII 2025-2026) — ¿correcta?
- [ ] **Tope RMA** de la prima (Q2 2026 = S/ 12,598.91) y que el aporte/comisión NO se topan — ¿correcto?
- [ ] **Comisiones por flujo** por AFP (Habitat 1.47 / Integra 1.55 / Prima 1.60 / Profuturo 1.69) — ¿correctas y vigentes?
- [ ] **Esquema "comisión por flujo"** (no mixta) — ¿aplica a los trabajadores de la empresa?
- [ ] Cualquier otro ajuste que recomiendes.

> Nota de mantenimiento: la **RMA cambia cada trimestre** y la **comisión** puede cambiar
> mensualmente — hay que actualizar las constantes en el sistema cuando la SBS publique
> nuevos valores. (Ubicación en código: `src/lib/legal-engine/peru-labor.ts`,
> `APORTES.PRIMA_SEGURO_SPP`, `REMUNERACION_MAXIMA_ASEGURABLE` y `COMISION_FLUJO_AFP`.)
