/**
 * Exposición legal en soles — traduce los hallazgos del Doctor de cumplimiento a
 * una estimación de multa SUNAFIL, usando el motor oficial `calcularMultaSunafil`
 * (escala granular del D.S. 019-2006-TR, validada contra resoluciones reales del
 * Tribunal de Fiscalización Laboral).
 *
 * Es una ESTIMACIÓN de exposición (peor caso), no un cálculo de una multa
 * impuesta: mapea la severidad del hallazgo a la gravedad de la infracción y usa
 * el nº de trabajadores como tramo de la escala.
 */
import { calcularMultaSunafil } from '@/lib/legal-engine/calculators/multa-sunafil'
import type { DoctorReport, DoctorSeverity } from './types'

const GRAVITY_BY_SEVERITY: Record<DoctorSeverity, 'LEVE' | 'GRAVE' | 'MUY_GRAVE'> = {
  CRITICAL: 'MUY_GRAVE',
  HIGH: 'GRAVE',
  MEDIUM: 'LEVE',
  LOW: 'LEVE',
}

export interface LegalExposure {
  /** Exposición total estimada en soles (suma de las multas por hallazgo). */
  totalSoles: number
  /** Total si se subsana voluntariamente antes de la inspección (-90%, Art. 40 Ley 28806). */
  totalConSubsanacion: number
  /** Cuánto se ahorra subsanando a tiempo. */
  ahorroSubsanacion: number
  /** Multa estimada en soles por cada hallazgo (paralelo a report.findings). */
  perFinding: number[]
}

/** Multa estimada en soles para UN hallazgo, según su severidad y el tamaño de la empresa. */
export function findingExposure(severity: DoctorSeverity, numWorkers: number): number {
  return calcularMultaSunafil({
    tipoInfraccion: GRAVITY_BY_SEVERITY[severity],
    numeroTrabajadores: Math.max(1, numWorkers),
    reincidente: false,
    subsanacionVoluntaria: false,
  }).multaEstimada
}

export function computeLegalExposure(report: DoctorReport, numWorkers: number): LegalExposure {
  const perFinding = report.findings.map((f) => findingExposure(f.severity, numWorkers))
  const totalSoles = perFinding.reduce((sum, v) => sum + v, 0)
  const totalConSubsanacion = Math.round(totalSoles * 0.1)
  return {
    totalSoles,
    totalConSubsanacion,
    ahorroSubsanacion: totalSoles - totalConSubsanacion,
    perFinding,
  }
}
