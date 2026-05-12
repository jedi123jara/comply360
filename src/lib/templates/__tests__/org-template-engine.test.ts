/**
 * Tests for org-template-engine.ts — pure logic, no mocks needed.
 */
import {
  PLACEHOLDER_CATALOG,
  detectPlaceholders,
  resolveFieldPath,
  renderTemplate,
  type WorkerMergeData,
  type OrgMergeData,
  type RenderContext,
} from '../org-template-engine'

// ── Fixtures ──────────────────────────────────────────────────────────────

const worker: WorkerMergeData = {
  firstName: 'Maria Fernanda',
  lastName: 'Gonzalez Perez',
  dni: '45678912',
  email: 'maria@example.com',
  phone: '+51 987 654 321',
  address: 'Av. Javier Prado 1234, San Isidro, Lima',
  position: 'Analista Contable',
  department: 'Finanzas',
  regimenLaboral: 'GENERAL',
  tipoContrato: 'INDEFINIDO',
  fechaIngreso: new Date('2026-04-01'),
  fechaCese: null,
  sueldoBruto: 2500,
  asignacionFamiliar: false,
  jornadaSemanal: 48,
  birthDate: new Date('1992-03-15'),
  nationality: 'peruana',
}

const org: OrgMergeData = {
  name: 'ACME S.A.C.',
  razonSocial: 'ACME SOCIEDAD ANONIMA CERRADA',
  ruc: '20123456789',
  address: 'Jr. Lampa 342, Lima',
  sector: 'Servicios',
  representanteLegal: 'Carlos Mendoza Torres',
}

const ctx = { worker, org, meta: {} as Record<string, string> }

// ═════════════════════════════════════════════════════════════════════════
//  PLACEHOLDER_CATALOG
// ═════════════════════════════════════════════════════════════════════════

