/**
 * Validador legal del modelo Worker — Ola 1 (compliance crítico SUNAFIL).
 *
 * Cruza `regimenLaboral × tipoContrato × sueldoBruto × jornadaSemanal × edad`
 * contra las reglas peruanas para evitar configuraciones inválidas en el alta
 * o edición de un trabajador.
 *
 * Reglas claves:
 *   - MODALIDAD_FORMATIVA → sueldo === RMV exacto, edad 18-30, sin sobretiempo
 *   - MYPE_MICRO/PEQUENA  → sueldo >= RMV (excepto MYPE_MICRO en algunos casos)
 *   - GENERAL/PEQUENA/etc → sueldo >= RMV (Ley 28051)
 *   - TIEMPO_PARCIAL      → jornada < 24h/semana (sin derecho CTS por D.Leg. 713)
 *   - CONSTRUCCION_CIVIL  → sctr === true obligatorio
 *   - MINERO/PESQUERO     → sctr === true obligatorio
 *   - DOMESTICO           → no tiene gratificación obligatoria
 *
 * No depende de Prisma — recibe valores planos para que se reuse en client
 * Server Components y workers (job runners). Tests en `__tests__/worker.test.ts`.
 */

import { PERU_LABOR } from '../peru-labor'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkerLegalityInput {
  regimen: string                  // RegimenLaboral enum value
  tipoContrato: string             // TipoContrato enum value
  sueldoBruto: number              // soles
  jornadaSemanal?: number          // horas (default 48)
  birthDate?: Date | string | null // para edad en MODALIDAD_FORMATIVA
  sctr?: boolean
  fechaIngreso?: Date | string
}

export type LegalityIssueSeverity = 'ERROR' | 'WARNING'

export interface LegalityIssue {
  field: keyof WorkerLegalityInput | 'general'
  severity: LegalityIssueSeverity
  code: string
  message: string
  baseLegal?: string
}

