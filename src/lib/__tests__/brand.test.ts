import { describe, it, expect } from 'vitest'
import {
  complianceScoreColor,
  severityColor,
  BRAND_COLORS,
  SEVERITY_COLORS,
  BRAND,
} from '@/lib/brand'

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
