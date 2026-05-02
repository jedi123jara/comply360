// =============================================
// CONTRACT VALIDATION ENGINE — RULE EVALUATOR
//
// Función pura: dado un RuleSpec + ValidationContext, decide si pasa o no
// y devuelve evidencia. Sin acceso a BD ni efectos secundarios.
//
// El engine.ts orquesta la lectura/escritura; este archivo solo decide.
// Mantenerlo puro permite tests rápidos sin mockear Prisma.
// =============================================

import type {
  RuleEvaluationResult,
  RuleSpec,
  ValidationContext,
} from './types'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Acceso seguro a path dotted dentro del context.
 * Soporta "contract.causeObjective", "contract.formData.cargo".
 * Retorna undefined si cualquier nivel es null/undefined.
 */
function getPath(ctx: ValidationContext, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = ctx
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function asDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  const d = new Date(v as string)
  return Number.isNaN(d.getTime()) ? null : d
}

function diffDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

// ─── Evaluador principal ────────────────────────────────────────────────────

export function evaluateRule(
  spec: RuleSpec,
  ctx: ValidationContext,
): RuleEvaluationResult {
  switch (spec.kind) {
    case 'FIELD_REQUIRED': {
      const value = asString(getPath(ctx, spec.field))
      const min = spec.min ?? 1
      const passed = value.length >= min
      return {
        passed,
        message: passed
          ? `Campo "${spec.field}" presente (${value.length} caracteres).`
          : `Campo "${spec.field}" requerido${spec.min ? ` con al menos ${spec.min} caracteres` : ''} (actual: ${value.length}).`,
        evidence: { field: spec.field, length: value.length, min },
      }
    }

    case 'FIELD_REGEX_DENY': {
      const value = asString(getPath(ctx, spec.field))
      if (!value) {
        // Si no hay valor, esta regla no aplica negativamente — la chequea FIELD_REQUIRED.
        return { passed: true, message: `Campo "${spec.field}" vacío — regex deny no aplica.` }
      }
      for (const pattern of spec.patterns) {
        const re = new RegExp(pattern, spec.flags ?? 'i')
        if (re.test(value)) {
          return {
            passed: false,
            message: `El campo "${spec.field}" contiene una expresión genérica prohibida: /${pattern}/${spec.flags ?? 'i'}.`,
            evidence: { field: spec.field, matchedPattern: pattern, sample: value.slice(0, 200) },
          }
        }
      }
      return { passed: true, message: `Campo "${spec.field}" no matchea expresiones genéricas.` }
    }

    case 'FIELD_REGEX_REQUIRE': {
      const value = asString(getPath(ctx, spec.field))
      for (const pattern of spec.patterns) {
        const re = new RegExp(pattern, spec.flags ?? '')
        if (re.test(value)) {
          return { passed: true, message: `Campo "${spec.field}" cumple formato.` }
        }
      }
      return {
        passed: false,
        message: `El campo "${spec.field}" no cumple ninguno de los formatos requeridos.`,
        evidence: { field: spec.field, patterns: spec.patterns, sample: value.slice(0, 200) },
      }
    }

    case 'FIELD_COMPARE': {
      const left = asNumber(getPath(ctx, spec.leftPath))
      const right = spec.rightIsPath
        ? asNumber(getPath(ctx, String(spec.rightValue)))
        : asNumber(spec.rightValue)
      if (left === null || right === null) {
        return {
          passed: true, // sin datos suficientes — no bloquea (otra regla cubre presencia)
          message: `No se pudo comparar (left=${left}, right=${right}). La validación de presencia se delega a otra regla.`,
          evidence: { left, right, leftPath: spec.leftPath, rightValue: spec.rightValue },
        }
      }
      const ok = (() => {
        switch (spec.operator) {
          case '>':  return left > right
          case '>=': return left >= right
          case '<':  return left < right
          case '<=': return left <= right
          case '==': return left === right
          case '!=': return left !== right
        }
      })()
      return {
        passed: ok,
        message: ok
          ? `Comparación cumplida: ${left} ${spec.operator} ${right}.`
          : `Comparación fallida: ${left} ${spec.operator} ${right} es falso.`,
        evidence: { left, operator: spec.operator, right, leftPath: spec.leftPath },
      }
    }

    case 'DURATION_MAX_DAYS': {
      const start = asDate(getPath(ctx, spec.startPath))
      const end = asDate(getPath(ctx, spec.endPath))
      if (!start) {
        return { passed: true, message: 'Sin fecha de inicio — regla no aplica.' }
      }
      if (!end) {
        if (spec.requireEnd) {
          return {
            passed: false,
            message: `Falta fecha de fin (${spec.endPath}) requerida para esta modalidad.`,
            evidence: { startPath: spec.startPath, endPath: spec.endPath },
          }
        }
        return { passed: true, message: `Sin fecha de fin — regla no aplica.` }
      }
      const days = diffDays(start, end)
      const passed = days <= spec.maxDays
      return {
        passed,
        message: passed
          ? `Duración ${days} días ≤ ${spec.maxDays} días permitidos.`
          : `Duración ${days} días excede el máximo legal de ${spec.maxDays} días.`,
        evidence: { days, maxDays: spec.maxDays, startISO: start.toISOString(), endISO: end.toISOString() },
      }
    }

    case 'WORKER_MODAL_SUM_MAX_DAYS': {
      const start = ctx.contract.startDate
      const end = ctx.contract.endDate
      const currentDays = start && end ? Math.max(0, diffDays(start, end)) : 0
      const historicalDays = ctx.workerModalHistory.reduce((acc, h) => acc + h.durationDays, 0)
      const totalDays = currentDays + historicalDays
      const passed = totalDays <= spec.maxDays
      return {
        passed,
        message: passed
          ? `Suma de contratos modales del trabajador: ${totalDays} días ≤ ${spec.maxDays}.`
          : `Suma de contratos modales del trabajador alcanza ${totalDays} días, supera el tope de ${spec.maxDays} (Art. 74 LPCL). Riesgo de desnaturalización a indeterminado.`,
        evidence: {
          currentDays,
          historicalDays,
          totalDays,
          maxDays: spec.maxDays,
          history: ctx.workerModalHistory.map((h) => ({
            contractId: h.contractId,
            type: h.type,
            durationDays: h.durationDays,
          })),
        },
      }
    }

    case 'CONDITIONAL_FIELD_REQUIRED': {
      const applies = spec.whenContractTypeIn.includes(ctx.contract.type)
      if (!applies) {
        return { passed: true, message: `Tipo de contrato no aplica esta regla.` }
      }
      const value = asString(getPath(ctx, spec.requiredField))
      const passed = value.length > 0
      return {
        passed,
        message: passed
          ? `Campo condicional "${spec.requiredField}" presente.`
          : `Campo "${spec.requiredField}" es requerido cuando el contrato es de tipo ${ctx.contract.type}.`,
        evidence: { contractType: ctx.contract.type, field: spec.requiredField, value: value.slice(0, 200) },
      }
    }

    case 'TUTELA_GESTANTE_NO_RENEWAL': {
      const pregnant = ctx.workers.filter((w) => w.isPregnant)
      if (pregnant.length === 0) {
        return { passed: true, message: 'Ningún trabajador vinculado en estado de gestación detectado.' }
      }
      // Si el contrato es modal (tiene endDate) y hay trabajadora gestante → BLOQUEO.
      // Política conservadora: no permitimos generar contrato modal con fecha
      // de fin para trabajadora gestante, salvo ack explícito.
      const hasEndDate = !!ctx.contract.endDate
      if (!hasEndDate) {
        return { passed: true, message: 'Contrato sin fecha de fin — tutela gestante no aplica.' }
      }
      return {
        passed: false,
        message: `Trabajadora(s) gestante(s) vinculada(s): ${pregnant.map((p) => p.fullName).join(', ')}. Ley 30709 + STC 00797-2022-AA/TC: no se permite generar contrato modal con fecha de término. Use indeterminado o adjunte sustento.`,
        evidence: { pregnantWorkers: pregnant.map((p) => ({ id: p.id, dni: p.dni, fullName: p.fullName })) },
      }
    }

    case 'WEEKLY_HOURS_RANGE': {
      const hours = ctx.contract.weeklyHours
      if (hours === null || hours === undefined) {
        return { passed: true, message: 'Horario semanal no consignado — regla no aplica.' }
      }
      if (spec.min !== undefined && hours < spec.min) {
        return {
          passed: false,
          message: `Horario semanal ${hours}h es inferior al mínimo ${spec.min}h.`,
          evidence: { weeklyHours: hours, min: spec.min },
        }
      }
      if (spec.max !== undefined && hours > spec.max) {
        return {
          passed: false,
          message: `Horario semanal ${hours}h excede el máximo ${spec.max}h para esta modalidad (tiempo parcial < 24h/sem).`,
          evidence: { weeklyHours: hours, max: spec.max },
        }
      }
      return { passed: true, message: `Horario semanal ${hours}h dentro del rango permitido.` }
    }

    default: {
      // Exhaustividad: si agregamos un kind nuevo y olvidamos handler, TS se queja.
      const _exhaustive: never = spec
      throw new Error(`RuleSpec kind no soportado: ${JSON.stringify(_exhaustive)}`)
    }
  }
}
