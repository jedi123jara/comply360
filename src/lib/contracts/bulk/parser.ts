// =============================================
// BULK PARSER — Excel / CSV → BulkContractRow[]
// Generador de Contratos / Chunk 7
//
// Lee el buffer del archivo subido por el usuario y produce filas
// normalizadas a las claves esperadas (trabajador_nombre, trabajador_dni,
// cargo, etc.). Soporta nombres de columna en español, inglés y variaciones
// comunes vía un mapa de aliases.
// =============================================

import {
  firstWorksheet,
  loadWorkbook,
  parseCsvObjects,
  worksheetToJson,
} from '@/lib/excel/exceljs'

/**
 * Mapeo de aliases de columnas → key canónica.
 * Las claves del lado izquierdo se comparan en lowercase y trimeadas.
 */
const COLUMN_ALIASES: Record<string, string> = {
  // trabajador_nombre
  'nombre': 'trabajador_nombre',
  'nombres': 'trabajador_nombre',
  'nombre completo': 'trabajador_nombre',
  'trabajador': 'trabajador_nombre',
  'apellidos y nombres': 'trabajador_nombre',
  'fullname': 'trabajador_nombre',
  // trabajador_dni
  'dni': 'trabajador_dni',
  'dni del trabajador': 'trabajador_dni',
  'documento': 'trabajador_dni',
  'doi': 'trabajador_dni',
  'document': 'trabajador_dni',
  // cargo
  'cargo': 'cargo',
  'puesto': 'cargo',
  'position': 'cargo',
  // fecha_inicio
  'fecha de inicio': 'fecha_inicio',
  'fecha inicio': 'fecha_inicio',
  'inicio': 'fecha_inicio',
  'fecha ingreso': 'fecha_inicio',
  'fechaingreso': 'fecha_inicio',
  'startdate': 'fecha_inicio',
  // fecha_fin
  'fecha de fin': 'fecha_fin',
  'fecha fin': 'fecha_fin',
  'fin': 'fecha_fin',
  'fecha cese': 'fecha_fin',
  'enddate': 'fecha_fin',
  // remuneracion
  'remuneracion': 'remuneracion',
  'remuneración': 'remuneracion',
  'sueldo': 'remuneracion',
  'salario': 'remuneracion',
  'salary': 'remuneracion',
  // causa_objetiva
  'causa': 'causa_objetiva',
  'causa objetiva': 'causa_objetiva',
  'objetivo': 'causa_objetiva',
  'objeto': 'causa_objetiva',
  // otros
  'jornada': 'jornada_semanal',
  'jornada semanal': 'jornada_semanal',
  'horas semanales': 'jornada_semanal',
  'email': 'email',
  'correo': 'email',
  'direccion': 'direccion',
  'dirección': 'direccion',
}

function normalizeColumnName(raw: string): string {
  const trimmed = String(raw).trim().toLowerCase()
  return COLUMN_ALIASES[trimmed] ?? trimmed.replace(/\s+/g, '_')
}

export interface ParseInput {
  /** Bytes del archivo. */
  buffer: ArrayBuffer | Uint8Array | Buffer
  /** "xlsx" | "csv" | inferido del MIME/nombre cuando no se pasa. */
  format?: 'xlsx' | 'csv'
}

export interface ParseResult {
  rows: Array<Record<string, unknown>>
  detectedColumns: string[]
  /** Mapeo aplicado: original → canónico. */
  columnMapping: Record<string, string>
}

/**
 * Lee un Excel/CSV y devuelve filas como objetos con keys canónicas.
 * Convierte fechas Excel (números seriales) a ISO YYYY-MM-DD.
 */
export async function parseBulkFile(input: ParseInput): Promise<ParseResult> {
  const data = toUint8Array(input.buffer)
  const format = input.format ?? 'xlsx'
  const raw = format === 'csv'
    ? parseCsvObjects(new TextDecoder().decode(data))
    : await parseXlsxObjects(data)

  if (raw.length === 0) {
    return { rows: [], detectedColumns: [], columnMapping: {} }
  }

  const detectedColumns = Object.keys(raw[0])
  const columnMapping: Record<string, string> = {}
  for (const c of detectedColumns) columnMapping[c] = normalizeColumnName(c)

  const rows = raw.map((r) => {
    const out: Record<string, unknown> = {}
    for (const [origKey, val] of Object.entries(r)) {
      const canonical = columnMapping[origKey] ?? normalizeColumnName(origKey)
      out[canonical] = normalizeValue(canonical, val)
    }
    return out
  })

  return { rows, detectedColumns, columnMapping }
}

async function parseXlsxObjects(data: Uint8Array) {
  const workbook = await loadWorkbook(data)
  const firstSheet = firstWorksheet(workbook)
  if (!firstSheet) throw new Error('El archivo no tiene hojas válidas.')
  return worksheetToJson(firstSheet, { defval: null, rawDates: false })
}

function toUint8Array(buf: ArrayBuffer | Uint8Array | Buffer): Uint8Array {
  if (buf instanceof Uint8Array) return buf
  if (typeof Buffer !== 'undefined' && buf instanceof Buffer) return new Uint8Array(buf)
  return new Uint8Array(buf as ArrayBuffer)
}

/**
 * Normaliza valores según la key canónica:
 *   - fecha_*: a ISO YYYY-MM-DD
 *   - remuneracion / jornada_semanal: a number
 *   - trabajador_dni: trim + zero-pad si tiene <8 dígitos
 *   - resto: string trimeado o null
 */
function normalizeValue(key: string, val: unknown): unknown {
  if (val === null || val === undefined || val === '') return null

  if (key.startsWith('fecha_')) {
    if (val instanceof Date) {
      if (Number.isNaN(val.getTime())) return null
      return val.toISOString().slice(0, 10)
    }
    const str = String(val).trim()
    // Acepta YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(str)
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
    const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(str)
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    return str
  }

  if (key === 'remuneracion' || key === 'jornada_semanal') {
    const n = Number(String(val).replace(/[^0-9.,-]/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  if (key === 'trabajador_dni') {
    const cleaned = String(val).trim().replace(/\D/g, '')
    return cleaned ? cleaned.padStart(8, '0').slice(-12) : null
  }

  return String(val).trim()
}
