import { describe, expect, it } from 'vitest'
import { buildCoverageReport, describeCoverage } from '../coverage-aggregator'
import type { DoctorFinding, OrgChartTree, OrgUnitDTO } from '../types'

function unit(
  partial: Partial<OrgUnitDTO> & Pick<OrgUnitDTO, 'id' | 'name'>,
): OrgUnitDTO {
  return {
    parentId: null,
    slug: partial.name.toLowerCase().replace(/\s+/g, '-'),
    kind: 'AREA',
    code: null,
    description: null,
    costCenter: null,
    level: 0,
    sortOrder: 0,
    color: null,
    icon: null,
    version: 1,
    isActive: true,
    ...partial,
  }
}

function emptyTree(units: OrgUnitDTO[]): OrgChartTree {
  return {
    rootUnitIds: units.filter((u) => u.parentId === null).map((u) => u.id),
    units,
    positions: [],
    assignments: [],
    complianceRoles: [],
    generatedAt: '2026-05-04T00:00:00.000Z',
    asOf: null,
  }
}

function finding(
  partial: Partial<DoctorFinding> & Pick<DoctorFinding, 'rule' | 'severity' | 'affectedUnitIds'>,
): DoctorFinding {
  return {
    title: 'finding',
    description: '',
    baseLegal: null,
    affectedWorkerIds: [],
    suggestedTaskTitle: null,
    suggestedFix: null,
    ...partial,
  }
}

describe('coverage-aggregator', () => {
  it('una unidad sin findings tiene score 100 y tono success', () => {
    const tree = emptyTree([unit({ id: 'u1', name: 'Gerencia General' })])
    const report = buildCoverageReport(tree, [])
    const cov = report.byUnit.get('u1')!
    expect(cov.score).toBe(100)
    expect(cov.selfScore).toBe(100)
    expect(cov.tone).toBe('success')
    expect(report.globalScore).toBe(100)
  })

  it('una finding CRITICAL baja el score 35 puntos y la marca como crítico', () => {
    const tree = emptyTree([unit({ id: 'u1', name: 'Gerencia' })])
    const findings = [
      finding({ rule: 'r1', severity: 'CRITICAL', affectedUnitIds: ['u1'] }),
      finding({ rule: 'r2', severity: 'CRITICAL', affectedUnitIds: ['u1'] }),
    ]
    const report = buildCoverageReport(tree, findings)
    const cov = report.byUnit.get('u1')!
    expect(cov.selfScore).toBe(30) // 100 - 35 - 35
    expect(cov.tone).toBe('critical')
    expect(cov.findingCount).toBe(2)
  })

  it('propaga el peor score del hijo al padre', () => {
    const tree = emptyTree([
      unit({ id: 'root', name: 'CEO' }),
      unit({ id: 'child', name: 'Operaciones', parentId: 'root' }),
    ])
    const findings = [finding({ rule: 'r1', severity: 'HIGH', affectedUnitIds: ['child'] })]
    const report = buildCoverageReport(tree, findings)
    const root = report.byUnit.get('root')!
    const child = report.byUnit.get('child')!
    expect(child.selfScore).toBe(82) // 100 - 18
    expect(root.selfScore).toBe(100)
    expect(root.score).toBe(82) // propagado del hijo
    expect(report.globalScore).toBe(82)
  })

  it('el score nunca baja de 0', () => {
    const tree = emptyTree([unit({ id: 'u1', name: 'Operaciones' })])
    const findings = Array.from({ length: 10 }).map((_, i) =>
      finding({ rule: `r${i}`, severity: 'CRITICAL', affectedUnitIds: ['u1'] }),
    )
    const report = buildCoverageReport(tree, findings)
    expect(report.byUnit.get('u1')!.score).toBe(0)
  })

  it('histograma cuenta correctamente cada tono', () => {
    const tree = emptyTree([
      unit({ id: 'u1', name: 'Limpia' }),
      unit({ id: 'u2', name: 'Tibia' }),
      unit({ id: 'u3', name: 'Crítica' }),
    ])
    const findings = [
      finding({ rule: 'r1', severity: 'MEDIUM', affectedUnitIds: ['u2'] }), // 92 → success... ajustamos
      finding({ rule: 'r2', severity: 'HIGH', affectedUnitIds: ['u2'] }), // 92 - 18 = 74 (warning)
      finding({ rule: 'r3', severity: 'CRITICAL', affectedUnitIds: ['u3'] }),
      finding({ rule: 'r4', severity: 'CRITICAL', affectedUnitIds: ['u3'] }),
      finding({ rule: 'r5', severity: 'CRITICAL', affectedUnitIds: ['u3'] }), // 100-105 → 0 critical
    ]
    const report = buildCoverageReport(tree, findings)
    expect(report.histogram.success).toBe(1) // u1
    expect(report.histogram.warning).toBe(1) // u2
    expect(report.histogram.critical).toBe(1) // u3
  })

  it('describeCoverage devuelve texto distinto por banda', () => {
    const cov = (score: number) => ({
      unitId: 'x',
      selfScore: score,
      score,
      tone: 'success' as const,
      findingCount: 0,
      findings: [],
    })
    expect(describeCoverage(cov(95))).toMatch(/cumple/)
    expect(describeCoverage(cov(70))).toMatch(/observaciones/)
    expect(describeCoverage(cov(50))).toMatch(/riesgos legales/)
    expect(describeCoverage(cov(20))).toMatch(/crítico/)
  })

  it('findings se ordenan dentro de la unidad por severidad descendente', () => {
    const tree = emptyTree([unit({ id: 'u1', name: 'X' })])
    const findings = [
      finding({ rule: 'low', severity: 'LOW', affectedUnitIds: ['u1'] }),
      finding({ rule: 'crit', severity: 'CRITICAL', affectedUnitIds: ['u1'] }),
      finding({ rule: 'med', severity: 'MEDIUM', affectedUnitIds: ['u1'] }),
    ]
    const report = buildCoverageReport(tree, findings)
    const cov = report.byUnit.get('u1')!
    expect(cov.findings[0].rule).toBe('crit')
    expect(cov.findings[2].rule).toBe('low')
  })
})
