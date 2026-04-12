/**
 * T-REGISTRO (electronic payroll registry) export service
 * Generates the flat file format required by SUNAT's T-REGISTRO system
 * Reference: Res. 183-2011/SUNAT and amendments
 *
 * T-REGISTRO requires these records per worker:
 * - Type 1: Worker data (DNI, name, dates, regime, contract type)
 * - Type 2: Establishment data (RUC, address)
 * - Type 3: Pension data (AFP/ONP, CUSPP)
 *
 * PLAME (Planilla Mensual de Pagos) monthly declaration included as a
 * convenience wrapper that delegates to the plame.ts module.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkerTRegistro {
  dni: string
  firstName: string
  lastName: string
  birthDate: string | null
  gender: string | null
  nationality: string | null
  address: string | null
  phone: string | null
  email: string | null
  position: string | null
  fechaIngreso: string
  fechaCese: string | null
  regimenLaboral: string
  tipoContrato: string
  sueldoBruto: number
  jornadaSemanal: number
  tipoAporte: string
  afpNombre: string | null
  cuspp: string | null
  sctr: boolean
  essaludVida: boolean
}

export interface OrgData {
  ruc: string
  razonSocial: string
  direccion: string
  ubigeo: string
}

export interface TRegistroResult {
  content: string
  errors: string[]
  warnings: string[]
  workerCount: number
}

// ---------------------------------------------------------------------------
// Regime and contract code mappings
// ---------------------------------------------------------------------------

const REGIMEN_CODES: Record<string, string> = {
  GENERAL: '01',
  MYPE_MICRO: '02',
  MYPE_PEQUENA: '03',
  AGRARIO: '04',
  CONSTRUCCION_CIVIL: '05',
  MINERO: '06',
  PESQUERO: '07',
  TEXTIL_EXPORTACION: '08',
  DOMESTICO: '09',
  CAS: '10',
  MODALIDAD_FORMATIVA: '11',
  TELETRABAJO: '12',
}

const CONTRATO_CODES: Record<string, string> = {
  INDEFINIDO: '01',
  PLAZO_FIJO: '02',
  TIEMPO_PARCIAL: '03',
  INICIO_ACTIVIDAD: '04',
  NECESIDAD_MERCADO: '05',
  RECONVERSION: '06',
  SUPLENCIA: '07',
  EMERGENCIA: '08',
  OBRA_DETERMINADA: '09',
  INTERMITENTE: '10',
  EXPORTACION: '11',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function sanitizeField(value: string | null | undefined): string {
  if (!value) return ''
  // Remove pipe characters that would break the delimiter format
  return value.replace(/\|/g, ' ').trim()
}

function splitApellidos(lastName: string): { paterno: string; materno: string } {
  const parts = lastName.trim().split(/\s+/)
  return {
    paterno: parts[0] || '',
    materno: parts.slice(1).join(' ') || '',
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface ValidationIssue {
  worker: string
  field: string
  message: string
}

function validateWorker(
  w: WorkerTRegistro,
  index: number
): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const id = `Trabajador #${index + 1} (${w.dni || 'SIN DNI'})`

  // --- Required fields ---
  if (!w.dni || !/^\d{8}$/.test(w.dni)) {
    errors.push({ worker: id, field: 'dni', message: 'DNI invalido. Debe tener 8 digitos.' })
  }

  if (!w.firstName || w.firstName.trim().length === 0) {
    errors.push({ worker: id, field: 'firstName', message: 'Nombres es obligatorio.' })
  }

  if (!w.lastName || w.lastName.trim().length === 0) {
    errors.push({ worker: id, field: 'lastName', message: 'Apellidos es obligatorio.' })
  }

  if (!w.fechaIngreso) {
    errors.push({ worker: id, field: 'fechaIngreso', message: 'Fecha de ingreso es obligatoria.' })
  } else {
    const d = new Date(w.fechaIngreso)
    if (isNaN(d.getTime())) {
      errors.push({ worker: id, field: 'fechaIngreso', message: 'Fecha de ingreso invalida.' })
    }
  }

  if (!w.regimenLaboral) {
    errors.push({ worker: id, field: 'regimenLaboral', message: 'Regimen laboral es obligatorio.' })
  } else if (!REGIMEN_CODES[w.regimenLaboral]) {
    warnings.push({
      worker: id,
      field: 'regimenLaboral',
      message: `Regimen "${w.regimenLaboral}" no reconocido. Se usara codigo por defecto "01".`,
    })
  }

  if (!w.tipoContrato) {
    errors.push({ worker: id, field: 'tipoContrato', message: 'Tipo de contrato es obligatorio.' })
  } else if (!CONTRATO_CODES[w.tipoContrato]) {
    warnings.push({
      worker: id,
      field: 'tipoContrato',
      message: `Tipo de contrato "${w.tipoContrato}" no reconocido. Se usara codigo por defecto "01".`,
    })
  }

  if (w.sueldoBruto <= 0) {
    errors.push({ worker: id, field: 'sueldoBruto', message: 'Sueldo bruto debe ser mayor a 0.' })
  }

  // --- Pension system ---
  if (!w.tipoAporte || !['AFP', 'ONP'].includes(w.tipoAporte)) {
    errors.push({ worker: id, field: 'tipoAporte', message: 'Tipo de aporte debe ser AFP u ONP.' })
  }

  if (w.tipoAporte === 'AFP') {
    if (!w.afpNombre) {
      errors.push({ worker: id, field: 'afpNombre', message: 'Nombre de AFP es obligatorio cuando el aporte es AFP.' })
    }
    if (!w.cuspp) {
      warnings.push({ worker: id, field: 'cuspp', message: 'CUSPP no proporcionado para afiliado AFP.' })
    }
  }

  // --- Optional but recommended ---
  if (!w.birthDate) {
    warnings.push({ worker: id, field: 'birthDate', message: 'Fecha de nacimiento no proporcionada.' })
  }

  if (!w.gender) {
    warnings.push({ worker: id, field: 'gender', message: 'Genero no proporcionado.' })
  }

  if (!w.address) {
    warnings.push({ worker: id, field: 'address', message: 'Direccion no proporcionada.' })
  }

  if (w.jornadaSemanal <= 0 || w.jornadaSemanal > 48) {
    warnings.push({
      worker: id,
      field: 'jornadaSemanal',
      message: `Jornada semanal ${w.jornadaSemanal}h fuera del rango normal (1-48).`,
    })
  }

  return { errors, warnings }
}

// ---------------------------------------------------------------------------
// Record generators (Type 1, 2, 3 as per SUNAT specification)
// ---------------------------------------------------------------------------

/**
 * Type 1: Worker identification and employment data
 */
