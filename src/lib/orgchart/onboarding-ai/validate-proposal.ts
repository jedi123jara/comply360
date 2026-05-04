/**
 * Validación post-generación de la propuesta IA.
 *
 * Más allá de Zod (estructura), validamos reglas de negocio:
 *   - El árbol debe ser conexo (todo nodo tiene padre o es raíz)
 *   - No puede haber ciclos
 *   - parentKey debe referenciar una unitKey existente
 *   - reportsToKey debe referenciar una positionKey existente
 *   - Cada position debe tener un unit válido
 *
 * Pure function — testeable sin I/O.
 */
import type { OnboardingProposal, OnboardingUnit, OnboardingPosition } from './schema'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateProposal(p: OnboardingProposal): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const unitKeys = new Set(p.units.map((u) => u.key))
  const positionKeys = new Set(p.positions.map((q) => q.key))

  // 1) Keys únicas
  if (unitKeys.size !== p.units.length) {
    errors.push('Hay claves de unidad duplicadas')
  }
  if (positionKeys.size !== p.positions.length) {
    errors.push('Hay claves de cargo duplicadas')
  }

  // 2) parentKey referencia válida
  for (const u of p.units) {
    if (u.parentKey && !unitKeys.has(u.parentKey)) {
      errors.push(`Unidad "${u.name}" referencia parentKey inexistente: ${u.parentKey}`)
    }
  }

  // 3) Debe haber al menos una raíz
  const roots = p.units.filter((u) => !u.parentKey)
  if (roots.length === 0) {
    errors.push('No hay unidades raíz (todas tienen parentKey)')
  }

  // 4) No ciclos en árbol de unidades
  if (hasUnitCycle(p.units)) {
    errors.push('El árbol de unidades tiene ciclos')
  }

  // 5) Position references
  for (const q of p.positions) {
    if (!unitKeys.has(q.unitKey)) {
      errors.push(`Cargo "${q.title}" referencia unitKey inexistente: ${q.unitKey}`)
    }
    if (q.reportsToKey && !positionKeys.has(q.reportsToKey)) {
      errors.push(`Cargo "${q.title}" reporta a positionKey inexistente: ${q.reportsToKey}`)
    }
  }

  // 6) No ciclos en línea de mando
  if (hasPositionCycle(p.positions)) {
    errors.push('La línea de mando tiene ciclos')
  }

  // 7) Warnings
  if (p.units.length > 30) {
    warnings.push('La propuesta tiene muchas unidades — revisar si todas son necesarias')
  }
  if (p.positions.length > 60) {
    warnings.push('La propuesta tiene muchos cargos — revisar antes de aplicar')
  }
  const unitsWithoutPositions = p.units.filter(
    (u) => !p.positions.some((q) => q.unitKey === u.key),
  )
  if (unitsWithoutPositions.length > 0) {
    warnings.push(
      `${unitsWithoutPositions.length} unidad(es) sin cargos: ${unitsWithoutPositions
        .slice(0, 3)
        .map((u) => u.name)
        .join(', ')}${unitsWithoutPositions.length > 3 ? '…' : ''}`,
    )
  }

  return { valid: errors.length === 0, errors, warnings }
}

function hasUnitCycle(units: OnboardingUnit[]): boolean {
  const parentByKey = new Map(units.map((u) => [u.key, u.parentKey]))
  for (const u of units) {
    let cursor: string | null | undefined = u.parentKey
    const seen = new Set<string>([u.key])
    while (cursor) {
      if (seen.has(cursor)) return true
      seen.add(cursor)
      cursor = parentByKey.get(cursor) ?? null
    }
  }
  return false
}

function hasPositionCycle(positions: OnboardingPosition[]): boolean {
  const parentByKey = new Map(positions.map((q) => [q.key, q.reportsToKey]))
  for (const q of positions) {
    let cursor: string | null | undefined = q.reportsToKey
    const seen = new Set<string>([q.key])
    while (cursor) {
      if (seen.has(cursor)) return true
      seen.add(cursor)
      cursor = parentByKey.get(cursor) ?? null
    }
  }
  return false
}
