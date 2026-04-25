/**
 * Tests del triaje IA de denuncias.
 *
 * `parseTriageResponse` es la parte pura y lo testeamos exhaustivamente.
 * `triageComplaint` hace llamada al provider — no lo testeamos end-to-end
 * acá (requiere mock de callAI complejo). El valor está en parseo estricto.
 */

import { describe, expect, it } from 'vitest'
import { parseTriageResponse } from '../complaint-triage'

describe('parseTriageResponse — happy paths', () => {
  it('acepta respuesta válida completa', () => {
    const raw = JSON.stringify({
      severity: 'ALTA',
      urgency: 'INMEDIATA',
      summary: 'Denuncia por hostigamiento reiterado.',
      redFlags: ['Conducta reiterada mencionada', 'Amenaza implícita'],
      suggestedProtectionMeasures: [
        'Separación física del denunciado',
        'Acompañamiento psicológico',
      ],
    })

    const result = parseTriageResponse(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.severity).toBe('ALTA')
      expect(result.urgency).toBe('INMEDIATA')
      expect(result.summary).toBe('Denuncia por hostigamiento reiterado.')
      expect(result.redFlags).toHaveLength(2)
      expect(result.suggestedProtectionMeasures).toHaveLength(2)
    }
  })

  it('limita summary a 500 chars', () => {
    const long = 'x'.repeat(1000)
    const raw = JSON.stringify({
      severity: 'BAJA',
      urgency: 'BAJA',
      summary: long,
      redFlags: [],
      suggestedProtectionMeasures: [],
    })
    const result = parseTriageResponse(raw)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.summary.length).toBe(500)
  })

  it('limita redFlags a 10 items y filtra strings vacías', () => {
    const flags = Array.from({ length: 15 }, (_, i) => `flag-${i}`)
    flags.push('', 'ok')
    const raw = JSON.stringify({
      severity: 'MEDIA',
      urgency: 'MEDIA',
      summary: 's',
      redFlags: flags,
      suggestedProtectionMeasures: [],
    })
    const result = parseTriageResponse(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.redFlags).toHaveLength(10)
      expect(result.redFlags.every((f) => f.length > 0)).toBe(true)
    }
  })

  it('limita suggestedProtectionMeasures a 15 items', () => {
    const measures = Array.from({ length: 20 }, (_, i) => `medida-${i}`)
    const raw = JSON.stringify({
      severity: 'ALTA',
      urgency: 'ALTA',
      summary: 's',
      redFlags: [],
      suggestedProtectionMeasures: measures,
    })
    const result = parseTriageResponse(raw)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.suggestedProtectionMeasures).toHaveLength(15)
  })

  it('arrays vacíos son válidos', () => {
    const raw = JSON.stringify({
      severity: 'BAJA',
      urgency: 'BAJA',
      summary: 'Sin red flags',
      redFlags: [],
      suggestedProtectionMeasures: [],
    })
    const result = parseTriageResponse(raw)
    expect(result.ok).toBe(true)
  })
})

describe('parseTriageResponse — rejects', () => {
  it('rechaza JSON inválido', () => {
    const result = parseTriageResponse('not json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_response')
  })

  it('rechaza severity inválida', () => {
    const raw = JSON.stringify({
      severity: 'URGENTE', // no está en el enum
      urgency: 'ALTA',
      summary: 's',
      redFlags: [],
      suggestedProtectionMeasures: [],
    })
    const result = parseTriageResponse(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_response')
  })

  it('rechaza urgency inválida', () => {
    const raw = JSON.stringify({
      severity: 'ALTA',
      urgency: 'MAX', // no válido
      summary: 's',
      redFlags: [],
      suggestedProtectionMeasures: [],
    })
    const result = parseTriageResponse(raw)
    expect(result.ok).toBe(false)
  })

  it('rechaza falta de severity', () => {
    const raw = JSON.stringify({
      urgency: 'ALTA',
      summary: 's',
      redFlags: [],
      suggestedProtectionMeasures: [],
    })
    const result = parseTriageResponse(raw)
    expect(result.ok).toBe(false)
  })

  it('tolera summary ausente (queda vacío pero el payload es válido)', () => {
    const raw = JSON.stringify({
      severity: 'ALTA',
      urgency: 'ALTA',
      redFlags: [],
      suggestedProtectionMeasures: [],
    })
    const result = parseTriageResponse(raw)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.summary).toBe('')
  })

  it('rechaza array donde espera string', () => {
    const raw = JSON.stringify({
      severity: ['ALTA'], // tipo incorrecto
      urgency: 'ALTA',
      summary: 's',
      redFlags: [],
      suggestedProtectionMeasures: [],
    })
    const result = parseTriageResponse(raw)
    expect(result.ok).toBe(false)
  })
})

describe('parseTriageResponse — sanitización defensiva', () => {
  it('filtra elementos no-string de redFlags', () => {
    const raw = JSON.stringify({
      severity: 'ALTA',
      urgency: 'ALTA',
      summary: 's',
      redFlags: ['válido', 123, null, { obj: 1 }, 'otro válido'],
      suggestedProtectionMeasures: [],
    })
    const result = parseTriageResponse(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.redFlags).toEqual(['válido', 'otro válido'])
    }
  })

  it('redFlags no-array → array vacío', () => {
    const raw = JSON.stringify({
      severity: 'BAJA',
      urgency: 'BAJA',
      summary: 's',
      redFlags: 'string-en-lugar-de-array',
      suggestedProtectionMeasures: [],
    })
    const result = parseTriageResponse(raw)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.redFlags).toEqual([])
  })
})
