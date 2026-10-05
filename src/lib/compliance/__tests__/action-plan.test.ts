import { describe, expect, it } from 'vitest'
import {
  classifyActionLane,
  computeActionRiskScore,
  daysUntil,
  evidenceGoalForAction,
  nextActionForAction,
} from '../action-plan'

describe('action-plan helpers', () => {
  const now = new Date('2026-05-25T12:00:00-05:00')

  it('classifies overdue and critical actions into the immediate lanes', () => {
    expect(daysUntil('2026-05-25T08:00:00-05:00', now)).toBe(0)
    expect(classifyActionLane({ severity: 'HIGH', dueDate: '2026-05-24T12:00:00-05:00' }, now)).toBe('today')
    expect(classifyActionLane({ severity: 'CRITICAL', dueDate: null }, now)).toBe('week')
  })

  it('raises the risk score when severity, deadline and money exposure compound', () => {
    const critical = computeActionRiskScore(
      { severity: 'CRITICAL', dueDate: '2026-05-24T12:00:00-05:00', multaEvitable: 30000, source: 'alert' },
      now,
    )
    const medium = computeActionRiskScore(
      { severity: 'MEDIUM', dueDate: '2026-07-25T12:00:00-05:00', multaEvitable: 0, source: 'training' },
      now,
    )

    expect(critical).toBe(100)
    expect(medium).toBeLessThan(critical)
  })

  it('suggests evidence and next actions from the operational area', () => {
    expect(evidenceGoalForAction({ source: 'task', area: 'sst', title: 'Sin EPP documentado' })).toContain('SST')
    expect(nextActionForAction({ source: 'task', severity: 'HIGH', area: 'sst', title: 'Sin EPP documentado' })).toContain('SST')
    expect(evidenceGoalForAction({ source: 'training', area: 'SST', title: 'Induccion' })).toContain('asistencia')
  })

  it('muestra los textos con tildes', () => {
    const areas = ['sst', 'contrato', 'planilla', 'hostigamiento', 'otro']
    const textos = [
      ...(['task', 'alert', 'training'] as const).flatMap((source) =>
        areas.flatMap((area) => [
          evidenceGoalForAction({ source, area, title: '' }),
          nextActionForAction({ source, severity: 'CRITICAL', area, title: '' }),
          nextActionForAction({ source, severity: 'LOW', area, title: '' }),
        ]),
      ),
    ].join(' ')

    for (const sinTilde of [
      /\bevaluacion\b/i,
      /\bcalculo\b/i,
      /\bsubsanacion\b/i,
      /\binspeccion\b/i,
      /\bcapacitacion\b/i,
      /\bcomunicacion\b/i,
      /\bpolitica\b/i,
      /\bcritica\b/i,
    ]) {
      expect(textos).not.toMatch(sinTilde)
    }
    expect(textos).toContain('evaluación')
    expect(textos).toContain('Cálculo')
    expect(textos).toContain('subsanación')
    expect(textos).toContain('inspección')
  })
})
