import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { parseWorkerCSV, autoDetectMapping, type ColumnMapping } from '@/lib/import/csv-parser'
import type { AuthContext } from '@/lib/auth'
import { generateWorkerAlerts } from '@/lib/alerts/alert-engine'
import * as XLSX from 'xlsx'
import { createHmac, timingSafeEqual } from 'crypto'

// Rate limiter: 5 imports per minute
const importLimiter = rateLimit({ interval: 60_000, limit: 5 })

// FIX #1.D: import token firmado con HMAC.
// Antes el token era `Buffer.from(JSON).toString('base64')` SIN firma,
// trivialmente manipulable: cualquier admin podía decodificar, mutar
// `orgId` o `validRows`, recodificar y enviar al PUT — inyectando
// trabajadores en otra org o con datos arbitrarios.
//
// Ahora firmamos `payload` con HMAC-SHA256 + IMPORT_TOKEN_SECRET y
// validamos con `timingSafeEqual`. Tope de filas también endurecido a
// 1000 para evitar memory blow-ups.
const IMPORT_MAX_ROWS = 1000

function getImportSecret(): string {
  const secret = process.env.IMPORT_TOKEN_SECRET
  if (!secret || secret.length < 32) {
    // Dev fallback determinístico (solo en development sin var configurada).
    if (process.env.NODE_ENV !== 'production') {
      return 'dev-import-secret-do-not-use-in-prod-32chars-12345'
    }
    throw new Error(
      'IMPORT_TOKEN_SECRET no configurado o demasiado corto (mínimo 32 chars).',
    )
  }
  return secret
}

interface SignedTokenEnvelope {
  payload: string // JSON crudo
  sig: string // HMAC-SHA256 hex
}

function signImportToken(payload: object): string {
  const json = JSON.stringify(payload)
  const sig = createHmac('sha256', getImportSecret()).update(json).digest('hex')
  const envelope: SignedTokenEnvelope = { payload: json, sig }
  return Buffer.from(JSON.stringify(envelope)).toString('base64')
}

function verifyAndDecodeImportToken<T>(token: string): T | null {
  let envelope: SignedTokenEnvelope
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded) as SignedTokenEnvelope
    if (typeof parsed?.payload !== 'string' || typeof parsed?.sig !== 'string') {
      return null
    }
    envelope = parsed
  } catch {
    return null
  }

  const expectedSig = createHmac('sha256', getImportSecret())
    .update(envelope.payload)
    .digest('hex')

  // Comparación constant-time
  const a = Buffer.from(envelope.sig, 'hex')
  const b = Buffer.from(expectedSig, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null
  }

  try {
    return JSON.parse(envelope.payload) as T
  } catch {
    return null
  }
}

// =============================================
// Smart Excel → CSV converter
// Handles PLAME-style planillas with:
//  - Multiple metadata rows before the real header
//  - Combined "APELLIDOS Y NOMBRES" column
//  - Repeated rows per worker (one per month) — deduplicates by DNI
//  - AFP/ONP detected from which column has values
// =============================================

type CellVal = string | number | boolean | null | undefined

function cellStr(v: CellVal): string {
  if (v == null) return ''
  return String(v).trim()
}

function findHeaderRow(rows: CellVal[][]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i]
    if (!row) continue
    const normalized = row.map(c => cellStr(c).toUpperCase())
    if (normalized.includes('DNI')) return i
  }
  return -1
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function findCol(headers: string[], ...terms: string[]): number {
  const norm = headers.map(h =>
    stripAccents(h).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  )
  for (const term of terms) {
    const t = stripAccents(term).toUpperCase()
    const idx = norm.findIndex(h => h === t || h.includes(t))
    if (idx >= 0) return idx
  }
  return -1
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const s = fullName.trim()
  if (!s) return { firstName: '', lastName: '' }
  // Format: "APELLIDO APELLIDO, NOMBRE NOMBRE"
  if (s.includes(',')) {
    const parts = s.split(',')
    return {
      lastName: (parts[0] ?? '').trim(),
      firstName: (parts.slice(1).join(',').trim()),
    }
  }
  // No comma — split after first two tokens (assume first two words are last names)
  const tokens = s.split(/\s+/).filter(Boolean)
  if (tokens.length <= 2) return { lastName: tokens[0] ?? s, firstName: tokens.slice(1).join(' ') }
  return {
    lastName: tokens.slice(0, 2).join(' '),
    firstName: tokens.slice(2).join(' '),
  }
}

