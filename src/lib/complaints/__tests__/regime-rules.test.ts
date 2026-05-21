import { describe, expect, it } from 'vitest'
import { buildComplaintDeadlines, inferRegimeFromType } from '../regime-rules'

describe('complaint regime rules', () => {
  it('infers regime from type', () => {
    expect(inferRegimeFromType('HOSTIGAMIENTO_SEXUAL')).toBe('HSL')
    expect(inferRegimeFromType('SST_ACCIDENTE_MORTAL')).toBe('SST')
    expect(inferRegimeFromType('MPD_CORRUPCION')).toBe('MPD')
  })

  it('calculates HSL statutory deadlines', () => {
    const receivedAt = new Date('2026-05-18T15:00:00-05:00')
    const deadlines = buildComplaintDeadlines({
      regime: 'HSL',
      type: 'HOSTIGAMIENTO_SEXUAL',
      receivedAt,
      occurredAt: receivedAt,
      now: new Date('2026-05-18T16:00:00-05:00'),
    })

    expect(deadlines.map((d) => d.label)).toContain('Medidas de proteccion')
    expect(deadlines.map((d) => d.label)).toContain('Informe del Comite')
    expect(deadlines.find((d) => d.label === 'Comunicacion inicial al MTPE')?.kind).toBe('EXTERNAL_REPORT')
  })

  it('calculates SST 24h SAT deadline for fatal accidents', () => {
    const occurredAt = new Date('2026-05-18T10:00:00-05:00')
    const deadlines = buildComplaintDeadlines({
      regime: 'SST',
      type: 'SST_ACCIDENTE_MORTAL',
      receivedAt: occurredAt,
      occurredAt,
      now: new Date('2026-05-18T11:00:00-05:00'),
    })

    const sat = deadlines.find((d) => d.label === 'Notificacion SAT/SUNAFIL')
    expect(sat?.authority).toBe('SAT-MTPE/SUNAFIL')
    expect(sat?.dueDate).toBe(new Date('2026-05-19T10:00:00-05:00').toISOString())
  })

  it('calculates MPD triage and investigation milestones', () => {
    const receivedAt = new Date('2026-05-18T09:00:00-05:00')
    const deadlines = buildComplaintDeadlines({
      regime: 'MPD',
      type: 'MPD_CORRUPCION',
      receivedAt,
      now: receivedAt,
    })

    expect(deadlines.map((d) => d.label)).toEqual([
      'Acuse de recibo',
      'Triaje preliminar MPD',
      'Plan de investigacion',
      'Investigacion MPD',
      'Evaluar derivacion a Fiscalia',
    ])
  })
})
