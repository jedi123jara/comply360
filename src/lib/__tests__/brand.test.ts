import { describe, it, expect } from 'vitest'
import {
  complianceScoreColor,
  complianceScoreLabel,
  complianceScoreTone,
  complianceScoreTextColor,
  COMPLIANCE_SCORE_LABELS,
  severityColor,
  BRAND_COLORS,
  SEVERITY_COLORS,
  BRAND,
} from '@/lib/brand'

/** Contraste WCAG entre dos colores hex (#rrggbb). */
function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b2)
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('brand / compliance thresholds', () => {
  it('score < 60 es crimson (riesgo)', () => {
    expect(complianceScoreColor(0)).toBe(BRAND_COLORS.crimson[600])
    expect(complianceScoreColor(40)).toBe(BRAND_COLORS.crimson[600])
    expect(complianceScoreColor(59)).toBe(BRAND_COLORS.crimson[600])
  })

  it('60–79 es amber (mejorable)', () => {
    expect(complianceScoreColor(60)).toBe(BRAND_COLORS.amber[500])
    expect(complianceScoreColor(75)).toBe(BRAND_COLORS.amber[500])
    expect(complianceScoreColor(79)).toBe(BRAND_COLORS.amber[500])
  })

  it('80–89 es emerald (saludable)', () => {
    expect(complianceScoreColor(80)).toBe(BRAND_COLORS.emerald[600])
    expect(complianceScoreColor(85)).toBe(BRAND_COLORS.emerald[600])
    expect(complianceScoreColor(89)).toBe(BRAND_COLORS.emerald[600])
  })

  it('≥ 90 es gold (elite)', () => {
    expect(complianceScoreColor(90)).toBe(BRAND_COLORS.gold[500])
    expect(complianceScoreColor(100)).toBe(BRAND_COLORS.gold[500])
  })

  it('clamp fuera de rango sigue thresholds', () => {
    expect(complianceScoreColor(-10)).toBe(BRAND_COLORS.crimson[600])
    expect(complianceScoreColor(150)).toBe(BRAND_COLORS.gold[500])
  })
})

describe('brand / etiqueta del score (no depender solo del color)', () => {
  it('< 60 es "En riesgo" (borde 59)', () => {
    expect(complianceScoreTone(0)).toBe('risk')
    expect(complianceScoreTone(59)).toBe('risk')
    expect(complianceScoreLabel(59)).toBe('En riesgo')
    expect(complianceScoreLabel(-10)).toBe('En riesgo')
  })

  it('60–79 es "A mejorar" (bordes 60 y 79)', () => {
    expect(complianceScoreTone(60)).toBe('fair')
    expect(complianceScoreTone(79)).toBe('fair')
    expect(complianceScoreLabel(60)).toBe('A mejorar')
    expect(complianceScoreLabel(79)).toBe('A mejorar')
  })

  it('≥ 80 es "Bien" (borde 80, incluye la banda gold)', () => {
    expect(complianceScoreTone(80)).toBe('good')
    expect(complianceScoreLabel(80)).toBe('Bien')
    expect(complianceScoreLabel(95)).toBe('Bien')
    expect(complianceScoreLabel(150)).toBe('Bien')
  })

  it('las etiquetas coinciden con el mapa exportado', () => {
    expect(COMPLIANCE_SCORE_LABELS).toEqual({
      good: 'Bien',
      fair: 'A mejorar',
      risk: 'En riesgo',
    })
  })

  it('la etiqueta cambia en los mismos umbrales que el color', () => {
    for (const [below, at] of [
      [59, 60],
      [79, 80],
    ]) {
      expect(complianceScoreColor(below)).not.toBe(complianceScoreColor(at))
      expect(complianceScoreLabel(below)).not.toBe(complianceScoreLabel(at))
    }
  })
})

describe('brand / tinta de texto del score', () => {
  it('sigue las bandas del color (59/60, 79/80, 89/90)', () => {
    expect(complianceScoreTextColor(59)).toBe(BRAND_COLORS.crimson[700])
    expect(complianceScoreTextColor(60)).toBe('#92400e')
    expect(complianceScoreTextColor(79)).toBe('#92400e')
    expect(complianceScoreTextColor(80)).toBe(BRAND_COLORS.emerald[600])
    expect(complianceScoreTextColor(89)).toBe(BRAND_COLORS.emerald[600])
    expect(complianceScoreTextColor(90)).toBe('#835c15')
  })

  it('toda tinta da contraste AA (≥ 4,5:1) sobre blanco', () => {
    for (const score of [0, 59, 60, 79, 80, 89, 90, 100]) {
      expect(contrastRatio(complianceScoreTextColor(score), '#ffffff')).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('brand / severity', () => {
  it('mapea severidad a colores consistentes', () => {
    expect(severityColor('critical')).toBe(SEVERITY_COLORS.critical)
    expect(severityColor('high')).toBe(SEVERITY_COLORS.high)
    expect(severityColor('medium')).toBe(SEVERITY_COLORS.medium)
    expect(severityColor('low')).toBe(SEVERITY_COLORS.low)
    expect(severityColor('success')).toBe(SEVERITY_COLORS.success)
  })

  it('critical usa crimson, success usa emerald', () => {
    expect(SEVERITY_COLORS.critical).toBe(BRAND_COLORS.crimson[600])
    expect(SEVERITY_COLORS.success).toBe(BRAND_COLORS.emerald[600])
  })
})

describe('brand / metadata', () => {
  it('tiene nombre y dominio correctos', () => {
    expect(BRAND.name).toBe('COMPLY360')
    expect(BRAND.domain).toBe('comply360.pe')
    expect(BRAND.supportEmail).toMatch(/@comply360\.pe$/)
  })
})
