/**
 * T-REGISTRO File Parser
 *
 * Parses the flat file format exported from SUNAT's T-REGISTRO system.
 * Reference: Res. 183-2011/SUNAT
 *
 * T-REGISTRO export format:
 *   - Pipe-delimited (|) fields
 *   - Record Type 1: Worker personal + labor data
 *   - Record Type 2: Establishment data (skipped in parser)
 *   - Record Type 3: Pension/AFP data
 *
 * Usage:
 *   const parsed = parseTRegistroFile(fileContent)
 *   const report = crossReferenceWorkers(parsed, orgWorkers)
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface TRegistroRecord {
  dni: string
  tipoDocumento: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombres: string
  fechaIngreso: string      // YYYY-MM-DD
  fechaCese: string | null   // YYYY-MM-DD or null
  regimenLaboral: string     // Código SUNAT
  tipoContrato: string       // Código SUNAT
  jornadaSemanal: number
  ocupacion: string
  situacion: string          // ACTIVO, BAJA
  tipoAporte: string         // AFP, ONP
  afpCodigo: string | null
}

export interface CrossReferenceResult {
  totalInSystem: number
  totalInTRegistro: number
  matches: MatchResult[]
  notInSunat: MissingRecord[]
  notInSystem: TRegistroRecord[]
  inconsistencies: InconsistencyRecord[]
  summary: {
    matched: number
    notRegisteredInSunat: number
    possibleGhosts: number
    withInconsistencies: number
  }
}

export interface MatchResult {
  dni: string
  name: string
  status: 'ok' | 'inconsistency'
}

export interface MissingRecord {
  dni: string
  name: string
  fechaIngreso: string
  reason: string
}

export interface InconsistencyRecord {
  dni: string
  name: string
  field: string
  systemValue: string
  sunatValue: string
}

// ── SUNAT Code Mappings ──────────────────────────────────────────────────────

const REGIMEN_CODES: Record<string, string> = {
  '01': 'GENERAL',
  '02': 'MYPE_MICRO',
  '03': 'MYPE_PEQUENA',
  '04': 'AGRARIO',
  '05': 'CONSTRUCCION_CIVIL',
  '06': 'PESQUERO',
  '07': 'MINERO',
  '08': 'EXPORTACION',
  '09': 'DOMESTICO',
  '10': 'CAS',
  '11': 'MODALIDAD_FORMATIVA',
}

const APORTE_CODES: Record<string, string> = {
  '01': 'AFP',
  '02': 'ONP',
  '03': 'SIN_APORTE',
}

// ── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a T-REGISTRO flat file into structured records.
 * Handles pipe-delimited format with record type prefix.
 */
