/**
 * Tests for Enterprise Security Middleware
 *
 * NOTE: BLOCK_THRESHOLDS and isDev are captured at module-load time from
 * process.env.NODE_ENV. Tests that assert production block behaviour use
 * vi.resetModules() + dynamic import so the module re-evaluates with the
 * correct NODE_ENV value. Tests that don't depend on thresholds (getClientIp,
 * detectSuspiciousInput, event logging) use a top-level static import.
 */

import {
  getClientIp,
  detectSuspiciousInput,
  logSecurityEvent,
  getRecentSecurityEvents,
} from '@/lib/security/middleware'

// ── Helper ──────────────────────────────────────────────────────────────

/** Build a minimal Request with the given headers. */
function fakeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/', {
    headers: new Headers(headers),
  })
}

/** Unique IP per test to avoid ipRecords cross-contamination. */
let ipCounter = 0
function uniqueIp(): string {
  return `10.0.0.${++ipCounter}`
}

// ── getClientIp ─────────────────────────────────────────────────────────

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = fakeRequest({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' })
    expect(getClientIp(req)).toBe('203.0.113.5')
  })

  it('extracts IP from x-real-ip as fallback', () => {
    const req = fakeRequest({ 'x-real-ip': '198.51.100.7' })
    expect(getClientIp(req)).toBe('198.51.100.7')
  })

  it('returns "unknown" when no IP headers are present', () => {
    const req = fakeRequest()
    expect(getClientIp(req)).toBe('unknown')
  })
})

// ── checkIpBlock + recordAuthFailure + recordSuccess (production thresholds)
//    These tests need the module loaded with NODE_ENV=production so the
//    threshold is 5 failures (not 100 in dev).

describe('IP blocking (production thresholds)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DISABLE_RATE_LIMIT', '')
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  async function loadModule() {
    const mod = await import('@/lib/security/middleware')
    return mod
  }

  it('checkIpBlock returns null for an unknown IP', async () => {
    const mod = await loadModule()
    const ip = uniqueIp()
    expect(mod.checkIpBlock(ip)).toBeNull()
  })

  it('blocks an IP after 5 auth failures', async () => {
    const mod = await loadModule()
    const ip = uniqueIp()

    for (let i = 0; i < 5; i++) {
      mod.recordAuthFailure(ip)
    }

    const result = mod.checkIpBlock(ip)
    expect(result).not.toBeNull()
    expect(result).toContain('bloqueada')
  })

  it('recordSuccess resets the failure counter and unblocks', async () => {
    const mod = await loadModule()
    const ip = uniqueIp()

    // Accumulate failures to trigger a block
    for (let i = 0; i < 5; i++) {
      mod.recordAuthFailure(ip)
    }
    const blocked = mod.checkIpBlock(ip)
    expect(blocked).not.toBeNull()
    expect(blocked).toContain('bloqueada')

    // Success should clear the auth-failure block.
    mod.recordSuccess(ip)

    // Wait a tick so the DoS rate-limiter (requests-per-second) doesn't
    // trip on the back-to-back calls within the same millisecond.
    await new Promise((r) => setTimeout(r, 15))

    expect(mod.checkIpBlock(ip)).toBeNull()
  })
})

// ── DISABLE_RATE_LIMIT bypass ───────────────────────────────────────────
//    DISABLE_RATE_LIMIT is read at runtime (process.env), so stubEnv works
//    even without resetting modules.

describe('DISABLE_RATE_LIMIT escape hatch', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DISABLE_RATE_LIMIT', '1')
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('checkIpBlock always returns null when DISABLE_RATE_LIMIT=1', async () => {
    const mod = await import('@/lib/security/middleware')
    const ip = uniqueIp()

    // Even with many failures, the escape hatch skips enforcement
    for (let i = 0; i < 10; i++) {
      mod.recordAuthFailure(ip)
    }

    expect(mod.checkIpBlock(ip)).toBeNull()
  })
})

// ── detectSuspiciousInput ───────────────────────────────────────────────

describe('detectSuspiciousInput', () => {
  it('detects SQL injection patterns', () => {
    const result = detectSuspiciousInput("' OR 1=1 --")
    expect(result).toBe('SQL injection pattern detected')
  })

  it('detects XSS patterns', () => {
    const result = detectSuspiciousInput('<script>alert(1)</script>')
    expect(result).toBe('XSS pattern detected')
  })

  it('detects path traversal patterns', () => {
    const result = detectSuspiciousInput('../../etc/passwd')
    expect(result).toBe('Path traversal pattern detected')
  })

  it('returns null for normal input', () => {
    const result = detectSuspiciousInput('Juan Perez Garcia')
    expect(result).toBeNull()
  })
})

// ── Security event logging ──────────────────────────────────────────────

describe('security event logging', () => {
  it('logSecurityEvent adds events that getRecentSecurityEvents returns', () => {
    const detail = `test-event-${Date.now()}`
    logSecurityEvent({
      type: 'AUTH_FAILURE',
      ip: '127.0.0.1',
      detail,
    })

    const events = getRecentSecurityEvents()
    const found = events.find((e) => e.detail === detail)
    expect(found).toBeDefined()
    expect(found!.type).toBe('AUTH_FAILURE')
    expect(found!.ip).toBe('127.0.0.1')
    expect(found!.timestamp).toBeTruthy()
  })

  it('getRecentSecurityEvents returns events in reverse chronological order', () => {
    const tag = `order-${Date.now()}`
    logSecurityEvent({ type: 'AUTH_SUCCESS', ip: '1.1.1.1', detail: `${tag}-first` })
    logSecurityEvent({ type: 'AUTH_SUCCESS', ip: '1.1.1.1', detail: `${tag}-second` })

    const events = getRecentSecurityEvents()
    const filtered = events.filter((e) => e.detail?.startsWith(tag))

    expect(filtered.length).toBeGreaterThanOrEqual(2)
    // Most recent first
    expect(filtered[0].detail).toBe(`${tag}-second`)
    expect(filtered[1].detail).toBe(`${tag}-first`)
  })
})
