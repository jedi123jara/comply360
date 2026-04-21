/**
 * Helper compartido para persistir resultados del `document-verifier`.
 *
 * Se movió acá desde `api/workers/[id]/documents/[docId]/verify/route.ts`
 * porque tanto el endpoint manual como los auto-triggers (admin + worker uploads)
 * necesitan consumirla, y importar de un `route.ts` de Next 16 genera chunks
 * ambiguos. La fuente de verdad es un lib aparte.
 */

import { prisma } from '@/lib/prisma'
import type { VerificationResult } from './document-verifier'

/**
 * Persiste el resultado de `verifyDocument()`.
 *
 * - Si `result.decision === 'auto-verified'` → marca el doc `status=VERIFIED`
 *   con `verifiedBy='ai-v1'` (sentinel que distingue IA vs humano)
 * - Siempre escribe un `AuditLog` con la metadata completa de la verificación,
 *   consumible por la UI (`GET /api/workers/:id/documents` hace el join)
 *
 * Nunca lanza — los errores se logean a console y se continúa.
 */
export async function persistVerification(
  documentId: string,
  workerId: string,
  userId: string | undefined,
  orgId: string,
  result: VerificationResult,
): Promise<void> {
  // Marcar el doc como VERIFIED solo si la IA decidió auto-verified
  if (result.decision === 'auto-verified') {
    try {
      await prisma.workerDocument.update({
        where: { id: documentId },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedBy: 'ai-v1',
        },
      })
    } catch (err) {
      console.error('[persistVerification] update doc failed', err)
    }
  }

  // AuditLog con toda la metadata para que UI la pueda mostrar
  try {
    await prisma.auditLog.create({
      data: {
        orgId,
        userId,
        action:
          result.decision === 'auto-verified'
            ? 'document.ai_verified'
            : 'document.ai_reviewed',
        entityType: 'WorkerDocument',
        entityId: documentId,
        metadataJson: {
          workerId,
          decision: result.decision,
          confidence: result.confidence,
          summary: result.summary,
          issues: result.issues,
          extracted: result.extracted,
          model: result.model,
          errorMessage: result.errorMessage ?? null,
        },
      },
    })
  } catch (err) {
    console.error('[persistVerification] audit log failed', err)
  }
}
