import { describe, it, expect } from 'vitest'
import { evaluarReglasSst, resumirAlertas, type SstSnapshot } from '../calendar-engine'

const NOW = new Date('2026-05-10T10:00:00.000Z')

const empty: SstSnapshot = { emos: [], ipercBases: [], accidentes: [], comites: [] }

function days(d: number): Date {
  return new Date(NOW.getTime() + d * 24 * 60 * 60 * 1000)
}
function hours(h: number): Date {
  return new Date(NOW.getTime() + h * 60 * 60 * 1000)
}

describe('evaluarReglasSst — EMO', () => {
  it('snapshot vacío → sin alertas', () => {
    expect(evaluarReglasSst(empty, NOW)).toHaveLength(0)
  })

  it('EMO con proximoExamenAntes en el pasado → EMO_VENCIDO HIGH', () => {
    const r = evaluarReglasSst(
      {
        ...empty,
        emos: [{ id: 'e1', workerId: 'w1', proximoExamenAntes: days(-3) }],
      },
      NOW,
    )
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('EMO_VENCIDO')
    expect(r[0].severity).toBe('HIGH')
    expect(r[0].fingerprint).toBe('EMO_VENCIDO:e1')
  })

  it('EMO en próximos 30 días → EMO_PROXIMO MEDIUM', () => {
    const r = evaluarReglasSst(
      { ...empty, emos: [{ id: 'e1', workerId: 'w1', proximoExamenAntes: days(15) }] },
      NOW,
    )
    expect(r[0].type).toBe('EMO_PROXIMO')
    expect(r[0].severity).toBe('MEDIUM')
  })

  it('EMO a 31 días → no genera alerta', () => {
    const r = evaluarReglasSst(
      { ...empty, emos: [{ id: 'e1', workerId: 'w1', proximoExamenAntes: days(31) }] },
      NOW,
    )
    expect(r).toHaveLength(0)
  })

  it('EMO sin proximoExamenAntes → ignorado', () => {
    const r = evaluarReglasSst(
      { ...empty, emos: [{ id: 'e1', workerId: 'w1', proximoExamenAntes: null }] },
      NOW,
    )
    expect(r).toHaveLength(0)
  })

  it('borde 30 días exactos → genera EMO_PROXIMO', () => {
    const r = evaluarReglasSst(
      { ...empty, emos: [{ id: 'e1', workerId: 'w1', proximoExamenAntes: days(30) }] },
      NOW,
    )
    expect(r[0].type).toBe('EMO_PROXIMO')
  })
})

describe('evaluarReglasSst — IPERC', () => {
  it('IPERC VIGENTE de hace 366 días → IPERC_VENCIDO', () => {
    const r = evaluarReglasSst(
      {
        ...empty,
        ipercBases: [
          { id: 'ip1', sedeId: 's1', estado: 'VIGENTE', fechaAprobacion: days(-366) },
        ],
      },
      NOW,
    )
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('IPERC_VENCIDO')
    expect(r[0].severity).toBe('HIGH')
    expect(r[0].workerId).toBeNull()
  })

  it('IPERC VIGENTE de hace 100 días → no genera alerta', () => {
    const r = evaluarReglasSst(
      {
        ...empty,
        ipercBases: [
          { id: 'ip1', sedeId: 's1', estado: 'VIGENTE', fechaAprobacion: days(-100) },
        ],
      },
      NOW,
    )
    expect(r).toHaveLength(0)
  })

  it('IPERC en BORRADOR no genera alerta aunque sea viejo', () => {
    const r = evaluarReglasSst(
      {
        ...empty,
        ipercBases: [
          { id: 'ip1', sedeId: 's1', estado: 'BORRADOR', fechaAprobacion: days(-500) },
        ],
      },
      NOW,
    )
    expect(r).toHaveLength(0)
  })

  it('IPERC sin fechaAprobacion no genera alerta', () => {
    const r = evaluarReglasSst(
      {
        ...empty,
        ipercBases: [{ id: 'ip1', sedeId: 's1', estado: 'VIGENTE', fechaAprobacion: null }],
      },
      NOW,
    )
    expect(r).toHaveLength(0)
  })
})

describe('evaluarReglasSst — Accidentes / SAT', () => {
  it('Accidente PENDIENTE con plazo vencido → SAT_PLAZO_VENCIDO CRITICAL', () => {
    const r = evaluarReglasSst(
      {
        ...empty,
        accidentes: [
          {
            id: 'a1',
            workerId: 'w1',
            fechaHora: hours(-30),
            plazoLegalHoras: 24,
            satEstado: 'PENDIENTE',
          },
        ],
      },
      NOW,
    )
    expect(r[0].type).toBe('SAT_PLAZO_VENCIDO')
    expect(r[0].severity).toBe('CRITICAL')
  })

  it('Accidente PENDIENTE con plazo en próximas 24h → SAT_PLAZO_PROXIMO CRITICAL', () => {
    const r = evaluarReglasSst(
      {
        ...empty,
        accidentes: [
          {
            id: 'a1',
            workerId: 'w1',
            fechaHora: hours(-12),
            plazoLegalHoras: 24, // deadline = NOW + 12h
            satEstado: 'PENDIENTE',
          },
        ],
      },
      NOW,
    )
    expect(r[0].type).toBe('SAT_PLAZO_PROXIMO')
  })

  it('Accidente NOTIFICADO no genera alerta aunque esté vencido', () => {
    const r = evaluarReglasSst(
      {
        ...empty,
        accidentes: [
          {
            id: 'a1',
            workerId: 'w1',
            fechaHora: hours(-30),
            plazoLegalHoras: 24,
            satEstado: 'NOTIFICADO',
          },
        ],
      },
      NOW,
    )
    expect(r).toHaveLength(0)
  })

  it('Accidente CONFIRMADO no genera alerta', () => {
    const r = evaluarReglasSst(
      {
        ...empty,
        accidentes: [
          {
            id: 'a1',
            workerId: 'w1',
            fechaHora: hours(-30),
            plazoLegalHoras: 24,
            satEstado: 'CONFIRMADO',
          },
        ],
      },
      NOW,
    )
    expect(r).toHaveLength(0)
  })

  it('Accidente con plazo NO_MORTAL (720h) muy lejos → no alerta', () => {
    const r = evaluarReglasSst(
      {
        ...empty,
        accidentes: [
          {
            id: 'a1',
            workerId: 'w1',
            fechaHora: hours(-2),
            plazoLegalHoras: 720,
            satEstado: 'PENDIENTE',
          },
        ],
      },
      NOW,
    )
    expect(r).toHaveLength(0)
  })
})

