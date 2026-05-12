import { describe, expect, it } from 'vitest'
import {
  ORGCHART_IMPORT_MAX_BYTES,
  orgChartImportTemplateCsv,
  validateOrgChartImportFileMetadata,
} from '../import-excel'

describe('orgchart import excel', () => {
  it('generates the expected CSV template headers', () => {
    const csv = orgChartImportTemplateCsv()

    expect(csv).toContain('"DNI","Trabajador","Área","Cargo","Jefe inmediato"')
    expect(csv).toContain('"SCTR","Examen médico","Cargo crítico"')
  })

  it('accepts supported Excel and CSV metadata', () => {
    expect(
      validateOrgChartImportFileMetadata({
        fileName: 'estructura.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 2048,
      }),
    ).toEqual([])

    expect(
      validateOrgChartImportFileMetadata({
        fileName: 'estructura.csv',
        mimeType: 'text/csv;charset=utf-8',
        size: 512,
      }),
    ).toEqual([])
  })

  it('rejects unsafe import metadata before parsing the workbook', () => {
    const errors = validateOrgChartImportFileMetadata({
      fileName: 'estructura.pdf',
      mimeType: 'application/pdf',
      size: ORGCHART_IMPORT_MAX_BYTES + 1,
    })

    expect(errors).toContain('Formato no soportado. Usa un archivo .xlsx o .csv.')
    expect(errors).toContain('El archivo supera el límite de 5 MB.')
    expect(errors).toContain('El tipo de archivo no coincide con Excel o CSV.')
  })
})
