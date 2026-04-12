/**
 * In-memory rate limiter (production should use Redis, but this works for MVP)
 *
 * Features:
 * - Token bucket algorithm
 * - Configurable limits per endpoint
 * - IP-based + orgId-based limiting
 * - Returns headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 * - 429 response with Retry-After header when exceeded
 *
 * Usage in API routes:
 *   import { rateLimit } from '@/lib/rate-limit'
 *   const limiter = rateLimit({ interval: 60_000, limit: 30 })
 *
 *   export async function GET(req) {
 *     const result = await limiter.check(req)
 *     if (!result.success) return result.response // 429 response
 *     // ... normal handler
 *   }
 *
 * Default tiers:
 * - Public endpoints (portal-empleado): 10 req/min per IP
 * - Authenticated endpoints: 60 req/min per orgId
 * - AI endpoints (ai-chat, ai-review): 10 req/min per orgId
 * - Export endpoints: 5 req/min per orgId
 */

import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenBucket {
  tokens: number
  lastRefill: number
}

export interface RateLimitConfig {
  /** Time window in milliseconds for a full token refill */
  interval: number
  /** Maximum number of requests (tokens) allowed per interval */
  limit: number
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Maximum requests allowed in the window */
  limit: number
  /** Remaining requests in the current window */
  remaining: number
  /** Unix timestamp (ms) when the bucket fully refills */
  reset: number
  /** Pre-built 429 NextResponse — only present when success is false */
  response?: NextResponse
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const buckets = new Map<string, TokenBucket>()

// Periodic cleanup of stale buckets every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      // If the bucket has been idle for longer than 2x any reasonable interval,
      // remove it. We use 10 minutes as a safe upper bound.
      if (now - bucket.lastRefill > 10 * 60_000) {
        buckets.delete(key)
      }
    }
  }, 5 * 60_000)
}

// ---------------------------------------------------------------------------
// Token bucket core
// ---------------------------------------------------------------------------

function consumeToken(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  let bucket = buckets.get(key)

  if (!bucket) {
    bucket = { tokens: config.limit, lastRefill: now }
    buckets.set(key, bucket)
  }

  // Refill tokens based on elapsed time (token bucket algorithm)
  const elapsed = now - bucket.lastRefill
  const refillRate = config.limit / config.interval // tokens per ms
  const tokensToAdd = elapsed * refillRate
  bucket.tokens = Math.min(config.limit, bucket.tokens + tokensToAdd)
  bucket.lastRefill = now

  // Calculate reset time (when bucket would be fully refilled from current level)
  const tokensNeededForFull = config.limit - bucket.tokens
  const msUntilFull = tokensNeededForFull / refillRate
  const reset = now + Math.ceil(msUntilFull)

  if (bucket.tokens < 1) {
    // Not enough tokens — rate limited
    const retryAfterSec = Math.ceil((1 - bucket.tokens) / refillRate / 1000)

    const response = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Has excedido el límite de solicitudes. Intenta de nuevo más tarde.',
        retryAfter: retryAfterSec,
      },
      { status: 429 }
    )
    response.headers.set('Retry-After', String(retryAfterSec))
    response.headers.set('X-RateLimit-Limit', String(config.limit))
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('X-RateLimit-Reset', String(reset))

    return { success: false, limit: config.limit, remaining: 0, reset, response }
  }

  // Consume one token
  bucket.tokens -= 1
  const remaining = Math.floor(bucket.tokens)

  return { success: true, limit: config.limit, remaining, reset }
}

// ---------------------------------------------------------------------------
// Key extraction helpers
// ---------------------------------------------------------------------------

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

function getOrgId(req: NextRequest): string | null {
  // Try common patterns used in COMPLY 360 for orgId
  const url = new URL(req.url)
  return (
    url.searchParams.get('orgId') ||
    req.headers.get('x-org-id') ||
    null
  )
}

