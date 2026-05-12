import { describe, expect, it } from 'vitest'
import { addAoaSheet, createWorkbook, workbookToArrayBuffer } from '@/lib/excel/exceljs'
import { parsePlameExcel } from '../plame-parser'

describe('parsePlameExcel', () => {
  it('parses payroll rows from monthly sheets and skips summary sheets', async () => {
    const workbook = createWorkbook()

    addAoaSheet(workbook, 'Resumen 3 meses', [
      ['Resumen Feb-Mar 2026'],
      [],
      ['Trabajador', 'DNI', 'Cargo', 'Sueldo Base', 'Feb 2026', 'Mar 2026'],
      ['PEREZ LOPEZ, JUAN CARLOS', '12345678', 'Operario', 1500, 1300, 1320],
    ])

    const header = [
      'Nro',
      'Apellidos y Nombres',
      'DNI',
      'Cargo',
      'Dias',
      'Sueldo',
      'Asig.Fam.',
      'Total Ing.',
      'Aporte AFP',
      'Total Desc.',
      'Neto a Pagar',
      'EsSalud',
      'AFP/ONP',
    ]

    addAoaSheet(workbook, 'Planilla Febrero 2026', [
      ['Empresa demo'],
      ['PLANILLA FEBRERO 2026'],
      [],
      ['DATOS'],
      header,
      [1, 'PEREZ LOPEZ, JUAN CARLOS', '12345678', 'Operario', 28, 1500, 0, 1500, 150, 200, 1300, 135, 'AFP Integra'],
    ])

    addAoaSheet(workbook, 'Planilla Marzo 2026', [
      ['Empresa demo'],
      ['PLANILLA MARZO 2026'],
      [],
      ['DATOS'],
      header,
      [1, 'PEREZ LOPEZ, JUAN CARLOS', '12345678', 'Operario', 31, 1550, 0, 1550, 155, 230, 1320, 139.5, 'AFP Integra'],
    ])

    const buffer = await workbookToArrayBuffer(workbook)
    const result = await parsePlameExcel(buffer, { format: 'xlsx' })

    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(2)
    expect(result.workerCount).toBe(1)
    expect(result.periodStart).toBe('2026-02')
    expect(result.periodEnd).toBe('2026-03')
    expect(result.rows.map(row => row.periodo)).toEqual(['2026-02', '2026-03'])
    expect(result.rows[0]).toMatchObject({
      dni: '12345678',
      firstName: 'JUAN CARLOS',
      lastName: 'PEREZ LOPEZ',
      year: 2026,
      month: 2,
      sueldoBasico: 1500,
      totalIngresos: 1500,
      totalDescuentos: 200,
      netoPagar: 1300,
      tipoAporte: 'AFP',
    })
  })
})
