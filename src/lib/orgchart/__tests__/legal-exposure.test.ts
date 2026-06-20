import { describe, it, expect } from 'vitest'
import { computeLegalExposure, findingExposure } from '../legal-exposure'
import type { DoctorReport, DoctorFinding, DoctorSeverity } from '../types'

function mkFinding(severity: DoctorSeverity): DoctorFinding {
  return {
    rule: 'test',
    severity,
    title: 't',
    description: 'd',
    baseLegal: null,
    affectedUnitIds: [],
    affectedWorkerIds: [],
    suggestedTaskTitle: null,
    suggestedFix: null,
  }
}

function mkReport(findings: DoctorFinding[]): DoctorReport {
  return {
    generatedAt: '2026-01-01',
    scoreOrgHealth: 50,
    findings,
    totals: { critical: 0, high: 0, medium: 0, low: 0 },
  }
}

describe('legal-exposure', () => {
  it('una infracción MUY_GRAVE (CRITICAL) expone más que una LEVE (LOW)', () => {
    expect(findingExposure('CRITICAL', 20)).toBeGreaterThan(findingExposure('LOW', 20))
  })

  it('el total suma cada hallazgo y la subsanación voluntaria es el 10% del total', () => {
    const r = mkReport([mkFinding('CRITICAL'), mkFinding('HIGH'), mkFinding('LOW')])
    const exp = computeLegalExposure(r, 20)
    expect(exp.perFinding).toHaveLength(3)
    const sum = exp.perFinding.reduce((a, b) => a + b, 0)
    expect(exp.totalSoles).toBeCloseTo(sum, 2)
    expect(exp.totalConSubsanacion).toBe(Math.round(exp.totalSoles * 0.1))
    expect(exp.ahorroSubsanacion).toBeCloseTo(exp.totalSoles - exp.totalConSubsanacion, 2)
  })

  it('no rompe con 0 trabajadores (usa el tramo mínimo de 1)', () => {
    expect(findingExposure('CRITICAL', 0)).toBe(findingExposure('CRITICAL', 1))
    expect(findingExposure('CRITICAL', 0)).toBeGreaterThan(0)
  })

  it('más trabajadores afectados → exposición mayor (escala por tramos)', () => {
    // 'HIGH' mapea a infracción GRAVE; más trabajadores = tramo superior de la escala.
    expect(findingExposure('HIGH', 200)).toBeGreaterThan(findingExposure('HIGH', 1))
  })

  it('reporte sin hallazgos → exposición cero', () => {
    const exp = computeLegalExposure(mkReport([]), 20)
    expect(exp.totalSoles).toBe(0)
    expect(exp.perFinding).toHaveLength(0)
  })
})
