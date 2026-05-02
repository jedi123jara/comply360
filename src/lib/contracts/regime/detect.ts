// =============================================
// REGIME DETECTOR — ALGORITMO PRINCIPAL
// Generador de Contratos / Chunk 2
//
// Función pura: dado un snapshot de inputs (Organization + UIT vigente),
// devuelve el régimen primario + alternativos + razonamiento.
//
// Jerarquía de prioridad (de mayor a menor):
//   1. TRABAJO_HOGAR (DOMESTICO)         — empleador persona natural con propósito doméstico
//   2. CONSTRUCCION_CIVIL                — CIIU 41-43 + obra > 50 UIT
//   3. AGRARIO (Ley 31110)               — agricultura/agroindustria fuera Lima/Callao
//   4. MYPE_MICRO / MYPE_PEQUENA         — REMYPE + ventas según topes
//   5. GENERAL (D.Leg. 728)              — fallback
//
// Especiales aditivos (no excluyentes con el primario):
//   - TEXTIL_EXPORTACION (D.L. 22342)    — exportación ≥40% no tradicional
//   - PESQUERO                            — CIIU pesquero → laboral 728 + REP
//
// Capa transversal:
//   - isPublicEntity → warning Huatuco; no cambia el régimen primario
// =============================================

import type {
  RegimeDetectionResult,
  RegimeInputs,
} from './types'
import {
  isAgricultureCiiu,
  isAgroIndustryCandidate,
  isAgroIndustryCiiu,
  isConstructionCiiu,
  isExcludedAgroIndustry,
  isExcludedFromMype,
  isFishingCiiu,
  isInLimaCallao,
  isTraditionalExportCiiu,
} from './ciiu-mappings'

const MYPE_MICRO_MAX_UIT = 150
const MYPE_PEQUENA_MAX_UIT = 1700
const CONSTRUCTION_MIN_PROJECT_UIT = 50
const EXPORT_NO_TRADITIONAL_MIN_PCT = 40

