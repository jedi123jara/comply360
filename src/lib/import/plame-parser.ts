/**
 * PLAME Excel parser — extracts ALL monthly rows from a PLAME-format planilla.
 * Returns one PlameRow per worker × month (no deduplication).
 *
 * Supported column formats:
 *   - Standard PLAME codes: 0121, 0201, 0406, 0312, 0607, 0601, 0602, 0603
 *   - Spanish labels: "TOTAL REM. BÁSICA", "TOTAL ASIG.FAM.", "AFP COMIS+SEG", "IR 5TA", etc.
 *   - Files with no MES column (annual summaries): rows processed with month fallback
 */
import * as XLSX from 'xlsx'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface PlameRow {
  dni: string
  fullName: string
  firstName: string
  lastName: string
  cargo: string
  area: string
  year: number
  month: number          // 1–12 (1 when no MES column in file)
  periodo: string        // "YYYY-MM"
  // Ingresos
  sueldoBasico: number
  asignacionFamiliar: number
  gratificacion: number
  bonificacionExtraord: number
  otrosIngresos: number
  totalIngresos: number
  // Descuentos trabajador
  descuentoONP: number
  descuentoAFP: number
  comisionAFP: number    // includes combined AFP COMIS+SEG when single column
  seguroAFP: number
  rentaQuinta: number
  otrosDescuentos: number
  totalDescuentos: number
  // Aportes empleador (informativo)
  essalud: number
  ctsDeposito: number    // CTS DEPÓSITOS column if present
  // Neto
  netoPagar: number
  // AFP/ONP
  tipoAporte: 'AFP' | 'ONP'
  // Metadata
  noMesColumn: boolean   // true when file has no MES column (annual format)
}

export interface PlameParseResult {
  rows: PlameRow[]
  workerCount: number
  periodStart: string   // "YYYY-MM"
  periodEnd: string     // "YYYY-MM"
  errors: string[]
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

type CellVal = string | number | boolean | null | undefined

function cellStr(v: CellVal): string {
  if (v == null) return ''
  return String(v).trim()
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function numCell(v: CellVal): number {
  if (v == null || v === '') return 0
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''))
  return isNaN(n) ? 0 : n
}

const MES_MAP: Record<string, number> = {
  ENE: 1, ENERO: 1, JAN: 1,
  FEB: 2, FEBRERO: 2,
  MAR: 3, MARZO: 3,
  ABR: 4, ABRIL: 4, APR: 4,
  MAY: 5, MAYO: 5,
  JUN: 6, JUNIO: 6,
  JUL: 7, JULIO: 7,
  AGO: 8, AGOSTO: 8, AUG: 8,
  SET: 9, SEP: 9, SETIEMBRE: 9, SEPTIEMBRE: 9,
  OCT: 10, OCTUBRE: 10,
  NOV: 11, NOVIEMBRE: 11,
  DIC: 12, DICIEMBRE: 12, DEC: 12,
}

function parseMes(v: CellVal): number {
  const s = stripAccents(cellStr(v)).toUpperCase().trim()
  const fromMap = MES_MAP[s]
  if (fromMap) return fromMap
  const n = parseInt(s, 10)
  return !isNaN(n) && n >= 1 && n <= 12 ? n : 0
}

function parseYear(v: CellVal): number {
  const n = numCell(v)
  return n >= 1990 && n <= 2100 ? n : 0
}

function normHeader(h: string): string {
  return stripAccents(h).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function findCol(headers: string[], ...terms: string[]): number {
  const norm = headers.map(normHeader)
  for (const term of terms) {
    const t = stripAccents(term).toUpperCase()
    const idx = norm.findIndex(h => h === t || h.includes(t))
    if (idx >= 0) return idx
  }
  return -1
}

function findHeaderRow(rows: CellVal[][]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i]
    if (!row) continue
    if (row.map(c => cellStr(c).toUpperCase()).includes('DNI')) return i
  }
  return -1
}

function splitName(full: string): { firstName: string; lastName: string } {
  const s = full.trim()
  if (!s) return { firstName: '', lastName: '' }
  if (s.includes(',')) {
    const [last, ...rest] = s.split(',')
    return { lastName: (last ?? '').trim(), firstName: rest.join(',').trim() }
  }
  const tokens = s.split(/\s+/).filter(Boolean)
  if (tokens.length <= 2) return { lastName: tokens[0] ?? s, firstName: tokens.slice(1).join(' ') }
  return { lastName: tokens.slice(0, 2).join(' '), firstName: tokens.slice(2).join(' ') }
}

// ──────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────