export function parseTRegistroFile(content: string): TRegistroRecord[] {
  const records: TRegistroRecord[] = []
  const lines = content.split('\n').filter(l => l.trim())

  for (const line of lines) {
    const fields = line.split('|')

    // Record Type 1: Worker data (minimum 15 fields)
    if (fields[0] === '1' && fields.length >= 12) {
      records.push({
        tipoDocumento: fields[1]?.trim() || 'DNI',
        dni: fields[2]?.trim() || '',
        apellidoPaterno: fields[3]?.trim() || '',
        apellidoMaterno: fields[4]?.trim() || '',
        nombres: fields[5]?.trim() || '',
        fechaIngreso: parseDate(fields[6]?.trim()),
        fechaCese: fields[7]?.trim() ? parseDate(fields[7].trim()) : null,
        regimenLaboral: REGIMEN_CODES[fields[8]?.trim()] || fields[8]?.trim() || '',
        tipoContrato: fields[9]?.trim() || '',
        jornadaSemanal: parseInt(fields[10]?.trim() || '48', 10),
        ocupacion: fields[11]?.trim() || '',
        situacion: fields[12]?.trim() || 'ACTIVO',
        tipoAporte: APORTE_CODES[fields[13]?.trim()] || fields[13]?.trim() || '',
        afpCodigo: fields[14]?.trim() || null,
      })
    }

    // Also try comma-separated or tab-separated formats
    if (fields.length < 5) {
      // Try CSV parsing
      const csvFields = line.split(',')
      if (csvFields.length >= 8) {
        // CSV format: DNI, apellidos, nombres, fechaIngreso, regimen, tipoContrato, aporte, afp
        const dni = csvFields[0]?.trim().replace(/"/g, '') || ''
        if (/^\d{8}$/.test(dni)) {
          const apellidos = (csvFields[1]?.trim().replace(/"/g, '') || '').split(' ')
          records.push({
            tipoDocumento: 'DNI',
            dni,
            apellidoPaterno: apellidos[0] || '',
            apellidoMaterno: apellidos.slice(1).join(' ') || '',
            nombres: csvFields[2]?.trim().replace(/"/g, '') || '',
            fechaIngreso: parseDate(csvFields[3]?.trim().replace(/"/g, '') || ''),
            fechaCese: null,
            regimenLaboral: csvFields[4]?.trim().replace(/"/g, '') || '',
            tipoContrato: csvFields[5]?.trim().replace(/"/g, '') || '',
            jornadaSemanal: 48,
            ocupacion: '',
            situacion: 'ACTIVO',
            tipoAporte: csvFields[6]?.trim().replace(/"/g, '') || '',
            afpCodigo: csvFields[7]?.trim().replace(/"/g, '') || null,
          })
        }
      }
    }
  }

  return records
}

function parseDate(dateStr: string): string {
  if (!dateStr) return ''
  // Handle DD/MM/YYYY format
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }
  // Already YYYY-MM-DD
  return dateStr
}

// ── Cross Reference ──────────────────────────────────────────────────────────

interface SystemWorker {
  id: string
  dni: string
  firstName: string
  lastName: string
  fechaIngreso: Date | string
  regimenLaboral: string
  tipoAporte: string
  afpNombre: string | null
  status: string
}

/**
 * Cross-reference T-REGISTRO records against system workers.
 * Identifies discrepancies, missing registrations, and ghost workers.
 */
export function crossReferenceWorkers(
  tRegistroRecords: TRegistroRecord[],
  systemWorkers: SystemWorker[],
): CrossReferenceResult {
  const matches: MatchResult[] = []
  const notInSunat: MissingRecord[] = []
  const notInSystem: TRegistroRecord[] = []
  const inconsistencies: InconsistencyRecord[] = []

  // Build lookup by DNI
  const sunatByDni = new Map<string, TRegistroRecord>()
  for (const r of tRegistroRecords) {
    if (r.dni) sunatByDni.set(r.dni, r)
  }

  const systemByDni = new Map<string, SystemWorker>()
  for (const w of systemWorkers) {
    if (w.dni) systemByDni.set(w.dni, w)
  }

  // Check each system worker against T-REGISTRO
  for (const worker of systemWorkers) {
    if (worker.status === 'TERMINATED') continue

    const sunatRecord = sunatByDni.get(worker.dni)
    if (!sunatRecord) {
      notInSunat.push({
        dni: worker.dni,
        name: `${worker.firstName} ${worker.lastName}`,
        fechaIngreso: typeof worker.fechaIngreso === 'string'
          ? worker.fechaIngreso
          : worker.fechaIngreso.toISOString().split('T')[0],
        reason: 'No encontrado en T-REGISTRO de SUNAT',
      })
      continue
    }

    // Found — check for inconsistencies
    let hasInconsistency = false

    // Check regime
    if (sunatRecord.regimenLaboral && worker.regimenLaboral &&
        sunatRecord.regimenLaboral !== worker.regimenLaboral) {
      inconsistencies.push({
        dni: worker.dni,
        name: `${worker.firstName} ${worker.lastName}`,
        field: 'Régimen Laboral',
        systemValue: worker.regimenLaboral,
        sunatValue: sunatRecord.regimenLaboral,
      })
      hasInconsistency = true
    }

    // Check pension type
    if (sunatRecord.tipoAporte && worker.tipoAporte &&
        sunatRecord.tipoAporte !== worker.tipoAporte) {
      inconsistencies.push({
        dni: worker.dni,
        name: `${worker.firstName} ${worker.lastName}`,
        field: 'Tipo Aporte',
        systemValue: worker.tipoAporte,
        sunatValue: sunatRecord.tipoAporte,
      })
      hasInconsistency = true
    }

    matches.push({
      dni: worker.dni,
      name: `${worker.firstName} ${worker.lastName}`,
      status: hasInconsistency ? 'inconsistency' : 'ok',
    })
  }

  // Check T-REGISTRO records not in our system (possible ghost workers)
  for (const record of tRegistroRecords) {
    if (record.situacion === 'BAJA') continue // Skip terminated in SUNAT
    if (!systemByDni.has(record.dni)) {
      notInSystem.push(record)
    }
  }

  return {
    totalInSystem: systemWorkers.filter(w => w.status !== 'TERMINATED').length,
    totalInTRegistro: tRegistroRecords.filter(r => r.situacion !== 'BAJA').length,
    matches,
    notInSunat,
    notInSystem,
    inconsistencies,
    summary: {
      matched: matches.filter(m => m.status === 'ok').length,
      notRegisteredInSunat: notInSunat.length,
      possibleGhosts: notInSystem.length,
      withInconsistencies: inconsistencies.length,
    },
  }
}
