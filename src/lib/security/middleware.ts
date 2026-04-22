/**
 * Enterprise Security Middleware
 *
 * Provides:
 * - IP-based brute-force detection with exponential backoff
 * - Suspicious pattern detection (rapid requests, parameter fuzzing)
 * - Automatic temporary IP blocking after threshold
 * - Security event logging for audit trail
 * - Request fingerprinting for anomaly detection
 */

// ── IP Tracking ─────────────────────────────────────────────────────────

interface IpRecord {
  failures: number
  firstFailure: number
  lastFailure: number
  blockedUntil: number | null
  totalRequests: number
  lastRequest: number
}

// In development, be much more permissive (hot-reload causes rapid requests)
const isDev = process.env.NODE_ENV === 'development'

const ipRecords = new Map<string, IpRecord>()
const BLOCK_THRESHOLDS = isDev ? [
  { failures: 100, blockMinutes: 1 },  // Dev: very permissive
] : [
  { failures: 5, blockMinutes: 1 },    // 5 failures → 1 min block
  { failures: 10, blockMinutes: 5 },   // 10 failures → 5 min block
  { failures: 20, blockMinutes: 30 },  // 20 failures → 30 min block
  { failures: 50, blockMinutes: 1440 },// 50 failures → 24 hour block
]

// NOTE: The true rate-limit enforcement lives in rate-limit.ts (token bucket
// per endpoint). This MAX_REQUESTS_PER_SECOND only exists as a very coarse
// DoS shield — it must stay well above normal SPA fan-out (a dashboard page
// can easily fire 20+ parallel requests on hydration).
const MAX_REQUESTS_PER_SECOND = isDev ? 200 : 150
const RECORD_CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Clean up old records periodically
let lastCleanup = Date.now()
function cleanupRecords() {
  const now = Date.now()
  if (now - lastCleanup < RECORD_CLEANUP_INTERVAL) return
  lastCleanup = now
  const expiry = now - 60 * 60 * 1000 // 1 hour
  for (const [ip, record] of ipRecords) {
    if (record.lastRequest < expiry && (!record.blockedUntil || record.blockedUntil < now)) {
      ipRecords.delete(ip)
    }
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

/**
 * Check if an IP is currently blocked.
 * Returns null if OK, or an error message if blocked.
 */
export function checkIpBlock(ip: string): string | null {
  cleanupRecords()
  const record = ipRecords.get(ip)
  if (!record) return null

  // Check if blocked
  if (record.blockedUntil && Date.now() < record.blockedUntil) {
    const remainingMinutes = Math.ceil((record.blockedUntil - Date.now()) / 60000)
    return `IP temporalmente bloqueada. Intente en ${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''}.`
  }

  // Check DoS (too many requests per second)
  const timeSinceLastRequest = Date.now() - record.lastRequest
  if (timeSinceLastRequest < 1000 / MAX_REQUESTS_PER_SECOND) {
    return 'Demasiadas solicitudes. Reduzca la velocidad.'
  }

  return null
}

/**
 * Record a failed authentication attempt for an IP.
 */
export function recordAuthFailure(ip: string): void {
  const now = Date.now()
  const record = ipRecords.get(ip) || {
    failures: 0,
    firstFailure: now,
    lastFailure: now,
    blockedUntil: null,
    totalRequests: 0,
    lastRequest: now,
  }

  record.failures++
  record.lastFailure = now

  // Apply block based on failure count
  for (const threshold of BLOCK_THRESHOLDS) {
    if (record.failures >= threshold.failures) {
      record.blockedUntil = now + threshold.blockMinutes * 60 * 1000
    }
  }

  ipRecords.set(ip, record)
}

/**
 * Record a successful request (resets failure counter).
 */
export function recordSuccess(ip: string): void {
  const record = ipRecords.get(ip)
  if (record) {
    record.failures = 0
    record.blockedUntil = null
    record.lastRequest = Date.now()
    record.totalRequests++
  }
}

/**
 * Track a request from an IP (for rate/DoS monitoring).
 */
export function trackRequest(ip: string): void {
  const now = Date.now()
  const record = ipRecords.get(ip)
  if (record) {
    record.totalRequests++
    record.lastRequest = now
  } else {
    ipRecords.set(ip, {
      failures: 0,
      firstFailure: 0,
      lastFailure: 0,
      blockedUntil: null,
      totalRequests: 1,
      lastRequest: now,
    })
  }
}

// ── Security Event Logger ───────────────────────────────────────────────

export type SecurityEventType =
  | 'AUTH_FAILURE'
  | 'AUTH_SUCCESS'
  | 'BRUTE_FORCE_DETECTED'
  | 'IP_BLOCKED'
  | 'CREDENTIAL_ACCESS'
  | 'CREDENTIAL_CHANGE'
  | 'SUSPICIOUS_INPUT'
  | 'RATE_LIMIT_HIT'
  | 'IDOR_ATTEMPT'
  | 'PRIVILEGE_ESCALATION'

interface SecurityEvent {
  type: SecurityEventType
  ip: string
  userId?: string
  orgId?: string
  path?: string
  detail?: string
  timestamp: string
}

// In-memory buffer — in production, flush to DB or external SIEM
const securityEvents: SecurityEvent[] = []
const MAX_EVENTS = 10000

export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  const entry: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  }
  securityEvents.push(entry)
  if (securityEvents.length > MAX_EVENTS) {
    securityEvents.splice(0, securityEvents.length - MAX_EVENTS)
  }

  // Console log for server monitoring
  const level = ['AUTH_FAILURE', 'BRUTE_FORCE_DETECTED', 'IP_BLOCKED', 'IDOR_ATTEMPT', 'PRIVILEGE_ESCALATION']
    .includes(event.type) ? 'warn' : 'info'
  console[level](`[SECURITY] ${event.type} | IP: ${event.ip} | ${event.detail || ''}`)
}

/**
 * Get recent security events (for admin dashboard).
 */
export function getRecentSecurityEvents(limit = 100): SecurityEvent[] {
  return securityEvents.slice(-limit).reverse()
}

// ── Input Sanitization ──────────────────────────────────────────────────

/**
 * Detect potentially malicious input patterns.
 */
export function detectSuspiciousInput(input: string): string | null {
  if (!input || typeof input !== 'string') return null

  // SQL injection patterns
  if (/('|"|;|--|\b(OR|AND|UNION|SELECT|INSERT|DELETE|DROP|UPDATE|ALTER)\b)/i.test(input)) {
    return 'SQL injection pattern detected'
  }

  // XSS patterns
  if (/<script|javascript:|on\w+\s*=/i.test(input)) {
    return 'XSS pattern detected'
  }

  // Path traversal
  if (/\.\.[\/\\]/.test(input)) {
    return 'Path traversal pattern detected'
  }

  // Shell injection
  if (/[`$(){}|;&]/.test(input) && input.length > 50) {
    return 'Shell injection pattern detected'
  }

  return null
}

// ── Blocked IPs Report ──────────────────────────────────────────────────

export function getBlockedIps(): { ip: string; blockedUntil: string; failures: number }[] {
  const now = Date.now()
  const blocked: { ip: string; blockedUntil: string; failures: number }[] = []
  for (const [ip, record] of ipRecords) {
    if (record.blockedUntil && record.blockedUntil > now) {
      blocked.push({
        ip,
        blockedUntil: new Date(record.blockedUntil).toISOString(),
        failures: record.failures,
      })
    }
  }
  return blocked
}
