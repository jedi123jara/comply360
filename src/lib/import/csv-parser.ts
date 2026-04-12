/**
 * CSV/Excel Parser for bulk worker import (D9)
 *
 * Features:
 * - Handles UTF-8 BOM
 * - Auto-detects delimiter (comma, semicolon, tab)
 * - Validates DNI (8 digits, unique within file)
 * - Validates dates (DD/MM/YYYY)
 * - Validates numeric sueldo
 * - Maps Spanish column headers to Worker model fields
 */

// =============================================
// Types
// =============================================

export interface ParsedWorkerRow {
  rowNumber: number
  dni: string
  firstName: string
  lastName: string
  position: string
  department: string
  fechaIngreso: string // ISO date string
  sueldoBruto: number
  regimenLaboral: string
  tipoContrato: string
  tipoAporte: string
  afpNombre: string
  asignacionFamiliar: boolean
  jornadaSemanal: number
}

export interface ParseError {
  row: number
  field: string
  message: string
}

export interface ParseResult {
  validRows: ParsedWorkerRow[]
  errors: ParseError[]
  totalRows: number
  headers: string[]
}

export interface ColumnMapping {
  [csvHeader: string]: string // maps CSV header -> internal field name
}

// =============================================
// Column header mapping (Spanish -> internal)
// =============================================

const HEADER_ALIASES: Record<string, string[]> = {
  dni: ['dni', 'documento', 'nro documento', 'nro_documento', 'numero documento', 'doc identidad', 'n° doc', 'nro. doc'],
  firstName: ['nombres', 'nombre', 'first_name', 'firstname', 'primer nombre', 'name'],
  lastName: ['apellidos', 'apellido', 'last_name', 'lastname', 'apellido paterno', 'surname'],
  position: ['cargo', 'puesto', 'posicion', 'position', 'ocupacion'],
  department: ['departamento', 'area', 'department', 'unidad', 'seccion'],
  fechaIngreso: ['fecha ingreso', 'fecha_ingreso', 'fecha de ingreso', 'ingreso', 'start_date', 'fecha inicio', 'fecha contratacion'],
  sueldoBruto: ['sueldo bruto', 'sueldo_bruto', 'sueldo', 'remuneracion', 'salario', 'remuneracion bruta', 'rem basica', 'rem. basica', 'remuneracion basica'],
  regimenLaboral: ['regimen laboral', 'regimen_laboral', 'regimen', 'tipo regimen'],
  tipoContrato: ['tipo contrato', 'tipo_contrato', 'contrato', 'modalidad contrato'],
  tipoAporte: ['tipo aporte', 'tipo_aporte', 'aporte', 'sistema pensionario', 'pension'],
  afpNombre: ['afp nombre', 'afp_nombre', 'afp', 'nombre afp'],
  asignacionFamiliar: ['asignacion familiar', 'asignacion_familiar', 'asig familiar', 'asig_familiar', 'asig. familiar'],
  jornadaSemanal: ['jornada semanal', 'jornada_semanal', 'jornada', 'horas semanales', 'horas semana'],
}

// Valid enum values
const VALID_REGIMEN: Record<string, string> = {
  general: 'GENERAL',
  'mype micro': 'MYPE_MICRO',
  'mype pequena': 'MYPE_PEQUENA',
  mype_micro: 'MYPE_MICRO',
  mype_pequena: 'MYPE_PEQUENA',
  agrario: 'AGRARIO',
  'construccion civil': 'CONSTRUCCION_CIVIL',
  construccion_civil: 'CONSTRUCCION_CIVIL',
  minero: 'MINERO',
  pesquero: 'PESQUERO',
  'textil exportacion': 'TEXTIL_EXPORTACION',
  textil_exportacion: 'TEXTIL_EXPORTACION',
  domestico: 'DOMESTICO',
  cas: 'CAS',
  'modalidad formativa': 'MODALIDAD_FORMATIVA',
  modalidad_formativa: 'MODALIDAD_FORMATIVA',
  teletrabajo: 'TELETRABAJO',
}

const VALID_CONTRATO: Record<string, string> = {
  indefinido: 'INDEFINIDO',
  'plazo fijo': 'PLAZO_FIJO',
  plazo_fijo: 'PLAZO_FIJO',
  'tiempo parcial': 'TIEMPO_PARCIAL',
  tiempo_parcial: 'TIEMPO_PARCIAL',
  'inicio actividad': 'INICIO_ACTIVIDAD',
  inicio_actividad: 'INICIO_ACTIVIDAD',
  'necesidad mercado': 'NECESIDAD_MERCADO',
  necesidad_mercado: 'NECESIDAD_MERCADO',
  reconversion: 'RECONVERSION',
  suplencia: 'SUPLENCIA',
  emergencia: 'EMERGENCIA',
  'obra determinada': 'OBRA_DETERMINADA',
  obra_determinada: 'OBRA_DETERMINADA',
  intermitente: 'INTERMITENTE',
  exportacion: 'EXPORTACION',
}

