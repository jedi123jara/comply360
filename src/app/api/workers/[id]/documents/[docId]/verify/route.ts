/**
 * POST /api/workers/[id]/documents/[docId]/verify
 *
 * Dispara auto-verificación con IA sobre un documento ya subido. Útil cuando:
 *   - El admin quiere re-correr la verificación (tras corregir datos del worker)
 *   - El auto-trigger al upload falló silenciosamente
 *   - Docs uploaded antes de tener el verifier
 *
 * El verifier (GPT-4o vision) decide entre:
 *   - auto-verified    → marca status=VERIFIED, verifiedBy='ai-v1'
 *   - needs-review     → deja UPLOADED, registra issues en AuditLog
 *   - mismatch / wrong-type / unreadable → deja UPLOADED, flag al admin
 *   - unsupported / error → no toca nada, devuelve razón
 *
 * Acceso: ADMIN+ del org.
 * Plan gate: feature 'review_ia' (PRO+) — auto-verificación es premium.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { planHasFeature } from '@/lib/plan-gate'
import { verifyDocument } from '@/lib/ai/document-verifier'
import { persistVerification } from '@/lib/ai/document-verifier-persist'
import { recalculateLegajoScore } from '@/lib/compliance/legajo-config'
import { generateWorkerAlerts } from '@/lib/alerts/alert-engine'
import { syncComplianceScore } from '@/lib/compliance/sync-score'

export const runtime = 'nodejs'
export const maxDuration = 60

export const POST = withRoleParams<{ id: string; docId: string }>('ADMIN', async (
  _req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  // ── Plan gate ────────────────────────────────────────────────────────────
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { plan: true, planExpiresAt: true },
  })
  if (!org) {
    return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
  }
  let effectivePlan = org.plan
  if (org.planExpiresAt && new Date(org.planExpiresAt) < new Date()) {
    effectivePlan = 'STARTER'
  }
  if (!planHasFeature(effectivePlan, 'review_ia')) {
    return NextResponse.json(
      {
        error: 'La verificación automática requiere el plan PRO.',
        code: 'PLAN_UPGRADE_REQUIRED',
        requiredPlan: 'PRO',
        currentPlan: effectivePlan,
      },
      { status: 403 },
    )
  }

  // ── Fetch worker + doc ───────────────────────────────────────────────────
  const worker = await prisma.worker.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      orgId: true,
      firstName: true,
      lastName: true,
      dni: true,
      birthDate: true,
      position: true,
    },
  })
  if (!worker || worker.orgId !== ctx.orgId) {
    return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  }

  const doc = await prisma.workerDocument.findUnique({
    where: { id: params.docId },
  })
  if (!doc || doc.workerId !== worker.id) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
  }
  if (!doc.fileUrl) {
    return NextResponse.json({ error: 'Documento sin archivo subido' }, { status: 400 })
  }

  // ── Correr verifier ──────────────────────────────────────────────────────
  const result = await verifyDocument(
    {
      fileUrl: doc.fileUrl,
      mimeType: doc.mimeType,
      documentType: doc.documentType,
    },
    {
      firstName: worker.firstName,
      lastName: worker.lastName,
      dni: worker.dni,
      birthDate: worker.birthDate,
      position: worker.position,
    },
  )

  // ── Persistir resultado ──────────────────────────────────────────────────
  await persistVerification(doc.id, worker.id, ctx.userId, ctx.orgId, result)

  // Si auto-verified → recalcular score + alertas
  if (result.decision === 'auto-verified') {
    await recalculateLegajoScore(worker.id).catch(() => null)
    try {
      await generateWorkerAlerts(worker.id)
    } catch (err) {
      console.error('[verify] generateWorkerAlerts', err)
    }
    syncComplianceScore(ctx.orgId).catch(() => {})
  }

  return NextResponse.json({
    data: {
      documentId: doc.id,
      documentType: doc.documentType,
      decision: result.decision,
      confidence: result.confidence,
      summary: result.summary,
      issues: result.issues,
      extracted: result.extracted,
      model: result.model,
    },
  })
})

// `persistVerification` helper vive en `src/lib/ai/document-verifier-persist.ts`
// para ser consumible desde los auto-triggers sin importar de un route module.