export interface LegalityResult {
  valid: boolean      // true si no hay errores (warnings sí están permitidas)
  errors: LegalityIssue[]
  warnings: LegalityIssue[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes derivadas
// ─────────────────────────────────────────────────────────────────────────────

const REGIMENES_RIESGO_OBLIGAN_SCTR = new Set([
  'CONSTRUCCION_CIVIL',
  'MINERO',
  'PESQUERO',
])

const REGIMENES_EXENTOS_RMV = new Set([
  'MODALIDAD_FORMATIVA', // recibe SUBVENCIÓN, no remuneración
  'CAS',                 // tiene su propia escala (tope mín. ≈ RMV en práctica)
])

// Compatibilidad régimen × tipo de contrato (las modalidades formativas no
// son contratos de trabajo en sentido estricto, etc.)
const TIPOS_INCOMPATIBLES_POR_REGIMEN: Record<string, Set<string>> = {
  MODALIDAD_FORMATIVA: new Set([
    'INDEFINIDO', 'PLAZO_FIJO', 'INICIO_ACTIVIDAD', 'NECESIDAD_MERCADO',
    'RECONVERSION', 'SUPLENCIA', 'EMERGENCIA', 'OBRA_DETERMINADA',
    'INTERMITENTE', 'EXPORTACION', 'TIEMPO_PARCIAL',
  ]), // solo permite el "convenio de modalidad formativa" — no es TipoContrato del enum
  CAS: new Set([
    'INDEFINIDO', // CAS es siempre temporal por definición
  ]),
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function calcularEdad(birthDate: Date | string | null | undefined, ref: Date = new Date()): number | null {
  if (!birthDate) return null
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate)
  if (isNaN(d.getTime())) return null
  let age = ref.getFullYear() - d.getFullYear()
  const m = ref.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--
  return age
}

// ─────────────────────────────────────────────────────────────────────────────
// Validador principal
// ─────────────────────────────────────────────────────────────────────────────

export function validateWorkerLegality(input: WorkerLegalityInput): LegalityResult {
  const errors: LegalityIssue[] = []
  const warnings: LegalityIssue[] = []

  const {
    regimen,
    tipoContrato,
    sueldoBruto,
    jornadaSemanal = 48,
    birthDate,
    sctr = false,
  } = input

  const RMV = PERU_LABOR.RMV

  // ── 1. Sueldo mínimo (RMV) ──────────────────────────────────────────────
  if (regimen === 'MODALIDAD_FORMATIVA') {
    // Subvención de modalidad formativa = exactamente RMV (Ley 28518 Art. 45)
    if (sueldoBruto !== RMV) {
      errors.push({
        field: 'sueldoBruto',
        severity: 'ERROR',
        code: 'MOD_FORMATIVA_SUELDO_DEBE_SER_RMV',
        message: `Modalidad formativa exige subvención exactamente igual a la RMV (S/ ${RMV}). Valor recibido: S/ ${sueldoBruto}.`,
        baseLegal: 'Ley 28518 Art. 45',
      })
    }
  } else if (!REGIMENES_EXENTOS_RMV.has(regimen)) {
    if (sueldoBruto < RMV) {
      errors.push({
        field: 'sueldoBruto',
        severity: 'ERROR',
        code: 'SUELDO_MENOR_A_RMV',
        message: `El sueldo (S/ ${sueldoBruto}) está por debajo de la RMV vigente (S/ ${RMV}). Infracción muy grave SUNAFIL.`,
        baseLegal: 'D.S. 007-2012-TR (RMV) + Ley 28051',
      })
    }
  }

  // ── 2. Tiempo parcial vs jornada ────────────────────────────────────────
  if (tipoContrato === 'TIEMPO_PARCIAL') {
    if (jornadaSemanal >= 24) {
      errors.push({
        field: 'jornadaSemanal',
        severity: 'ERROR',
        code: 'TIEMPO_PARCIAL_JORNADA_INVALIDA',
        message: `Tiempo parcial requiere jornada menor a 24 h/semana (en promedio < 4h diarias). Recibido: ${jornadaSemanal}h.`,
        baseLegal: 'D.Leg. 713 + D.S. 003-97-TR Art. 11',
      })
    }
  }

  // ── 3. Jornada máxima (regla general) ───────────────────────────────────
  if (jornadaSemanal > PERU_LABOR.HORAS_EXTRAS.JORNADA_MAXIMA_SEMANAL) {
    warnings.push({
      field: 'jornadaSemanal',
      severity: 'WARNING',
      code: 'JORNADA_EXCEDE_MAXIMO',
      message: `Jornada de ${jornadaSemanal}h excede el máximo legal de 48h/semana. El exceso son horas extras (D.S. 007-2002-TR).`,
      baseLegal: 'D.S. 007-2002-TR Art. 9',
    })
  }

  // ── 4. SCTR obligatorio en sectores de riesgo ──────────────────────────
  if (REGIMENES_RIESGO_OBLIGAN_SCTR.has(regimen) && !sctr) {
    errors.push({
      field: 'sctr',
      severity: 'ERROR',
      code: 'SCTR_OBLIGATORIO_FALTANTE',
      message: `El régimen ${regimen} obliga SCTR (Seguro Complementario de Trabajo de Riesgo). Activa el toggle en datos previsionales.`,
      baseLegal: 'Ley 26790 + D.S. 003-98-SA',
    })
  }

  // ── 5. Compatibilidad régimen × tipo de contrato ───────────────────────
  const incompatibles = TIPOS_INCOMPATIBLES_POR_REGIMEN[regimen]
  if (incompatibles?.has(tipoContrato)) {
    errors.push({
      field: 'tipoContrato',
      severity: 'ERROR',
      code: 'REGIMEN_TIPO_INCOMPATIBLE',
      message: `Régimen ${regimen} no admite tipo de contrato ${tipoContrato}.`,
      baseLegal: 'Ley específica del régimen',
    })
  }

  // ── 6. Edad mínima/máxima en modalidad formativa ───────────────────────
  if (regimen === 'MODALIDAD_FORMATIVA') {
    const edad = calcularEdad(birthDate)
    if (edad !== null) {
      if (edad < 14) {
        errors.push({
          field: 'birthDate',
          severity: 'ERROR',
          code: 'MENOR_DE_EDAD_NO_ADMITIDO',
          message: `Edad menor a 14 años no admitida en modalidad formativa.`,
          baseLegal: 'C.N.A. Art. 51 + Ley 28518',
        })
      } else if (edad < 18) {
        warnings.push({
          field: 'birthDate',
          severity: 'WARNING',
          code: 'MODALIDAD_FORMATIVA_ADOLESCENTE',
          message: `Adolescente (${edad} años): requiere autorización del MTPE y aprobación de los padres.`,
          baseLegal: 'C.N.A. Art. 56-57',
        })
      } else if (edad > 30) {
        warnings.push({
          field: 'birthDate',
          severity: 'WARNING',
          code: 'MODALIDAD_FORMATIVA_FUERA_DE_EDAD',
          message: `Modalidad formativa típicamente para 18-30 años. El trabajador tiene ${edad}.`,
          baseLegal: 'Ley 28518 Art. 11',
        })
      }
    }
  }

  // ── 7. Sueldo razonable (cota superior, defensa contra typos) ──────────
  if (sueldoBruto > 100_000) {
    warnings.push({
      field: 'sueldoBruto',
      severity: 'WARNING',
      code: 'SUELDO_FUERA_DE_RANGO',
      message: `Sueldo mensual de S/ ${sueldoBruto} es atípico. Verifica que no haya un error de tipeo (¿separador miles?).`,
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Versión "throw" para usar en tRPC / Server Actions sin importar el tipo.
 * Lanza Error con `cause` que incluye los issues, listo para `formatLegalityErrors`.
 */
export function assertWorkerLegality(input: WorkerLegalityInput): void {
  const result = validateWorkerLegality(input)
  if (!result.valid) {
    const err = new Error(
      `Validación legal falló: ${result.errors.map(e => e.message).join('; ')}`,
    )
    ;(err as Error & { cause?: unknown }).cause = { issues: result.errors }
    throw err
  }
}

/**
 * Helper para serializar issues a JSON estable (para logs / DB).
 */
export function formatLegalityIssues(issues: LegalityIssue[]): Array<{
  field: string
  code: string
  message: string
  baseLegal?: string
}> {
  return issues.map(i => ({
    field: i.field,
    code: i.code,
    message: i.message,
    baseLegal: i.baseLegal,
  }))
}
