import { describe, it, expect } from 'vitest'
import {
  getSolicitudesInspeccion,
  evaluarSolicitud,
  generarResultadoSimulacro,
} from '../simulacro-engine'
import type {
  SolicitudInspector,
  HallazgoInspeccion,
  InspeccionTipo,
} from '../simulacro-engine'

const UIT = 5500 // must match the constant in simulacro-engine.ts

/**
 * Worker-factor scale as per D.S. 019-2006-TR Art. 48 (Cuadro de Escala de Multas).
 * Must match `getFactorTrabajadores` in simulacro-engine.ts.
 */
function factor(totalWorkers: number): number {
  if (totalWorkers <= 10) return 1
  if (totalWorkers <= 50) return 5
  if (totalWorkers <= 100) return 10
  if (totalWorkers <= 500) return 20
  return 30
}

// ---------------------------------------------------------------------------
// getSolicitudesInspeccion
// ---------------------------------------------------------------------------

describe('getSolicitudesInspeccion', () => {
  it('should return 28 solicitudes for PREVENTIVA', () => {
    const result = getSolicitudesInspeccion('PREVENTIVA')
    expect(result).toHaveLength(28)
  })

  it('should return 28 solicitudes for POR_DENUNCIA', () => {
    const result = getSolicitudesInspeccion('POR_DENUNCIA')
    expect(result).toHaveLength(28)
  })

  it('should return fewer solicitudes for PROGRAMA_SECTORIAL (SST + CONTRATOS + REGISTROS only)', () => {
    const result = getSolicitudesInspeccion('PROGRAMA_SECTORIAL')
    expect(result.length).toBeLessThan(28)
    // Every returned solicitud should be SST, CONTRATOS, or REGISTROS
    for (const s of result) {
      expect(['SST', 'CONTRATOS', 'REGISTROS']).toContain(s.categoria)
    }
  })

  it('PROGRAMA_SECTORIAL should not include BOLETAS, BENEFICIOS, or POLITICAS', () => {
    const result = getSolicitudesInspeccion('PROGRAMA_SECTORIAL')
    const excluded = result.filter(
      s => s.categoria === 'BOLETAS' || s.categoria === 'BENEFICIOS' || s.categoria === 'POLITICAS'
    )
    expect(excluded).toHaveLength(0)
  })

  it('every solicitud should have sequential paso numbers', () => {
    const result = getSolicitudesInspeccion('PREVENTIVA')
    for (let i = 0; i < result.length; i++) {
      expect(result[i].paso).toBe(i + 1)
    }
  })

  it('every solicitud should have a unique id', () => {
    const result = getSolicitudesInspeccion('PREVENTIVA')
    const ids = result.map(s => s.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('every solicitud should have required fields', () => {
    const result = getSolicitudesInspeccion('PREVENTIVA')
    for (const s of result) {
      expect(s.id).toBeTruthy()
      expect(s.mensaje).toBeTruthy()
      expect(s.documentoRequerido).toBeTruthy()
      expect(s.documentoLabel).toBeTruthy()
      expect(s.baseLegal).toBeTruthy()
      expect(['LEVE', 'GRAVE', 'MUY_GRAVE']).toContain(s.gravedad)
      expect(s.multaUIT).toBeGreaterThan(0)
      expect(['CONTRATOS', 'BOLETAS', 'SST', 'REGISTROS', 'BENEFICIOS', 'POLITICAS']).toContain(s.categoria)
    }
  })
})

// ---------------------------------------------------------------------------
// evaluarSolicitud
// ---------------------------------------------------------------------------

describe('evaluarSolicitud', () => {
  const solicitud: SolicitudInspector = {
    id: 'S-01',
    paso: 1,
    mensaje: 'Test solicitud',
    documentoRequerido: 'contrato_trabajo',
    documentoLabel: 'Contratos de Trabajo',
    baseLegal: 'D.Leg. 728, Art. 4',
    gravedad: 'GRAVE',
    multaUIT: 1.57,
    categoria: 'CONTRATOS',
  }

  it('should return CUMPLE when 100% of workers have VERIFIED documents', () => {
    const docs = [
      { documentType: 'contrato_trabajo', status: 'VERIFIED', category: 'contratos' },
      { documentType: 'contrato_trabajo', status: 'VERIFIED', category: 'contratos' },
      { documentType: 'contrato_trabajo', status: 'VERIFIED', category: 'contratos' },
      { documentType: 'contrato_trabajo', status: 'VERIFIED', category: 'contratos' },
      { documentType: 'contrato_trabajo', status: 'VERIFIED', category: 'contratos' },
    ]
    const result = evaluarSolicitud(solicitud, docs, 5)
    expect(result.estado).toBe('CUMPLE')
    expect(result.multaPEN).toBe(0)
  })

  it('should return PARCIAL when some documents are uploaded but not enough verified', () => {
    const docs = [
      { documentType: 'contrato_trabajo', status: 'UPLOADED', category: 'contratos' },
      { documentType: 'contrato_trabajo', status: 'UPLOADED', category: 'contratos' },
    ]
    const totalWorkers = 5
    const result = evaluarSolicitud(solicitud, docs, totalWorkers)
    expect(result.estado).toBe('PARCIAL')
    // PARCIAL multa = multaUIT * UIT * workerFactor * 0.3, factor per D.S. 019-2006-TR
    expect(result.multaPEN).toBe(Math.round(solicitud.multaUIT * UIT * factor(totalWorkers) * 0.3))
  })

  it('should return NO_CUMPLE when no documents are uploaded at all', () => {
    const totalWorkers = 5
    const result = evaluarSolicitud(solicitud, [], totalWorkers)
    expect(result.estado).toBe('NO_CUMPLE')
    // NO_CUMPLE multa = multaUIT * UIT * workerFactor, factor per D.S. 019-2006-TR
    expect(result.multaPEN).toBe(Math.round(solicitud.multaUIT * UIT * factor(totalWorkers)))
  })

  it('should return NO_APLICA when totalWorkers is 0', () => {
    const result = evaluarSolicitud(solicitud, [], 0)
    expect(result.estado).toBe('NO_APLICA')
    expect(result.multaPEN).toBe(0)
  })

  it('should ignore documents of a different type', () => {
    const docs = [
      { documentType: 'boleta_pago', status: 'VERIFIED', category: 'boletas' },
      { documentType: 'boleta_pago', status: 'VERIFIED', category: 'boletas' },
    ]
    const result = evaluarSolicitud(solicitud, docs, 5)
    expect(result.estado).toBe('NO_CUMPLE')
  })

  it('should scale multa by worker bracket (D.S. 019-2006-TR Art. 48)', () => {
    // ≤10 trabajadores → factor 1; 11-50 → factor 5; 51-100 → factor 10
    const r10 = evaluarSolicitud(solicitud, [], 10)
    const r50 = evaluarSolicitud(solicitud, [], 50)
    const r100 = evaluarSolicitud(solicitud, [], 100)
    expect(r10.multaPEN).toBe(Math.round(solicitud.multaUIT * UIT * 1))
    expect(r50.multaPEN).toBe(Math.round(solicitud.multaUIT * UIT * 5))
    expect(r100.multaPEN).toBe(Math.round(solicitud.multaUIT * UIT * 10))
    // 100 workers must result in higher multa than 10 workers
    expect(r100.multaPEN).toBeGreaterThan(r10.multaPEN)
  })

  it('should include the correct metadata in the hallazgo', () => {
    const result = evaluarSolicitud(solicitud, [], 5)
    expect(result.solicitudId).toBe('S-01')
    expect(result.documentoLabel).toBe('Contratos de Trabajo')
    expect(result.baseLegal).toBe('D.Leg. 728, Art. 4')
    expect(result.gravedad).toBe('GRAVE')
    expect(result.multaUIT).toBe(1.57)
  })

  it('CUMPLE requires 100% of workers verified (SUNAFIL no acepta parciales)', () => {
    // 5 verified out of 5 = 100% -> CUMPLE
    const docs5 = Array.from({ length: 5 }, () => ({
      documentType: 'contrato_trabajo', status: 'VERIFIED', category: 'contratos',
    }))
    expect(evaluarSolicitud(solicitud, docs5, 5).estado).toBe('CUMPLE')

    // 4 verified out of 5 = 80% -> PARCIAL (stricter than the legacy 80% threshold)
    const docs4 = Array.from({ length: 4 }, () => ({
      documentType: 'contrato_trabajo', status: 'VERIFIED', category: 'contratos',
    }))
    expect(evaluarSolicitud(solicitud, docs4, 5).estado).toBe('PARCIAL')
  })

  it('should downgrade to PARCIAL when documents are EXPIRED', () => {
    // Expired docs trigger PARCIAL regardless of verified count
    const docsExpired = Array.from({ length: 5 }, () => ({
      documentType: 'contrato_trabajo', status: 'EXPIRED', category: 'contratos',
    }))
    const result = evaluarSolicitud(solicitud, docsExpired, 5)
    expect(result.estado).toBe('PARCIAL')
    expect(result.mensaje).toMatch(/vencido/i)
  })
})

// ---------------------------------------------------------------------------
// generarResultadoSimulacro
// ---------------------------------------------------------------------------

describe('generarResultadoSimulacro', () => {
  function makeHallazgo(overrides: Partial<HallazgoInspeccion>): HallazgoInspeccion {
    return {
      solicitudId: 'S-XX',
      estado: 'CUMPLE',
      mensaje: 'Test',
      documentoLabel: 'Test Doc',
      baseLegal: 'Ley X',
      gravedad: 'LEVE',
      multaUIT: 0.23,
      multaPEN: 0,
      ...overrides,
    }
  }

  it('should count cumple, parcial, noCumple, noAplica correctly', () => {
    const hallazgos: HallazgoInspeccion[] = [
      makeHallazgo({ estado: 'CUMPLE' }),
      makeHallazgo({ estado: 'CUMPLE' }),
      makeHallazgo({ estado: 'PARCIAL', multaPEN: 1000 }),
      makeHallazgo({ estado: 'NO_CUMPLE', multaPEN: 5000 }),
      makeHallazgo({ estado: 'NO_APLICA' }),
    ]
    const result = generarResultadoSimulacro('PREVENTIVA', hallazgos)
    expect(result.cumple).toBe(2)
    expect(result.parcial).toBe(1)
    expect(result.noCumple).toBe(1)
    expect(result.noAplica).toBe(1)
    expect(result.totalSolicitudes).toBe(5)
  })

  it('should calculate scoreSimulacro correctly (excludes NO_APLICA)', () => {
    // evaluable = 5 - 1 = 4
    // score = round(((2 + 1*0.5) / 4) * 100) = round((2.5/4)*100) = round(62.5) = 63
    const hallazgos: HallazgoInspeccion[] = [
      makeHallazgo({ estado: 'CUMPLE' }),
      makeHallazgo({ estado: 'CUMPLE' }),
      makeHallazgo({ estado: 'PARCIAL', multaPEN: 1000 }),
      makeHallazgo({ estado: 'NO_CUMPLE', multaPEN: 5000 }),
      makeHallazgo({ estado: 'NO_APLICA' }),
    ]
    const result = generarResultadoSimulacro('PREVENTIVA', hallazgos)
    expect(result.scoreSimulacro).toBe(63)
  })

  it('should return 0 score when all evaluable items are NO_CUMPLE', () => {
    const hallazgos: HallazgoInspeccion[] = [
      makeHallazgo({ estado: 'NO_CUMPLE', multaPEN: 5000 }),
      makeHallazgo({ estado: 'NO_CUMPLE', multaPEN: 3000 }),
    ]
    const result = generarResultadoSimulacro('PREVENTIVA', hallazgos)
    expect(result.scoreSimulacro).toBe(0)
  })

  it('should return 100 score when all evaluable items are CUMPLE', () => {
    const hallazgos: HallazgoInspeccion[] = [
      makeHallazgo({ estado: 'CUMPLE' }),
      makeHallazgo({ estado: 'CUMPLE' }),
      makeHallazgo({ estado: 'NO_APLICA' }),
    ]
    const result = generarResultadoSimulacro('PREVENTIVA', hallazgos)
    expect(result.scoreSimulacro).toBe(100)
  })

  it('should return 0 score when all items are NO_APLICA (0 evaluable)', () => {
    const hallazgos: HallazgoInspeccion[] = [
      makeHallazgo({ estado: 'NO_APLICA' }),
    ]
    const result = generarResultadoSimulacro('PREVENTIVA', hallazgos)
    expect(result.scoreSimulacro).toBe(0)
  })

  it('should sum multaTotal from all hallazgos', () => {
    const hallazgos: HallazgoInspeccion[] = [
      makeHallazgo({ estado: 'NO_CUMPLE', multaPEN: 5000 }),
      makeHallazgo({ estado: 'PARCIAL', multaPEN: 1500 }),
      makeHallazgo({ estado: 'CUMPLE', multaPEN: 0 }),
    ]
    const result = generarResultadoSimulacro('PREVENTIVA', hallazgos)
    expect(result.multaTotal).toBe(6500)
  })

  it('should calculate subsanacion discounts correctly', () => {
    const hallazgos: HallazgoInspeccion[] = [
      makeHallazgo({ estado: 'NO_CUMPLE', multaPEN: 10000 }),
    ]
    const result = generarResultadoSimulacro('PREVENTIVA', hallazgos)
    // 90% discount -> pay only 10%
    expect(result.multaConSubsanacion).toBe(Math.round(10000 * 0.1))
    // 70% discount -> pay only 30%
    expect(result.multaConSubsanacionDurante).toBe(Math.round(10000 * 0.3))
  })

  it('should count infracciones by gravedad (only non-CUMPLE and non-NO_APLICA)', () => {
    const hallazgos: HallazgoInspeccion[] = [
      makeHallazgo({ estado: 'NO_CUMPLE', gravedad: 'LEVE', multaPEN: 100 }),
      makeHallazgo({ estado: 'NO_CUMPLE', gravedad: 'LEVE', multaPEN: 100 }),
      makeHallazgo({ estado: 'PARCIAL', gravedad: 'GRAVE', multaPEN: 500 }),
      makeHallazgo({ estado: 'NO_CUMPLE', gravedad: 'MUY_GRAVE', multaPEN: 2000 }),
      makeHallazgo({ estado: 'CUMPLE', gravedad: 'GRAVE', multaPEN: 0 }), // CUMPLE -> not counted
      makeHallazgo({ estado: 'NO_APLICA', gravedad: 'MUY_GRAVE', multaPEN: 0 }), // NO_APLICA -> not counted
    ]
    const result = generarResultadoSimulacro('PREVENTIVA', hallazgos)
    expect(result.infraccionesLeves).toBe(2)
    expect(result.infraccionesGraves).toBe(1)
    expect(result.infraccionesMuyGraves).toBe(1)
  })

  it('should set the tipo field from the input parameter', () => {
    const hallazgos: HallazgoInspeccion[] = [makeHallazgo({ estado: 'CUMPLE' })]
    const tipos: InspeccionTipo[] = ['PREVENTIVA', 'POR_DENUNCIA', 'PROGRAMA_SECTORIAL']
    for (const tipo of tipos) {
      const result = generarResultadoSimulacro(tipo, hallazgos)
      expect(result.tipo).toBe(tipo)
    }
  })

  it('should handle empty hallazgos array', () => {
    const result = generarResultadoSimulacro('PREVENTIVA', [])
    expect(result.totalSolicitudes).toBe(0)
    expect(result.cumple).toBe(0)
    expect(result.parcial).toBe(0)
    expect(result.noCumple).toBe(0)
    expect(result.noAplica).toBe(0)
    expect(result.scoreSimulacro).toBe(0)
    expect(result.multaTotal).toBe(0)
  })
})
