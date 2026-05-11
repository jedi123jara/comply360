import { describe, it, expect } from 'vitest'
import { parseBulkFile } from '../parser'
import { addAoaSheet, addJsonSheet, createWorkbook, workbookToArrayBuffer } from '@/lib/excel/exceljs'

async function makeXlsxBuffer(rows: Array<Record<string, unknown>>): Promise<Buffer> {
  const wb = createWorkbook()
  addJsonSheet(wb, 'Hoja1', rows)
  return Buffer.from(await workbookToArrayBuffer(wb))
}

describe('parseBulkFile', () => {
  it('parsea filas con keys canónicas (Nombre, DNI, etc.)', async () => {
    const buf = await makeXlsxBuffer([
      { 'Nombre': 'Juan Pérez', 'DNI': '12345678', 'Cargo': 'Operario', 'Fecha de inicio': '2026-01-01', 'Sueldo': 1500 },
    ])
    const out = await parseBulkFile({ buffer: buf })
    expect(out.rows).toHaveLength(1)
    expect(out.rows[0]).toMatchObject({
      trabajador_nombre: 'Juan Pérez',
      trabajador_dni: '12345678',
      cargo: 'Operario',
      fecha_inicio: '2026-01-01',
      remuneracion: 1500,
    })
  })

  it('parsea variaciones de columna (sueldo / salario / remuneracion)', async () => {
    const buf = await makeXlsxBuffer([
      { 'Nombres': 'Ana', 'Documento': '11111111', 'Puesto': 'Analista', 'Inicio': '2026-02-01', 'Salario': 2000 },
    ])
    const out = await parseBulkFile({ buffer: buf })
    expect(out.rows[0].trabajador_nombre).toBe('Ana')
    expect(out.rows[0].remuneracion).toBe(2000)
  })

  it('normaliza fechas DD/MM/YYYY a ISO', async () => {
    const buf = await makeXlsxBuffer([
      { 'Nombre': 'X', 'DNI': '12345678', 'Cargo': 'Y', 'Fecha de inicio': '15/03/2026', 'Sueldo': 1500 },
    ])
    const out = await parseBulkFile({ buffer: buf })
    expect(out.rows[0].fecha_inicio).toBe('2026-03-15')
  })

  it('preserva DNI con leading zeros (zfill a 8)', async () => {
    const buf = await makeXlsxBuffer([
      { 'Nombre': 'X', 'DNI': '12345', 'Cargo': 'Y', 'Inicio': '2026-01-01', 'Sueldo': 1500 },
    ])
    const out = await parseBulkFile({ buffer: buf })
    expect(out.rows[0].trabajador_dni).toBe('00012345')
  })

  it('archivo vacío retorna rows=[]', async () => {
    const wb = createWorkbook()
    addAoaSheet(wb, 'Hoja1', [])
    const buf = Buffer.from(await workbookToArrayBuffer(wb))
    const out = await parseBulkFile({ buffer: buf })
    expect(out.rows).toEqual([])
  })

  it('preserva columnas extra', async () => {
    const buf = await makeXlsxBuffer([
      { 'Nombre': 'X', 'DNI': '12345678', 'Cargo': 'Y', 'Fecha de inicio': '2026-01-01', 'Sueldo': 1500, 'Departamento': 'TI' },
    ])
    const out = await parseBulkFile({ buffer: buf })
    expect(out.rows[0].departamento).toBe('TI')
    expect(out.detectedColumns).toContain('Departamento')
  })
})
