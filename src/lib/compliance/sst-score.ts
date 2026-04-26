/**
 * SST Score Calculator — desglose ponderado por área de Seguridad y Salud
 * en el Trabajo según Ley 29783 + R.M. 050-2013-TR.
 *
 * Reemplaza el cálculo simplista que usaba `legajoAvg` como proxy. Ahora
 * mide cobertura real por área crítica auditada por SUNAFIL:
 *
 *   1. Política SST vigente (peso 15%)
 *   2. IPERC actualizado < 12 meses (peso 25%)
 *   3. Plan Anual SST vigente (peso 15%)
 *   4. Capacitaciones SST (4 obligatorias/año) (peso 20%)
 *   5. EPP entregados al 100% workers (peso 10%)
 *   6. Comité SST conformado (≥20 trabajadores) o Supervisor (<20) (peso 10%)
 *   7. Exámenes médicos vigentes (peso 5%)
 *
 * Cada área retorna 0-100. Score global = promedio ponderado.
 *
 * Uso típico:
 *   const sstResult = await calculateSstScore(orgId)
 *   // sstResult.scoreGlobal, sstResult.breakdown, sstResult.criticasPendientes
 */

import { prisma } from '@/lib/prisma'

export interface SstAreaScore {
  key: string
  label: string
  score: number // 0-100
  weight: number // 0-100
  detail: string
  status: 'OK' | 'WARNING' | 'CRITICAL'
  cta?: { label: string; href: string }
}

export interface SstScoreResult {
  scoreGlobal: number
  totalWorkers: number
  breakdown: SstAreaScore[]
  criticasPendientes: number // count de áreas en CRITICAL
  multaEstimadaSunafil: number // estimación PEN
}

const UIT = 5500
// Multas SUNAFIL por incumplimientos SST (D.S. 019-2006-TR)
const MULTA_SST_GRAVE_UIT = 1.57 // ~S/8,635 por trabajador
const MULTA_SST_MUY_GRAVE_UIT = 5.25 // ~S/28,875 por trabajador

const TWELVE_MONTHS_AGO = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 12)
  return d
}

const ONE_YEAR_AGO = TWELVE_MONTHS_AGO

function statusFromScore(score: number): 'OK' | 'WARNING' | 'CRITICAL' {
  if (score >= 80) return 'OK'
  if (score >= 50) return 'WARNING'
  return 'CRITICAL'
}

