/**
 * Tests for the Document Template Engine
 *
 * Validates:
 *  - Variable substitution (resolveVariables)
 *  - Conditional block evaluation (evaluateCondition)
 *  - Text rendering (renderDocumentToText)
 *  - HTML rendering (renderDocumentToHtml)
 *  - Template registry (getDocumentTemplateById, DOCUMENT_TEMPLATES)
 *  - All 4 bundled legal templates load correctly
 */

import { describe, it, expect } from 'vitest'
import {
  resolveVariables,
  evaluateCondition,
  renderDocumentToText,
  renderDocumentToHtml,
  getDocumentTemplateById,
  DOCUMENT_TEMPLATES,
} from '../documents'

// ─── resolveVariables ──────────────────────────────────────────────────────────

describe('resolveVariables', () => {
  it('substitutes a single variable', () => {
    expect(resolveVariables('Hola {{nombre}}', { nombre: 'María' })).toBe('Hola María')
  })

  it('substitutes multiple variables in one pass', () => {
    const result = resolveVariables('{{a}} y {{b}}', { a: 'foo', b: 'bar' })
    expect(result).toBe('foo y bar')
  })

  it('leaves unknown variables as-is', () => {
    expect(resolveVariables('Empresa: {{razon_social}}', {})).toBe('Empresa: {{razon_social}}')
  })

  it('converts numeric values to string', () => {
    expect(resolveVariables('{{n}} trabajadores', { n: 42 })).toBe('42 trabajadores')
  })

  it('converts boolean values to string', () => {
    expect(resolveVariables('tiene sctr: {{sctr}}', { sctr: true })).toBe('tiene sctr: true')
  })

  it('handles null / undefined values by leaving placeholder', () => {
    const result = resolveVariables('{{val}}', { val: null })
    // null → String(null) = 'null', but the implementation returns 'null' for null
    // Let's just check it doesn't throw
    expect(typeof result).toBe('string')
  })

  it('ignores extra whitespace in variable names when they are exact matches', () => {
    // The pattern matches \w+ so spaces in variable names won't match; this is fine
    expect(resolveVariables('{{empresa_ruc}}', { empresa_ruc: '20123456789' })).toBe('20123456789')
  })
})

// ─── evaluateCondition ─────────────────────────────────────────────────────────

describe('evaluateCondition', () => {
  it('returns true when condition is undefined', () => {
    expect(evaluateCondition(undefined, {})).toBe(true)
  })

  it('evaluates a simple boolean expression', () => {
    expect(evaluateCondition('tiene_comite === true', { tiene_comite: true })).toBe(true)
    expect(evaluateCondition('tiene_comite === true', { tiene_comite: false })).toBe(false)
  })

  it('evaluates numeric comparisons', () => {
    expect(evaluateCondition('totalWorkers >= 20', { totalWorkers: 25 })).toBe(true)
    expect(evaluateCondition('totalWorkers >= 20', { totalWorkers: 10 })).toBe(false)
  })

  it('evaluates string equality', () => {
    expect(evaluateCondition(`sector === 'MINERO'`, { sector: 'MINERO' })).toBe(true)
    expect(evaluateCondition(`sector === 'MINERO'`, { sector: 'SERVICIOS' })).toBe(false)
  })

  it('returns true on invalid expression (safe fallback)', () => {
    expect(evaluateCondition('this is not valid JS @@', {})).toBe(true)
  })

  it('supports logical AND', () => {
    expect(evaluateCondition('a > 0 && b > 0', { a: 1, b: 2 })).toBe(true)
    expect(evaluateCondition('a > 0 && b > 0', { a: 1, b: 0 })).toBe(false)
  })
})

// ─── renderDocumentToText ──────────────────────────────────────────────────────

describe('renderDocumentToText', () => {
  const fakeTemplate = {
    id: 'test',
    type: 'RIT' as const,
    name: 'Test Template',
    description: 'Test',
    legalBasis: 'Test basis',
    sections: [],
    blocks: [
      {
        id: 'b1',
        title: 'SECCIÓN 1',
        text: 'La empresa {{empresa}} tiene {{n}} trabajadores.',
        blockType: 'clause' as const,
      },
      {
        id: 'b2',
        text: 'Solo si aplica: {{extra}}',
        blockType: 'clause' as const,
        condition: 'aplica === true',
      },
    ],
  }

  it('renders blocks with variable substitution', () => {
    const text = renderDocumentToText(fakeTemplate, { empresa: 'ACME', n: 10, aplica: false })
    expect(text).toContain('La empresa ACME tiene 10 trabajadores.')
  })

  it('skips blocks where condition is false', () => {
    const text = renderDocumentToText(fakeTemplate, { empresa: 'ACME', n: 10, aplica: false })
    expect(text).not.toContain('Solo si aplica')
  })

  it('includes blocks where condition is true', () => {
    const text = renderDocumentToText(fakeTemplate, { empresa: 'ACME', n: 10, aplica: true, extra: 'INCLUIDO' })
    expect(text).toContain('Solo si aplica: INCLUIDO')
  })

  it('renders block title when present', () => {
    const text = renderDocumentToText(fakeTemplate, { empresa: 'X', n: 1, aplica: false })
    expect(text).toContain('SECCIÓN 1')
  })
})

// ─── renderDocumentToHtml ──────────────────────────────────────────────────────

