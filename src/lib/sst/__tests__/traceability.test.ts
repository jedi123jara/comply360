import { describe, it, expect } from 'vitest'
import {
  canonicalJson,
  computeFingerprint,
  buildPublicSlug,
  parsePublicSlug,
  buildPublicVerifyUrl,
  ipercPayload,
  accidentePayload,
  emoPayload,
  visitaPayload,
} from '../traceability'

describe('canonicalJson', () => {
  it('ordena keys alfabéticamente', () => {
    const a = canonicalJson({ b: 2, a: 1, c: 3 })
    const b = canonicalJson({ c: 3, a: 1, b: 2 })
    expect(a).toBe(b)
  })

  it('ordena keys recursivamente', () => {
    const a = canonicalJson({ x: { z: 1, a: 2 }, b: 3 })
    const b = canonicalJson({ b: 3, x: { a: 2, z: 1 } })
    expect(a).toBe(b)
  })

  it('serializa Date a ISO', () => {
    const d = new Date('2026-05-10T10:00:00.000Z')
    const out = canonicalJson({ fecha: d })
    expect(out).toContain('2026-05-10T10:00:00.000Z')
  })

  it('preserva orden de arrays', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]')
  })
})

describe('computeFingerprint', () => {
  it('mismas entradas → mismo hash (determinístico)', () => {
    const a = computeFingerprint({ x: 1, y: 'abc' })
    const b = computeFingerprint({ x: 1, y: 'abc' })
    expect(a).toBe(b)
  })

  it('mismas entradas en orden distinto → mismo hash', () => {
    const a = computeFingerprint({ x: 1, y: 'abc' })
    const b = computeFingerprint({ y: 'abc', x: 1 })
    expect(a).toBe(b)
  })

  it('cambio mínimo → hash distinto', () => {
    const a = computeFingerprint({ x: 1 })
    const b = computeFingerprint({ x: 2 })
    expect(a).not.toBe(b)
  })

  it('output es 64 chars hex', () => {
    const h = computeFingerprint({ a: 1 })
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('buildPublicSlug + parsePublicSlug', () => {
  it('genera slug 12 chars con prefijo correcto', () => {
    const fp = 'a3b4c5d6e7f80123456789abcdef0123456789abcdef0123456789abcdef0123'
    expect(buildPublicSlug('IPERC', fp)).toBe('I' + fp.slice(0, 11))
    expect(buildPublicSlug('ACCIDENTE', fp)).toBe('A' + fp.slice(0, 11))
    expect(buildPublicSlug('EMO', fp)).toBe('E' + fp.slice(0, 11))
    expect(buildPublicSlug('VISITA', fp)).toBe('V' + fp.slice(0, 11))
    expect(buildPublicSlug('COMITE', fp)).toBe('C' + fp.slice(0, 11))
  })

  it('parse del slug recupera el tipo', () => {
    const fp = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    const slug = buildPublicSlug('IPERC', fp)
    const parsed = parsePublicSlug(slug)
    expect(parsed?.kind).toBe('IPERC')
    expect(parsed?.hashPrefix).toBe(fp.slice(0, 11))
  })

  it('parse devuelve null para slug inválido', () => {
    expect(parsePublicSlug('')).toBeNull()
    expect(parsePublicSlug('XYZ')).toBeNull()
    expect(parsePublicSlug('Z123456789ab')).toBeNull()
    expect(parsePublicSlug('I1234')).toBeNull()
  })
})

describe('buildPublicVerifyUrl', () => {
  it('arma URL con slug', () => {
    const url = buildPublicVerifyUrl('I12345abcdef', 'https://comply360.pe')
    expect(url).toBe('https://comply360.pe/verify/sst/I12345abcdef')
  })

  it('quita trailing slash del base', () => {
    const url = buildPublicVerifyUrl('I12345abcdef', 'https://comply360.pe/')
    expect(url).toBe('https://comply360.pe/verify/sst/I12345abcdef')
  })
})

describe('payloads canónicos por tipo', () => {
  it('ipercPayload incluye filas y count', () => {
    const p = ipercPayload(
      {
        id: 'ip1',
        orgId: 'org1',
        sedeId: 's1',
        version: 1,
        estado: 'VIGENTE',
        fechaAprobacion: new Date('2026-05-01'),
      },
      [
        { proceso: 'P1', actividad: 'A1', tarea: 'T1', nivelRiesgo: 18, clasificacion: 'IMPORTANTE' },
      ],
    )
    expect(p.kind).toBe('IPERC')
    expect(p.filasCount).toBe(1)
    expect(p.filas[0].clasificacion).toBe('IMPORTANTE')
  })

  it('accidentePayload no incluye descripción libre (PII)', () => {
    const p = accidentePayload({
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
    })
    expect(p.kind).toBe('ACCIDENTE')
    expect(p).not.toHaveProperty('descripcion')
  })

  it('emoPayload SOLO incluye boolean de tieneRestricciones, NO el contenido', () => {
    const p = emoPayload({
      id: 'e1',
      orgId: 'org1',
      workerId: 'w1',
      tipoExamen: 'PERIODICO',
      fechaExamen: new Date('2026-05-10'),
      centroMedicoNombre: 'Centro X',
      aptitud: 'APTO',
      consentimientoLey29733: true,
      restriccionesCifrado: new Uint8Array([1, 2, 3]),
    })
    expect(p.tieneRestricciones).toBe(true)
    expect(p).not.toHaveProperty('restricciones')
    expect(p).not.toHaveProperty('restriccionesCifrado')
  })

  it('emoPayload con restriccionesCifrado=null → tieneRestricciones=false', () => {
    const p = emoPayload({
      id: 'e1',
      orgId: 'org1',
      workerId: 'w1',
      tipoExamen: 'PERIODICO',
      fechaExamen: new Date('2026-05-10'),
      centroMedicoNombre: 'Centro X',
      aptitud: 'APTO',
      consentimientoLey29733: true,
      restriccionesCifrado: null,
    })
    expect(p.tieneRestricciones).toBe(false)
  })

  it('visitaPayload incluye hallazgos sin foto/coordenadas', () => {
    const p = visitaPayload(
      {
        id: 'v1',
        orgId: 'org1',
        sedeId: 's1',
        colaboradorId: 'c1',
        fechaProgramada: new Date('2026-05-10'),
        fechaCierreOficina: null,
        estado: 'CERRADA',
      },
      [{ tipo: 'EPP_AUSENTE', severidad: 'MODERADO', descripcion: 'Operario sin casco' }],
    )
    expect(p.hallazgos).toHaveLength(1)
    expect(p.hallazgos[0]).not.toHaveProperty('fotoUrl')
    expect(p.hallazgos[0]).not.toHaveProperty('coordenadasGps')
  })

  it('mismas entradas a un payload generan el mismo fingerprint', () => {
    const args = {
      id: 'a1',
      orgId: 'org1',
      sedeId: 's1',
      workerId: 'w1',
      tipo: 'NO_MORTAL',
      fechaHora: new Date('2026-05-10T10:00:00.000Z'),
      plazoLegalHoras: 720,
      satEstado: 'PENDIENTE',
      satNumeroManual: null,
      satFechaEnvioManual: null,
    }
    const p1 = accidentePayload(args)
    const p2 = accidentePayload(args)
    expect(computeFingerprint(p1)).toBe(computeFingerprint(p2))
  })
})