// Month name → number lookup (Spanish abbreviations and full names)
const MES_MAP: Record<string, number> = {
  ENE: 1, ENERO: 1, JAN: 1, JANUARY: 1,
  FEB: 2, FEBRERO: 2, FEBRUARY: 2,
  MAR: 3, MARZO: 3, MARCH: 3,
  ABR: 4, ABRIL: 4, APR: 4, APRIL: 4,
  MAY: 5, MAYO: 5,
  JUN: 6, JUNIO: 6, JUNE: 6,
  JUL: 7, JULIO: 7, JULY: 7,
  AGO: 8, AGOSTO: 8, AUG: 8, AUGUST: 8,
  SET: 9, SEP: 9, SEPT: 9, SETIEMBRE: 9, SEPTIEMBRE: 9, SEPTEMBER: 9,
  OCT: 10, OCTUBRE: 10, OCTOBER: 10,
  NOV: 11, NOVIEMBRE: 11, NOVEMBER: 11,
  DIC: 12, DICIEMBRE: 12, DEC: 12, DECEMBER: 12,
}

function numericCell(v: CellVal): number {
  if (v == null || v === '') return 0
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''))
  return isNaN(n) ? 0 : n
}

/** Parse MES cell: handles text abbreviations ("ENE") and numbers (1, 2, ...) */
function parseMes(v: CellVal): number {
  if (v == null || v === '') return 0
  const s = stripAccents(String(v)).toUpperCase().trim()
  // Try text lookup first
  const fromMap = MES_MAP[s]
  if (fromMap) return fromMap
  // Try as number
  const n = parseInt(s, 10)
  return !isNaN(n) && n >= 1 && n <= 12 ? n : 0
}

/** Parse AÑO cell: returns 0 if invalid year */
function parseAno(v: CellVal): number {
  const n = numericCell(v)
  return n >= 1990 && n <= 2100 ? n : 0
}

/** Convert Excel date serial to DD/MM/YYYY */
function excelSerialToDate(serial: number): string | null {
  try {
    const d = XLSX.SSF.parse_date_code(serial)
    if (!d || !d.y || d.y < 1900) return null
    return `${String(d.d).padStart(2, '0')}/${String(d.m).padStart(2, '0')}/${d.y}`
  } catch { return null }
}

