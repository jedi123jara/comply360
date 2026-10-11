import { describe, it, expect, vi } from 'vitest'

// legajo-config importa Prisma; aquí solo nos interesa la constante.
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { REQUIRED_DOC_TYPES } from '@/lib/compliance/legajo-config'
import { GLOSSARY_BY_ID } from '@/lib/glossary'
import {
  LEGAJO_CATEGORY_TERMS,
  LEGAJO_DOCS,
  REQUIRED_LEGAJO_DOCS,
  getMultaReferencial,
  legajoDocSegments,
  pickDocsByType,
  resolveDocStatus,
  splitByTerms,
  summarizeLegajo,
} from '../legajo-docs'

const NOW = new Date('2026-10-05T12:00:00Z')

describe('LEGAJO_DOCS', () => {
  it('los obligatorios coinciden 1:1 con el score del servidor', () => {
    const uiRequired = REQUIRED_LEGAJO_DOCS.map((d) => d.type).sort()
    expect(uiRequired).toEqual([...REQUIRED_DOC_TYPES].sort())
  })

  it('no repite tipos de documento', () => {
    const types = LEGAJO_DOCS.map((d) => d.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('cada documento explica por qué lo pide la ley', () => {
    for (const def of LEGAJO_DOCS) {
      expect(def.why.trim().length).toBeGreaterThan(10)
      expect(def.title.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('enlaces al glosario', () => {
  it('cada término existe en el glosario y su texto aparece en el nombre o la explicación', () => {
    for (const def of LEGAJO_DOCS) {
      for (const link of def.terms ?? []) {
        expect(GLOSSARY_BY_ID.has(link.id), `${def.type} → ${link.id}`).toBe(true)
        expect(def.title.includes(link.text) || def.why.includes(link.text), `${def.type}: "${link.text}"`).toBe(
          true,
        )
      }
      expect((def.terms ?? []).length, def.type).toBeLessThanOrEqual(2)
    }
    for (const id of Object.values(LEGAJO_CATEGORY_TERMS)) {
      expect(GLOSSARY_BY_ID.has(id as string)).toBe(true)
    }
  })

  it('cada término se enlaza una sola vez y el texto no cambia', () => {
    for (const def of LEGAJO_DOCS) {
      const { title, why } = legajoDocSegments(def)
      expect(title.map((s) => s.text).join('')).toBe(def.title)
      expect(why.map((s) => s.text).join('')).toBe(def.why)
      const linked = [...title, ...why].filter((s) => s.termId).map((s) => s.termId)
      expect(linked).toHaveLength((def.terms ?? []).length)
      expect(new Set(linked).size).toBe(linked.length)
    }
  })

  it('el Reglamento Interno de SST no se confunde con el RIT', () => {
    const reglamento = LEGAJO_DOCS.find((d) => d.type === 'reglamento_interno')
    expect(reglamento?.terms?.some((t) => t.id === 'rit') ?? false).toBe(false)
  })

  it('splitByTerms marca la primera aparición y conserva el resto del texto', () => {
    expect(splitByTerms('Póliza SCTR', [{ id: 'sctr', text: 'SCTR' }])).toEqual([
      { text: 'Póliza ' },
      { text: 'SCTR', termId: 'sctr' },
    ])
    expect(
      splitByTerms('Constancia de afiliación AFP u ONP', [
        { id: 'onp', text: 'ONP' },
        { id: 'afp', text: 'AFP' },
      ]),
    ).toEqual([
      { text: 'Constancia de afiliación ' },
      { text: 'AFP', termId: 'afp' },
      { text: ' u ' },
      { text: 'ONP', termId: 'onp' },
    ])
    expect(splitByTerms('Currículum vitae', [{ id: 'cts', text: 'CTS' }])).toEqual([{ text: 'Currículum vitae' }])
    expect(splitByTerms('Sin enlaces')).toEqual([{ text: 'Sin enlaces' }])
  })
})

describe('getMultaReferencial', () => {
  it('convierte la multa del catálogo SUNAFIL a soles', () => {
    const multa = getMultaReferencial('contrato_trabajo')
    expect(multa).not.toBeNull()
    expect(multa?.uit).toBe(1.57)
    expect(multa?.soles).toBe(Math.round(1.57 * 5500))
    expect(multa?.gravity).toBe('GRAVE')
  })

  it('devuelve null si el documento no tiene multa directa', () => {
    expect(getMultaReferencial('cv')).toBeNull()
  })
})

describe('resolveDocStatus', () => {
  it('sin documento → falta', () => {
    expect(resolveDocStatus(undefined, NOW)).toBe('falta')
  })

  it('rechazado (MISSING) → falta', () => {
    expect(resolveDocStatus({ status: 'MISSING' }, NOW)).toBe('falta')
  })

  it('con fecha de vencimiento pasada → vencido aunque esté verificado', () => {
    expect(resolveDocStatus({ status: 'VERIFIED', expiresAt: '2026-01-01T00:00:00Z' }, NOW)).toBe('vencido')
  })

  it('VERIFIED → verificado, UPLOADED → subido, PENDING → pendiente', () => {
    expect(resolveDocStatus({ status: 'VERIFIED' }, NOW)).toBe('verificado')
    expect(resolveDocStatus({ status: 'UPLOADED' }, NOW)).toBe('subido')
    expect(resolveDocStatus({ status: 'PENDING' }, NOW)).toBe('pendiente')
  })
})

describe('pickDocsByType', () => {
  it('prefiere el más reciente que no esté rechazado', () => {
    const map = pickDocsByType([
      { documentType: 'dni_copia', status: 'MISSING', createdAt: '2026-09-01T00:00:00Z' },
      { documentType: 'dni_copia', status: 'UPLOADED', createdAt: '2026-08-01T00:00:00Z' },
      { documentType: 'dni_copia', status: 'VERIFIED', createdAt: '2026-07-01T00:00:00Z' },
    ])
    expect(map.get('dni_copia')?.status).toBe('UPLOADED')
  })
})

describe('summarizeLegajo', () => {
  it('sin documentos: nada completo y no se declara legajo completo', () => {
    const s = summarizeLegajo([], NOW)
    expect(s.total).toBe(REQUIRED_DOC_TYPES.length)
    expect(s.completeCount).toBe(0)
    expect(s.isComplete).toBe(false)
    expect(s.missing).toHaveLength(REQUIRED_DOC_TYPES.length)
    expect(s.multaReferencialTotal).toBeGreaterThan(0)
  })

  it('todos los obligatorios subidos → legajo completo', () => {
    const docs = REQUIRED_DOC_TYPES.map((t) => ({ documentType: t, status: 'UPLOADED' }))
    const s = summarizeLegajo(docs, NOW)
    expect(s.isComplete).toBe(true)
    expect(s.completeCount).toBe(REQUIRED_DOC_TYPES.length)
    expect(s.verifiedCount).toBe(0)
    expect(s.multaReferencialTotal).toBe(0)
  })

  it('un documento genérico (OTRO) no cuenta como obligatorio', () => {
    const s = summarizeLegajo([{ documentType: 'OTRO', status: 'UPLOADED' }], NOW)
    expect(s.completeCount).toBe(0)
    expect(s.isComplete).toBe(false)
  })
})
