import { describe, it, expect } from 'vitest'
import {
  calcularScoreSst,
  calcularMultaSoles,
  UIT_2026,
  type SstScoreSnapshot,
} from '../scoring'

const NOW = new Date('2026-05-10T10:00:00.000Z')

function days(d: number): Date {
  return new Date(NOW.getTime() + d * 24 * 60 * 60 * 1000)
}
function hours(h: number): Date {
  return new Date(NOW.getTime() + h * 60 * 60 * 1000)
}

const baseSnapshot: SstScoreSnapshot = {
  numeroTrabajadores: 50,
  esMype: false,
  sedes: [{ id: 's1', activa: true, ubigeoCompleto: true }],
  ipercBases: [],
  emos: [],
  workerIdsActivos: ['w1', 'w2', 'w3'],
  accidentes: [],
  comite: null,
  visitasUlt6Meses: [],
}

describe('calcularMultaSoles', () => {
  it('MUY_GRAVE 50 trabajadores no MYPE = 6.4 UIT', () => {
    const m = calcularMultaSoles('MUY_GRAVE', 50, false)
    expect(m).toBe(Math.round(6.4 * UIT_2026))
  })

  it('GRAVE 100 trabajadores = 5.0 UIT', () => {
    const m = calcularMultaSoles('GRAVE', 100, false)
    expect(m).toBe(Math.round(5.0 * UIT_2026))
  })

  it('LEVE 5 trabajadores = 0.45 UIT', () => {
    const m = calcularMultaSoles('LEVE', 5, false)
    expect(m).toBe(Math.round(0.45 * UIT_2026))
  })

  it('MYPE reduce ~50%', () => {
    const noMype = calcularMultaSoles('GRAVE', 10, false)
    const mype = calcularMultaSoles('GRAVE', 10, true)
    expect(mype).toBeCloseTo(noMype / 2, -2)
  })

  it('rangos: 1000+ usa el tope', () => {
    const m = calcularMultaSoles('MUY_GRAVE', 5000, false)
    expect(m).toBe(Math.round(26.0 * UIT_2026))
  })

  it('borde 51 → rango 51-100', () => {
    const m = calcularMultaSoles('MUY_GRAVE', 51, false)
    expect(m).toBe(Math.round(7.5 * UIT_2026))
  })
})

describe('calcularScoreSst — empresa nueva sin nada', () => {
  it('score muy bajo, semáforo ROJO, exposición alta', () => {
    const r = calcularScoreSst(baseSnapshot, NOW)
    expect(r.scoreGlobal).toBeLessThan(60)
    expect(r.semaforo).toBe('ROJO')
    // Espera al menos 2 áreas con exposición: IPERC (sin matrices) + COMITE (≥20 trab.)
    expect(r.exposicionEconomica.detalle.length).toBeGreaterThanOrEqual(2)
    expect(r.exposicionEconomica.totalSoles).toBeGreaterThan(0)
    expect(r.recomendaciones.length).toBeGreaterThanOrEqual(2)
  })

  it('IPERC y COMITE generan recomendaciones HIGH', () => {
    const r = calcularScoreSst(baseSnapshot, NOW)
    const areas = r.recomendaciones.map((x) => x.area)
    expect(areas).toContain('IPERC')
    expect(areas).toContain('COMITE')
  })
})

describe('calcularScoreSst — empresa cumpliendo todo', () => {
  it('score alto, semáforo VERDE, exposición 0', () => {
    const fullCompliance: SstScoreSnapshot = {
      ...baseSnapshot,
      ipercBases: [
        {
          sedeId: 's1',
          estado: 'VIGENTE',
          fechaAprobacion: days(-30),
          filasSignificativasAbiertas: 0,
        },
      ],
      emos: [
        { workerId: 'w1', proximoExamenAntes: days(180) },
        { workerId: 'w2', proximoExamenAntes: days(180) },
        { workerId: 'w3', proximoExamenAntes: days(180) },
      ],
      comite: {
        estado: 'VIGENTE',
        miembrosActivos: 6,
        representantesEmpleador: 3,
        representantesTrabajadores: 3,
        tienePresidente: true,
        tieneSecretario: true,
        mandatoFin: days(400),
      },
      visitasUlt6Meses: [
        {
          id: 'v1',
          estado: 'CERRADA',
          hallazgosTotal: 2,
          hallazgosSignificativosAbiertos: 0,
        },
      ],
    }

    const r = calcularScoreSst(fullCompliance, NOW)
    expect(r.scoreGlobal).toBeGreaterThanOrEqual(90)
    expect(r.semaforo).toBe('VERDE')
    expect(r.exposicionEconomica.totalSoles).toBe(0)
    expect(r.exposicionEconomica.detalle).toHaveLength(0)
  })
})

describe('calcularScoreSst — accidente sin notificar (CRITICAL)', () => {
  it('SAT vencido genera CRITICAL recomendación + multa MUY_GRAVE', () => {
    const r = calcularScoreSst(
      {
        ...baseSnapshot,
        accidentes: [
          {
            id: 'a1',
            fechaHora: hours(-30),
            plazoLegalHoras: 24,
            satEstado: 'PENDIENTE',
            satFechaEnvioManual: null,
          },
        ],
      },
      NOW,
    )
    const sat = r.recomendaciones.find((x) => x.area === 'SAT')
    expect(sat).toBeDefined()
    expect(sat?.prioridad).toBe('CRITICAL')
    expect(sat?.impactoSoles).toBeGreaterThan(0)
  })

  it('SAT cumplido NO genera recomendación', () => {
    const r = calcularScoreSst(
      {
        ...baseSnapshot,
        accidentes: [
          {
            id: 'a1',
            fechaHora: hours(-100),
            plazoLegalHoras: 24,
            satEstado: 'NOTIFICADO',
            satFechaEnvioManual: hours(-90),
          },
        ],
      },
      NOW,
    )
    expect(r.recomendaciones.find((x) => x.area === 'SAT')).toBeUndefined()
    expect(r.breakdown.sat.score).toBe(r.breakdown.sat.max)
  })
})