function generateType1Record(
  ruc: string,
  w: WorkerTRegistro,
  correlativo: number
): string {
  const { paterno, materno } = splitApellidos(w.lastName)

  const fields = [
    '1',                                                    // Tipo registro
    String(correlativo).padStart(5, '0'),                   // Correlativo
    ruc,                                                    // RUC empleador
    '01',                                                   // Tipo documento (01=DNI)
    w.dni,                                                  // Numero documento
    sanitizeField(paterno),                                 // Apellido paterno
    sanitizeField(materno),                                 // Apellido materno
    sanitizeField(w.firstName),                             // Nombres
    w.gender === 'M' ? '1' : w.gender === 'F' ? '2' : '0', // Sexo
    formatDate(w.birthDate),                                // Fecha nacimiento
    sanitizeField(w.nationality) || 'PERUANA',              // Nacionalidad
    sanitizeField(w.address),                               // Direccion
    sanitizeField(w.phone),                                 // Telefono
    sanitizeField(w.email),                                 // Email
    REGIMEN_CODES[w.regimenLaboral] || '01',                // Cod. regimen laboral
    sanitizeField(w.position),                              // Cargo / ocupacion
    CONTRATO_CODES[w.tipoContrato] || '01',                 // Cod. tipo contrato
    formatDate(w.fechaIngreso),                             // Fecha ingreso
    formatDate(w.fechaCese),                                // Fecha cese (vacio si activo)
    w.sueldoBruto.toFixed(2),                               // Remuneracion
    String(w.jornadaSemanal),                               // Jornada semanal (horas)
  ]

  return fields.join('|')
}

/**
 * Type 2: Establishment data (one record per worker-establishment)
 */
function generateType2Record(
  ruc: string,
  orgData: OrgData,
  w: WorkerTRegistro,
  correlativo: number
): string {
  const fields = [
    '2',                                                    // Tipo registro
    String(correlativo).padStart(5, '0'),                   // Correlativo
    ruc,                                                    // RUC empleador
    '01',                                                   // Tipo documento trabajador
    w.dni,                                                  // Numero documento trabajador
    '0000',                                                 // Cod. establecimiento (0000 = sede principal)
    sanitizeField(orgData.direccion),                       // Direccion establecimiento
    orgData.ubigeo || '',                                   // Ubigeo
    formatDate(w.fechaIngreso),                             // Fecha inicio en establecimiento
    formatDate(w.fechaCese),                                // Fecha fin (vacio si activo)
  ]

  return fields.join('|')
}