export function parsePlameExcel(buffer: ArrayBuffer): PlameParseResult {
  const errors: string[] = []
  const rows: PlameRow[] = []

  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json<CellVal[]>(sheet, { header: 1, defval: '' }) as CellVal[][]

  const headerRowIdx = findHeaderRow(raw)
  if (headerRowIdx === -1) {
    errors.push('No se encontró una fila de encabezado con columna "DNI"')
    return { rows: [], workerCount: 0, periodStart: '', periodEnd: '', errors }
  }

  const hdrs = (raw[headerRowIdx] ?? []).map(c => cellStr(c))

  // ── Column indices ───────────────────────────
  const dniCol       = findCol(hdrs, 'DNI', 'DOCUMENTO', 'NRO DOCUMENTO', 'NRO DOC')
  const nameCol      = findCol(hdrs, 'APELLIDOS Y NOMBRES', 'APELLIDOS Y NOMBRE', 'NOMBRES Y APELLIDOS', 'NOMBRE COMPLETO')
  const firstNameCol = findCol(hdrs, 'NOMBRES', 'NOMBRE', 'PRIMER NOMBRE')
  const lastNameCol  = findCol(hdrs, 'APELLIDOS', 'APELLIDO', 'APELLIDO PATERNO')
  const cargoCol     = findCol(hdrs, 'CARGO', 'PUESTO', 'OCUPACION')
  const areaCol      = findCol(hdrs, 'AREA', 'DEPARTAMENTO', 'UNIDAD', 'SECCION')
  const anoCol       = findCol(hdrs, 'ANO', 'YEAR')
  const mesCol       = findCol(hdrs, 'MES', 'MONTH')

  // Régimen pensionario (texto: "AFP Prima", "ONP", etc.) — used when amount columns are 0
  const regPensCol   = findCol(hdrs, 'REG PENS', 'REGIMEN PENS', 'REG PENSION', 'REGIMEN PENSION', 'AFP ONP')

  // Ingresos
  const sueldoCol    = findCol(hdrs, '0121', 'REM BASICA', 'REM. BASICA', 'REMUNERACION BASICA', 'SUELDO BRUTO', 'SUELDO BASICO', 'SUELDO')
  //   "TOTAL REM. BÁSICA" → normHeader → "TOTAL REM BASICA" → contains "REM BASICA" ✓
  const asigFamCol   = findCol(hdrs, 'ASIG FAM', '0201', 'ASIG FAMILIAR', 'ASIG. FAMILIAR', 'ASIGNACION FAMILIAR')
  //   "TOTAL ASIG.FAM."  → "TOTAL ASIG FAM" → contains "ASIG FAM" ✓
  const gratiCol     = findCol(hdrs, '0406', 'GRATIFICACION', 'GRATIF')
  const bonifCol     = findCol(hdrs, '0312', 'BONIF EXTR', 'BONIF. EXTR', 'BONIFICACION EXTRA', 'BONIFICACION EXT')
  const otrosIngCol  = findCol(hdrs, 'OTROS INGRESOS', 'OTROS ING')
  const totalIngCol  = findCol(hdrs, 'TOTAL INGRESOS', 'TOTAL ING', 'TOTAL REMUNERACION')

  // Descuentos trabajador
  const onpCol       = findCol(hdrs, '0607', 'ONP', 'SNP', 'DESCUENTO ONP', 'ONP 13')
  //   "ONP 13% (SNP)"    → "ONP 13 SNP" → contains "ONP" ✓
  const afpAporteCol = findCol(hdrs, '0601', 'AFP APORTE', 'APORTE AFP', 'AFP 10')
  //   "AFP APORTE 10%"   → "AFP APORTE 10" → contains "AFP APORTE" ✓
  const afpComCol    = findCol(hdrs, 'AFP COMIS', '0602', 'AFP COMISION', 'COMISION AFP')
  //   "AFP COMIS+SEG 3.39%" → "AFP COMIS SEG 3 39" → contains "AFP COMIS" ✓
  //   When this matches the combined column, seguroAFP will be 0 (no separate column)
  const afpSegCol    = findCol(hdrs, '0603', 'AFP SEGURO', 'SEGURO AFP')
  const rentaCol     = findCol(hdrs, 'IR 5TA', 'IR5TA', 'IR QUINTA', 'RENTA QUINTA', 'QUINTA CATEGORIA', '3071')
  //   "IR 5TA"           → "IR 5TA" → equals "IR 5TA" ✓
  const otrosDescCol = findCol(hdrs, 'OTROS DESCUENTOS', 'OTROS DESC')
  const totalDescCol = findCol(hdrs, 'TOTAL DESCUENTOS', 'TOTAL DESC')

  // Aportes empleador
  const essaludCol   = findCol(hdrs, 'ESSALUD', 'EPS', '0601 ESSALUD', 'APORTE ESSALUD', 'ESSALUD 9')
  //   "EsSALUD 9% (EMPLEADOR)" → "ESSALUD 9 EMPLEADOR" → contains "ESSALUD" ✓
  const ctsCol       = findCol(hdrs, 'CTS DEPOSITOS', 'CTS DEPOSIT', 'CTS DEP')
  //   "CTS DEPÓSITOS"    → "CTS DEPOSITOS" → equals "CTS DEPOSITOS" ✓
  //   NOTE: "CTS" alone is too short and may false-match; require longer form
  const netoCol      = findCol(hdrs, 'NETO', 'NETO PAGAR', 'NETO A PAGAR', 'LIQUIDO', 'LIQUIDO A PAGAR', 'NETO PAGADO')
  //   "NETO PAGADO"      → "NETO PAGADO" → contains "NETO" ✓

  const hasSeparateNames = firstNameCol >= 0 && lastNameCol >= 0
  const hasMesCol = mesCol >= 0
  const dniSet = new Set<string>()

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const row = raw[i] ?? []
    if (!row.some(c => c !== '' && c != null)) continue

    const dni = cellStr(row[dniCol] ?? '').replace(/\D/g, '')
    if (!dni || !/^\d{8}$/.test(dni)) continue

    const year = anoCol >= 0 ? parseYear(row[anoCol]) : 0
    if (year === 0) continue

    // When no MES column (annual summary format), default to month 1
    const month = hasMesCol ? parseMes(row[mesCol]) : 1
    if (hasMesCol && month === 0) continue  // skip only when column exists but value invalid

    dniSet.add(dni)

    let fullName = '', firstName = '', lastName = ''
    if (hasSeparateNames) {
      firstName = cellStr(row[firstNameCol] ?? '')
      lastName  = cellStr(row[lastNameCol]  ?? '')
      fullName  = `${lastName}, ${firstName}`.trim()
    } else if (nameCol >= 0) {
      fullName  = cellStr(row[nameCol] ?? '')
      const split = splitName(fullName)
      firstName = split.firstName
      lastName  = split.lastName
    }

    const cargo = cargoCol >= 0 ? cellStr(row[cargoCol] ?? '') : ''
    const area  = areaCol  >= 0 ? cellStr(row[areaCol]  ?? '') : ''

    // Régimen pensionario from text column (e.g. "AFP Prima", "ONP")
    const regPensText = regPensCol >= 0 ? cellStr(row[regPensCol] ?? '').toUpperCase() : ''
    const regPensIsONP = regPensText.includes('ONP') || regPensText.includes('SNP')
    const regPensIsAFP = regPensText.includes('AFP')

    const sueldoBasico         = sueldoCol    >= 0 ? numCell(row[sueldoCol])    : 0
    const asignFam             = asigFamCol   >= 0 ? numCell(row[asigFamCol])   : 0
    const gratificacion        = gratiCol     >= 0 ? numCell(row[gratiCol])     : 0
    const bonificacionExtraord = bonifCol     >= 0 ? numCell(row[bonifCol])     : 0
    const otrosIngresos        = otrosIngCol  >= 0 ? numCell(row[otrosIngCol])  : 0
    const descONP              = onpCol       >= 0 ? numCell(row[onpCol])       : 0
    const descAFP              = afpAporteCol >= 0 ? numCell(row[afpAporteCol]) : 0
    // afpComCol may point to combined "AFP COMIS+SEG" column
    const comAFP               = afpComCol    >= 0 ? numCell(row[afpComCol])    : 0
    const segAFP               = afpSegCol    >= 0 ? numCell(row[afpSegCol])    : 0
    const renta                = rentaCol     >= 0 ? numCell(row[rentaCol])     : 0
    const otrosDescuentos      = otrosDescCol >= 0 ? numCell(row[otrosDescCol]) : 0
    const essalud              = essaludCol   >= 0 ? numCell(row[essaludCol])   : 0
    const ctsDeposito          = ctsCol       >= 0 ? numCell(row[ctsCol])       : 0

    // Totals — use explicit columns if present, else calculate
    const totalIngresos =
      totalIngCol >= 0
        ? numCell(row[totalIngCol])
        : sueldoBasico + asignFam + gratificacion + bonificacionExtraord + otrosIngresos

    const totalDescuentos =
      totalDescCol >= 0
        ? numCell(row[totalDescCol])
        : descONP + descAFP + comAFP + segAFP + renta + otrosDescuentos

    const netoPagar =
      netoCol >= 0
        ? numCell(row[netoCol])
        : Math.max(0, totalIngresos - totalDescuentos)

    // tipoAporte: amount columns first, then REG PENS text, then default AFP
    const tipoAporte: 'AFP' | 'ONP' =
      descONP > 0           ? 'ONP' :
      (descAFP > 0 || comAFP > 0) ? 'AFP' :
      regPensIsONP          ? 'ONP' :
      regPensIsAFP          ? 'AFP' :
      'AFP'

    const mm = String(month).padStart(2, '0')
    rows.push({
      dni, fullName, firstName, lastName, cargo, area,
      year, month, periodo: `${year}-${mm}`,
      sueldoBasico, asignacionFamiliar: asignFam,
      gratificacion, bonificacionExtraord,
      otrosIngresos, totalIngresos,
      descuentoONP: descONP, descuentoAFP: descAFP,
      comisionAFP: comAFP, seguroAFP: segAFP,
      rentaQuinta: renta, otrosDescuentos,
      totalDescuentos, essalud, ctsDeposito, netoPagar, tipoAporte,
      noMesColumn: !hasMesCol,
    })
  }

  // Period range
  const periodos = rows.map(r => r.periodo).sort()
  const periodStart = periodos[0] ?? ''
  const periodEnd   = periodos[periodos.length - 1] ?? ''

  return { rows, workerCount: dniSet.size, periodStart, periodEnd, errors }
}
