/**
 * Helpers de formato para Perú: soles, DNI, RUC, teléfono, fechas.
 *
 * Fuente única para que boletas, documentos, contratos y resto del portal
 * muestren números y datos exactamente igual. Evita drift entre páginas.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Dinero — sufijo "nuevos soles", 2 decimales, separadores US (1,234.56)
// Convención BCRP/SUNAT: plural siempre, incluido 1.00 nuevos soles
// ═══════════════════════════════════════════════════════════════════════════

type SolesInput = number | string | { toNumber: () => number } | null | undefined

function toNumeric(value: SolesInput): number {
  if (value === null || value === undefined) return NaN
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  if (typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber()
  return NaN
}

export function formatSoles(value: SolesInput): string {
  const num = toNumeric(value)
  if (!Number.isFinite(num)) return '0.00 nuevos soles'
  return `${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} nuevos soles`
}

/**
 * Para precios de marketing donde el monto es entero (49, 349, 4990).
 * Omite decimales cuando son enteros, mantiene formato completo si tiene céntimos.
 *
 * 49      → "49 nuevos soles"
 * 4990    → "4,990 nuevos soles"
 * 49.50   → "49.50 nuevos soles"
 * null    → "Consultar"
 */
export function formatSolesMarketing(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Consultar'
  if (Number.isInteger(value)) {
    return `${value.toLocaleString('en-US')} nuevos soles`
  }
  return formatSoles(value)
}

/**
 * Devuelve { amount, currency } para estilo jerárquico en KPIs / hero panels.
 *
 * Uso:
 *   const { amount, currency } = formatSolesParts(2350.55)
 *   <span className="text-3xl font-bold">{amount}</span>
 *   <span className="text-sm text-muted ml-1">{currency}</span>
 */
export function formatSolesParts(value: SolesInput): { amount: string; currency: string } {
  const num = toNumeric(value)
  if (!Number.isFinite(num)) return { amount: '0.00', currency: 'nuevos soles' }
  return {
    amount: num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    currency: 'nuevos soles',
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DNI — 8 dígitos; enmascara para displays públicos
// ═══════════════════════════════════════════════════════════════════════════

export function formatDni(dni: string | null | undefined): string {
  if (!dni) return '—'
  const digits = dni.replace(/\D/g, '')
  if (digits.length !== 8) return dni
  return digits // DNI no se formatea con separadores, se muestra plano
}

export function formatDniMasked(dni: string | null | undefined): string {
  if (!dni) return '—'
  const digits = dni.replace(/\D/g, '')
  if (digits.length < 4) return '****'
  return digits.slice(0, 2) + '*'.repeat(digits.length - 4) + digits.slice(-2)
}

// ═══════════════════════════════════════════════════════════════════════════
// RUC — 11 dígitos. Se muestra plano, no separado.
// ═══════════════════════════════════════════════════════════════════════════

export function formatRuc(ruc: string | null | undefined): string {
  if (!ruc) return '—'
  return ruc.replace(/\D/g, '')
}

// ═══════════════════════════════════════════════════════════════════════════
// Teléfono PE — 9 dígitos móvil ("+51 916 275 643") o 7 dígitos fijo
// ═══════════════════════════════════════════════════════════════════════════

export function formatPhonePE(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  // Móvil con código de país 51 + 9 dígitos
  if (digits.length === 11 && digits.startsWith('51')) {
    return `+51 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  }
  // Móvil 9 dígitos sin código
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  // Fijo Lima 7 dígitos (01-XXX-XXXX)
  if (digits.length === 7) {
    return `01 ${digits.slice(0, 3)} ${digits.slice(3)}`
  }
  return phone
}

// ═══════════════════════════════════════════════════════════════════════════
// Períodos ("YYYY-MM") → "Abril 2026"
// ═══════════════════════════════════════════════════════════════════════════

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

export function formatPeriodo(periodo: string | null | undefined): string {
  if (!periodo) return '—'
  const match = periodo.match(/^(\d{4})-(\d{2})$/)
  if (!match) return periodo
  const year = match[1]
  const month = parseInt(match[2], 10)
  if (month < 1 || month > 12) return periodo
  return `${MESES[month - 1]} ${year}`
}

export function formatPeriodoCorto(periodo: string | null | undefined): string {
  if (!periodo) return '—'
  const match = periodo.match(/^(\d{4})-(\d{2})$/)
  if (!match) return periodo
  const year = match[1].slice(2)
  const month = parseInt(match[2], 10)
  if (month < 1 || month > 12) return periodo
  return `${MESES_CORTOS[month - 1]} '${year}`
}

// ═══════════════════════════════════════════════════════════════════════════
// Fechas — formato PE corto y largo
// ═══════════════════════════════════════════════════════════════════════════

export function formatShortDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatLongDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Tiempo relativo ("hace 3 días", "en 2 horas")
// ═══════════════════════════════════════════════════════════════════════════

export function formatRelative(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'

  const diffMs = d.getTime() - Date.now()
  const absMs = Math.abs(diffMs)
  const past = diffMs < 0

  const MIN = 60_000
  const HOUR = 3_600_000
  const DAY = 86_400_000

  if (absMs < MIN) return past ? 'hace un momento' : 'ahora'
  if (absMs < HOUR) {
    const mins = Math.floor(absMs / MIN)
    return past ? `hace ${mins} min` : `en ${mins} min`
  }
  if (absMs < DAY) {
    const hrs = Math.floor(absMs / HOUR)
    return past ? `hace ${hrs} h` : `en ${hrs} h`
  }
  if (absMs < DAY * 30) {
    const days = Math.floor(absMs / DAY)
    return past ? `hace ${days} día${days === 1 ? '' : 's'}` : `en ${days} día${days === 1 ? '' : 's'}`
  }
  return formatShortDate(d)
}