/**
 * Type 3: Pension system data
 */
function generateType3Record(
  ruc: string,
  w: WorkerTRegistro,
  correlativo: number
): string {
  const tipoAporteCod = w.tipoAporte === 'AFP' ? '1' : w.tipoAporte === 'ONP' ? '2' : '0'

  const fields = [
    '3',                                                    // Tipo registro
    String(correlativo).padStart(5, '0'),                   // Correlativo
    ruc,                                                    // RUC empleador
    '01',                                                   // Tipo documento trabajador
    w.dni,                                                  // Numero documento trabajador
    tipoAporteCod,                                          // Tipo regimen pensionario (1=AFP, 2=ONP)
    sanitizeField(w.afpNombre) || '',                       // Nombre AFP (vacio si ONP)
    sanitizeField(w.cuspp) || '',                           // CUSPP (solo AFP)
    formatDate(w.fechaIngreso),                             // Fecha inicio aporte
    '',                                                     // Fecha fin aporte (vacio si vigente)
    w.sctr ? '1' : '0',                                    // Indicador SCTR
    w.essaludVida ? '1' : '0',                             // Indicador EsSalud Vida
  ]

  return fields.join('|')
}

// ---------------------------------------------------------------------------
// Main export: generateTRegistroFile
// ---------------------------------------------------------------------------

/**
 * Generates the complete T-REGISTRO flat file for SUNAT submission.
 *
 * Validates all worker data before generating. Returns:
 * - content: the pipe-delimited text file content
 * - errors: blocking issues that prevent valid submission
 * - warnings: non-blocking issues that should be reviewed
 *
 * If there are errors, content will still be generated (for preview)
 * but should NOT be submitted to SUNAT until errors are resolved.
 */
export function generateTRegistroFile(
  workers: WorkerTRegistro[],
  orgData: OrgData
): TRegistroResult {
  const allErrors: string[] = []
  const allWarnings: string[] = []

  // --- Org-level validation ---
  if (!orgData.ruc || !/^\d{11}$/.test(orgData.ruc)) {
    allErrors.push(`RUC de la organizacion "${orgData.ruc || ''}" no es valido.`)
  }

  if (!orgData.razonSocial) {
    allWarnings.push('Razon social de la organizacion no proporcionada.')
  }

  if (workers.length === 0) {
    allErrors.push('No hay trabajadores para generar el archivo T-REGISTRO.')
    return { content: '', errors: allErrors, warnings: allWarnings, workerCount: 0 }
  }

  // --- Check for duplicate DNIs ---
  const dniSet = new Set<string>()
  for (const w of workers) {
    if (w.dni && dniSet.has(w.dni)) {
      allErrors.push(`DNI ${w.dni} aparece duplicado en la lista de trabajadores.`)
    }
    dniSet.add(w.dni)
  }

  // --- Validate each worker ---
  workers.forEach((w, idx) => {
    const { errors, warnings } = validateWorker(w, idx)
    for (const e of errors) {
      allErrors.push(`${e.worker} - ${e.field}: ${e.message}`)
    }
    for (const w2 of warnings) {
      allWarnings.push(`${w2.worker} - ${w2.field}: ${w2.message}`)
    }
  })

  // --- Generate file content ---
  const ruc = orgData.ruc || '00000000000'
  const lines: string[] = []

  // Header line
  lines.push(
    `H|${ruc}|T-REGISTRO|${formatDate(new Date().toISOString())}|${workers.length}|${sanitizeField(orgData.razonSocial)}`
  )

  // Generate three record types for each worker
  let correlativo = 0
  for (const w of workers) {
    correlativo++
    lines.push(generateType1Record(ruc, w, correlativo))
    lines.push(generateType2Record(ruc, orgData, w, correlativo))
    lines.push(generateType3Record(ruc, w, correlativo))
  }

  // Footer
  lines.push(`T|${workers.length}|${correlativo * 3}`)

  return {
    content: lines.join('\n'),
    errors: allErrors,
    warnings: allWarnings,
    workerCount: workers.length,
  }
}

// ---------------------------------------------------------------------------
// PLAME wrapper (delegates to plame.ts module)
// ---------------------------------------------------------------------------

interface WorkerPlameInput {
  dni: string
  firstName: string
  lastName: string
  regimenLaboral: string
  tipoContrato: string
  sueldoBruto: number
  asignacionFamiliar: boolean
  diasTrabajados: number
  horasExtras25: number
  horasExtras35: number
  inasistencias: number
  tardanzas: number
  tipoAporte: string
  afpNombre: string | null
  sctr: boolean
}

