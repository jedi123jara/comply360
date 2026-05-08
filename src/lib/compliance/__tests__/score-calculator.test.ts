/**
 * Tests para score-calculator.ts
 *
 * Función `calculateComplianceScore` es async + Prisma-heavy → cubierta
 * por tests de integración (Ola 8.B). Acá probamos los helpers puros.
 */

import { describe, it, expect } from 'vitest'
import { getMultaMultiplierByRegimen } from '../score-calculator'

describe('getMultaMultiplierByRegimen', () => {
  describe('regimen explícito', () => {
    it('MYPE_MICRO devuelve 0.10', () => {
      expect(getMultaMultiplierByRegimen('MYPE_MICRO', 50)).toBe(0.10)
      // Funciona case-insensitive
      expect(getMultaMultiplierByRegimen('mype_micro', 5)).toBe(0.10)
    })

    it('MYPE_PEQUENA devuelve 0.30', () => {
      expect(getMultaMultiplierByRegimen('MYPE_PEQUENA', 50)).toBe(0.30)
      expect(getMultaMultiplierByRegimen('mype_pequena', 50)).toBe(0.30)
    })

    it('GENERAL devuelve 1.00 (referencia base)', () => {
      expect(getMultaMultiplierByRegimen('GENERAL', 200)).toBe(1.00)
      expect(getMultaMultiplierByRegimen('general', 5)).toBe(1.00)
    })

    it('AGRARIO devuelve 1.00 (régimen general no-MYPE)', () => {
      expect(getMultaMultiplierByRegimen('AGRARIO', 100)).toBe(1.00)
    })
  })

  describe('regimen no provisto — usa tamaño', () => {
    it('1-10 trabajadores → 0.10 (proxy MYPE micro)', () => {
      expect(getMultaMultiplierByRegimen(null, 5)).toBe(0.10)
      expect(getMultaMultiplierByRegimen(null, 10)).toBe(0.10)
      expect(getMultaMultiplierByRegimen(undefined, 1)).toBe(0.10)
      expect(getMultaMultiplierByRegimen('', 7)).toBe(0.10)
    })

    it('11-100 trabajadores → 0.30 (proxy MYPE pequeña)', () => {
      expect(getMultaMultiplierByRegimen(null, 11)).toBe(0.30)
      expect(getMultaMultiplierByRegimen(null, 50)).toBe(0.30)
      expect(getMultaMultiplierByRegimen(null, 100)).toBe(0.30)
    })

    it('100+ trabajadores → 1.00 (proxy general)', () => {
      expect(getMultaMultiplierByRegimen(null, 101)).toBe(1.00)
      expect(getMultaMultiplierByRegimen(null, 500)).toBe(1.00)
    })
  })
})
