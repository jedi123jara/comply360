import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseBulkFile } from '../parser'

function makeXlsxBuffer(rows: Array<Record<string, unknown>>): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

describe('parseBulkFile', () => {
  it('parsea filas con keys canónicas (Nombre, DNI, etc.)', () => {
    const buf = makeXlsxBuffer([
      { 'Nombre': 'Juan Pérez', 'DNI': '12345678', 'Cargo': 'Operario', 'Fecha de inicio': '2026-01-01', 'Sueldo': 1500 },
    ])
    const out = parseBulkFile({ buffer: buf })
    expect(out.rows).toHaveLength(1)
    expect(out.rows[0]).toMatchObject({
      trabajador_nombre: 'Juan Pérez',
      trabajador_dni: '12345678',
      cargo: 'Operario',
      fecha_inicio: '2026-01-01',
      remuneracion: 1500,
    })
  })

  it('parsea variaciones de columna (sueldo / salario / remuneracion)', () => {
    const buf = makeXlsxBuffer([
      { 'Nombres': 'Ana', 'Documento': '11111111', 'Puesto': 'Analista', 'Inicio': '2026-02-01', 'Salario': 2000 },
    ])
    const out = parseBulkFile({ buffer: buf })
    expect(out.rows[0].trabajador_nombre).toBe('Ana')
    expect(out.rows[0].remuneracion).toBe(2000)
  })

  it('normaliza fechas DD/MM/YYYY a ISO', () => {
    const buf = makeXlsxBuffer([
      { 'Nombre': 'X', 'DNI': '12345678', 'Cargo': 'Y', 'Fecha de inicio': '15/03/2026', 'Sueldo': 1500 },
    ])
    const out = parseBulkFile({ buffer: buf })
    expect(out.rows[0].fecha_inicio).toBe('2026-03-15')
  })

  it('preserva DNI con leading zeros (zfill a 8)', () => {
    const buf = makeXlsxBuffer([
      { 'Nombre': 'X', 'DNI': '12345', 'Cargo': 'Y', 'Inicio': '2026-01-01', 'Sueldo': 1500 },
    ])
    const out = parseBulkFile({ buffer: buf })
    expect(out.rows[0].trabajador_dni).toBe('00012345')
  })

  it('archivo vacío retorna rows=[]', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), 'Hoja1')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const out = parseBulkFile({ buffer: buf })
    expect(out.rows).toEqual([])
  })

  it('preserva columnas extra', () => {
    const buf = makeXlsxBuffer([
      { 'Nombre': 'X', 'DNI': '12345678', 'Cargo': 'Y', 'Fecha de inicio': '2026-01-01', 'Sueldo': 1500, 'Departamento': 'TI' },
    ])
    const out = parseBulkFile({ buffer: buf })
    expect(out.rows[0].departamento).toBe('TI')
    expect(out.detectedColumns).toContain('Departamento')
  })
})
