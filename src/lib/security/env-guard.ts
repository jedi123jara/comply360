/**
 * Environment Variable Guard
 *
 * Validates that all required environment variables are set before the
 * application accepts traffic. Prevents deployment with missing secrets.
 *
 * Usage: Called once during app startup (e.g., in instrumentation.ts or layout.tsx)
 */

interface EnvRequirement {
  key: string
  required: 'always' | 'production' | 'optional'
  description: string
  pattern?: RegExp
  minLength?: number
}

const ENV_REQUIREMENTS: EnvRequirement[] = [
  // Database
  { key: 'DATABASE_URL', required: 'always', description: 'PostgreSQL connection string', minLength: 20 },

  // Authentication
  { key: 'CLERK_SECRET_KEY', required: 'always', description: 'Clerk secret key', pattern: /^sk_/ },
  { key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', required: 'always', description: 'Clerk publishable key', pattern: /^pk_/ },

  // Encryption
  { key: 'ENCRYPTION_MASTER_KEY', required: 'always', description: 'AES-256-GCM master key for credential encryption', minLength: 64 },

  // Production-only requirements
  { key: 'CRON_SECRET', required: 'production', description: 'Secret for cron job authentication', minLength: 16 },

  // Optional but recommended
  { key: 'RESEND_API_KEY', required: 'optional', description: 'Resend API key for email delivery' },
  { key: 'APIS_NET_PE_TOKEN', required: 'optional', description: 'apis.net.pe token for RUC/DNI validation' },
  { key: 'SUNAT_CLIENT_ID', required: 'optional', description: 'SUNAT API client ID for SOL integration' },
]

export interface EnvValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateEnvironment(): EnvValidationResult {
  const isProd = process.env.NODE_ENV === 'production'
  const errors: string[] = []
  const warnings: string[] = []

  for (const req of ENV_REQUIREMENTS) {
    const value = process.env[req.key]
    const isRequired = req.required === 'always' || (req.required === 'production' && isProd)

    if (!value) {
      if (isRequired) {
        errors.push(`MISSING: ${req.key} — ${req.description}`)
      } else if (req.required === 'optional') {
        warnings.push(`OPTIONAL: ${req.key} not set — ${req.description}`)
      }
      continue
    }

    // Validate pattern
    if (req.pattern && !req.pattern.test(value)) {
      errors.push(`INVALID: ${req.key} does not match expected pattern`)
    }

    // Validate minimum length
    if (req.minLength && value.length < req.minLength) {
      errors.push(`WEAK: ${req.key} is too short (min ${req.minLength} chars)`)
    }
  }

  // Additional security checks
  if (isProd) {
    if (process.env.NODE_ENV !== 'production') {
      errors.push('NODE_ENV must be "production" in production deployment')
    }

    // Check encryption key isn't all zeros
    const encKey = process.env.ENCRYPTION_MASTER_KEY
    if (encKey && /^0+$/.test(encKey)) {
      errors.push('ENCRYPTION_MASTER_KEY cannot be all zeros — generate a real key')
    }

    // Warn about test keys in production
    const clerkKey = process.env.CLERK_SECRET_KEY || ''
    if (clerkKey.includes('test')) {
      warnings.push('CLERK_SECRET_KEY appears to be a test key — use production key')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Run validation and throw if critical requirements are missing.
 * Call once during application startup.
 */
export function enforceEnvironment(): void {
  const result = validateEnvironment()

  if (result.warnings.length > 0) {
    console.warn('[ENV-GUARD] Warnings:')
    result.warnings.forEach(w => console.warn(`  ⚠️  ${w}`))
  }

  if (!result.valid) {
    console.error('[ENV-GUARD] CRITICAL — Environment validation FAILED:')
    result.errors.forEach(e => console.error(`  ❌  ${e}`))

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `[ENV-GUARD] Cannot start in production with ${result.errors.length} missing/invalid environment variables. ` +
        'Fix the issues above and restart.'
      )
    } else {
      console.warn('[ENV-GUARD] Continuing in development mode despite validation errors.')
    }
  } else {
    console.info('[ENV-GUARD] ✅ All environment variables validated successfully.')
  }
}
