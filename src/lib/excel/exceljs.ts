import ExcelJS from 'exceljs'
import type { CellValue, Workbook, Worksheet } from 'exceljs'

export type ExcelPrimitive = string | number | boolean | Date | null

export function createWorkbook() {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'COMPLY360'
  workbook.created = new Date()
  workbook.modified = new Date()
  return workbook
}

export function addAoaSheet(
  workbook: Workbook,
  name: string,
  rows: unknown[][],
  options: { columnWidths?: number[] } = {},
) {
  const worksheet = workbook.addWorksheet(safeWorksheetName(name))
  worksheet.addRows(rows)
  if (options.columnWidths) {
    worksheet.columns = options.columnWidths.map(width => ({ width }))
  }
  styleHeaderRow(worksheet, 1)
  return worksheet
}

export function addJsonSheet(
  workbook: Workbook,
  name: string,
  rows: Array<Record<string, unknown>>,
  options: { headers?: string[]; columnWidths?: number[] } = {},
) {
  const headers = options.headers ?? inferHeaders(rows)
  const data = [
    headers,
    ...rows.map(row => headers.map(header => normalizeExportValue(row[header]))),
  ]
  const worksheet = addAoaSheet(workbook, name, data, {
    columnWidths: options.columnWidths ?? autoWidths(headers, rows),
  })
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  return worksheet
}

export async function workbookToArrayBuffer(workbook: Workbook): Promise<ArrayBuffer> {
  const raw = await workbook.xlsx.writeBuffer()
  return toArrayBuffer(raw)
}

export async function loadWorkbook(data: ArrayBuffer | Uint8Array): Promise<Workbook> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(toArrayBuffer(data))
  return workbook
}

export function firstWorksheet(workbook: Workbook): Worksheet | null {
  return workbook.worksheets[0] ?? null
}

export function worksheetToAoA(
  worksheet: Worksheet,
  options: { defval?: ExcelPrimitive; maxRows?: number } = {},
): ExcelPrimitive[][] {
  const defval = options.defval ?? ''
  const rowCount = options.maxRows ? Math.min(worksheet.rowCount, options.maxRows) : worksheet.rowCount
  const rows: ExcelPrimitive[][] = []

  for (let rowNumber = 1; rowNumber <= rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const values: ExcelPrimitive[] = []
    const maxCell = row.cellCount
    for (let colNumber = 1; colNumber <= maxCell; colNumber++) {
      const value = cellValueToPrimitive(row.getCell(colNumber).value)
      values.push(value ?? defval)
    }
    rows.push(trimTrailingEmpty(values, defval))
  }

  return rows
}

export function worksheetToJson(
  worksheet: Worksheet,
  options: { defval?: ExcelPrimitive; rawDates?: boolean } = {},
): Array<Record<string, unknown>> {
  const defval = options.defval ?? ''
  const rows = worksheetToAoA(worksheet, { defval })
  const headerRow = rows[0] ?? []
  const headers = headerRow.map((value, index) => {
    const text = String(value ?? '').trim()
    return text || `__EMPTY_${index}`
  })

  const out: Array<Record<string, unknown>> = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? []
    if (!row.some(value => !isEmptyCell(value))) continue
    const record: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      const value = row[index] ?? defval
      record[header] = options.rawDates === false && value instanceof Date
        ? value.toISOString().slice(0, 10)
        : value
    })
    out.push(record)
  }
  return out
}

export function worksheetDataRowCount(worksheet: Worksheet): number {
  let count = 0
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    let hasData = false
    row.eachCell({ includeEmpty: false }, cell => {
      if (!isEmptyCell(cellValueToPrimitive(cell.value))) hasData = true
    })
    if (hasData) {
      count++
    }
  })
  return count
}

export function rowsToCsv(rows: Array<Record<string, unknown>>, headers = inferHeaders(rows)): string {
  return [
    headers.map(csvEscape).join(','),
    ...rows.map(row => headers.map(header => csvEscape(row[header])).join(',')),
  ].join('\n')
}

export function aoaToCsv(rows: unknown[][]): string {
  return rows.map(row => row.map(csvEscape).join(',')).join('\n')
}

export function parseCsvObjects(text: string): Array<Record<string, unknown>> {
  const rows = parseDelimitedRows(text)
  const headers = (rows[0] ?? []).map(value => String(value ?? '').trim())
  return rows.slice(1)
    .filter(row => row.some(value => String(value ?? '').trim() !== ''))
    .map(row => {
      const record: Record<string, unknown> = {}
      headers.forEach((header, index) => {
        if (!header) return
        record[header] = row[index] ?? ''
      })
      return record
    })
}

export function parseCsvAoA(text: string): ExcelPrimitive[][] {
  return parseDelimitedRows(text)
}

export function excelSerialDateToDate(serial: number): Date | null {
  if (!Number.isFinite(serial)) return null
  const utc = Math.round((serial - 25569) * 86400 * 1000)
  const date = new Date(utc)
  return Number.isNaN(date.getTime()) ? null : date
}

export function cellValueToPrimitive(value: CellValue): ExcelPrimitive {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value

  if (typeof value === 'object') {
    if ('result' in value) return cellValueToPrimitive(value.result as CellValue)
    if ('text' in value && typeof value.text === 'string') return value.text
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map(part => part.text ?? '').join('')
    }
    if ('error' in value) return String(value.error ?? '')
  }

  return String(value)
}

function safeWorksheetName(name: string) {
  return (name || 'Hoja1').replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Hoja1'
}

function inferHeaders(rows: Array<Record<string, unknown>>) {
  const headers = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) headers.add(key)
  }
  return Array.from(headers)
}

function autoWidths(headers: string[], rows: Array<Record<string, unknown>>) {
  return headers.map(header => {
    const contentWidth = rows.reduce((max, row) => {
      const value = row[header]
      return Math.max(max, String(value ?? '').length)
    }, header.length)
    return Math.min(Math.max(contentWidth + 2, 10), 60)
  })
}

function normalizeExportValue(value: unknown) {
  if (value === undefined || value === null) return ''
  return value
}

function styleHeaderRow(worksheet: Worksheet, rowNumber: number) {
  const row = worksheet.getRow(rowNumber)
  row.font = { bold: true }
  row.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEFF6F3' },
    }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFD5E4DE' } },
    }
  })
}

function toArrayBuffer(data: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
}

function trimTrailingEmpty(values: ExcelPrimitive[], defval: ExcelPrimitive) {
  let end = values.length
  while (end > 0 && isSameEmpty(values[end - 1], defval)) end--
  return values.slice(0, end)
}

function isSameEmpty(value: ExcelPrimitive, defval: ExcelPrimitive) {
  return isEmptyCell(value) || value === defval
}

function isEmptyCell(value: unknown) {
  return value === null || value === undefined || value === ''
}

function csvEscape(value: unknown) {
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function parseDelimitedRows(text: string): ExcelPrimitive[][] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const firstLine = normalized.split('\n', 1)[0] ?? ''
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','
  const rows: ExcelPrimitive[][] = []
  let row: ExcelPrimitive[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i]
    const next = normalized[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && ch === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }

    if (!inQuotes && ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += ch
  }

  row.push(cell)
  if (row.some(value => String(value ?? '').trim() !== '') || rows.length === 0) {
    rows.push(row)
  }
  return rows
}
