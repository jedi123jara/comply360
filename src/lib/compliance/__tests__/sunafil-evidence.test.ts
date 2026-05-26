import { describe, expect, it } from 'vitest'
import { getDocByIdSunafil } from '@/data/legal/sunafil-ready-catalog'
import {
  resolveSunafilDocStatus,
  type SunafilEvidenceSnapshot,
  type WorkerCoverageBucket,
} from '../sunafil-evidence'

const NOW = new Date('2026-05-25T12:00:00.000Z')

function doc(id: string) {
  const found = getDocByIdSunafil(id)
  if (!found) throw new Error(`Missing SUNAFIL doc ${id}`)
  return found
}

function bucket(present: string[] = [], expired: string[] = []): WorkerCoverageBucket {
  return { present: new Set(present), expired: new Set(expired) }
}

function baseSnapshot(overrides: Partial<SunafilEvidenceSnapshot> = {}): SunafilEvidenceSnapshot {
  return {
    now: NOW,
    totalWorkers: 2,
    workerDocsByType: new Map(),
    orgDocByType: new Map(),
    orgDocSearchText: [],
    sstRecords: [],
    sedes: [],
    ipercBases: [],
    comites: [],
    emos: [],
    workerEpps: [],
    capacitaciones: [],
    accidentes: [],
    ...overrides,
  }
}

describe('resolveSunafilDocStatus', () => {
  it('marks IPERC complete from current IPERC bases per active site', () => {
    const result = resolveSunafilDocStatus(
      doc('iperc'),
      baseSnapshot({
        sedes: [
          { id: 'sede-1', activa: true },
          { id: 'sede-2', activa: true },
        ],
        ipercBases: [
          { sedeId: 'sede-1', estado: 'VIGENTE', fechaAprobacion: new Date('2026-01-10') },
          { sedeId: 'sede-2', estado: 'VIGENTE', fechaAprobacion: new Date('2026-02-10') },
        ],
      }),
    )

    expect(result.status).toBe('COMPLETO')
    expect(result.coverage).toEqual({ present: 2, total: 2 })
  })

  it('combines EMO module rows and worker documents for medical exam coverage', () => {
    const workerDocsByType = new Map<string, WorkerCoverageBucket>()
    workerDocsByType.set('examen_medico_ingreso', bucket(['worker-2']))

    const result = resolveSunafilDocStatus(
      doc('examen-medico-ingreso'),
      baseSnapshot({
        workerDocsByType,
        emos: [{ workerId: 'worker-1', proximoExamenAntes: new Date('2027-05-01') }],
      }),
    )

    expect(result.status).toBe('COMPLETO')
    expect(result.coverage).toEqual({ present: 2, total: 2 })
  })

  it('recognizes the organization risk map document as exhibited evidence', () => {
    const orgDocByType = new Map()
    orgDocByType.set('MAPA_RIESGOS_ACTUALIZADO', {
      validUntil: new Date('2027-01-01'),
      hasFile: true,
    })

    const result = resolveSunafilDocStatus(doc('mapa-riesgos'), baseSnapshot({ orgDocByType }))

    expect(result.status).toBe('COMPLETO')
    expect(result.evidenceSources).toContain('OrgDocument.MAPA_RIESGOS_ACTUALIZADO')
  })

  it('requires four annual SST sessions and worker coverage for training', () => {
    const result = resolveSunafilDocStatus(
      doc('capacitacion-sst'),
      baseSnapshot({
        capacitaciones: [
          { workerId: 'worker-1', tipo: 'ANUAL', fechaCapacitacion: new Date('2026-01-15') },
          { workerId: 'worker-2', tipo: 'ANUAL', fechaCapacitacion: new Date('2026-02-15') },
          { workerId: 'worker-1', tipo: 'EPP_USO', fechaCapacitacion: new Date('2026-03-15') },
          { workerId: 'worker-2', tipo: 'ERGONOMIA', fechaCapacitacion: new Date('2026-04-15') },
        ],
      }),
    )

    expect(result.status).toBe('COMPLETO')
    expect(result.coverage).toEqual({ present: 2, total: 2 })
  })
})
