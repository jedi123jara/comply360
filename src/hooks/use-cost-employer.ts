'use client'

/* -------------------------------------------------------------------------- */
/*  use-cost-employer — calculo memoizado del costo total empleador           */
/* -------------------------------------------------------------------------- */
/*
 * Wrapper sobre `calcularCostoEmpleador` (funcion pura del legal-engine) con
 * memo + early return cuando el sueldo aun no es significativo. Disenado para
 * usarse en formularios donde el usuario tipea en vivo y queremos evitar
 * recalcular en cada keystroke.
 *
 * Uso:
 *   const cost = useCostEmployer({
 *     sueldoBruto: 3500,
 *     regimenLaboral: 'GENERAL',
 *     asignacionFamiliar: true,
 *     tipoAporte: 'AFP',
 *     sctr: false,
 *     essaludVida: false,
 *   })
 *   if (cost) <CostSummaryPill {...cost} />
 */

import { useMemo } from 'react'
import {
  calcularCostoEmpleador,
  type CostoEmpleadorInput,
  type CostoEmpleadorResult,
} from '@/lib/legal-engine/calculators/costo-empleador'

/** Sueldo minimo razonable para mostrar el calculo (debajo son numeros sin sentido) */
const MIN_SUELDO_TO_SHOW = 100

export type UseCostEmployerInput = Partial<CostoEmpleadorInput>

/**
 * Devuelve el resultado memoizado o `null` si los datos aun no son
 * suficientemente completos como para calcular algo significativo.
 */
export function useCostEmployer(input: UseCostEmployerInput): CostoEmpleadorResult | null {
  return useMemo(() => {
    const sueldoBruto = Number(input.sueldoBruto ?? 0)
    if (!Number.isFinite(sueldoBruto) || sueldoBruto < MIN_SUELDO_TO_SHOW) return null
    if (!input.regimenLaboral) return null

    return calcularCostoEmpleador({
      sueldoBruto,
      asignacionFamiliar: !!input.asignacionFamiliar,
      regimenLaboral: input.regimenLaboral,
      tipoAporte: input.tipoAporte ?? 'AFP',
      sctr: !!input.sctr,
      essaludVida: !!input.essaludVida,
      jornadaSemanal: input.jornadaSemanal,
    })
  }, [
    input.sueldoBruto,
    input.regimenLaboral,
    input.asignacionFamiliar,
    input.tipoAporte,
    input.sctr,
    input.essaludVida,
    input.jornadaSemanal,
  ])
}