export interface PlameFileResult {
  content: string
  errors: string[]
  warnings: string[]
  workerCount: number
}

/**
 * Generates the PLAME (Planilla Mensual de Pagos) flat file for a given period.
 *
 * Validates worker data completeness before generating.
 * Returns content + any validation errors/warnings.
 */
export function generatePLAMEFile(
  workers: WorkerPlameInput[],
  period: { month: number; year: number },
  ruc: string
): PlameFileResult {
  const errors: string[] = []
  const warnings: string[] = []

  // --- Period validation ---
  if (period.month < 1 || period.month > 12) {
    errors.push(`Mes ${period.month} invalido. Debe estar entre 1 y 12.`)
  }

  if (period.year < 2000 || period.year > 2100) {
    errors.push(`Anio ${period.year} invalido.`)
  }

  if (!ruc || !/^\d{11}$/.test(ruc)) {
    errors.push(`RUC "${ruc || ''}" no es valido.`)
  }

  if (workers.length === 0) {
    errors.push('No hay trabajadores para generar la planilla PLAME.')
    return { content: '', errors, warnings, workerCount: 0 }
  }

  // --- Worker validation ---
  workers.forEach((w, idx) => {
    const id = `Trabajador #${idx + 1} (${w.dni || 'SIN DNI'})`

    if (!w.dni || !/^\d{8}$/.test(w.dni)) {
      errors.push(`${id}: DNI invalido.`)
    }

    if (!w.firstName || !w.lastName) {
      errors.push(`${id}: Nombre completo es obligatorio.`)
    }

    if (w.sueldoBruto <= 0) {
      errors.push(`${id}: Sueldo bruto debe ser mayor a 0.`)
    }

    if (w.diasTrabajados < 0 || w.diasTrabajados > 31) {
      warnings.push(`${id}: Dias trabajados (${w.diasTrabajados}) fuera de rango.`)
    }

    if (!w.tipoAporte || !['AFP', 'ONP'].includes(w.tipoAporte)) {
      errors.push(`${id}: Tipo de aporte debe ser AFP u ONP.`)
    }

    if (w.tipoAporte === 'AFP' && !w.afpNombre) {
      errors.push(`${id}: Nombre de AFP obligatorio para aporte AFP.`)
    }

    if (w.horasExtras25 < 0 || w.horasExtras35 < 0) {
      warnings.push(`${id}: Horas extras negativas detectadas.`)
    }

    if (w.inasistencias < 0) {
      warnings.push(`${id}: Inasistencias negativas detectadas.`)
    }
  })

  // --- Generate PLAME file content ---
  // Delegate to generatePlameExport from plame.ts via inline generation
  // to keep this module self-contained for the wrapper API
  const periodo = `${period.year}${String(period.month).padStart(2, '0')}`
  const lines: string[] = []

  // AFP rates (2026)
  const AFP_COMISION_FLUJO: Record<string, number> = {
    HABITAT: 0.0138,
    INTEGRA: 0.0155,
    PRIMA: 0.0155,
    PROFUTURO: 0.0169,
  }
  const AFP_APORTE = 0.10
  const AFP_SEGURO = 0.0184
  const TASA_ONP = 0.13
  const TASA_ESSALUD = 0.09
  const TASA_SCTR_SALUD = 0.0053
  const TASA_SCTR_PENSION = 0.0100
  const RMV = 1130

  // Header: 0601|RUC|Periodo|NumTrabajadores|NumPensionistas
  lines.push(`0601|${ruc}|${periodo}|${workers.length}|0|`)

  workers.forEach((w, idx) => {
    const { paterno, materno } = splitApellidos(w.lastName)
    const asigFamiliar = w.asignacionFamiliar ? RMV * 0.1 : 0
    const he25 = w.horasExtras25 * (w.sueldoBruto / 240) * 1.25
    const he35 = w.horasExtras35 * (w.sueldoBruto / 240) * 1.35
    const descInasist = (w.sueldoBruto / 30) * w.inasistencias
    const descTard = (w.sueldoBruto / 240) * w.tardanzas
    const remTotal = round2(w.sueldoBruto + asigFamiliar + he25 + he35 - descInasist - descTard)

    // Pension deductions
    let afpOblig = 0
    let afpSeguro = 0
    let afpComision = 0
    let onp = 0

    if (w.tipoAporte === 'AFP' && w.afpNombre) {
      const key = w.afpNombre.toUpperCase()
      afpOblig = round2(remTotal * AFP_APORTE)
      afpSeguro = round2(remTotal * AFP_SEGURO)
      afpComision = round2(remTotal * (AFP_COMISION_FLUJO[key] || 0.015))
    } else if (w.tipoAporte === 'ONP') {
      onp = round2(remTotal * TASA_ONP)
    }

    const totalDescTrab = round2(afpOblig + afpSeguro + afpComision + onp)

    // Employer contributions
    const essalud = round2(remTotal * TASA_ESSALUD)
    const sctrSalud = w.sctr ? round2(remTotal * TASA_SCTR_SALUD) : 0
    const sctrPension = w.sctr ? round2(remTotal * TASA_SCTR_PENSION) : 0
    const totalAporteEmpl = round2(essalud + sctrSalud + sctrPension)

    const sueldoNeto = round2(remTotal - totalDescTrab)
    const tipoAporteCod = w.tipoAporte === 'AFP' ? '1' : '2'

    const AFP_CODES: Record<string, string> = {
      HABITAT: '01', INTEGRA: '02', PRIMA: '03', PROFUTURO: '04',
    }
    const afpCode = w.afpNombre ? (AFP_CODES[w.afpNombre.toUpperCase()] || '00') : '00'

    const fields = [
      '0701',
      String(idx + 1).padStart(5, '0'),
      '01',
      w.dni,
      sanitizeField(paterno),
      sanitizeField(materno),
      sanitizeField(w.firstName),
      String(w.diasTrabajados),
      String(w.horasExtras25),
      String(w.horasExtras35),
      remTotal.toFixed(2),
      w.sueldoBruto.toFixed(2),
      asigFamiliar.toFixed(2),
      he25.toFixed(2),
      he35.toFixed(2),
      descInasist.toFixed(2),
      descTard.toFixed(2),
      essalud.toFixed(2),
      sctrSalud.toFixed(2),
      sctrPension.toFixed(2),
      tipoAporteCod,
      afpCode,
      afpOblig.toFixed(2),
      afpSeguro.toFixed(2),
      afpComision.toFixed(2),
      onp.toFixed(2),
      totalDescTrab.toFixed(2),
      totalAporteEmpl.toFixed(2),
      sueldoNeto.toFixed(2),
    ]
    lines.push(fields.join('|'))
  })

  // Footer
  lines.push(`0801|${workers.length}`)

  return {
    content: lines.join('\n'),
    errors,
    warnings,
    workerCount: workers.length,
  }
}

