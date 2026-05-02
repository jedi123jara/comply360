import { describe, it, expect } from 'vitest'
import { validateBulkRow, validateBulkPreview } from '../validator'

const baseRow = {
  trabajador_nombre: 'Juan Pérez',
  trabajador_dni: '12345678',
  cargo: 'Operario',
  fecha_inicio: '2026-01-01',
  remuneracion: 1500,
}

describe('validateBulkRow — campos obligatorios', () => {
  it('row mínimo válido para LABORAL_INDEFINIDO', () => {
    const r = validateBulkRow(baseRow, 1, { contractType: 'LABORAL_INDEFINIDO' })
    expect(r.valid).toBe(true)
    expect(r.errors).toEqual([])
  })

  it('rechaza DNI inválido', () => {
    const r = validateBulkRow(
      { ...baseRow, trabajador_dni: 'ABC123' },
      1,
      { contractType: 'LABORAL_INDEFINIDO' },
    )
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('DNI'))).toBe(true)
  })

  it('rechaza fecha en formato no soportado', () => {
    const r = validateBulkRow(
      { ...baseRow, fecha_inicio: '01/01/2026' }, // sin parser previo
      1,
      { contractType: 'LABORAL_INDEFINIDO' },
    )
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('fecha_inicio'))).toBe(true)
  })

  it('rechaza salario < RMV', () => {
    const r = validateBulkRow(
      { ...baseRow, remuneracion: 800 },
      1,
      { contractType: 'LABORAL_INDEFINIDO' },
    )
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('remuneracion'))).toBe(true)
  })

  it('warning si salario muy cerca de RMV', () => {
    const r = validateBulkRow(
      { ...baseRow, remuneracion: 1140 },
      1,
      { contractType: 'LABORAL_INDEFINIDO' },
    )
    expect(r.valid).toBe(true)
    expect(r.warnings.some((w) => w.includes('cerca de la RMV'))).toBe(true)
  })
})

describe('validateBulkRow — LABORAL_PLAZO_FIJO', () => {
  it('exige fecha_fin', () => {
    const r = validateBulkRow(baseRow, 1, { contractType: 'LABORAL_PLAZO_FIJO' })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('fecha_fin'))).toBe(true)
  })

  it('warning si causa_objetiva corta', () => {
    const r = validateBulkRow(
      { ...baseRow, fecha_fin: '2026-12-31', causa_objetiva: 'corta' },
      1,
      { contractType: 'LABORAL_PLAZO_FIJO' },
    )
    expect(r.warnings.some((w) => w.includes('80 caracteres'))).toBe(true)
  })

  it('rechaza fecha_fin <= fecha_inicio', () => {
    const r = validateBulkRow(
      { ...baseRow, fecha_fin: '2025-01-01' },
      1,
      { contractType: 'LABORAL_PLAZO_FIJO' },
    )
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('posterior'))).toBe(true)
  })
})

describe('validateBulkRow — LABORAL_TIEMPO_PARCIAL', () => {
  it('rechaza jornada >= 24', () => {
    const r = validateBulkRow(
      { ...baseRow, jornada_semanal: 30 },
      1,
      { contractType: 'LABORAL_TIEMPO_PARCIAL' },
    )
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('< 24'))).toBe(true)
  })

  it('acepta jornada < 24', () => {
    const r = validateBulkRow(
      { ...baseRow, jornada_semanal: 20 },
      1,
      { contractType: 'LABORAL_TIEMPO_PARCIAL' },
    )
    expect(r.valid).toBe(true)
  })
})

describe('validateBulkPreview', () => {
  it('agrega contadores correctamente', () => {
    const rows = [
      baseRow,
      { ...baseRow, trabajador_dni: 'INVALID' },
      { ...baseRow, trabajador_dni: '99999999', remuneracion: 500 },
    ]
    const result = validateBulkPreview(rows, ['nombre', 'dni'], {
      contractType: 'LABORAL_INDEFINIDO',
    })
    expect(result.totalRows).toBe(3)
    expect(result.validRows).toBe(1)
    expect(result.invalidRows).toBe(2)
  })

  it('rowIndex es 1-indexed', () => {
    const rows = [baseRow, baseRow]
    const result = validateBulkPreview(rows, [], {
      contractType: 'LABORAL_INDEFINIDO',
    })
    expect(result.rows[0].rowIndex).toBe(1)
    expect(result.rows[1].rowIndex).toBe(2)
  })
})
