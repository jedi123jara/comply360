/**
 * COMPLY360 — Brand constants
 *
 * Single source of truth for brand identity. Used by:
 * - UI components (cards, buttons, landing hero)
 * - Email templates (Resend)
 * - PDF reports (jspdf)
 * - OG images, favicon manifest
 *
 * Do not hardcode colors or names elsewhere — import from here.
 */

export const BRAND = {
  name: 'COMPLY360',
  tagline: 'Compliance laboral inteligente para el Perú',
  shortTagline: 'Compliance laboral · Perú',
  description:
    'La primera plataforma SaaS de compliance laboral integral para empresas peruanas. Gestión de trabajadores, alertas SUNAFIL, diagnóstico, simulacro y asistente IA.',
  domain: 'comply360.pe',
  supportEmail: 'soporte@comply360.pe',
  legalEmail: 'legal@comply360.pe',
} as const

/**
 * Obsidian + Esmeralda — la paleta "nivel dios".
 *
 * Obsidian: un negro cálido con un tinte grafito, no gris plano.
 * Esmeralda: verde compliance, saturación moderada, tinte cyan sutil.
 * Crimson: rojo riesgo, alta visibilidad.
 * Gold: acento residual para CTAs premium y estados "logro".
 */
export const BRAND_COLORS = {
  // Obsidian scale legacy — ahora mapeado a neutral para fallbacks
  obsidian: {
    50: '#1e293b',
    100: '#0f172a',
    200: '#0f172a',
    300: '#0f172a',
    400: '#f1f5f9',
    500: '#ffffff',
    600: '#f8fafc',
    700: '#f1f5f9',
    800: '#e9eef5',
    900: '#0f172a',
  },
  // Esmeralda (primary, compliance positive) — tailwind emerald
  emerald: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#2563eb', // base
    600: '#1d4ed8',
    700: '#1e40af',
    800: '#1e3a8a',
    900: '#172554',
  },
  // Crimson (riesgo, alertas críticas) — tailwind red
  crimson: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626', // base
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  // Amber (advertencias, pendientes) — tailwind amber
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // base
    600: '#d97706',
  },
  // Gold (acento premium residual — logros, plan PRO, certificaciones)
  gold: {
    400: '#e0bc6e',
    500: '#d4a853',
    600: '#b8923e',
  },
  // Cyan (info, links) — tailwind cyan
  cyan: {
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
  },
  // Escala neutral (textos, borders)
  neutral: {
    50: '#f8fafc',
    100: '#e8ecf4',
    200: '#c9d1de',
    300: '#94a0b4',
    400: '#6b7589',
    500: '#4a5366',
    600: '#343b4c',
    700: '#232937',
    800: '#161b26',
    900: '#0c0f18',
  },
} as const

export const BRAND_GRADIENTS = {
  hero: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)',
  emerald: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
  riskHeat: 'linear-gradient(135deg, #dc2626 0%, #f59e0b 50%, #2563eb 100%)',
  glowEmerald:
    'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)',
  glowCrimson:
    'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.08) 0%, transparent 55%)',
} as const

export const BRAND_TYPOGRAPHY = {
  sans: 'var(--font-sans)',
  mono: 'var(--font-mono)',
  display:
    'var(--font-sans), ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
} as const

/**
 * Mapping de severidad → color.
 * Fuente única para alertas, badges, rings, progress bars.
 */
export const SEVERITY_COLORS = {
  critical: BRAND_COLORS.crimson[600],
  high: BRAND_COLORS.amber[500],
  medium: BRAND_COLORS.amber[400],
  low: BRAND_COLORS.cyan[500],
  success: BRAND_COLORS.emerald[600],
  info: BRAND_COLORS.neutral[400],
} as const

export type Severity = keyof typeof SEVERITY_COLORS

/**
 * Mapping de score de compliance → color del anillo.
 * <60 rojo · 60-79 amber · 80-89 emerald · 90+ gold.
 */
export function complianceScoreColor(score: number): string {
  if (score >= 90) return BRAND_COLORS.gold[500]
  if (score >= 80) return BRAND_COLORS.emerald[600]
  if (score >= 60) return BRAND_COLORS.amber[500]
  return BRAND_COLORS.crimson[600]
}

/**
 * Accessor tipado para color por severidad.
 */
export function severityColor(severity: Severity): string {
  return SEVERITY_COLORS[severity]
}