// ---------------------------------------------------------------------------
// Legacy exports (backward compatible with existing route.ts usage)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use generateTRegistroFile() instead. Kept for backward compatibility.
 */
export function generateTRegistroExport(ruc: string, workers: WorkerTRegistro[]): string {
  const result = generateTRegistroFile(workers, {
    ruc,
    razonSocial: '',
    direccion: '',
    ubigeo: '',
  })
  return result.content
}

/**
 * Generates a CSV version for T-REGISTRO data review.
 */
export function generateTRegistroCSV(workers: WorkerTRegistro[]): string {
  const headers = [
    'Tipo Documento', 'Numero Documento', 'Apellido Paterno', 'Apellido Materno',
    'Nombres', 'Sexo', 'Fecha Nacimiento', 'Nacionalidad', 'Direccion',
    'Telefono', 'Email', 'Regimen Laboral', 'Cargo', 'Tipo Contrato',
    'Fecha Ingreso', 'Fecha Cese', 'Remuneracion', 'Jornada Semanal',
    'Sistema Pensionario', 'AFP', 'CUSPP', 'SCTR', 'EsSalud Vida',
  ]

  const rows = workers.map(w => {
    const { paterno, materno } = splitApellidos(w.lastName)
    return [
      'DNI',
      w.dni,
      paterno,
      materno,
      w.firstName,
      w.gender || '',
      formatDate(w.birthDate),
      w.nationality || 'PERUANA',
      w.address || '',
      w.phone || '',
      w.email || '',
      w.regimenLaboral,
      w.position || '',
      w.tipoContrato,
      formatDate(w.fechaIngreso),
      formatDate(w.fechaCese),
      w.sueldoBruto.toFixed(2),
      String(w.jornadaSemanal),
      w.tipoAporte,
      w.afpNombre || '',
      w.cuspp || '',
      w.sctr ? 'SI' : 'NO',
      w.essaludVida ? 'SI' : 'NO',
    ]
  })

  return [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
}

// ---------------------------------------------------------------------------
// Internal utility
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
