/**
 * Validación de DNI peruano.
 *
 * El DNI estándar son 8 dígitos. RENIEC además emite un Código de
 * Verificación (CDV) de 1 dígito (0-9) o letra 'K' que se calcula con
 * algoritmo módulo 11 sobre los 8 dígitos:
 *
 *   1. Multiplicar cada dígito por el peso [3,2,7,6,5,4,3,2] (left-to-right)
 *   2. Sumar los productos
 *   3. r = suma mod 11
 *   4. Si r === 0 → CDV = 1
 *      Si r === 1 → CDV = 1 (algunos casos), pero RENIEC suele asignar 0 o letra
 *      Si r >= 2  → CDV = 11 - r → si > 9 reemplaza por 'K'
 *
 * Nota: la fórmula exacta tiene variantes; este helper implementa la versión
 * más común (la usada por RENIEC en consultas estándar). Como el CDV no
 * siempre se conoce, el modo `requireCdv: false` solo rechaza patrones
 * obviamente inválidos.
 *
 * FIX #6.A: antes el endpoint de alta worker solo validaba `/^\d{8}$/`,
 * aceptando DNIs falsos como `00000000` o `12345678`.
 */

const DIGIT_WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2]

/**
 * Calcula el CDV (Código de Verificación) para un DNI de 8 dígitos.
 * Devuelve un dígito '0'-'9' o 'K'.
 */
export function computeDniCdv(dni8: string): string {
  if (!/^\d{8}$/.test(dni8)) {
    throw new Error('computeDniCdv: input debe ser exactamente 8 dígitos')
  }
  let sum = 0
  for (let i = 0; i < 8; i++) {
    sum += parseInt(dni8[i]!, 10) * DIGIT_WEIGHTS[i]!
  }
  const r = sum % 11
  if (r === 0) return '1'
  if (r === 1) return '0'
  const cdv = 11 - r
  if (cdv === 10) return 'K'
  return String(cdv)
}

interface ValidateOptions {
  /**
   * Si true, requiere que el input traiga el 9no dígito (CDV) y lo valida.
   * Default false (solo valida los 8 dígitos contra patrones evidentemente
   * falsos).
   */
  requireCdv?: boolean
}

interface ValidationResult {
  valid: boolean
  reason?: string
}

/**
 * Valida un DNI peruano. Acepta 8 dígitos (sin CDV) o 9 caracteres con CDV.
 */
export function validatePeruvianDni(input: string, opts: ValidateOptions = {}): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, reason: 'DNI debe ser string' }
  }

  const trimmed = input.trim()

  // Caso 1: 8 dígitos puros
  if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
    if (opts.requireCdv) {
      return { valid: false, reason: 'Falta CDV (9no dígito)' }
    }
    if (isObviouslyInvalid(trimmed)) {
      return { valid: false, reason: 'DNI inválido (patrón sospechoso)' }
    }
    return { valid: true }
  }

  // Caso 2: 9 caracteres = 8 dígitos + CDV
  if (trimmed.length === 9 && /^\d{8}[0-9K]$/.test(trimmed)) {
    const dni8 = trimmed.slice(0, 8)
    const cdv = trimmed.slice(8)
    if (isObviouslyInvalid(dni8)) {
      return { valid: false, reason: 'DNI inválido (patrón sospechoso)' }
    }
    const expected = computeDniCdv(dni8)
    if (expected !== cdv) {
      return { valid: false, reason: `CDV inválido (esperado ${expected})` }
    }
    return { valid: true }
  }

  return {
    valid: false,
    reason: 'Formato inválido. Esperado 8 dígitos o 8 dígitos + CDV (9 caracteres)',
  }
}

/**
 * Detecta DNIs evidentemente falsos: todos iguales, secuencias triviales.
 * El RENIEC emite DNIs reales pero estos patrones no se asignan en la práctica
 * y suelen ser typos o fakes.
 */
function isObviouslyInvalid(dni8: string): boolean {
  // Todos los dígitos iguales (00000000, 11111111, etc.)
  if (/^(\d)\1{7}$/.test(dni8)) return true
  // Secuencia 12345678 / 87654321
  if (dni8 === '12345678' || dni8 === '87654321') return true
  return false
}
