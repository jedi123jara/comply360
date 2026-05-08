/**
 * Tests para medical-vault.ts — FIX #4.E hard guards.
 *
 * No probamos encrypt/decrypt directamente porque requieren pgcrypto
 * en una DB real (eso queda para tests de integración).
 *
 * Sí probamos los guardrails de getVaultKey() que es la línea de defensa
 * crítica contra deploys mal configurados (Vercel preview/staging sin
 * MEDICAL_VAULT_KEY → caería al dev fallback con clave hardcoded).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ensureMedicalVaultConfigured } from '../medical-vault'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  // Limpiar env entre tests
  delete process.env.MEDICAL_VAULT_KEY
  delete process.env.VERCEL
  delete process.env.VERCEL_ENV
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('medical-vault — getVaultKey hard guards (FIX #4.E)', () => {
  describe('producción', () => {
    it('lanza si NODE_ENV=production sin clave', () => {
      vi.stubEnv('NODE_ENV', 'production')
      expect(() => ensureMedicalVaultConfigured()).toThrow(/MEDICAL_VAULT_KEY/)
    })

    it('lanza si NODE_ENV=production con clave muy corta', () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('MEDICAL_VAULT_KEY', 'short-key')
      expect(() => ensureMedicalVaultConfigured()).toThrow(/≥32 chars/)
    })

    it('NO lanza si NODE_ENV=production con clave válida', () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('MEDICAL_VAULT_KEY', 'a'.repeat(32))
      expect(() => ensureMedicalVaultConfigured()).not.toThrow()
    })
  })

  describe('Vercel preview/production sin variable', () => {
    it('lanza si VERCEL=1 sin clave (preview deploy mal configurado)', () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('VERCEL', '1')
      expect(() => ensureMedicalVaultConfigured()).toThrow(/MEDICAL_VAULT_KEY/)
    })

    it('lanza si VERCEL_ENV=preview sin clave', () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('VERCEL_ENV', 'preview')
      expect(() => ensureMedicalVaultConfigured()).toThrow(/MEDICAL_VAULT_KEY/)
    })

    it('lanza si VERCEL_ENV=production sin clave', () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('VERCEL_ENV', 'production')
      expect(() => ensureMedicalVaultConfigured()).toThrow(/MEDICAL_VAULT_KEY/)
    })

    it('NO lanza si VERCEL_ENV=preview pero hay clave válida', () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('VERCEL_ENV', 'preview')
      vi.stubEnv('MEDICAL_VAULT_KEY', 'b'.repeat(32))
      expect(() => ensureMedicalVaultConfigured()).not.toThrow()
    })
  })

  describe('dev local (sin Vercel)', () => {
    it('NO lanza con NODE_ENV=development y sin clave (usa fallback)', () => {
      vi.stubEnv('NODE_ENV', 'development')
      // Sin VERCEL/VERCEL_ENV
      expect(() => ensureMedicalVaultConfigured()).not.toThrow()
    })

    it('NO lanza en NODE_ENV=test (los tests no tienen DB real)', () => {
      vi.stubEnv('NODE_ENV', 'test')
      expect(() => ensureMedicalVaultConfigured()).not.toThrow()
    })
  })

  describe('NODE_ENV raro', () => {
    it('lanza si NODE_ENV=staging sin clave (no es development|test|production)', () => {
      vi.stubEnv('NODE_ENV', 'staging')
      expect(() => ensureMedicalVaultConfigured()).toThrow(
        /NODE_ENV='staging' no es development\|test\|production|MEDICAL_VAULT_KEY/,
      )
    })
  })
})
