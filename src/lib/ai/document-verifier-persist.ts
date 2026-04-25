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
  // Construimos el patch del doc. Reglas:
  //  - auto-verified → marcar VERIFIED + sentinel verifiedBy=ai-v1
  //  - Si la IA extrajo expiresAt válido y el doc no lo tiene seteado →
  //    lo persistimos (alimenta el cron de alertas de vencimiento)
  const docPatch: {
    status?: 'VERIFIED'
    verifiedAt?: Date
    verifiedBy?: string
    expiresAt?: Date
  } = {}

  if (result.decision === 'auto-verified') {
    docPatch.status = 'VERIFIED'
    docPatch.verifiedAt = new Date()
    docPatch.verifiedBy = 'ai-v1'
  }

  // Auto-set expiresAt si la IA lo detectó y el doc no lo tenía ya
  if (result.expiresAt) {
    const parsedExpiry = new Date(`${result.expiresAt}T00:00:00Z`)
    if (!Number.isNaN(parsedExpiry.getTime())) {
      try {
        const current = await prisma.workerDocument.findUnique({
          where: { id: documentId },
          select: { expiresAt: true },
        })
        if (current && !current.expiresAt) {
          docPatch.expiresAt = parsedExpiry
        }
      } catch (err) {
        console.error('[persistVerification] check expiresAt failed', err)
      }
    }
  }

  if (Object.keys(docPatch).length > 0) {
    try {
      await prisma.workerDocument.update({
        where: { id: documentId },
        data: docPatch,
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
          expiresAt: result.expiresAt ?? null,
          expiresAtApplied: docPatch.expiresAt ? true : false,
          suspicionFlags: result.suspicionFlags ?? [],
          suspicionScore: result.suspicionScore ?? 0,
          errorMessage: result.errorMessage ?? null,
        },
      },
    })
  } catch (err) {
    console.error('[persistVerification] audit log failed', err)
  }

  // Anti-fraude: si la IA marcó alta sospecha, crear WorkerAlert para que
  // RRHH lo revise manualmente. Idempotente: si ya hay una alerta abierta
  // del mismo tipo + entityId, no duplicamos.
  const score = result.suspicionScore ?? 0
  if (score >= 0.6) {
    try {
      const existing = await prisma.workerAlert.findFirst({
        where: {
          workerId,
          type: 'DOCUMENTO_SOSPECHOSO',
          resolvedAt: null,
          description: { contains: documentId },
        },
        select: { id: true },
      })
      if (!existing) {
        const flags = (result.suspicionFlags ?? []).slice(0, 3).join(', ')
        const severity = score >= 0.8 ? 'CRITICAL' : 'HIGH'
        await prisma.workerAlert.create({
          data: {
            workerId,
            orgId,
            type: 'DOCUMENTO_SOSPECHOSO',
            severity,
            title: 'Documento con posibles señales de manipulación',
            description:
              `IA detectó suspicion=${score.toFixed(2)} en documento ${documentId}. ` +
              `Flags: ${flags || 'sin detalle'}. Revísalo antes de aceptarlo en el legajo.`,
          },
        })
      }
    } catch (err) {
      console.error('[persistVerification] suspicion alert failed', err)
    }
  }
}
