import { describe, expect, it } from 'vitest'
import { buildComplaintProgress } from '../progress'

describe('buildComplaintProgress', () => {
  it('marks HSL protection and investigation stages with reporter-visible documents', () => {
    const progress = buildComplaintProgress({
      regime: 'HSL',
      status: 'INVESTIGATING',
      updatedAt: '2026-05-20T10:00:00.000Z',
      timeline: [
        { action: 'HSL_CASE_RECEIVED', createdAt: '2026-05-17T10:00:00.000Z' },
        { action: 'INICIO_INVESTIGACION', createdAt: '2026-05-18T10:00:00.000Z' },
      ],
      documents: [
        {
          id: 'doc-1',
          title: 'Acta de medidas de proteccion',
          stage: 'MEDIDAS_PROTECCION',
          kind: 'MEDIDA_PROTECCION',
          createdAt: '2026-05-18T11:00:00.000Z',
          downloadUrl: '/api/complaints/status/documents/doc-1',
        },
      ],
    })

    const protection = progress.find((step) => step.stage === 'MEDIDAS_PROTECCION')
    const investigation = progress.find((step) => step.stage === 'INVESTIGACION')

    expect(protection?.status).toBe('DONE')
    expect(protection?.documents).toHaveLength(1)
    expect(investigation?.status).toBe('ACTIVE')
  })

  it('keeps MPD authority communication pending until documented or closed', () => {
    const progress = buildComplaintProgress({
      regime: 'MPD',
      status: 'INVESTIGATING',
      updatedAt: '2026-05-20T10:00:00.000Z',
      timeline: [{ action: 'INICIO_INVESTIGACION', createdAt: '2026-05-20T10:00:00.000Z' }],
      documents: [],
    })

    expect(progress.find((step) => step.stage === 'COMUNICACION_AUTORIDAD')?.status).toBe('PENDING')
  })

  it('does not mark every stage done just because a case is closed', () => {
    const progress = buildComplaintProgress({
      regime: 'HSL',
      status: 'RESOLVED',
      updatedAt: '2026-05-20T10:00:00.000Z',
      resolvedAt: '2026-05-20T10:00:00.000Z',
      timeline: [{ action: 'HSL_CASE_RECEIVED', createdAt: '2026-05-17T10:00:00.000Z' }],
      documents: [],
    })

    expect(progress.find((step) => step.stage === 'RECEPCION')?.status).toBe('DONE')
    expect(progress.find((step) => step.stage === 'INFORME_COMITE')?.status).toBe('PENDING')
    expect(progress.find((step) => step.stage === 'CIERRE')?.status).toBe('ACTIVE')
  })
})