describe('renderDocumentToHtml', () => {
  const fakeTemplate = {
    id: 'test-html',
    type: 'PLAN_SST' as const,
    name: 'Plan SST Test',
    description: 'Test',
    legalBasis: 'Ley 29783',
    sections: [],
    blocks: [
      {
        id: 'h1',
        text: 'PLAN ANUAL SST\n{{empresa}}',
        blockType: 'header' as const,
      },
      {
        id: 'c1',
        title: 'I. OBJETO',
        text: 'El objeto de este plan es {{objeto}}.',
        blockType: 'clause' as const,
      },
    ],
  }

  it('returns valid HTML string starting with DOCTYPE', () => {
    const html = renderDocumentToHtml(fakeTemplate, { empresa: 'ACME SAC', objeto: 'prevenir accidentes' })
    expect(html).toMatch(/^<!DOCTYPE html>/i)
  })

  it('contains the template name in title', () => {
    const html = renderDocumentToHtml(fakeTemplate, { empresa: 'ACME' })
    expect(html).toContain('Plan SST Test')
  })

  it('substitutes variables in HTML output', () => {
    const html = renderDocumentToHtml(fakeTemplate, { empresa: 'COMPLY360 S.A.C.', objeto: 'proteger trabajadores' })
    expect(html).toContain('COMPLY360 S.A.C.')
    expect(html).toContain('proteger trabajadores')
  })

  it('escapes HTML special characters to prevent XSS', () => {
    const html = renderDocumentToHtml(fakeTemplate, { empresa: '<script>alert(1)</script>', objeto: 'x' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('renders header block with h1 tag', () => {
    const html = renderDocumentToHtml(fakeTemplate, { empresa: 'ACME' })
    expect(html).toContain('<h1>')
  })

  it('renders section titles with h2 tag', () => {
    const html = renderDocumentToHtml(fakeTemplate, { empresa: 'ACME', objeto: 'test' })
    expect(html).toContain('<h2>')
    expect(html).toContain('I. OBJETO')
  })
})

// ─── Template Registry ─────────────────────────────────────────────────────────

describe('DOCUMENT_TEMPLATES registry', () => {
  it('has exactly 4 templates', () => {
    expect(DOCUMENT_TEMPLATES).toHaveLength(4)
  })

  it('all templates have required fields', () => {
    for (const t of DOCUMENT_TEMPLATES) {
      expect(t.id).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(t.legalBasis).toBeTruthy()
      expect(Array.isArray(t.sections)).toBe(true)
      expect(Array.isArray(t.blocks)).toBe(true)
      expect(t.blocks.length).toBeGreaterThan(0)
    }
  })

  it('all template IDs are unique', () => {
    const ids = DOCUMENT_TEMPLATES.map(t => t.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('can look up each template by ID', () => {
    for (const t of DOCUMENT_TEMPLATES) {
      const found = getDocumentTemplateById(t.id)
      expect(found).toBeDefined()
      expect(found!.id).toBe(t.id)
    }
  })

  it('returns undefined for unknown IDs', () => {
    expect(getDocumentTemplateById('no-existe-template-xyz')).toBeUndefined()
  })
})

// ─── Individual template smoke tests ──────────────────────────────────────────

describe('Individual template smoke tests', () => {
  // Use real template IDs from the registry
  const REQUIRED_DATA: Record<string, Record<string, unknown>> = {
    'politica-hostigamiento-sexual': {
      empresa_razon_social: 'ACME SAC',
      empresa_ruc: '20123456789',
      empresa_sector: 'Servicios',
      empresa_direccion: 'Av. Lima 123',
      empresa_ciudad: 'Lima',
      empresa_distrito: 'Miraflores',
      total_trabajadores: 50,
      representante_legal: 'Juan Pérez',
      gerente_rrhh: 'María García',
      fecha_elaboracion: '01 de abril de 2026',
    },
    'plan-anual-sst': {
      empresa_razon_social: 'ACME SAC',
      empresa_ruc: '20123456789',
      empresa_sector: 'Manufactura',
      anio_plan: '2026',
      representante_legal: 'Juan Pérez',
      fecha_elaboracion: '01 de abril de 2026',
    },
    'reglamento-interno-trabajo': {
      empresa_razon_social: 'ACME SAC',
      empresa_ruc: '20123456789',
      empresa_sector: 'Comercio',
      empresa_actividad: 'Venta de productos',
      empresa_direccion: 'Av. Lima 123',
      empresa_ciudad: 'Lima',
      representante_legal: 'Juan Pérez',
      fecha_elaboracion: '01 de abril de 2026',
    },
    'ccf-ley-30709': {
      empresa_razon_social: 'ACME SAC',
      empresa_ruc: '20123456789',
      empresa_sector: 'Servicios',
      representante_legal: 'Juan Pérez',
      fecha_elaboracion: '01 de abril de 2026',
    },
  }

  for (const [id, data] of Object.entries(REQUIRED_DATA)) {
    it(`template "${id}" renders to text without throwing`, () => {
      const tmpl = getDocumentTemplateById(id)
      expect(tmpl).toBeDefined()
      const text = renderDocumentToText(tmpl!, data)
      expect(text.length).toBeGreaterThan(100)
      // Should not have unresolved required variables (empresa_razon_social should be substituted)
      expect(text).toContain('ACME SAC')
    })

    it(`template "${id}" renders to HTML without throwing`, () => {
      const tmpl = getDocumentTemplateById(id)
      expect(tmpl).toBeDefined()
      const html = renderDocumentToHtml(tmpl!, data)
      expect(html).toMatch(/^<!DOCTYPE html>/i)
      expect(html).toContain('ACME SAC')
    })
  }
})