export function detectRegime(input: RegimeInputs): RegimeDetectionResult {
  const reasoning: string[] = []
  const warnings: string[] = []
  const specials: Set<RegimeDetectionResult['primaryRegime']> = new Set()

  // ─── PASO 1: Trabajo del Hogar (Ley 31047) ──────────────────────────────
  if (input.employerType === 'NATURAL_PERSON' && input.domesticPurpose) {
    reasoning.push('Empleador persona natural con propósito doméstico → Régimen Trabajo del Hogar (Ley 31047).')
    return {
      primaryRegime: 'DOMESTICO',
      applicableSpecialRegimes: [],
      confidence: 0.99,
      reasoning,
      warnings,
      flags: {
        isMype: false,
        isPublic: false,
        needsRemype: false,
        hasSpecialModalAvailable: false,
      },
    }
  }

  // ─── PASO 2: Construcción Civil ────────────────────────────────────────
  let constructionApplies = false
  if (isConstructionCiiu(input.ciiu)) {
    const cost = input.currentProjectCostUIT ?? 0
    if (cost > CONSTRUCTION_MIN_PROJECT_UIT) {
      specials.add('CONSTRUCCION_CIVIL')
      constructionApplies = true
      reasoning.push(`CIIU ${input.ciiu} y obra ${cost} UIT > 50 UIT → Construcción Civil (Convención CAPECO–FTCCP).`)
    } else if (input.currentProjectCostUIT === null) {
      warnings.push(
        `CIIU ${input.ciiu} es del sector construcción pero falta declarar costo de obra (UIT). Se asume régimen general 728 hasta confirmar.`,
      )
    } else {
      warnings.push(
        `CIIU ${input.ciiu} de construcción con obra ≤ 50 UIT → fuera del régimen Construcción Civil; aplica D.Leg. 728.`,
      )
    }
  }

  // ─── PASO 3: Agrario (Ley 31110) ────────────────────────────────────────
  let agrarianApplies = false
  const inLimaCallao = isInLimaCallao(input.ubigeo)
  const agriculture = isAgricultureCiiu(input.ciiu)
  const agroindustryEligible = isAgroIndustryCiiu(input.ciiu) && input.usesAgroInputs
  // Consideramos agroindustria también cuando el CIIU es 10-12 pero está
  // excluido (cerveza, tabaco, trigo): la org pretende régimen agrario y
  // debemos avisarle por qué no califica.
  const considersAgroindustry =
    agroindustryEligible || (isAgroIndustryCandidate(input.ciiu) && input.usesAgroInputs)
  if (agriculture || considersAgroindustry) {
    if (isExcludedAgroIndustry(input.ciiu)) {
      warnings.push(`CIIU ${input.ciiu} pertenece a las exclusiones del régimen agrario (trigo, tabaco, cerveza, etc.).`)
    } else if (inLimaCallao && !agriculture) {
      // La agroindustria en Lima/Callao queda excluida; la agricultura pura sí
      // mantiene el régimen aunque la sede principal esté en Lima.
      warnings.push(
        'Actividad agroindustrial registrada en Lima Metropolitana / Callao — Ley 31110 excluye agroindustria en estas jurisdicciones (Art. 2).',
      )
    } else {
      specials.add('AGRARIO')
      agrarianApplies = true
      reasoning.push(`CIIU ${input.ciiu}${inLimaCallao ? '' : ' fuera de Lima/Callao'} → Régimen Agrario (Ley 31110).`)
    }
  }

  // ─── PASO 4: Pesquero (laboral 728 + REP) ───────────────────────────────
  if (isFishingCiiu(input.ciiu)) {
    specials.add('PESQUERO')
    warnings.push(
      `CIIU ${input.ciiu} sector pesquero: el régimen laboral es D.Leg. 728, pero corresponde inscripción en el Régimen Especial de Pensiones Pesqueras (Ley 30003).`,
    )
  }

  // ─── PASO 5: Exportación No Tradicional (D.L. 22342) ───────────────────
  const exportPct = input.exportRatioPct ?? 0
  if (
    exportPct >= EXPORT_NO_TRADITIONAL_MIN_PCT &&
    !isTraditionalExportCiiu(input.ciiu)
  ) {
    specials.add('TEXTIL_EXPORTACION')
    reasoning.push(
      `Exportación ${exportPct}% ≥ 40% en CIIU no tradicional → modalidad D.L. 22342 disponible para personal directo de exportación.`,
    )
  }

  // ─── PASO 6: MYPE (Ley 32353) ───────────────────────────────────────────
  let mypeRegime: 'MYPE_MICRO' | 'MYPE_PEQUENA' | null = null
  let mypeNeedsRemype = false
  if (isExcludedFromMype(input.ciiu)) {
    warnings.push(`CIIU ${input.ciiu} excluido del régimen MYPE (bares, discotecas, casinos, juegos de azar).`)
  } else if (input.annualSalesPEN === null) {
    // Sin ventas declaradas no se puede determinar — se cae a GENERAL.
  } else {
    const annualSalesUIT = input.annualSalesPEN / input.uitValue
    const groupSalesUIT = (input.groupAnnualSalesPEN ?? input.annualSalesPEN) / input.uitValue

    if (input.isPartOfBigGroup || groupSalesUIT > MYPE_PEQUENA_MAX_UIT) {
      warnings.push(
        `El grupo económico vinculado tiene ventas consolidadas de ${groupSalesUIT.toFixed(0)} UIT (> ${MYPE_PEQUENA_MAX_UIT} UIT) → no califica MYPE (Ley 32353, Art. 5).`,
      )
    } else if (annualSalesUIT <= MYPE_MICRO_MAX_UIT) {
      if (input.remypeRegistered) {
        mypeRegime = 'MYPE_MICRO'
        reasoning.push(
          `Ventas ${annualSalesUIT.toFixed(2)} UIT ≤ ${MYPE_MICRO_MAX_UIT} UIT + REMYPE → Microempresa MYPE.`,
        )
      } else {
        mypeNeedsRemype = true
        warnings.push(
          `Ventas ${annualSalesUIT.toFixed(2)} UIT calificarían como Microempresa, pero falta inscripción REMYPE. Se aplica D.Leg. 728 hasta regularizar.`,
        )
      }
    } else if (annualSalesUIT <= MYPE_PEQUENA_MAX_UIT) {
      if (input.remypeRegistered) {
        mypeRegime = 'MYPE_PEQUENA'
        reasoning.push(
          `Ventas ${annualSalesUIT.toFixed(2)} UIT (entre ${MYPE_MICRO_MAX_UIT} y ${MYPE_PEQUENA_MAX_UIT} UIT) + REMYPE → Pequeña Empresa MYPE.`,
        )
      } else {
        mypeNeedsRemype = true
        warnings.push(
          `Ventas ${annualSalesUIT.toFixed(2)} UIT calificarían como Pequeña Empresa, pero falta inscripción REMYPE. Se aplica D.Leg. 728.`,
        )
      }
    }
  }

  // ─── PASO 7: Resolución de prioridades ─────────────────────────────────
  // HOGAR ya retornó arriba si aplicaba.
  // CONSTRUCCION solo es primario para personal de obra; igualmente la org puede
  // tener oficinas → mantenemos GENERAL/MYPE como primario y CONSTRUCCION
  // entra como aplicable special.
  // AGRARIO sí es primario cuando aplica (es el grueso del personal del campo).
  let primary: RegimeDetectionResult['primaryRegime']
  if (agrarianApplies) primary = 'AGRARIO'
  else if (mypeRegime) primary = mypeRegime
  else primary = 'GENERAL'

  // ─── PASO 8: Capa pública (Huatuco) ─────────────────────────────────────
  if (input.isPublicEntity) {
    warnings.push(
      'Entidad pública detectada — STC 5057-2013-PA/TC (Huatuco): la reposición indeterminada exige concurso público previo. Considerar régimen CAS / Servir.',
    )
  }

  // Confidence: alta cuando tenemos CIIU + ubigeo + ventas, baja si faltan inputs.
  const inputsKnown = [
    input.ciiu,
    input.ubigeo,
    input.annualSalesPEN,
  ].filter((x) => x !== null && x !== '').length
  const confidence = inputsKnown === 3 ? 0.95 : inputsKnown === 2 ? 0.8 : inputsKnown === 1 ? 0.6 : 0.4

  // El primario sale de la lista de specials para no duplicarlo.
  const applicableSpecialRegimes = Array.from(specials).filter((s) => s !== primary)

  return {
    primaryRegime: primary,
    applicableSpecialRegimes,
    confidence,
    reasoning,
    warnings,
    flags: {
      isMype: primary === 'MYPE_MICRO' || primary === 'MYPE_PEQUENA',
      isPublic: input.isPublicEntity,
      needsRemype: mypeNeedsRemype,
      hasSpecialModalAvailable:
        specials.has('TEXTIL_EXPORTACION') ||
        constructionApplies ||
        agrarianApplies,
    },
  }
}
