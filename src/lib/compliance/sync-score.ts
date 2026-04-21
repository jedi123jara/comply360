import { calculateComplianceScore } from './score-calculator'

/**
 * Fire-and-forget compliance score recalculation.
 *
 * Call this after mutations that affect the score (worker CRUD, document
 * uploads, contract changes, etc.). The caller should NOT await the
 * returned promise — it is intentionally non-blocking so the user-facing
 * request can return immediately.
 *
 * Usage:
 *   void syncComplianceScore(orgId)   // fire and forget
 */
export async function syncComplianceScore(orgId: string): Promise<void> {
  try {
    await calculateComplianceScore(orgId)
  } catch (err) {
    console.warn('[syncComplianceScore] Failed for org', orgId, err)
  }
}