const VALID_APORTE: Record<string, string> = {
  afp: 'AFP',
  onp: 'ONP',
  'sin aporte': 'SIN_APORTE',
  sin_aporte: 'SIN_APORTE',
}

// =============================================
// Helpers
// =============================================

/** Strip UTF-8 BOM if present */
function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1)
  }
  return text
}

/** Detect delimiter from first line */
function detectDelimiter(firstLine: string): string {
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const tabCount = (firstLine.match(/\t/g) || []).length

  if (tabCount > commaCount && tabCount > semicolonCount) return '\t'
  if (semicolonCount > commaCount) return ';'
  return ','
}

/** Parse a single CSV line respecting quoted fields */
function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === delimiter) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }

  fields.push(current.trim())
  return fields
}

/** Normalize header text for matching */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parse DD/MM/YYYY date to ISO string */
function parseDateDMY(value: string): string | null {
  const match = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (!match) return null

  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const year = parseInt(match[3], 10)

  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  if (year < 1900 || year > 2100) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null // invalid date (e.g., Feb 30)
  }

  return date.toISOString()
}

/** Parse truthy/falsy values for booleans */
function parseBooleanField(value: string): boolean {
  const lower = value.toLowerCase().trim()
  return ['si', 'sí', 'yes', '1', 'true', 'verdadero', 'x'].includes(lower)
}

// =============================================
// Auto-detect column mapping
// =============================================

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}

  for (const header of headers) {
    const normalized = normalizeHeader(header)

    for (const [fieldName, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(normalized)) {
        mapping[header] = fieldName
        break
      }
    }
  }

  return mapping
}

// =============================================
// Main parser
// =============================================

