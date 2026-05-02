import { describe, expect, it } from 'vitest'
import { alertToTaskPayload } from '../alert-monitor'
import type { OrgAlert } from '../alerts'

function alert(partial: Partial<OrgAlert> = {}): OrgAlert {
  return {
    id: 'alert-1',
    category: 'SST',
    severity: 'CRITICAL',
    title: 'Comite SST incompleto',
    description: 'La empresa requiere completar el comite SST.',
    baseLegal: 'Ley 29783',
    affectedUnitIds: ['u1'],
    affectedWorkerIds: ['w1', 'w2'],
    suggestedTaskTitle: 'Regularizar comite SST',
    suggestedFix: 'Designar representantes y registrar acta.',
    sourceRule: 'committee.sst.missing',
    priority: 1,
    ...partial,
  }
}

describe('monitor de alertas de organigrama', () => {
  it('convierte una alerta critica en tarea muy grave con vencimiento a 7 dias', () => {
    const now = new Date('2026-05-02T10:00:00.000Z')
    const payload = alertToTaskPayload('org-1', alert(), now)

    expect(payload).toMatchObject({
      orgId: 'org-1',
      area: 'organigrama',
      title: 'Regularizar comite SST',
      gravedad: 'MUY_GRAVE',
      priority: 1,
      sourceId: 'orgchart-alert:alert-1',
      plazoSugerido: 'Inmediato (7 dias)',
    })
    expect(payload.dueDate.toISOString()).toBe('2026-05-09T10:00:00.000Z')
    expect(payload.description).toContain('2 trabajador(es) afectado(s)')
    expect(payload.description).toContain('Regla: committee.sst.missing')
  })

  it('mapea severidades altas y medias como graves con plazos distintos', () => {
    const now = new Date('2026-05-02T10:00:00.000Z')
    const high = alertToTaskPayload('org-1', alert({ severity: 'HIGH', id: 'high-1', priority: 2 }), now)
    const medium = alertToTaskPayload('org-1', alert({ severity: 'MEDIUM', id: 'medium-1', priority: 3 }), now)

    expect(high.gravedad).toBe('GRAVE')
    expect(high.plazoSugerido).toBe('Prioritario (15 dias)')
    expect(high.dueDate.toISOString()).toBe('2026-05-17T10:00:00.000Z')

    expect(medium.gravedad).toBe('GRAVE')
    expect(medium.plazoSugerido).toBe('Planificado (30 dias)')
    expect(medium.dueDate.toISOString()).toBe('2026-06-01T10:00:00.000Z')
  })

  it('usa el titulo original cuando no hay tarea sugerida', () => {
    const payload = alertToTaskPayload('org-1', alert({ suggestedTaskTitle: null, baseLegal: null }))

    expect(payload.title).toBe('Comite SST incompleto')
    expect(payload.baseLegal).toBeNull()
    expect(payload.description).toContain('Base legal: no especificada')
  })
})
