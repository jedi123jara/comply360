import { describe, it, expect } from 'vitest'
import { computeWorkerComplianceScore } from '../people-score'

describe('computeWorkerComplianceScore', () => {
  it('trabajador en regla → tone success', () => {
    const r = computeWorkerComplianceScore({
      legajoScore: 90,
      contractType: 'INDEFINIDO',
      hireDate: new Date('2024-01-01'),
      alertSeverities: [],
    })
    expect(r.tone).toBe('success')
    expect(r.score).toBeGreaterThanOrEqual(85)
    expect(r.contractAtRisk).toBe(false)
  })

  it('legajo incompleto baja el score', () => {
    const r = computeWorkerComplianceScore({
      legajoScore: 40,
      contractType: 'INDEFINIDO',
      hireDate: new Date('2024-01-01'),
      alertSeverities: [],
    })
    expect(r.score).toBe(40)
    expect(r.tone).toBe('danger')
    expect(r.reasons.some((x) => x.includes('Legajo'))).toBe(true)
  })

  it('contrato de locación de servicios penaliza con flag', () => {
    const r = computeWorkerComplianceScore({
      legajoScore: 90,
      contractType: 'LOCACION_SERVICIOS',
      hireDate: new Date('2024-01-01'),
      alertSeverities: [],
    })
    expect(r.contractAtRisk).toBe(true)
    expect(r.score).toBeLessThan(90)
    expect(r.reasons.some((x) => x.includes('desnaturalización'))).toBe(true)
  })

  it('alerta crítica baja 30 puntos', () => {
    const base = computeWorkerComplianceScore({
      legajoScore: 100,
      contractType: 'INDEFINIDO',
      hireDate: new Date('2024-01-01'),
      alertSeverities: [],
    })
    const conCritica = computeWorkerComplianceScore({
      legajoScore: 100,
      contractType: 'INDEFINIDO',
      hireDate: new Date('2024-01-01'),
      alertSeverities: ['CRITICAL'],
    })
    expect(base.score - conCritica.score).toBe(30)
    expect(conCritica.tone).toBe('warning')
  })

  it('múltiples alertas críticas pueden caer a critical', () => {
    const r = computeWorkerComplianceScore({
      legajoScore: 70,
      contractType: 'INDEFINIDO',
      hireDate: new Date('2024-01-01'),
      alertSeverities: ['CRITICAL', 'CRITICAL', 'HIGH'],
    })
    expect(r.tone).toBe('critical')
  })

  it('+4 años con plazo fijo penaliza por presunción de indeterminación', () => {
    const r = computeWorkerComplianceScore({
      legajoScore: 100,
      contractType: 'PLAZO_FIJO',
      hireDate: new Date('2018-01-01'),
      alertSeverities: [],
    })
    expect(r.score).toBe(90) // 100 - 10
    expect(r.reasons.some((x) => x.includes('plazo'))).toBe(true)
  })

  it('legajoScore null asume neutral 80', () => {
    const r = computeWorkerComplianceScore({
      legajoScore: null,
      contractType: 'INDEFINIDO',
      hireDate: new Date('2024-01-01'),
      alertSeverities: [],
    })
    expect(r.score).toBe(80)
    expect(r.tone).toBe('warning')
  })

  it('score nunca baja de 0', () => {
    const r = computeWorkerComplianceScore({
      legajoScore: 30,
      contractType: 'LOCACION_SERVICIOS',
      hireDate: new Date('2018-01-01'),
      alertSeverities: ['CRITICAL', 'CRITICAL', 'CRITICAL', 'HIGH', 'HIGH'],
    })
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.tone).toBe('critical')
  })
})