/** Build a guaranteed-valid DD/MM/YYYY date string */
function buildDate(day: number, month: number, year: number): string {
  const d = Math.max(1, Math.min(28, day))    // clamp to safe range
  const m = Math.max(1, Math.min(12, month))
  const y = (year >= 1990 && year <= 2100) ? year : 2020
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function preprocessExcelToCsv(sheet: XLSX.WorkSheet): string {
  const rows = XLSX.utils.sheet_to_json<CellVal[]>(sheet, { header: 1, defval: '' }) as CellVal[][]

  const headerRowIdx = findHeaderRow(rows)

  // Fallback: no recognizable header → plain CSV
  if (headerRowIdx === -1) {
    return XLSX.utils.sheet_to_csv(sheet)
  }

  const rawHeaders = (rows[headerRowIdx] ?? []).map(c => cellStr(c))

  // ── Locate columns ────────────────────────────────────────────
  const dniCol          = findCol(rawHeaders, 'DNI', 'DOCUMENTO', 'NRO DOCUMENTO', 'NRO DOC')
  // ⚠️ Detectar columna combinada PRIMERO. findCol usa h.includes(), por lo que
  //    "APELLIDOS Y NOMBRES" matchea tanto 'NOMBRES' como 'APELLIDOS' individualmente.
  //    Si se detectara primero firstNameCol y lastNameCol, ambos apuntarían al mismo
  //    índice y hasSeparateNames sería true, duplicando el nombre completo en ambos campos.
  const nameCol         = findCol(rawHeaders, 'APELLIDOS Y NOMBRES', 'APELLIDOS Y NOMBRE', 'NOMBRES Y APELLIDOS', 'NOMBRE COMPLETO', 'NOMBRE Y APELLIDOS')
  // Solo buscar columnas separadas si NO existe columna combinada
  const firstNameCol    = nameCol >= 0 ? -1 : findCol(rawHeaders, 'NOMBRES', 'NOMBRE', 'PRIMER NOMBRE')
  const lastNameCol     = nameCol >= 0 ? -1 : findCol(rawHeaders, 'APELLIDOS', 'APELLIDO', 'APELLIDO PATERNO')
  const cargoCol        = findCol(rawHeaders, 'CARGO', 'PUESTO', 'OCUPACION')
  const areaCol         = findCol(rawHeaders, 'AREA', 'DEPARTAMENTO', 'UNIDAD', 'SECCION')
  const anoCol          = findCol(rawHeaders, 'ANO', 'YEAR')
  const mesCol          = findCol(rawHeaders, 'MES', 'MONTH')
  // Régimen pensionario (texto: "AFP Prima", "ONP") — fallback for tipoAporte
  const regPensCol      = findCol(rawHeaders, 'REG PENS', 'REGIMEN PENS', 'REG PENSION', 'REGIMEN PENSION', 'AFP ONP')
  const sueldoCol       = findCol(rawHeaders, 'REM BASICA', 'REMUNERACION BASICA', 'REMUNERACION BRUTA', 'SUELDO BRUTO', 'SUELDO', 'SALARIO', '0121')
  //   "TOTAL REM. BÁSICA" → "TOTAL REM BASICA" → contains "REM BASICA" ✓
  const asigFamCol      = findCol(rawHeaders, 'ASIG FAM', 'ASIG FAMILIAR', 'ASIGNACION FAMILIAR', '0201')
  //   "TOTAL ASIG.FAM."  → "TOTAL ASIG FAM" → contains "ASIG FAM" ✓
  const onpCol          = findCol(rawHeaders, 'ONP', 'SNP', '0607', 'ONP 13')
  const afpAporteCol    = findCol(rawHeaders, 'AFP APORTE', '0601', 'AFP 10')
  const afpComisionCol  = findCol(rawHeaders, 'AFP COMIS', 'AFP COMISION', 'COMISION AFP', '0602')
  //   "AFP COMIS+SEG 3.39%" → "AFP COMIS SEG 3 39" → contains "AFP COMIS" ✓
  const fechaIngresoCol = findCol(rawHeaders, 'FECHA INGRESO', 'FECHA DE INGRESO', 'FECHA INICIO', 'INICIO LABORES')

  // Ambas columnas deben existir Y ser distintas. Si apuntan al mismo índice
  // (mismo header), es la columna combinada en disfraz → tratar como nameCol
  const hasSeparateNames = firstNameCol >= 0 && lastNameCol >= 0 && firstNameCol !== lastNameCol

  // ── Per-worker accumulator ─────────────────────────────────────
  interface WorkerAccum {
    dni: string; firstName: string; lastName: string
    cargo: string; area: string
    // Latest period (for current salary/aporte)
    latestAno: number; latestMes: number
    sueldo: number; asigFamiliar: boolean
    tipoAporte: string
    // Earliest period (for fechaIngreso estimation)
    earliestAno: number; earliestMes: number
    // Explicit fechaIngreso from column (best)
    fechaIngreso: string
  }

  const workerMap = new Map<string, WorkerAccum>()

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? []
    // Skip empty rows
    if (!row.some(c => c !== '' && c != null)) continue

    const dni = cellStr(row[dniCol] ?? '').replace(/\D/g, '')
    if (!dni || !/^\d{8}$/.test(dni)) continue

    const ano = anoCol >= 0 ? parseAno(row[anoCol]) : 0
    if (anoCol >= 0 && ano === 0) continue  // skip rows with invalid year when column exists
    // When no MES column (annual summary format), default to month 1 so rows are not skipped
    const mes = mesCol >= 0 ? parseMes(row[mesCol]) : 1
    if (mesCol >= 0 && mes === 0) continue  // skip only when column exists but value is invalid
    // Combine into a sortable period number: 202401 > 202312
    const period = ano * 100 + mes

    const sueldo = sueldoCol >= 0 ? numericCell(row[sueldoCol]) : 0
    const asigFamVal = asigFamCol >= 0 ? numericCell(row[asigFamCol]) : 0
    const asigFamiliar = asigFamVal > 0

    // AFP vs ONP: amount columns first, then REG PENS text column, then default AFP
    const onpVal  = onpCol         >= 0 ? numericCell(row[onpCol])         : 0
    const afpVal  = afpAporteCol   >= 0 ? numericCell(row[afpAporteCol])   : 0
    const afpCom  = afpComisionCol >= 0 ? numericCell(row[afpComisionCol]) : 0
    const regPensText = regPensCol >= 0 ? cellStr(row[regPensCol] ?? '').toUpperCase() : ''
    const tipoAporte =
      onpVal > 0                                         ? 'ONP' :
      (afpVal > 0 || afpCom > 0)                        ? 'AFP' :
      (regPensText.includes('ONP') || regPensText.includes('SNP')) ? 'ONP' :
      regPensText.includes('AFP')                        ? 'AFP' :
      'AFP'

    let firstName = '', lastName = ''
    if (hasSeparateNames) {
      firstName = cellStr(row[firstNameCol] ?? '')
      lastName  = cellStr(row[lastNameCol]  ?? '')
      // Red de seguridad: si ambos campos son idénticos o uno contiene al otro
      // (PLAME con datos duplicados), tratar el más largo como nombre completo y dividirlo
      if (
        firstName && lastName && (
          firstName === lastName ||
          firstName.includes(lastName) ||
          lastName.includes(firstName)
        )
      ) {
        const combined = lastName.length >= firstName.length ? lastName : firstName
        const split = splitFullName(combined)
        firstName = split.firstName || firstName
        lastName  = split.lastName  || lastName
      }
    } else if (nameCol >= 0) {
      const split = splitFullName(cellStr(row[nameCol] ?? ''))
      firstName = split.firstName
      lastName  = split.lastName
    }

    const cargo = cargoCol >= 0 ? cellStr(row[cargoCol] ?? '') : ''
    const area  = areaCol  >= 0 ? cellStr(row[areaCol]  ?? '') : ''

    // Parse explicit fechaIngreso column if present
    let fechaIngreso = ''
    if (fechaIngresoCol >= 0) {
      const raw = row[fechaIngresoCol]
      if (raw != null && raw !== '') {
        const asNum = numericCell(raw)
        if (asNum > 1000) {
          // Excel serial date
          fechaIngreso = excelSerialToDate(asNum) ?? ''
        } else {
          const s = cellStr(raw)
          // Already DD/MM/YYYY or similar
          if (/\d/.test(s)) fechaIngreso = s
        }
      }
    }

    const existing = workerMap.get(dni)
    if (!existing) {
      workerMap.set(dni, {
        dni, firstName, lastName, cargo, area,
        latestAno: ano, latestMes: mes, sueldo, asigFamiliar, tipoAporte,
        earliestAno: ano > 0 ? ano : 9999,
        earliestMes: mes > 0 ? mes : 13,
        fechaIngreso,
      })
    } else {
      // Update LATEST period entry (for current salary)
      const existingLatest = existing.latestAno * 100 + existing.latestMes
      if (period > existingLatest) {
        existing.latestAno = ano
        existing.latestMes = mes
        existing.sueldo = sueldo
        existing.tipoAporte = tipoAporte
        existing.asigFamiliar = asigFamiliar
      }
      // Update EARLIEST period entry (for fechaIngreso)
      const existingEarliest = existing.earliestAno * 100 + existing.earliestMes
      if (ano > 0 && period < existingEarliest) {
        existing.earliestAno = ano
        existing.earliestMes = mes > 0 ? mes : 1
      }
      // Prefer explicit fechaIngreso
      if (!existing.fechaIngreso && fechaIngreso) existing.fechaIngreso = fechaIngreso
      // Fill missing name/cargo with first non-empty found
      if (!existing.firstName && firstName) existing.firstName = firstName
      if (!existing.lastName  && lastName)  existing.lastName  = lastName
      if (!existing.cargo     && cargo)     existing.cargo     = cargo
      if (!existing.area      && area)      existing.area      = area
    }
  }

  if (workerMap.size === 0) {
    // No workers extracted — fall back to plain CSV from header row
    const dataRows = rows.slice(headerRowIdx)
    return dataRows.map(r => (r ?? []).map(c => {
      const s = cellStr(c)
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')).join('\n')
  }

  // ── Build standard CSV for csv-parser.ts ─────────────────────
  const csvLines: string[] = [
    'DNI,Nombres,Apellidos,Cargo,Departamento,Fecha Ingreso,Sueldo Bruto,Tipo Aporte,Asignacion Familiar',
  ]

  for (const w of workerMap.values()) {
    // Priority: (1) explicit column, (2) earliest AÑO/MES from data, (3) hardcoded default
    let fechaIngreso = w.fechaIngreso
    if (!fechaIngreso) {
      const ano = w.earliestAno < 9999 ? w.earliestAno : 2020
      const mes = w.earliestMes < 13  ? w.earliestMes : 1
      fechaIngreso = buildDate(1, mes, ano)
    }

    const q = (s: string) => `"${s.replace(/"/g, '""')}"`
    csvLines.push([
      w.dni,
      q(w.firstName),
      q(w.lastName),
      q(w.cargo),
      q(w.area),
      fechaIngreso,
      w.sueldo.toFixed(2),
      w.tipoAporte,
      w.asigFamiliar ? 'Si' : 'No',
    ].join(','))
  }

  return csvLines.join('\n')
}

// =============================================
// POST /api/workers/import — Upload CSV, parse, validate, return preview
// =============================================
export const POST = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  // Rate limit
  const rl = await importLimiter.check(req)
  if (!rl.success) return rl.response!

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const customMappingStr = formData.get('mapping') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporciono ningun archivo' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileName = file.name.toLowerCase()
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
    const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.txt')
    if (!isExcel && !isCsv) {
      return NextResponse.json(
        { error: 'Solo se aceptan archivos Excel (.xlsx, .xls) o CSV (.csv)' },
        { status: 400 }
      )
    }

    // Limit file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo excede el tamano maximo de 5MB' },
        { status: 400 }
      )
    }

    // Parse file content: convert Excel to CSV if needed
    let csvContent: string
    if (isExcel) {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      csvContent = preprocessExcelToCsv(sheet)
    } else {
      csvContent = await file.text()
    }

    // Parse custom mapping if provided
    let customMapping: ColumnMapping | undefined
    if (customMappingStr) {
      try {
        customMapping = JSON.parse(customMappingStr) as ColumnMapping
      } catch {
        return NextResponse.json(
          { error: 'Formato de mapeo de columnas invalido' },
          { status: 400 }
        )
      }
    }

    const result = parseWorkerCSV(csvContent, customMapping)

    // Check existing DNIs in the org to flag duplicates
    if (result.validRows.length > 0) {
      const dnis = result.validRows.map((r) => r.dni)
      const existingWorkers = await prisma.worker.findMany({
        where: {
          orgId: ctx.orgId,
          dni: { in: dnis },
        },
        select: { dni: true },
      })

      const existingDniSet = new Set(existingWorkers.map((w) => w.dni))

      // Move rows with existing DNIs to errors
      const stillValid = []
      for (const row of result.validRows) {
        if (existingDniSet.has(row.dni)) {
          result.errors.push({
            row: row.rowNumber,
            field: 'DNI',
            message: `Ya existe un trabajador con DNI ${row.dni} en la organizacion`,
          })
        } else {
          stillValid.push(row)
        }
      }
      result.validRows = stillValid
    }

    // Auto-detect headers for mapping preview
    const lines = csvContent.replace(/\r\n/g, '\n').split('\n')
    const headerLine = lines[0]?.replace(/^\uFEFF/, '') || ''
    const delimiter = headerLine.includes(';') ? ';' : headerLine.includes('\t') ? '\t' : ','
    const headers = headerLine.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''))
    const detectedMapping = autoDetectMapping(headers)

    return NextResponse.json({
      preview: {
        totalRows: result.totalRows,
        validCount: result.validRows.length,
        errorCount: result.errors.length,
        validRows: result.validRows.slice(0, 50), // Preview first 50
        errors: result.errors.slice(0, 100), // First 100 errors
        headers: result.headers,
        detectedMapping,
      },
      // FIX #1.D: token firmado con HMAC. Tope de filas endurecido a 1000
      // para evitar OOM en lambda con archivos enormes.
      importToken: signImportToken({
        orgId: ctx.orgId,
        validRows: result.validRows.slice(0, IMPORT_MAX_ROWS),
        timestamp: Date.now(),
      }),
    })
  } catch (error) {
    console.error('Import parse error:', error)
    return NextResponse.json(
      { error: 'Error al procesar el archivo. Verifica que el formato sea correcto.' },
      { status: 500 }
    )
  }
})

