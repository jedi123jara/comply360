/**
 * Tests for env-guard.ts — environment variable validation.
 */

import { validateEnvironment, enforceEnvironment, reportEnvironment } from '../env-guard'

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db')
  vi.stubEnv('CLERK_SECRET_KEY', 'sk_live_abc123')
  vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_live_abc123')
  vi.stubEnv('ENCRYPTION_MASTER_KEY', 'a'.repeat(64))
  vi.stubEnv('CRON_SECRET', 'a'.repeat(32))
  vi.stubEnv('NODE_ENV', 'development')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('validateEnvironment', () => {
  it('returns valid when all required vars are set', () => {
    const result = validateEnvironment()
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns error when DATABASE_URL is missing', () => {
    vi.stubEnv('DATABASE_URL', '')
    const result = validateEnvironment()
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('DATABASE_URL'))).toBe(true)
  })

  it('returns error when CLERK_SECRET_KEY is missing', () => {
    vi.stubEnv('CLERK_SECRET_KEY', '')
    const result = validateEnvironment()
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('CLERK_SECRET_KEY'))).toBe(true)
  })

  it('returns error when CLERK_SECRET_KEY does not start with sk_', () => {
    vi.stubEnv('CLERK_SECRET_KEY', 'pk_wrong_prefix')
    const result = validateEnvironment()
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('CLERK_SECRET_KEY') && e.includes('pattern'))).toBe(true)
  })

  it('returns error when ENCRYPTION_MASTER_KEY is too short', () => {
    vi.stubEnv('ENCRYPTION_MASTER_KEY', 'short')
    const result = validateEnvironment()
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('ENCRYPTION_MASTER_KEY') && e.includes('too short'))).toBe(true)
  })

  it('returns error when CRON_SECRET is missing in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CRON_SECRET', '')
    const result = validateEnvironment()
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('CRON_SECRET'))).toBe(true)
  })

  it('does not return error when CRON_SECRET is missing in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('CRON_SECRET', '')
    const result = validateEnvironment()
    // CRON_SECRET is 'production' required only — should not cause an error in dev
    expect(result.errors.some(e => e.includes('CRON_SECRET'))).toBe(false)
  })

  it('returns error when ENCRYPTION_MASTER_KEY is all zeros in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ENCRYPTION_MASTER_KEY', '0'.repeat(64))
    const result = validateEnvironment()
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('ENCRYPTION_MASTER_KEY') && e.includes('zeros'))).toBe(true)
  })

  it('returns warning when CLERK_SECRET_KEY contains test in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_abc123')
    const result = validateEnvironment()
    expect(result.warnings.some(w => w.includes('CLERK_SECRET_KEY') && w.includes('test'))).toBe(true)
  })

  it('returns warnings (not errors) when optional vars are missing', () => {
    // Ensure optional vars are unset
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('APIS_NET_PE_TOKEN', '')
    vi.stubEnv('SUNAT_CLIENT_ID', '')
    const result = validateEnvironment()
    // Should still be valid
    expect(result.valid).toBe(true)
    // Warnings should mention the optional vars
    expect(result.warnings.some(w => w.includes('RESEND_API_KEY'))).toBe(true)
    expect(result.warnings.some(w => w.includes('APIS_NET_PE_TOKEN'))).toBe(true)
    expect(result.warnings.some(w => w.includes('SUNAT_CLIENT_ID'))).toBe(true)
  })
})

describe('secretos exigidos en producción', () => {
  it('marca los secretos de firma y cifrado que faltan en producción', () => {
    vi.stubEnv('NODE_ENV', 'production')
    for (const key of ['JWT_SECRET', 'MEDICAL_VAULT_KEY', 'IMPORT_TOKEN_SECRET', 'SIGNATURE_JWT_SECRET', 'WEBAUTHN_CHALLENGE_SECRET']) {
      vi.stubEnv(key, '')
    }
    const result = validateEnvironment()
    for (const key of ['JWT_SECRET', 'MEDICAL_VAULT_KEY', 'IMPORT_TOKEN_SECRET', 'SIGNATURE_JWT_SECRET', 'WEBAUTHN_CHALLENGE_SECRET']) {
      expect(result.errors.some(e => e.includes(key)), key).toBe(true)
    }
  })
})

describe('reportEnvironment', () => {
  it('no detiene la app en producción aunque falten variables', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DATABASE_URL', '')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    let result: ReturnType<typeof reportEnvironment> | undefined
    expect(() => { result = reportEnvironment() }).not.toThrow()
    expect(result?.valid).toBe(false)
  })

  it('nunca escribe el valor de un secreto en los logs', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('JWT_SECRET', 'valor-secreto-corto')
    const logs: string[] = []
    vi.spyOn(console, 'error').mockImplementation((...args) => { logs.push(args.join(' ')) })
    vi.spyOn(console, 'warn').mockImplementation((...args) => { logs.push(args.join(' ')) })

    const result = reportEnvironment()
    expect(result.errors.some(e => e.includes('JWT_SECRET'))).toBe(true)
    expect(logs.join('\n')).not.toContain('valor-secreto-corto')
  })
})

describe('enforceEnvironment', () => {
  it('throws in production when there are validation errors', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DATABASE_URL', '') // Missing required var

    expect(() => enforceEnvironment()).toThrow('[ENV-GUARD]')
  })

  it('does NOT throw in development when there are validation errors', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DATABASE_URL', '') // Missing required var

    // Should log a warning but not throw
    expect(() => enforceEnvironment()).not.toThrow()
  })
})
