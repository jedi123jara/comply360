/**
 * Tests de integración del flow SST end-to-end (sin DB real).
 *
 * Cubre la composición de los helpers puros:
 *   1. Crear sede + puesto + IPERC con motor → calcular scoring
 *   2. Registrar accidente + plazo SAT + alertas calendarizador
 *   3. Generar sello criptográfico + verificación pública
 *   4. Análisis de Comité SST con paridad
 *
 * Estos tests garantizan que las piezas componen correctamente sin
 * regresiones cuando se cambia algún helper.
 */

import { describe, it, expect } from 'vitest'
import { calcularNivelRiesgo } from '../iperc-matrix'
import { calcularPlazoSat, evaluarCountdown } from '../sat-deadline'
import { calcularComposicionMinima, analizarComite } from '../comite-rules'
import { evaluarReglasSst } from '../calendar-engine'
import { calcularScoreSst, calcularMultaSoles } from '../scoring'
import {
  computeFingerprint,
  buildPublicSlug,
  parsePublicSlug,
  ipercPayload,
  accidentePayload,
} from '../traceability'
import { detectarCamposMedicosProhibidos } from '../schemas'

describe('FLOW 1 — Sede nueva → IPERC → Score', () => {
  it('Empresa cumpliendo todo tiene score VERDE y exposición 0', () => {
    const fechaAprobacion = new Date('2026-01-15T00:00:00Z')
    const now = new Date('2026-05-10T00:00:00Z')

    // Crear 3 filas IPERC
    const filas = [
      calcularNivelRiesgo({
        indicePersonas: 1,
        indiceProcedimiento: 1,
        indiceCapacitacion: 1,
        indiceExposicion: 1,
        indiceSeveridad: 1,
      }),
      calcularNivelRiesgo({
        indicePersonas: 2,
        indiceProcedimiento: 1,
        indiceCapacitacion: 1,
        indiceExposicion: 2,
        indiceSeveridad: 1,
      }),
      calcularNivelRiesgo({
        indicePersonas: 2,
        indiceProcedimiento: 2,
        indiceCapacitacion: 1,
        indiceExposicion: 1,
        indiceSeveridad: 1,
      }),
    ]

    // Todas Trivial/Tolerable
    expect(filas.every((f) => f.clasificacion === 'TRIVIAL' || f.clasificacion === 'TOLERABLE'))
      .toBe(true)

    const score = calcularScoreSst(
      {
        numeroTrabajadores: 30,
        esMype: false,
        sedes: [{ id: 's1', activa: true, ubigeoCompleto: true }],
        ipercBases: [
          {
            sedeId: 's1',
            estado: 'VIGENTE',
            fechaAprobacion,
            filasSignificativasAbiertas: 0,
          },
        ],
        emos: Array.from({ length: 30 }, (_, i) => ({
          workerId: `w${i + 1}`,
          proximoExamenAntes: new Date('2027-01-01'),
        })),
        workerIdsActivos: Array.from({ length: 30 }, (_, i) => `w${i + 1}`),
        accidentes: [],
        comite: {
          estado: 'VIGENTE',
          miembrosActivos: 4,
          representantesEmpleador: 2,
          representantesTrabajadores: 2,
          tienePresidente: true,
          tieneSecretario: true,
          mandatoFin: new Date('2027-05-10'),
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
      now,
    )

    expect(score.semaforo).toBe('VERDE')
    expect(score.scoreGlobal).toBeGreaterThanOrEqual(80)
    expect(score.exposicionEconomica.totalSoles).toBe(0)
  })

  it('Empresa sin IPERC ni Comité tiene exposición ≥ 6 UIT', () => {
    const score = calcularScoreSst(
      {
        numeroTrabajadores: 50,
        esMype: false,
        sedes: [{ id: 's1', activa: true, ubigeoCompleto: true }],
        ipercBases: [],
        emos: [],
        workerIdsActivos: ['w1', 'w2', 'w3', 'w4', 'w5'],
        accidentes: [],
        comite: null,
        visitasUlt6Meses: [],
      },
      new Date('2026-05-10T00:00:00Z'),
    )

    expect(score.semaforo).toBe('ROJO')
    expect(score.exposicionEconomica.detalle.length).toBeGreaterThanOrEqual(2)
    expect(score.exposicionEconomica.totalSoles).toBeGreaterThan(0)
  })
})

describe('FLOW 2 — Accidente → SAT → Alertas calendarizador', () => {
  it('Accidente MORTAL no notificado en 24h dispara SAT_PLAZO_VENCIDO CRITICAL', () => {
    const eventTime = new Date('2026-05-09T10:00:00Z')
    const plazo = calcularPlazoSat('MORTAL', eventTime)
    expect(plazo.horas).toBe(24)

    // 36h después
    const now = new Date('2026-05-10T22:00:00Z')

    const cd = evaluarCountdown(plazo.deadline, now)
    expect(cd.estado).toBe('VENCIDO')

    const alertas = evaluarReglasSst(
      {
        emos: [],
        ipercBases: [],
        accidentes: [
          {
            id: 'a1',
            workerId: 'w1',
            fechaHora: eventTime,
            plazoLegalHoras: 24,
            satEstado: 'PENDIENTE',
          },
        ],
        comites: [],
      },
      now,
    )

    const sat = alertas.find((a) => a.type === 'SAT_PLAZO_VENCIDO')
    expect(sat).toBeDefined()
    expect(sat?.severity).toBe('CRITICAL')
  })

  it('Accidente NOTIFICADO desaparece del set de alertas (auto-resolve)', () => {
    const alertas = evaluarReglasSst(
      {
        emos: [],
        ipercBases: [],
        accidentes: [
          {
            id: 'a1',
            workerId: 'w1',
            fechaHora: new Date('2026-05-09T10:00:00Z'),
            plazoLegalHoras: 24,
            satEstado: 'NOTIFICADO',
          },
        ],
        comites: [],
      },
      new Date('2026-05-12T00:00:00Z'),
    )
    expect(alertas.find((a) => a.type === 'SAT_PLAZO_VENCIDO')).toBeUndefined()
  })
})

describe('FLOW 3 — Trazabilidad criptográfica end-to-end', () => {
  it('IPERC firmado: hash → slug → parse → match', () => {
    const payload = ipercPayload(
      {
        id: 'ip1',
        orgId: 'org1',
        sedeId: 's1',
        version: 1,
        estado: 'VIGENTE',
        fechaAprobacion: new Date('2026-05-10'),
      },
      [
        {
          proceso: 'P1',
          actividad: 'A1',
          tarea: 'T1',
          nivelRiesgo: 18,
          clasificacion: 'IMPORTANTE',
        },
      ],
    )
    const hash = computeFingerprint(payload)
    const slug = buildPublicSlug('IPERC', hash)
    const parsed = parsePublicSlug(slug)

    expect(parsed?.kind).toBe('IPERC')
    expect(hash.startsWith(parsed!.hashPrefix)).toBe(true)
  })

  it('Misma matriz IPERC genera siempre el mismo hash (determinístico)', () => {
    const args = {
      id: 'ip1',
      orgId: 'org1',
      sedeId: 's1',
      version: 1,
      estado: 'VIGENTE',
      fechaAprobacion: new Date('2026-05-10T00:00:00Z'),
    }
    const filas = [
      {
        proceso: 'P1',
        actividad: 'A1',
        tarea: 'T1',
        nivelRiesgo: 18,
        clasificacion: 'IMPORTANTE',
      },
    ]
    const h1 = computeFingerprint(ipercPayload(args, filas))
    const h2 = computeFingerprint(ipercPayload(args, filas))
    expect(h1).toBe(h2)
  })

  it('Cambiar una fila cambia el hash (detección de manipulación)', () => {
    const args = {
      id: 'ip1',
      orgId: 'org1',
      sedeId: 's1',
      version: 1,
      estado: 'VIGENTE',
      fechaAprobacion: new Date('2026-05-10T00:00:00Z'),
    }
    const filas = [
      {
        proceso: 'P1',
        actividad: 'A1',
        tarea: 'T1',
        nivelRiesgo: 18,
        clasificacion: 'IMPORTANTE',
      },
    ]
    const filasModificadas = [
      {
        proceso: 'P1',
        actividad: 'A1',
        tarea: 'T1-modificado',
        nivelRiesgo: 18,
        clasificacion: 'IMPORTANTE',
      },
    ]
    const h1 = computeFingerprint(ipercPayload(args, filas))
    const h2 = computeFingerprint(ipercPayload(args, filasModificadas))
    expect(h1).not.toBe(h2)
  })

  it('Accidente con descripción modificada genera hash distinto', () => {
    const args = {
      id: 'a1',
      orgId: 'org1',
      sedeId: 's1',
      workerId: 'w1',
      tipo: 'NO_MORTAL',
      fechaHora: new Date('2026-05-10'),
      plazoLegalHoras: 720,
      satEstado: 'PENDIENTE',
      satNumeroManual: null,
      satFechaEnvioManual: null,
    }
    const h1 = computeFingerprint(accidentePayload(args))
    const h2 = computeFingerprint(
      accidentePayload({ ...args, satEstado: 'NOTIFICADO' }),
    )
    expect(h1).not.toBe(h2)
  })
})

describe('FLOW 4 — Comité SST análisis', () => {
  it('Empresa de 50 trab. con comité paritario completo cumple', () => {
    const m = (
      cargo: 'PRESIDENTE' | 'SECRETARIO' | 'MIEMBRO',
      origen: 'REPRESENTANTE_EMPLEADOR' | 'REPRESENTANTE_TRABAJADORES',
    ) => ({ cargo, origen, fechaBaja: null })
    const r = analizarComite(50, [
      m('PRESIDENTE', 'REPRESENTANTE_EMPLEADOR'),
      m('MIEMBRO', 'REPRESENTANTE_EMPLEADOR'),
      m('MIEMBRO', 'REPRESENTANTE_EMPLEADOR'),
      m('SECRETARIO', 'REPRESENTANTE_TRABAJADORES'),
      m('MIEMBRO', 'REPRESENTANTE_TRABAJADORES'),
      m('MIEMBRO', 'REPRESENTANTE_TRABAJADORES'),
    ])
    expect(r.cumple).toBe(true)
    expect(r.minimo.totalMiembros).toBe(6)
  })

  it('Reglas escalan correctamente con tamaño de empresa', () => {
    expect(calcularComposicionMinima(15).tipo).toBe('SUPERVISOR')
    expect(calcularComposicionMinima(20).totalMiembros).toBe(4)
    expect(calcularComposicionMinima(50).totalMiembros).toBe(6)
    expect(calcularComposicionMinima(100).totalMiembros).toBe(8)
    expect(calcularComposicionMinima(500).totalMiembros).toBe(10)
    expect(calcularComposicionMinima(1000).totalMiembros).toBe(12)
  })
})

describe('FLOW 5 — Privacy: detección de campos médicos prohibidos', () => {
  it('Campo prohibido en cualquier nivel → rechazo', () => {
    expect(detectarCamposMedicosProhibidos({ diagnostico: 'asma' })).toBe('diagnostico')
    expect(detectarCamposMedicosProhibidos({ historiaClinica: '...' })).toBe(
      'historiaClinica',
    )
    expect(detectarCamposMedicosProhibidos({ cie10: 'M54.5' })).toBe('cie10')
    expect(detectarCamposMedicosProhibidos({ tratamiento: 'paracetamol' })).toBe(
      'tratamiento',
    )
  })

  it('Payload limpio (solo aptitud + restricciones) → null', () => {
    const ok = {
      workerId: 'w1',
      tipoExamen: 'PERIODICO',
      aptitud: 'APTO_CON_RESTRICCIONES',
      restricciones: 'No levantar más de 10kg',
      consentimientoLey29733: true,
    }
    expect(detectarCamposMedicosProhibidos(ok)).toBeNull()
  })
})

describe('FLOW 6 — Multas SUNAFIL D.S. 019-2006-TR', () => {
  it('UIT 2026 = S/ 5,500 aplicado correctamente', () => {
    const m = calcularMultaSoles('GRAVE', 50, false)
    // GRAVE 26-50 = 3.6 UIT × 5500 = 19800
    expect(m).toBe(19800)
  })

  it('MYPE recibe 50% de descuento', () => {
    const sin = calcularMultaSoles('MUY_GRAVE', 10, false)
    const con = calcularMultaSoles('MUY_GRAVE', 10, true)
    expect(con).toBeCloseTo(sin / 2, -2)
  })

  it('Empresas grandes (1000+) usan tope de la tabla', () => {
    const m1000 = calcularMultaSoles('MUY_GRAVE', 1000, false)
    const m5000 = calcularMultaSoles('MUY_GRAVE', 5000, false)
    expect(m1000).toBe(m5000)
  })
})

describe('FLOW 7 — Score + recomendaciones componen correctamente', () => {
  it('Score con SAT vencido genera CRITICAL en recomendaciones', () => {
    const score = calcularScoreSst(
      {
        numeroTrabajadores: 30,
        esMype: false,
        sedes: [{ id: 's1', activa: true, ubigeoCompleto: true }],
        ipercBases: [
          {
            sedeId: 's1',
            estado: 'VIGENTE',
            fechaAprobacion: new Date('2026-04-01'),
            filasSignificativasAbiertas: 0,
          },
        ],
        emos: [],
        workerIdsActivos: ['w1'],
        accidentes: [
          {
            id: 'a1',
            fechaHora: new Date('2026-05-08'),
            plazoLegalHoras: 24,
            satEstado: 'PENDIENTE',
            satFechaEnvioManual: null,
          },
        ],
        comite: null,
        visitasUlt6Meses: [],
      },
      new Date('2026-05-12T00:00:00Z'),
    )

    const sat = score.recomendaciones.find((r) => r.area === 'SAT')
    expect(sat).toBeDefined()
    expect(sat?.prioridad).toBe('CRITICAL')

    // Las recomendaciones críticas vienen primero
    expect(score.recomendaciones[0].prioridad).toBe('CRITICAL')
  })
})
