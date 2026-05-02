// =============================================
// BULK VALIDATOR — valida cada fila contra reglas mínimas
// Generador de Contratos / Chunk 7
//
// Validación rápida y sin BD. Las reglas legales completas las aplica
// el motor del chunk 1 al crear cada Contract — acá solo bloqueamos
// errores de forma (DNI, fecha, salario) que harían fallar el insert.
// =============================================

import { z } from 'zod'
import type {
  BulkContractRow,
  BulkPreviewResult,
  BulkRowValidationResult,
} from './types'

const PERU_RMV_2026 = 1130

const rowSchema = z.object({
  trabajador_nombre: z
    .string({ message: 'Nombre del trabajador requerido' })
    .trim()
    .min(2, 'Nombre del trabajador requerido (mínimo 2 caracteres)'),
  trabajador_dni: z
    .string({ message: 'DNI requerido' })
    .trim()
    .regex(/^\d{8,12}$/, 'DNI debe tener 8 a 12 dígitos'),
  cargo: z
    .string({ message: 'Cargo requerido' })
    .trim()
    .min(2, 'Cargo requerido (mínimo 2 caracteres)'),
  fecha_inicio: z
    .string({ message: 'Fecha de inicio requerida' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de inicio inválida (use YYYY-MM-DD)'),
  fecha_fin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de fin inválida (use YYYY-MM-DD)')
    .optional(),
  remuneracion: z
    .number({ message: 'Remuneración requerida' })
    .positive('Remuneración debe ser un número positivo'),
  causa_objetiva: z.string().trim().optional(),
  jornada_semanal: z.number().min(1).max(72).optional(),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  direccion: z.string().optional(),
}).passthrough()

export interface ValidateOptions {
  /** Tipo de contrato — afecta qué reglas extras corren. */
  contractType: 'LABORAL_INDEFINIDO' | 'LABORAL_PLAZO_FIJO' | 'LABORAL_TIEMPO_PARCIAL'
}

export function validateBulkRow(
  raw: Record<string, unknown>,
  rowIndex: number,
  options: ValidateOptions,
): BulkRowValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const parsed = rowSchema.safeParse(raw)

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.')
      errors.push(path ? `${path}: ${issue.message}` : issue.message)
    }
    return { rowIndex, raw, normalized: null, errors, warnings, valid: false }
  }

  const data = parsed.data as BulkContractRow

  // Reglas adicionales por contractType
  if (options.contractType === 'LABORAL_PLAZO_FIJO') {
    if (!data.fecha_fin) {
      errors.push('fecha_fin: requerida para contratos a plazo fijo (Art. 72 LPCL).')
    }
    if (!data.causa_objetiva || data.causa_objetiva.length < 80) {
      warnings.push(
        'causa_objetiva: recomendado mínimo 80 caracteres con detalles específicos (Art. 72 LPCL — ver Cas. Lab. 13734-2017-Lima).',
      )
    }
  }

  if (options.contractType === 'LABORAL_TIEMPO_PARCIAL') {
    if (data.jornada_semanal !== undefined && data.jornada_semanal >= 24) {
      errors.push(
        'jornada_semanal: contrato a tiempo parcial requiere < 24h/semana (Art. 11 D.S. 001-96-TR).',
      )
    }
  }

  // Coherencia de fechas
  if (data.fecha_fin && data.fecha_inicio && data.fecha_fin <= data.fecha_inicio) {
    errors.push('fecha_fin: debe ser posterior a fecha_inicio.')
  }

  // RMV
  if (data.remuneracion < PERU_RMV_2026) {
    errors.push(`remuneracion: debe ser ≥ S/ ${PERU_RMV_2026} (RMV 2026 — D.S. 006-2024-TR).`)
  } else if (data.remuneracion < PERU_RMV_2026 * 1.05) {
    warnings.push('remuneracion: muy cerca de la RMV — verifica que sea correcto.')
  }

  return {
    rowIndex,
    raw,
    normalized: errors.length === 0 ? data : null,
    errors,
    warnings,
    valid: errors.length === 0,
  }
}

export function validateBulkPreview(
  rows: Array<Record<string, unknown>>,
  detectedColumns: string[],
  options: ValidateOptions,
): BulkPreviewResult {
  const validations = rows.map((r, idx) => validateBulkRow(r, idx + 1, options))
  return {
    totalRows: rows.length,
    validRows: validations.filter((v) => v.valid).length,
    invalidRows: validations.filter((v) => !v.valid).length,
    rows: validations,
    detectedColumns,
  }
}
