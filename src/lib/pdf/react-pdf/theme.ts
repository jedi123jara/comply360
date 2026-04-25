/**
 * Theme compartido para los reportes ejecutivos con @react-pdf/renderer.
 *
 * Mantiene la paleta de marca COMPLY360 (azul corporativo + verde de acción)
 * y una escala tipográfica cómoda para reportes A4.
 */

export const BRAND = {
  primary: '#1e3a6e',    // azul corporativo
  primaryDark: '#142847',
  primaryLight: '#e8eef7',
  accent: '#059669',     // verde acción
  accentLight: '#d1fae5',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  warning: '#d97706',
  warningLight: '#fef3c7',
  muted: '#64748b',
  border: '#e2e8f0',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate700: '#334155',
  slate900: '#0f172a',
  white: '#ffffff',
} as const

export const TYPO = {
  xs: 8,
  sm: 9,
  base: 10,
  md: 11,
  lg: 13,
  xl: 16,
  xxl: 22,
  title: 26,
} as const

/** Interpreta un score 0-100 para elegir color + etiqueta. */
export function scoreSemantic(score: number): {
  color: string
  bg: string
  label: string
} {
  if (score >= 80) return { color: BRAND.accent, bg: BRAND.accentLight, label: 'CUMPLIMIENTO SATISFACTORIO' }
  if (score >= 60) return { color: BRAND.warning, bg: BRAND.warningLight, label: 'REQUIERE ATENCIÓN' }
  return { color: BRAND.danger, bg: BRAND.dangerLight, label: 'RIESGO CRÍTICO' }
}

export function formatMoney(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}