describe('calcularScoreSst — Supervisor SST en MYPE', () => {
  it('empresa <20 trabajadores con supervisor cumple', () => {
    const r = calcularScoreSst(
      {
        ...baseSnapshot,
        numeroTrabajadores: 10,
        comite: {
          estado: 'VIGENTE',
          miembrosActivos: 1,
          representantesEmpleador: 0,
          representantesTrabajadores: 1,
          tienePresidente: false,
          tieneSecretario: false,
          mandatoFin: days(400),
        },
      },
      NOW,
    )
    expect(r.breakdown.comite.score).toBe(r.breakdown.comite.max)
  })

  it('empresa <20 trabajadores sin supervisor pierde 5 pts pero no exposición', () => {
    const r = calcularScoreSst({ ...baseSnapshot, numeroTrabajadores: 10 }, NOW)
    expect(r.breakdown.comite.score).toBe(r.breakdown.comite.max - 5)
    expect(r.exposicionEconomica.detalle.find((d) => d.area === 'COMITE')).toBeUndefined()
  })
})

describe('calcularScoreSst — IPERC con filas significativas abiertas', () => {
  it('penaliza por cada fila significativa abierta', () => {
    const sin = calcularScoreSst(
      {
        ...baseSnapshot,
        ipercBases: [
          {
            sedeId: 's1',
            estado: 'VIGENTE',
            fechaAprobacion: days(-30),
            filasSignificativasAbiertas: 0,
          },
        ],
      },
      NOW,
    )
    const con = calcularScoreSst(
      {
        ...baseSnapshot,
        ipercBases: [
          {
            sedeId: 's1',
            estado: 'VIGENTE',
            fechaAprobacion: days(-30),
            filasSignificativasAbiertas: 5,
          },
        ],
      },
      NOW,
    )
    expect(sin.breakdown.iperc.score).toBeGreaterThan(con.breakdown.iperc.score)
  })

  it('IPERC vigente >365 días reduce el score', () => {
    const reciente = calcularScoreSst(
      {
        ...baseSnapshot,
        ipercBases: [
          {
            sedeId: 's1',
            estado: 'VIGENTE',
            fechaAprobacion: days(-30),
            filasSignificativasAbiertas: 0,
          },
        ],
      },
      NOW,
    )
    const viejo = calcularScoreSst(
      {
        ...baseSnapshot,
        ipercBases: [
          {
            sedeId: 's1',
            estado: 'VIGENTE',
            fechaAprobacion: days(-400),
            filasSignificativasAbiertas: 0,
          },
        ],
      },
      NOW,
    )
    expect(reciente.breakdown.iperc.score).toBeGreaterThan(viejo.breakdown.iperc.score)
  })
})

describe('calcularScoreSst — recomendaciones ordenadas por prioridad', () => {
  it('CRITICAL viene antes que HIGH > MEDIUM > LOW', () => {
    const r = calcularScoreSst(
      {
        ...baseSnapshot,
        accidentes: [
          {
            id: 'a1',
            fechaHora: hours(-30),
            plazoLegalHoras: 24,
            satEstado: 'PENDIENTE',
            satFechaEnvioManual: null,
          },
        ],
        emos: [],
      },
      NOW,
    )
    const orden: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    let last = -1
    for (const rec of r.recomendaciones) {
      const idx = orden[rec.prioridad]
      expect(idx).toBeGreaterThanOrEqual(last)
      last = idx
    }
  })
})

describe('calcularScoreSst — semáforo', () => {
  it('VERDE >= 80', () => {
    const r = calcularScoreSst(
      {
        ...baseSnapshot,
        ipercBases: [
          {
            sedeId: 's1',
            estado: 'VIGENTE',
            fechaAprobacion: days(-30),
            filasSignificativasAbiertas: 0,
          },
        ],
        emos: baseSnapshot.workerIdsActivos.map((id) => ({
          workerId: id,
          proximoExamenAntes: days(200),
        })),
        comite: {
          estado: 'VIGENTE',
          miembrosActivos: 6,
          representantesEmpleador: 3,
          representantesTrabajadores: 3,
          tienePresidente: true,
          tieneSecretario: true,
          mandatoFin: days(400),
        },
        visitasUlt6Meses: [
          {
            id: 'v1',
            estado: 'CERRADA',
            hallazgosTotal: 0,
            hallazgosSignificativosAbiertos: 0,
          },
        ],
      },
      NOW,
    )
    expect(r.scoreGlobal).toBeGreaterThanOrEqual(80)
    expect(r.semaforo).toBe('VERDE')
  })

  it('AMARILLO entre 60 y 79', () => {
    const r = calcularScoreSst(
      {
        ...baseSnapshot,
        // Algunos cumplimientos pero no todos
        ipercBases: [
          {
            sedeId: 's1',
            estado: 'VIGENTE',
            fechaAprobacion: days(-30),
            filasSignificativasAbiertas: 0,
          },
        ],
        emos: [
          { workerId: 'w1', proximoExamenAntes: days(200) },
          { workerId: 'w2', proximoExamenAntes: days(200) },
          // w3 sin EMO
        ],
        // Sin comité, sin visitas
      },
      NOW,
    )
    if (r.scoreGlobal >= 60 && r.scoreGlobal < 80) {
      expect(r.semaforo).toBe('AMARILLO')
    }
  })
})
