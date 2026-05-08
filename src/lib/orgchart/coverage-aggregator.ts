/**
 * Coverage Aggregator — Backend del **Compliance Heatmap**.
 *
 * Toma el reporte del Org Doctor (findings de las 8 reglas) y los reduce a
 * un score 0-100 por unidad, propagando hacia arriba con la peor severidad
 * de los descendientes. Esto permite pintar el árbol completo en
 * verde/ámbar/rojo según el riesgo legal real (Ley 29783, 29733, 27942,
 * R.M. 050-2013-TR, etc).
 *
 * Diseño determinístico, puro y cero IO — recibe `tree` y `findings`,
 * devuelve un mapa `unitId → score`. Tests viven en `__tests__/`.
 */

import type { OrgChartTree, DoctorFinding, DoctorSeverity } from './types'

export interface UnitCoverage {
  unitId: string
  /**
   * Score directo: penalizaciones SOLO de findings que afectan a esta unidad
   * (no propagado).
   */
  selfScore: number
  /**
   * Score agregado: peor entre selfScore y el rolledUp de descendientes.
   * Es el que se usa para pintar el nodo.
   */
  score: number
  /** Severidad simbólica derivada del score. */
  tone: 'success' | 'warning' | 'danger' | 'critical'
  /** Cantidad de findings que afectan a esta unidad. */
  findingCount: number
  /** Findings asociadas (no propagadas) para el popover. */
  findings: DoctorFinding[]
}

export interface CoverageReport {
  /** Score global del organigrama (mejor de los roots). */
  globalScore: number
  /** Mapa unitId → coverage. Incluye TODAS las unidades del árbol. */
  byUnit: Map<string, UnitCoverage>
  /** Para gráficos: cuántas unidades cayeron en cada tono. */
  histogram: Record<UnitCoverage['tone'], number>
}

/** Penalización por severidad. Suma sobre el score base de 100. */
const SEVERITY_PENALTY: Record<DoctorSeverity, number> = {
  CRITICAL: 35,
  HIGH: 18,
  MEDIUM: 8,
  LOW: 3,
}

/** Cap mínimo del score (no bajar de aquí ni con muchas findings). */
const MIN_SCORE = 0

function severityFromScore(score: number): UnitCoverage['tone'] {
  if (score >= 85) return 'success'
  if (score >= 65) return 'warning'
  if (score >= 40) return 'danger'
  return 'critical'
}

/**
 * Calcula score por unidad y propaga hacia arriba: el score de un padre es
 * el peor de su selfScore vs el peor de sus hijos.
 */
export function buildCoverageReport(
  tree: OrgChartTree,
  findings: DoctorFinding[],
): CoverageReport {
  // 1) Indexar findings por unidad afectada
  const findingsByUnit = new Map<string, DoctorFinding[]>()
  for (const finding of findings) {
    for (const unitId of finding.affectedUnitIds) {
      const list = findingsByUnit.get(unitId) ?? []
      list.push(finding)
      findingsByUnit.set(unitId, list)
    }
  }

  // 2) Indexar children por padre para BFS bottom-up
  const childrenByParent = new Map<string | null, string[]>()
  for (const u of tree.units) {
    const list = childrenByParent.get(u.parentId ?? null) ?? []
    list.push(u.id)
    childrenByParent.set(u.parentId ?? null, list)
  }

  // 3) Calcular selfScore de cada unidad (sin propagar)
  const selfScoreByUnit = new Map<string, number>()
  for (const unit of tree.units) {
    const ownFindings = findingsByUnit.get(unit.id) ?? []
    let score = 100
    for (const f of ownFindings) {
      score -= SEVERITY_PENALTY[f.severity]
    }
    selfScoreByUnit.set(unit.id, Math.max(MIN_SCORE, score))
  }

  // 4) Propagar bottom-up: score(node) = min(selfScore, min(scores de hijos))
  //    Hacemos memo recursivo desde cada nodo.
  const propagatedScore = new Map<string, number>()
  function scoreOf(unitId: string): number {
    const cached = propagatedScore.get(unitId)
    if (cached !== undefined) return cached
    const self = selfScoreByUnit.get(unitId) ?? 100
    const kids = childrenByParent.get(unitId) ?? []
    let worst = self
    for (const kidId of kids) {
      const kidScore = scoreOf(kidId)
      if (kidScore < worst) worst = kidScore
    }
    propagatedScore.set(unitId, worst)
    return worst
  }
  for (const unit of tree.units) {
    scoreOf(unit.id)
  }

  // 5) Construir resultado
  const byUnit = new Map<string, UnitCoverage>()
  const histogram: CoverageReport['histogram'] = {
    success: 0,
    warning: 0,
    danger: 0,
    critical: 0,
  }
  for (const unit of tree.units) {
    const ownFindings = findingsByUnit.get(unit.id) ?? []
    const selfScore = selfScoreByUnit.get(unit.id) ?? 100
    const score = propagatedScore.get(unit.id) ?? 100
    const tone = severityFromScore(score)
    histogram[tone]++
    byUnit.set(unit.id, {
      unitId: unit.id,
      selfScore,
      score,
      tone,
      findingCount: ownFindings.length,
      findings: ownFindings.sort(
        (a, b) => SEVERITY_PENALTY[b.severity] - SEVERITY_PENALTY[a.severity],
      ),
    })
  }

  // 6) Score global = peor entre las raíces (peor caso visible al primer vistazo)
  const roots = tree.units.filter((u) => u.parentId === null)
  const globalScore =
    roots.length === 0
      ? 100
      : Math.min(...roots.map((r) => propagatedScore.get(r.id) ?? 100))

  return { globalScore, byUnit, histogram }
}

/**
 * Helpers de presentación: color hex y clase Tailwind a partir del tono.
 * Centralizados acá para mantener consistencia en heatmap, minimap, badges
 * y tooltips.
 */
export const TONE_COLOR_HEX: Record<UnitCoverage['tone'], string> = {
  success: '#2563eb', // emerald-500
  warning: '#f59e0b', // amber-500
  danger: '#f97316', // orange-500
  critical: '#dc2626', // red-600
}

export const TONE_BG_CLASS: Record<UnitCoverage['tone'], string> = {
  success: 'bg-emerald-50 border-emerald-200',
  warning: 'bg-amber-50 border-amber-200',
  danger: 'bg-orange-50 border-orange-300',
  critical: 'bg-red-50 border-red-300',
}

export const TONE_RING_CLASS: Record<UnitCoverage['tone'], string> = {
  success: 'ring-emerald-300/40',
  warning: 'ring-amber-300/50',
  danger: 'ring-orange-300/60',
  critical: 'ring-red-400/60',
}

export const TONE_LABEL: Record<UnitCoverage['tone'], string> = {
  success: 'En regla',
  warning: 'Atención',
  danger: 'En riesgo',
  critical: 'Crítico',
}

/**
 * Helper: dado un score y el nivel de exposición, devuelve un veredicto
 * legible. Útil para tooltips y popovers.
 */
export function describeCoverage(coverage: UnitCoverage): string {
  if (coverage.score >= 85) {
    return 'Esta unidad cumple con los requisitos legales evaluados.'
  }
  if (coverage.score >= 65) {
    return 'Hay observaciones menores que conviene revisar pronto.'
  }
  if (coverage.score >= 40) {
    return 'Existen riesgos legales relevantes que requieren acción.'
  }
  return 'Riesgo crítico: hay incumplimientos con base legal directa.'
}
