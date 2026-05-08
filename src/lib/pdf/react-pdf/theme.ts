/**
 * Theme compartido para los reportes ejecutivos con @react-pdf/renderer.
 *
 * Paleta v4 "Blue Authority" (alineada con tokens.css y design system del SaaS).
 * Navy + accent blue brillante + gold premium + escala neutral slate.
 * Tipografía cómoda para reportes A4.
 */

export const BRAND = {
  primary: '#1e3a8a',    // navy authority — headings, hero band
  primaryDark: '#172554',// deep navy — subtítulos, separadores fuertes
  primaryLight: '#dbeafe',// navy tint — backgrounds suaves
  accent: '#2563eb',     // brand blue — CTAs, sello compliance
  accentLight: '#eff6ff',// brand tint — cards info
  premium: '#b45309',    // gold dark — sello PRO, certificados
  premiumLight: '#fef3c7',// gold tint — bordes premium
  success: '#16a34a',    // verde nativo — KPIs OK, scores >= 80
  successLight: '#dcfce7',
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
  if (score >= 80) return { color: BRAND.success, bg: BRAND.successLight, label: 'CUMPLIMIENTO SATISFACTORIO' }
  if (score >= 60) return { color: BRAND.warning, bg: BRAND.warningLight, label: 'REQUIERE ATENCIÓN' }
  return { color: BRAND.danger, bg: BRAND.dangerLight, label: 'RIESGO CRÍTICO' }
}

export function formatMoney(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}
