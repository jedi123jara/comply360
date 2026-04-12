/**
 * Server-side reCAPTCHA v3 verification for COMPLY 360.
 *
 * Uses the Google reCAPTCHA verify API to validate tokens submitted by the
 * client. Returns both the verification status and the risk score (0.0–1.0).
 *
 * Environment variable: RECAPTCHA_SECRET_KEY
 *   - If not set, the function gracefully returns success=true with score=1.0
 *     so development environments work without a key.
 *
 * Usage:
 *   import { verifyRecaptcha } from '@/lib/recaptcha'
 *
 *   const { success, score } = await verifyRecaptcha(token)
 *   if (!success) return NextResponse.json({ error: 'Bot detected' }, { status: 403 })
 */

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

/** Default minimum score to consider a request legitimate (0.0–1.0) */
const DEFAULT_SCORE_THRESHOLD = 0.5

export interface RecaptchaResult {
  /** Whether the token is valid AND the score meets the threshold */
  success: boolean
  /** Risk score returned by Google (1.0 = very likely human, 0.0 = very likely bot) */
  score: number
  /** The action name submitted with the token, if any */
  action?: string
  /** Raw error codes from Google, if any */
  errorCodes?: string[]
}

interface GoogleRecaptchaResponse {
  success: boolean
  score?: number
  action?: string
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
}

/**
 * Verify a reCAPTCHA v3 token server-side.
 *
 * @param token       - The reCAPTCHA token from the client
 * @param options     - Optional overrides
 * @param options.threshold   - Minimum acceptable score (default 0.5)
 * @param options.expectedAction - If provided, verification fails when the
 *                                 action in the token doesn't match
 */
export async function verifyRecaptcha(
  token: string,
  options?: {
    threshold?: number
    expectedAction?: string
  }
): Promise<RecaptchaResult> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY

  // Dev mode: if no secret key is configured, skip verification
  if (!secretKey) {
    console.warn(
      '[recaptcha] RECAPTCHA_SECRET_KEY not set — bypassing verification (dev mode)'
    )
    return { success: true, score: 1.0 }
  }

  // Guard against empty tokens
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return { success: false, score: 0, errorCodes: ['missing-input-response'] }
  }

  const threshold = options?.threshold ?? DEFAULT_SCORE_THRESHOLD

  try {
    const body = new URLSearchParams({
      secret: secretKey,
      response: token,
    })

    const res = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!res.ok) {
      console.error(`[recaptcha] Google API returned HTTP ${res.status}`)
      return { success: false, score: 0, errorCodes: [`http-${res.status}`] }
    }

    const data: GoogleRecaptchaResponse = await res.json()

    const score = data.score ?? 0

    // Check basic verification
    if (!data.success) {
      return {
        success: false,
        score,
        action: data.action,
        errorCodes: data['error-codes'],
      }
    }

    // Check score threshold
    if (score < threshold) {
      return {
        success: false,
        score,
        action: data.action,
        errorCodes: ['score-below-threshold'],
      }
    }

    // Check expected action if specified
    if (options?.expectedAction && data.action !== options.expectedAction) {
      return {
        success: false,
        score,
        action: data.action,
        errorCodes: ['action-mismatch'],
      }
    }

    return {
      success: true,
      score,
      action: data.action,
    }
  } catch (error) {
    console.error('[recaptcha] Verification failed:', error)
    return { success: false, score: 0, errorCodes: ['network-error'] }
  }
}