export function parseWorkerCSV(csvContent: string, customMapping?: ColumnMapping): ParseResult {
  const errors: ParseError[] = []
  const validRows: ParsedWorkerRow[] = []

  // Strip BOM and normalize line endings
  const cleaned = stripBom(csvContent).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = cleaned.split('\n').filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    errors.push({ row: 0, field: 'file', message: 'El archivo debe tener al menos una fila de encabezado y una fila de datos' })
    return { validRows: [], errors, totalRows: 0, headers: [] }
  }

  // Detect delimiter from header line
  const delimiter = detectDelimiter(lines[0])

  // Parse headers
  const headers = parseCsvLine(lines[0], delimiter)

  // Build column mapping
  const mapping = customMapping || autoDetectMapping(headers)

  // Check required fields are mapped
  const requiredFields = ['dni', 'firstName', 'lastName', 'fechaIngreso', 'sueldoBruto']
  for (const field of requiredFields) {
    const isMapped = Object.values(mapping).includes(field)
    if (!isMapped) {
      errors.push({
        row: 0,
        field,
        message: `Columna requerida no encontrada: ${field}. Verifique los encabezados del archivo.`,
      })
    }
  }

  if (errors.length > 0) {
    return { validRows: [], errors, totalRows: lines.length - 1, headers }
  }

  // Build reverse mapping: field name -> column index
  const fieldToIndex: Record<string, number> = {}
  for (const [csvHeader, fieldName] of Object.entries(mapping)) {
    const idx = headers.indexOf(csvHeader)
    if (idx !== -1) {
      fieldToIndex[fieldName] = idx
    }
  }

  // Track DNIs for uniqueness check within file
  const seenDnis = new Map<string, number>()

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1 // 1-based, accounting for header
    const fields = parseCsvLine(lines[i], delimiter)
    const rowErrors: ParseError[] = []

    const getValue = (fieldName: string): string => {
      const idx = fieldToIndex[fieldName]
      if (idx === undefined || idx >= fields.length) return ''
      return fields[idx].trim()
    }

    // --- DNI ---
    const dni = getValue('dni')
    if (!dni) {
      rowErrors.push({ row: rowNumber, field: 'DNI', message: 'DNI es obligatorio' })
    } else if (!/^\d{8}$/.test(dni)) {
      rowErrors.push({ row: rowNumber, field: 'DNI', message: 'DNI debe tener exactamente 8 digitos' })
    } else {
      const prevRow = seenDnis.get(dni)
      if (prevRow !== undefined) {
        rowErrors.push({
          row: rowNumber,
          field: 'DNI',
          message: `DNI duplicado, ya aparece en la fila ${prevRow}`,
        })
      } else {
        seenDnis.set(dni, rowNumber)
      }
    }

    // --- Nombres ---
    const firstName = getValue('firstName')
    if (!firstName) {
      rowErrors.push({ row: rowNumber, field: 'Nombres', message: 'Nombres es obligatorio' })
    }

    // --- Apellidos ---
    const lastName = getValue('lastName')
    if (!lastName) {
      rowErrors.push({ row: rowNumber, field: 'Apellidos', message: 'Apellidos es obligatorio' })
    }

    // --- Fecha Ingreso ---
    const fechaIngresoRaw = getValue('fechaIngreso')
    let fechaIngreso = ''
    if (!fechaIngresoRaw) {
      rowErrors.push({ row: rowNumber, field: 'Fecha Ingreso', message: 'Fecha de ingreso es obligatoria' })
    } else {
      const parsed = parseDateDMY(fechaIngresoRaw)
      if (!parsed) {
        rowErrors.push({
          row: rowNumber,
          field: 'Fecha Ingreso',
          message: 'Formato de fecha invalido. Use DD/MM/YYYY',
        })
      } else {
        fechaIngreso = parsed
      }
    }

    // --- Sueldo Bruto ---
    const sueldoRaw = getValue('sueldoBruto').replace(/[,\s]/g, '').replace(/S\/\.?\s*/i, '')
    let sueldoBruto = 0
    if (!sueldoRaw) {
      rowErrors.push({ row: rowNumber, field: 'Sueldo Bruto', message: 'Sueldo bruto es obligatorio' })
    } else {
      const parsed = parseFloat(sueldoRaw)
      if (isNaN(parsed) || parsed < 0) {
        rowErrors.push({
          row: rowNumber,
          field: 'Sueldo Bruto',
          message: 'Sueldo bruto debe ser un numero positivo',
        })
      } else {
        sueldoBruto = parsed
      }
    }

    // --- Optional fields ---
    const position = getValue('position')
    const department = getValue('department')

    // Regimen Laboral
    const regimenRaw = getValue('regimenLaboral')
    let regimenLaboral = 'GENERAL'
    if (regimenRaw) {
      const mapped = VALID_REGIMEN[regimenRaw.toLowerCase().trim()]
      if (mapped) {
        regimenLaboral = mapped
      } else {
        rowErrors.push({
          row: rowNumber,
          field: 'Regimen Laboral',
          message: `Valor invalido: "${regimenRaw}". Valores validos: ${Object.keys(VALID_REGIMEN).join(', ')}`,
        })
      }
    }

    // Tipo Contrato
    const contratoRaw = getValue('tipoContrato')
    let tipoContrato = 'INDEFINIDO'
    if (contratoRaw) {
      const mapped = VALID_CONTRATO[contratoRaw.toLowerCase().trim()]
      if (mapped) {
        tipoContrato = mapped
      } else {
        rowErrors.push({
          row: rowNumber,
          field: 'Tipo Contrato',
          message: `Valor invalido: "${contratoRaw}". Valores validos: ${Object.keys(VALID_CONTRATO).join(', ')}`,
        })
      }
    }

    // Tipo Aporte
    const aporteRaw = getValue('tipoAporte')
    let tipoAporte = 'AFP'
    if (aporteRaw) {
      const mapped = VALID_APORTE[aporteRaw.toLowerCase().trim()]
      if (mapped) {
        tipoAporte = mapped
      } else {
        rowErrors.push({
          row: rowNumber,
          field: 'Tipo Aporte',
          message: `Valor invalido: "${aporteRaw}". Valores validos: ${Object.keys(VALID_APORTE).join(', ')}`,
        })
      }
    }

    const afpNombre = getValue('afpNombre')
    const asignacionFamiliar = parseBooleanField(getValue('asignacionFamiliar'))

    const jornadaRaw = getValue('jornadaSemanal')
    let jornadaSemanal = 48
    if (jornadaRaw) {
      const parsed = parseInt(jornadaRaw, 10)
      if (isNaN(parsed) || parsed < 1 || parsed > 48) {
        rowErrors.push({
          row: rowNumber,
          field: 'Jornada Semanal',
          message: 'Jornada semanal debe ser un numero entre 1 y 48',
        })
      } else {
        jornadaSemanal = parsed
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
    } else {
      validRows.push({
        rowNumber,
        dni,
        firstName,
        lastName,
        position,
        department,
        fechaIngreso,
        sueldoBruto,
        regimenLaboral,
        tipoContrato,
        tipoAporte,
        afpNombre,
        asignacionFamiliar,
        jornadaSemanal,
      })
    }
  }

  return {
    validRows,
    errors,
    totalRows: lines.length - 1,
    headers,
  }
}

// =============================================
// Template CSV generator
// =============================================

export function generateTemplateCSV(): string {
  const headers = [
    'DNI',
    'Nombres',
    'Apellidos',
    'Cargo',
    'Departamento',
    'Fecha Ingreso',
    'Sueldo Bruto',
    'Regimen Laboral',
    'Tipo Contrato',
    'Tipo Aporte',
    'AFP Nombre',
    'Asignacion Familiar',
    'Jornada Semanal',
  ]

  const exampleRow = [
    '12345678',
    'Juan Carlos',
    'Perez Lopez',
    'Analista',
    'Contabilidad',
    '15/03/2024',
    '3500.00',
    'General',
    'Indefinido',
    'AFP',
    'Prima',
    'Si',
    '48',
  ]

  return headers.join(',') + '\n' + exampleRow.join(',') + '\n'
}
