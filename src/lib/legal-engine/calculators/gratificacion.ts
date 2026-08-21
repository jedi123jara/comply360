import { GratificacionInput, GratificacionResult } from '../types'
import {
  PERU_LABOR,
  calcularRemuneracionComputable,
} from '../peru-labor'
import { money } from '../money'
import { formatSoles as fmt } from '@/lib/format/peruvian'

// =============================================
// GRATIFICACIÓN - Fiestas Patrias / Navidad
// Ley 27735 y su Reglamento D.S. 005-2002-TR
// =============================================

export function calcularGratificacion(input: GratificacionInput): GratificacionResult {
  // 1. Remuneración computable
  const remComputable = calcularRemuneracionComputable(
    input.sueldoBruto,
    input.asignacionFamiliar
  )

  // 2. Meses trabajados en el semestre (máximo 6)
  const mesesTrabajados = Math.min(Math.max(input.mesesTrabajados, 0), 6)

  // 3. Gratificación bruta — FIX #2.A aritmética decimal precisa.
  const remM = money(remComputable)
  const gratificacionGeneral = mesesTrabajados >= 6
    ? remM.toNumber()
    : remM.div(6).mul(mesesTrabajados).toNumber()

  // FIX auditoría P0 (JUR-01): factor MYPE por régimen (Ley 32353), idéntico al
  // usado en liquidacion.ts. MYPE_MICRO no tiene gratificación; MYPE_PEQUENA 50%.
  const mypeFactor =
    input.regimenLaboral === 'MYPE_MICRO' ? 0 :
    input.regimenLaboral === 'MYPE_PEQUENA' ? 0.5 :
    1
  const gratificacionBruta = mypeFactor === 1
    ? gratificacionGeneral
    : Math.round(gratificacionGeneral * mypeFactor * 100) / 100

  // 4. Bonificación extraordinaria del 9% (aporte EsSalud - Ley 30334)
  const bonificacionExtraordinaria = money(gratificacionBruta)
    .mul(PERU_LABOR.GRATIFICACION.BONIFICACION_EXTRAORDINARIA)
    .toNumber()

  // 5. Total neto (exonerado de renta por Ley 30334)
  const totalNeto = money(gratificacionBruta).add(bonificacionExtraordinaria).toNumber()

  // 6. Fórmula descriptiva
  const esTrunca = mesesTrabajados < 6
  const periodoLabel = input.periodo === 'julio' ? 'Fiestas Patrias (julio)' : 'Navidad (diciembre)'
  const notaRegimen = mypeFactor === 1
    ? ''
    : ` [Régimen ${input.regimenLaboral}: factor ${mypeFactor}` +
      `${mypeFactor === 0 ? ' (microempresa sin gratificación)' : ''} — Ley 32353. ` +
      `Grati régimen general: ${fmt(gratificacionGeneral)}]`
  const formula = esTrunca
    ? `Gratificación trunca ${periodoLabel}: (${fmt(remComputable)} / 6) × ${mesesTrabajados} meses = ${fmt(gratificacionBruta)}. ` +
      `Bonificación extraordinaria 9%: ${fmt(bonificacionExtraordinaria)}. ` +
      `Total neto (exonerado de renta): ${fmt(totalNeto)}${notaRegimen}`
    : `Gratificación completa ${periodoLabel}: ${fmt(gratificacionBruta)}. ` +
      `Bonificación extraordinaria 9%: ${fmt(bonificacionExtraordinaria)}. ` +
      `Total neto (exonerado de renta): ${fmt(totalNeto)}${notaRegimen}`

  return {
    gratificacionBruta,
    bonificacionExtraordinaria,
    totalNeto,
    formula,
    baseLegal: PERU_LABOR.GRATIFICACION.BASE_LEGAL,
  }
}

