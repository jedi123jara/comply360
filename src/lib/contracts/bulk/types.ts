// =============================================
// BULK CONTRACT GENERATION — TYPES
// Generador de Contratos / Chunk 7
// =============================================

/**
 * Schema canónico de una fila para generación masiva. Las columnas del
 * Excel/CSV se normalizan a estos nombres antes de validar.
 */
export interface BulkContractRow {
  // Datos del trabajador (obligatorios)
  trabajador_nombre: string
  trabajador_dni: string
  cargo: string
  fecha_inicio: string // ISO YYYY-MM-DD
  remuneracion: number

  // Opcionales para modal
  fecha_fin?: string
  causa_objetiva?: string

  // Otros
  jornada_semanal?: number
  email?: string
  direccion?: string
  // Cualquier campo extra se preserva como passthrough
  [key: string]: unknown
}

export interface BulkRowValidationResult {
  rowIndex: number // 1-indexed (matchea fila de Excel después del header)
  raw: Record<string, unknown>
  normalized: BulkContractRow | null
  errors: string[]
  warnings: string[]
  valid: boolean
}

export interface BulkPreviewResult {
  totalRows: number
  validRows: number
  invalidRows: number
  rows: BulkRowValidationResult[]
  /** Columnas detectadas en el archivo origen — útil para mapeo en UI. */
  detectedColumns: string[]
}

export interface BulkGenerateInput {
  /** Tipo de contrato a aplicar a todas las filas. */
  contractType:
    | 'LABORAL_INDEFINIDO'
    | 'LABORAL_PLAZO_FIJO'
    | 'LABORAL_TIEMPO_PARCIAL'
  /** Filas ya validadas (output del preview). */
  rows: BulkContractRow[]
  /** Identificador del template a usar (opcional). */
  templateId?: string
  /** Cabecera/título base para los contratos generados. */
  titleTemplate?: string
}

/**
 * Snapshot de un archivo dentro del ZIP, usado para construir el manifest.
 */
export interface BulkZipEntry {
  fileName: string
  buffer: Buffer
  sha256: string
  contractId?: string
  rowIndex: number
}