describe('PLACEHOLDER_CATALOG', () => {
  it('has exactly 27 entries', () => {
    expect(PLACEHOLDER_CATALOG).toHaveLength(27)
  })

  it('every entry has key, label, description, path, group, example as non-empty strings', () => {
    for (const entry of PLACEHOLDER_CATALOG) {
      expect(typeof entry.key).toBe('string')
      expect(entry.key.length).toBeGreaterThan(0)

      expect(typeof entry.label).toBe('string')
      expect(entry.label.length).toBeGreaterThan(0)

      expect(typeof entry.description).toBe('string')
      expect(entry.description.length).toBeGreaterThan(0)

      expect(typeof entry.path).toBe('string')
      expect(entry.path.length).toBeGreaterThan(0)

      expect(typeof entry.group).toBe('string')
      expect(entry.group.length).toBeGreaterThan(0)

      expect(typeof entry.example).toBe('string')
      expect(entry.example.length).toBeGreaterThan(0)
    }
  })

  it('groups are only worker, org, or meta', () => {
    const validGroups = new Set(['worker', 'org', 'meta'])
    for (const entry of PLACEHOLDER_CATALOG) {
      expect(validGroups.has(entry.group)).toBe(true)
    }
  })

  it('keys are UPPER_SNAKE_CASE', () => {
    const upperSnake = /^[A-Z_][A-Z0-9_]*$/
    for (const entry of PLACEHOLDER_CATALOG) {
      expect(entry.key).toMatch(upperSnake)
    }
  })

  it('has no duplicate keys', () => {
    const keys = PLACEHOLDER_CATALOG.map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

// ═════════════════════════════════════════════════════════════════════════
//  detectPlaceholders
// ═════════════════════════════════════════════════════════════════════════

describe('detectPlaceholders', () => {
  it('finds a single placeholder', () => {
    expect(detectPlaceholders('{{NOMBRE}}')).toEqual(['NOMBRE'])
  })

  it('finds multiple different placeholders', () => {
    expect(detectPlaceholders('{{NOMBRE}} con DNI {{DNI}}')).toEqual(['NOMBRE', 'DNI'])
  })

  it('returns unique keys (no duplicates)', () => {
    expect(detectPlaceholders('{{DNI}} y {{DNI}}')).toEqual(['DNI'])
  })

  it('preserves order of first appearance', () => {
    const result = detectPlaceholders('{{CARGO}} luego {{DNI}} y despues {{NOMBRE}}')
    expect(result).toEqual(['CARGO', 'DNI', 'NOMBRE'])
  })

  it('handles whitespace inside braces', () => {
    expect(detectPlaceholders('{{ NOMBRE }}')).toEqual(['NOMBRE'])
  })

  it('returns empty array for content without placeholders', () => {
    expect(detectPlaceholders('Texto plano sin variables')).toEqual([])
  })

  it('ignores lowercase keys (regex only matches UPPER)', () => {
    expect(detectPlaceholders('{{nombre}}')).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════
//  resolveFieldPath
// ═════════════════════════════════════════════════════════════════════════

describe('resolveFieldPath', () => {
  it('resolves worker.firstName', () => {
    expect(resolveFieldPath('worker.firstName', ctx)).toBe('Maria Fernanda')
  })

  it('resolves worker.fullName as firstName + lastName', () => {
    expect(resolveFieldPath('worker.fullName', ctx)).toBe('Maria Fernanda Gonzalez Perez')
  })

  it('resolves worker.dni', () => {
    expect(resolveFieldPath('worker.dni', ctx)).toBe('45678912')
  })

  it('resolves worker.sueldoEnLetras for sueldoBruto=2500', () => {
    const result = resolveFieldPath('worker.sueldoEnLetras', ctx)
    expect(result).toContain('DOS MIL QUINIENTOS')
    expect(result).toContain('SOLES')
  })

  it('resolves worker.sueldoBruto as formatted money string', () => {
    const result = resolveFieldPath('worker.sueldoBruto', ctx)
    // Locale-formatted: could be "2,500.00" or "2.500,00" depending on env
    // The function uses 'es-PE' locale with 2 decimal places
    expect(result).toMatch(/2[.,]?500[.,]00/)
  })

  it('resolves org.ruc', () => {
    expect(resolveFieldPath('org.ruc', ctx)).toBe('20123456789')
  })

  it('resolves org.name', () => {
    expect(resolveFieldPath('org.name', ctx)).toBe('ACME S.A.C.')
  })

  it('resolves meta.today as DD/MM/YYYY format', () => {
    const result = resolveFieldPath('meta.today', ctx)
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  it('resolves meta.todayInWords as Spanish date string', () => {
    const result = resolveFieldPath('meta.todayInWords', ctx)
    // Should contain "de" and a year — e.g. "21 de abril de 2026"
    expect(result).toMatch(/\d{1,2} de \w+ de \d{4}/)
  })

  it('returns empty string for null/undefined values', () => {
    const workerNulls: WorkerMergeData = {
      ...worker,
      email: null,
      phone: null,
      fechaCese: null,
    }
    const ctxNulls = { worker: workerNulls, org, meta: {} as Record<string, string> }
    expect(resolveFieldPath('worker.fechaCese', ctxNulls)).toBe('')
  })

  it('returns empty string for invalid path without dot', () => {
    expect(resolveFieldPath('invalidpath', ctx)).toBe('')
  })

  it('returns empty string for empty path', () => {
    expect(resolveFieldPath('', ctx)).toBe('')
  })
})

// ═════════════════════════════════════════════════════════════════════════
//  renderTemplate
// ═════════════════════════════════════════════════════════════════════════

describe('renderTemplate', () => {
  const renderCtx: RenderContext = { worker, org }

  it('replaces mapped placeholders with resolved values', () => {
    const content = 'Yo, {{NOMBRE}}, acepto.'
    const mappings = { NOMBRE: 'worker.firstName' }
    const result = renderTemplate(content, mappings, renderCtx)

    expect(result.rendered).toBe('Yo, Maria Fernanda, acepto.')
    expect(result.usedPlaceholders).toContain('NOMBRE')
    expect(result.missingPlaceholders).toEqual([])
  })

  it('replaces multiple different placeholders', () => {
    const content = '{{NOMBRE_COMPLETO}} con DNI {{DNI}} en {{EMPRESA}}'
    const mappings = {
      NOMBRE_COMPLETO: 'worker.fullName',
      DNI: 'worker.dni',
      EMPRESA: 'org.name',
    }
    const result = renderTemplate(content, mappings, renderCtx)

    expect(result.rendered).toBe('Maria Fernanda Gonzalez Perez con DNI 45678912 en ACME S.A.C.')
    expect(result.usedPlaceholders).toEqual(['NOMBRE_COMPLETO', 'DNI', 'EMPRESA'])
    expect(result.missingPlaceholders).toEqual([])
  })

  it('with blankUnmapped, replaces unmapped placeholders with underscores', () => {
    const content = 'Dato: {{DESCONOCIDO}}'
    const mappings: Record<string, string> = {}
    const result = renderTemplate(content, mappings, renderCtx, { blankUnmapped: true })

    expect(result.rendered).toBe('Dato: ____________')
    expect(result.missingPlaceholders).toContain('DESCONOCIDO')
  })

  it('without blankUnmapped, keeps unmapped placeholders as-is', () => {
    const content = 'Dato: {{DESCONOCIDO}}'
    const mappings: Record<string, string> = {}
    const result = renderTemplate(content, mappings, renderCtx)

    expect(result.rendered).toBe('Dato: {{DESCONOCIDO}}')
    expect(result.missingPlaceholders).toContain('DESCONOCIDO')
  })

  it('returns usedPlaceholders and missingPlaceholders lists', () => {
    const content = '{{NOMBRE}} y {{DNI}} y {{SIN_MAPEO}}'
    const mappings = { NOMBRE: 'worker.firstName', DNI: 'worker.dni' }
    const result = renderTemplate(content, mappings, renderCtx)

    expect(result.usedPlaceholders).toEqual(['NOMBRE', 'DNI', 'SIN_MAPEO'])
    expect(result.missingPlaceholders).toEqual(['SIN_MAPEO'])
  })

  it('injects ciudad into meta context from options', () => {
    const content = 'En la ciudad de {{CIUDAD}}'
    const mappings = { CIUDAD: 'meta.ciudad' }
    const result = renderTemplate(content, mappings, renderCtx, { ciudad: 'Arequipa' })

    expect(result.rendered).toBe('En la ciudad de Arequipa')
  })

  it('defaults ciudad to Lima when not provided', () => {
    const content = 'En la ciudad de {{CIUDAD}}'
    const mappings = { CIUDAD: 'meta.ciudad' }
    const result = renderTemplate(content, mappings, renderCtx)

    expect(result.rendered).toBe('En la ciudad de Lima')
  })

  it('tracks placeholders that resolve to empty values as missing', () => {
    const workerNoEmail: WorkerMergeData = { ...worker, email: null }
    const result = renderTemplate(
      'Email: {{EMAIL}}',
      { EMAIL: 'worker.email' },
      { worker: workerNoEmail, org },
    )
    expect(result.missingPlaceholders).toContain('EMAIL')
  })
})