export async function calculateSstScore(orgId: string): Promise<SstScoreResult> {
  const cutoff12m = ONE_YEAR_AGO()

  // Lightweight aggregate queries en paralelo
  const [
    totalWorkers,
    politicaSstActiva,
    ipercActualizado,
    planAnualVigente,
    capacitacionesUltimoAno,
    eppEntregadosUltimoAno,
    actaComiteVigente,
    examenesMedicosVigentes,
  ] = await Promise.all([
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),

    // 1. POLITICA_SST debe existir y estar COMPLETED
    prisma.sstRecord.count({
      where: { orgId, type: 'POLITICA_SST', status: 'COMPLETED' },
    }),

    // 2. IPERC actualizado en últimos 12 meses
    prisma.sstRecord.count({
      where: {
        orgId,
        type: 'IPERC',
        status: 'COMPLETED',
        updatedAt: { gte: cutoff12m },
      },
    }),

    // 3. PLAN_ANUAL del año actual
    prisma.sstRecord.count({
      where: {
        orgId,
        type: 'PLAN_ANUAL',
        status: 'COMPLETED',
        createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
    }),

    // 4. CAPACITACION en últimos 12 meses (≥4 anuales obligatorias)
    prisma.sstRecord.count({
      where: {
        orgId,
        type: 'CAPACITACION',
        status: 'COMPLETED',
        completedAt: { gte: cutoff12m },
      },
    }),

    // 5. ENTREGA_EPP en últimos 12 meses
    prisma.sstRecord.count({
      where: {
        orgId,
        type: 'ENTREGA_EPP',
        status: 'COMPLETED',
        completedAt: { gte: cutoff12m },
      },
    }),

    // 6. ACTA_COMITE vigente — empresas con 20+ workers requieren Comité
    prisma.sstRecord.count({
      where: {
        orgId,
        type: 'ACTA_COMITE',
        status: 'COMPLETED',
        createdAt: { gte: cutoff12m },
      },
    }),

    // 7. EXAMEN_MEDICO vigente
    prisma.sstRecord.count({
      where: {
        orgId,
        type: 'EXAMEN_MEDICO',
        status: 'COMPLETED',
        completedAt: { gte: cutoff12m },
      },
    }),
  ])

  if (totalWorkers === 0) {
    return {
      scoreGlobal: 0,
      totalWorkers: 0,
      breakdown: [],
      criticasPendientes: 0,
      multaEstimadaSunafil: 0,
    }
  }

  // ── Calcular scores por área ───────────────────────────────────────────
  const scorePolitica = politicaSstActiva > 0 ? 100 : 0
  const scoreIperc = ipercActualizado > 0 ? 100 : 0
  const scorePlanAnual = planAnualVigente > 0 ? 100 : 0
  // Capacitaciones: 4 obligatorias/año (Art. 35 Ley 29783)
  const scoreCapacitaciones = Math.min(100, Math.round((capacitacionesUltimoAno / 4) * 100))
  // EPP: idealmente 1 entrega documentada por worker/año
  const scoreEpp = totalWorkers > 0
    ? Math.min(100, Math.round((eppEntregadosUltimoAno / totalWorkers) * 100))
    : 0
  const scoreComite = actaComiteVigente > 0 ? 100 : (totalWorkers < 20 ? 100 : 0) // <20 no requiere comité
  const scoreExamenes = totalWorkers > 0
    ? Math.min(100, Math.round((examenesMedicosVigentes / totalWorkers) * 100))
    : 0

  const breakdown: SstAreaScore[] = [
    {
      key: 'politica',
      label: 'Política SST vigente',
      score: scorePolitica,
      weight: 15,
      detail:
        politicaSstActiva > 0
          ? 'Política aprobada y firmada por gerencia.'
          : 'Falta la Política SST firmada (Art. 23 Ley 29783).',
      status: statusFromScore(scorePolitica),
      cta:
        scorePolitica < 100
          ? { label: 'Generar política', href: '/dashboard/generadores' }
          : undefined,
    },
    {
      key: 'iperc',
      label: 'IPERC actualizado',
      score: scoreIperc,
      weight: 25,
      detail:
        ipercActualizado > 0
          ? 'Identificación de Peligros y Evaluación de Riesgos vigente (<12 meses).'
          : 'Falta o está desactualizado el IPERC. Multa estimada S/8,635/trabajador.',
      status: statusFromScore(scoreIperc),
      cta:
        scoreIperc < 100
          ? { label: 'Crear IPERC', href: '/dashboard/sst/iperc' }
          : undefined,
    },
    {
      key: 'plan-anual',
      label: 'Plan Anual SST',
      score: scorePlanAnual,
      weight: 15,
      detail:
        planAnualVigente > 0
          ? 'Plan Anual SST registrado este año.'
          : 'Falta el Plan Anual SST de este año (Art. 38 Ley 29783).',
      status: statusFromScore(scorePlanAnual),
      cta:
        scorePlanAnual < 100
          ? { label: 'Generar plan', href: '/dashboard/generadores' }
          : undefined,
    },
    {
      key: 'capacitaciones',
      label: 'Capacitaciones SST',
      score: scoreCapacitaciones,
      weight: 20,
      detail: `${capacitacionesUltimoAno} de 4 capacitaciones anuales obligatorias.`,
      status: statusFromScore(scoreCapacitaciones),
      cta:
        scoreCapacitaciones < 100
          ? { label: 'Registrar capacitación', href: '/dashboard/generadores' }
          : undefined,
    },
    {
      key: 'epp',
      label: 'EPP entregados',
      score: scoreEpp,
      weight: 10,
      detail: `${eppEntregadosUltimoAno} de ${totalWorkers} entregas EPP documentadas (último año).`,
      status: statusFromScore(scoreEpp),
      cta:
        scoreEpp < 100
          ? { label: 'Registrar entrega EPP', href: '/dashboard/generadores' }
          : undefined,
    },
    {
      key: 'comite',
      label: totalWorkers >= 20 ? 'Comité SST conformado' : 'Supervisor SST (no requiere comité)',
      score: scoreComite,
      weight: 10,
      detail:
        totalWorkers < 20
          ? 'Empresas <20 trabajadores no requieren Comité (basta supervisor SST designado).'
          : actaComiteVigente > 0
            ? 'Comité SST con acta vigente (<12 meses).'
            : 'Empresa de 20+ trabajadores SIN Comité SST conformado. Multa SUNAFIL grave.',
      status: statusFromScore(scoreComite),
      cta:
        scoreComite < 100
          ? { label: 'Generar acta comité', href: '/dashboard/generadores' }
          : undefined,
    },
    {
      key: 'examenes',
      label: 'Exámenes médicos vigentes',
      score: scoreExamenes,
      weight: 5,
      detail: `${examenesMedicosVigentes} de ${totalWorkers} trabajadores con EMO vigente (válidos 2 años).`,
      status: statusFromScore(scoreExamenes),
      cta:
        scoreExamenes < 100
          ? { label: 'Ver legajo', href: '/dashboard/trabajadores' }
          : undefined,
    },
  ]

  // Score global = promedio ponderado
  const scoreGlobal = Math.round(
    breakdown.reduce((sum, area) => sum + area.score * (area.weight / 100), 0),
  )

  const criticasPendientes = breakdown.filter(b => b.status === 'CRITICAL').length

  // Estimación multa SUNAFIL: por cada área CRITICAL con peso ≥15%, asume
  // GRAVE; por cada CRITICAL con peso <15%, asume LEVE/GRAVE menor.
  // Conservador: multiplica por # trabajadores (las multas SUNAFIL son por trabajador afectado)
  const multaEstimadaSunafil = breakdown.reduce((sum, area) => {
    if (area.status === 'OK') return sum
    const factor = area.status === 'CRITICAL' ? 1 : 0.4
    const uitMulta = area.weight >= 15 ? MULTA_SST_GRAVE_UIT : MULTA_SST_MUY_GRAVE_UIT * 0.3
    return sum + factor * uitMulta * UIT * Math.min(totalWorkers, 50)
  }, 0)

  return {
    scoreGlobal,
    totalWorkers,
    breakdown,
    criticasPendientes,
    multaEstimadaSunafil: Math.round(multaEstimadaSunafil),
  }
}