// ---------------------------------------------------------------------------
// Public API — rateLimit factory
// ---------------------------------------------------------------------------

export function rateLimit(config: RateLimitConfig) {
  return {
    /**
     * Check (and consume) a rate limit token for the given request.
     * The key is automatically derived from IP + orgId when available.
     * Pass an explicit `key` to override.
     */
    async check(
      req: NextRequest,
      explicitKey?: string
    ): Promise<RateLimitResult> {
      const ip = getClientIp(req)
      const orgId = getOrgId(req)
      const key = explicitKey || (orgId ? `org:${orgId}` : `ip:${ip}`)
      return consumeToken(key, config)
    },
  }
}

// ---------------------------------------------------------------------------
// Pre-configured limiters for common COMPLY 360 tiers
// ---------------------------------------------------------------------------

/** Public endpoints (general): 10 req/min per IP */
export const publicLimiter = rateLimit({ interval: 60_000, limit: 10 })

/** Portal empleado: 3 req/min per IP (strict — prevents DNI enumeration) */
export const portalEmpleadoLimiter = rateLimit({ interval: 60_000, limit: 3 })

/** Authenticated endpoints: 60 req/min per orgId */
export const authenticatedLimiter = rateLimit({ interval: 60_000, limit: 60 })

/** AI endpoints (ai-chat, ai-review): 10 req/min per orgId */
export const aiLimiter = rateLimit({ interval: 60_000, limit: 10 })

/** Export endpoints (PDF, DOCX, etc.): 5 req/min per orgId */
export const exportLimiter = rateLimit({ interval: 60_000, limit: 5 })

// ---------------------------------------------------------------------------
// Tiered limiters by role (3-tier access architecture)
// ---------------------------------------------------------------------------

/** Worker portal — 30 req/min per worker (suficiente para uso normal del portal) */
export const workerPortalLimiter = rateLimit({ interval: 60_000, limit: 30 })

/** Org dashboard endpoints — 100 req/min per orgId (uso intensivo de gerentes) */
export const orgDashboardLimiter = rateLimit({ interval: 60_000, limit: 100 })

/** Super-admin endpoints — 500 req/min per super-admin (operaciones globales bulk) */
export const superAdminLimiter = rateLimit({ interval: 60_000, limit: 500 })

/**
 * Pick a limiter based on role.
 * Use after authentication to apply the right tier.
 */
export function limiterForRole(role: string) {
  switch (role) {
    case 'WORKER':
      return workerPortalLimiter
    case 'SUPER_ADMIN':
      return superAdminLimiter
    case 'OWNER':
    case 'ADMIN':
    case 'MEMBER':
    case 'VIEWER':
      return orgDashboardLimiter
    default:
      return authenticatedLimiter
  }
}

// ---------------------------------------------------------------------------
// Helper to attach rate-limit headers to successful responses
// ---------------------------------------------------------------------------

/**
 * Copies rate-limit metadata headers onto an existing NextResponse so clients
 * can see how many requests they have remaining even on 2xx responses.
 */
export function withRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(result.reset))
  return response
}

// ---------------------------------------------------------------------------
// Legacy exports (backward-compatible with previous implementation)
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  public: { maxRequests: 10, windowMs: 60_000 } as { maxRequests: number; windowMs: number },
  authenticated: { maxRequests: 60, windowMs: 60_000 } as { maxRequests: number; windowMs: number },
  ai: { maxRequests: 10, windowMs: 60_000 } as { maxRequests: number; windowMs: number },
  export: { maxRequests: 5, windowMs: 60_000 } as { maxRequests: number; windowMs: number },
}

/**
 * @deprecated Use `rateLimit()` factory + `.check(req)` instead.
 * Kept for backward compatibility with existing code.
 */
export function checkRateLimit(
  key: string,
  config: { maxRequests: number; windowMs: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  const result = consumeToken(key, { interval: config.windowMs, limit: config.maxRequests })
  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  }
}
