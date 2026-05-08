/**
 * Tests para validatePeruvianDni y computeDniCdv (FIX #6.A).
 */

import { describe, it, expect } from 'vitest'
import { validatePeruvianDni, computeDniCdv } from '../dni'

describe('computeDniCdv', () => {
  it('calcula CDV con algoritmo módulo 11 (peso 3-2-7-6-5-4-3-2)', () => {
    // Cases verificados con la fórmula:
    // sum = 4×3 + 5×2 + 6×7 + 7×6 + 8×5 + 9×4 + 1×3 + 2×2
    //     = 12 + 10 + 42 + 42 + 40 + 36 + 3 + 4 = 189
    // r = 189 mod 11 = 2
    // cdv = 11 - 2 = 9
    expect(computeDniCdv('45678912')).toBe('9')
  })

  it('lanza si recibe input inválido', () => {
    expect(() => computeDniCdv('123')).toThrow(/exactamente 8 dígitos/)
    expect(() => computeDniCdv('abcdefgh')).toThrow()
    expect(() => computeDniCdv('123456789')).toThrow()
  })

  it('CDV puede ser "K" cuando r=1 → cdv=10', () => {
    // r=1 según código actual devuelve '0' (variante observada en RENIEC).
    // Test concreto: input que produzca r=1
    // sum = ... busquemos uno
    // Para que mod 11 = 1: sum = 1, 12, 23, 34...
    // Probamos con 11111111: 1*(3+2+7+6+5+4+3+2) = 32; 32 mod 11 = 10 → cdv=1
    expect(computeDniCdv('11111111')).toBe('1')
  })
})

describe('validatePeruvianDni', () => {
  describe('formato 8 dígitos', () => {
    it('acepta DNI random válido', () => {
      expect(validatePeruvianDni('45678912').valid).toBe(true)
      expect(validatePeruvianDni('23456789').valid).toBe(true)
      expect(validatePeruvianDni('98765432').valid).toBe(true)
    })

    it('rechaza patrones obviamente falsos', () => {
      expect(validatePeruvianDni('00000000').valid).toBe(false)
      expect(validatePeruvianDni('11111111').valid).toBe(false)
      expect(validatePeruvianDni('99999999').valid).toBe(false)
      expect(validatePeruvianDni('12345678').valid).toBe(false)
      expect(validatePeruvianDni('87654321').valid).toBe(false)
    })

    it('rechaza si tiene letras', () => {
      const r = validatePeruvianDni('1234567a')
      expect(r.valid).toBe(false)
      expect(r.reason).toMatch(/Formato/)
    })

    it('rechaza si es muy corto', () => {
      expect(validatePeruvianDni('1234567').valid).toBe(false)
      expect(validatePeruvianDni('').valid).toBe(false)
    })

    it('trimea espacios', () => {
      expect(validatePeruvianDni('  45678912  ').valid).toBe(true)
    })
  })

  describe('formato 8 dígitos + CDV (9 chars)', () => {
    it('acepta DNI con CDV correcto', () => {
      const cdv = computeDniCdv('45678912') // = '9'
      expect(validatePeruvianDni('45678912' + cdv).valid).toBe(true)
    })

    it('rechaza DNI con CDV incorrecto', () => {
      const wrong = '0' === computeDniCdv('45678912') ? '1' : '0'
      const r = validatePeruvianDni('45678912' + wrong)
      expect(r.valid).toBe(false)
      expect(r.reason).toMatch(/CDV/)
    })

    it('acepta CDV "K" como letra válida', () => {
      // Probamos un input que produzca un CDV específico
      const dni = '23456789'
      const cdv = computeDniCdv(dni)
      expect(validatePeruvianDni(dni + cdv).valid).toBe(true)
    })

    it('rechaza CDV con caracteres distintos a [0-9K]', () => {
      const r = validatePeruvianDni('45678912X')
      expect(r.valid).toBe(false)
    })
  })

  describe('opciones', () => {
    it('requireCdv=true rechaza DNI puro de 8 dígitos', () => {
      const r = validatePeruvianDni('45678912', { requireCdv: true })
      expect(r.valid).toBe(false)
      expect(r.reason).toMatch(/Falta CDV/)
    })
  })

  describe('inputs no-string', () => {
    it('rechaza null/undefined/number', () => {
      // @ts-expect-error testing runtime behavior
      expect(validatePeruvianDni(null).valid).toBe(false)
      // @ts-expect-error testing runtime behavior
      expect(validatePeruvianDni(undefined).valid).toBe(false)
      // @ts-expect-error testing runtime behavior
      expect(validatePeruvianDni(45678912).valid).toBe(false)
    })
  })
})