// =============================================
// PUT /api/workers/import — Confirm import, bulk create workers
// =============================================
export const PUT = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  // Rate limit
  const rl = await importLimiter.check(req)
  if (!rl.success) return rl.response!

  try {
    const body = await req.json()
    const { importToken } = body as { importToken: string }

    if (!importToken) {
      return NextResponse.json(
        { error: 'Token de importacion no proporcionado' },
        { status: 400 }
      )
    }

    // FIX #1.D: validar firma HMAC. Si la firma no coincide o el token
    // está corrupto, devolvemos 400 sin pista del por qué (no leak de detalle).
    type TokenPayload = {
      orgId: string
      validRows: Array<{
        dni: string
        firstName: string
        lastName: string
        position: string
        department: string
        fechaIngreso: string
        sueldoBruto: number
        regimenLaboral: string
        tipoContrato: string
        tipoAporte: string
        afpNombre: string
        asignacionFamiliar: boolean
        jornadaSemanal: number
      }>
      timestamp: number
    }

    const tokenData = verifyAndDecodeImportToken<TokenPayload>(importToken)
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Token de importacion invalido o adulterado' },
        { status: 400 }
      )
    }

    // Verify org matches (defense in depth — la firma ya garantiza que el
    // orgId era el del usuario al momento de POST, pero verificamos por
    // si el admin cambió de org entre POST y PUT).
    if (tokenData.orgId !== ctx.orgId) {
      return NextResponse.json(
        { error: 'Token de importacion no corresponde a esta organizacion' },
        { status: 403 }
      )
    }

    // Token expires after 30 minutes
    if (Date.now() - tokenData.timestamp > 30 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Token de importacion expirado. Suba el archivo nuevamente.' },
        { status: 410 }
      )
    }

    const { validRows } = tokenData

    if (!validRows || validRows.length === 0) {
      return NextResponse.json(
        { error: 'No hay registros validos para importar' },
        { status: 400 }
      )
    }

    if (validRows.length > IMPORT_MAX_ROWS) {
      return NextResponse.json(
        { error: `Maximo ${IMPORT_MAX_ROWS} trabajadores por importacion` },
        { status: 400 }
      )
    }

    // Double-check DNIs don't exist in DB (race condition protection)
    const dnis = validRows.map((r) => r.dni)
    const existing = await prisma.worker.findMany({
      where: { orgId: ctx.orgId, dni: { in: dnis } },
      select: { dni: true },
    })
    const existingSet = new Set(existing.map((w) => w.dni))
    const rowsToInsert = validRows.filter((r) => !existingSet.has(r.dni))

    if (rowsToInsert.length === 0) {
      return NextResponse.json(
        { error: 'Todos los trabajadores ya existen en la organizacion' },
        { status: 409 }
      )
    }

    // Bulk create using createMany
    const created = await prisma.worker.createMany({
      data: rowsToInsert.map((row) => ({
        orgId: ctx.orgId,
        dni: row.dni,
        firstName: row.firstName,
        lastName: row.lastName,
        position: row.position || null,
        department: row.department || null,
        fechaIngreso: new Date(row.fechaIngreso),
        sueldoBruto: row.sueldoBruto,
        regimenLaboral: row.regimenLaboral as 'GENERAL',
        tipoContrato: row.tipoContrato as 'INDEFINIDO',
        tipoAporte: row.tipoAporte as 'AFP',
        afpNombre: row.afpNombre || null,
        asignacionFamiliar: row.asignacionFamiliar,
        jornadaSemanal: row.jornadaSemanal,
        status: 'ACTIVE',
        legajoScore: 0,
      })),
      skipDuplicates: true,
    })

    // Compute alerts for the newly imported workers. `createMany` does not return IDs,
    // so we re-query by the DNIs we just inserted and alert each one individually.
    // Failures are logged but don't fail the import response.
    try {
      const insertedDnis = rowsToInsert.map((r) => r.dni)
      const newWorkers = await prisma.worker.findMany({
        where: { orgId: ctx.orgId, dni: { in: insertedDnis } },
        select: { id: true },
      })
      await Promise.all(newWorkers.map((w) => generateWorkerAlerts(w.id)))
    } catch (err) {
      console.error('[workers/import PUT] generateWorkerAlerts failed', err)
    }

    return NextResponse.json({
      message: `Se importaron ${created.count} trabajadores exitosamente`,
      imported: created.count,
      skipped: existingSet.size,
      total: validRows.length,
    })
  } catch (error) {
    console.error('Import confirm error:', error)
    return NextResponse.json(
      { error: 'Error al importar los trabajadores' },
      { status: 500 }
    )
  }
})