describe('evaluarReglasSst — Comité SST', () => {
  it('Comité VIGENTE con mandato a 30 días → COMITE_MANDATO_VENCE MEDIUM', () => {
    const r = evaluarReglasSst(
      { ...empty, comites: [{ id: 'c1', estado: 'VIGENTE', mandatoFin: days(30) }] },
      NOW,
    )
    expect(r[0].type).toBe('COMITE_MANDATO_VENCE')
    expect(r[0].severity).toBe('MEDIUM')
  })

  it('Comité VIGENTE con mandato a 10 días → COMITE_MANDATO_VENCE HIGH', () => {
    const r = evaluarReglasSst(
      { ...empty, comites: [{ id: 'c1', estado: 'VIGENTE', mandatoFin: days(10) }] },
      NOW,
    )
    expect(r[0].severity).toBe('HIGH')
  })

  it('Comité INACTIVO no genera alerta', () => {
    const r = evaluarReglasSst(
      { ...empty, comites: [{ id: 'c1', estado: 'INACTIVO', mandatoFin: days(30) }] },
      NOW,
    )
    expect(r).toHaveLength(0)
  })

  it('Comité con mandato a 90 días → no alerta (umbral 60d)', () => {
    const r = evaluarReglasSst(
      { ...empty, comites: [{ id: 'c1', estado: 'VIGENTE', mandatoFin: days(90) }] },
      NOW,
    )
    expect(r).toHaveLength(0)
  })

  it('Comité con mandato vencido (negativo) → no alerta del tipo MANDATO_VENCE', () => {
    const r = evaluarReglasSst(
      { ...empty, comites: [{ id: 'c1', estado: 'VIGENTE', mandatoFin: days(-5) }] },
      NOW,
    )
    expect(r.filter((a) => a.type === 'COMITE_MANDATO_VENCE')).toHaveLength(0)
  })
})

describe('evaluarReglasSst — composición', () => {
  it('snapshot mixto produce todas las alertas correctas', () => {
    const r = evaluarReglasSst(
      {
        emos: [
          { id: 'e1', workerId: 'w1', proximoExamenAntes: days(-3) },
          { id: 'e2', workerId: 'w2', proximoExamenAntes: days(15) },
        ],
        ipercBases: [
          { id: 'ip1', sedeId: 's1', estado: 'VIGENTE', fechaAprobacion: days(-400) },
        ],
        accidentes: [
          {
            id: 'a1',
            workerId: 'w3',
            fechaHora: hours(-30),
            plazoLegalHoras: 24,
            satEstado: 'PENDIENTE',
          },
        ],
        comites: [{ id: 'c1', estado: 'VIGENTE', mandatoFin: days(20) }],
      },
      NOW,
    )

    expect(r).toHaveLength(5)
    const types = r.map((a) => a.type).sort()
    expect(types).toEqual([
      'COMITE_MANDATO_VENCE',
      'EMO_PROXIMO',
      'EMO_VENCIDO',
      'IPERC_VENCIDO',
      'SAT_PLAZO_VENCIDO',
    ])
  })

  it('fingerprints son únicos por recurso', () => {
    const r = evaluarReglasSst(
      {
        ...empty,
        emos: [
          { id: 'e1', workerId: 'w1', proximoExamenAntes: days(-3) },
          { id: 'e2', workerId: 'w2', proximoExamenAntes: days(-3) },
        ],
      },
      NOW,
    )
    const fps = r.map((a) => a.fingerprint)
    expect(new Set(fps).size).toBe(fps.length)
  })
})

describe('resumirAlertas', () => {
  it('agrupa por type y severity', () => {
    const r = evaluarReglasSst(
      {
        emos: [{ id: 'e1', workerId: 'w1', proximoExamenAntes: days(-3) }],
        ipercBases: [],
        accidentes: [
          {
            id: 'a1',
            workerId: 'w1',
            fechaHora: hours(-30),
            plazoLegalHoras: 24,
            satEstado: 'PENDIENTE',
          },
        ],
        comites: [],
      },
      NOW,
    )
    const s = resumirAlertas(r)
    expect(s.total).toBe(2)
    expect(s.byType.EMO_VENCIDO).toBe(1)
    expect(s.byType.SAT_PLAZO_VENCIDO).toBe(1)
    expect(s.bySeverity.HIGH).toBe(1)
    expect(s.bySeverity.CRITICAL).toBe(1)
  })

  it('devuelve total 0 para arreglo vacío', () => {
    expect(resumirAlertas([]).total).toBe(0)
  })
})
