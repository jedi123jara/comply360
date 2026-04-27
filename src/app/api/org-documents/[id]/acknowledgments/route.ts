/**
 * GET /api/org-documents/:id/acknowledgments
 *
 * Admin view: lista de TODOS los workers que deben firmar un doc + estado.
 *
 * Útil para drill-down "67 firmados / 18 pendientes / 2 rebotados":
 *   - signed: array de workers con timestamp, método, IP
 *   - pending: array de workers que aún no firman, con días desde notificación
 *   - notApplicable: workers excluidos por scopeFilter
 *
 * Auth: Admin+ de la org del documento.
 *
 * POST /api/org-documents/:id/acknowledgments/remind
 *
 * Trigger bulk: re-envía notificación SOLO a los pendientes.
 * Body: { workerIds?: string[] } — si vacío, manda a todos los pendientes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveTargetedWorkers } from '@/lib/documents/acknowledgments'

function extractDocId(req: NextRequest): string | null {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const idx = segments.indexOf('org-documents')
  if (idx === -1 || !segments[idx + 1]) return null
  return segments[idx + 1]
}

interface ScopeFilter {
  regimen?: string[]
  departamento?: string[]
  position?: string[]
}

export const GET = withRole('MEMBER', async (req: NextRequest, ctx: AuthContext) => {
  const documentId = extractDocId(req)
  if (!documentId) return NextResponse.json({ error: 'documentId requerido' }, { status: 400 })

  const doc = await prisma.orgDocument.findFirst({
    where: { id: documentId, orgId: ctx.orgId },
    select: {
      id: true,
      title: true,
      version: true,
      acknowledgmentRequired: true,
      lastNotifiedAt: true,
      scopeFilter: true,
    },
  })
  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  // Workers en scope
  const targets = await resolveTargetedWorkers(ctx.orgId, (doc.scopeFilter as ScopeFilter | null) ?? null)

  // Acks de la versión actual
  const acks = await prisma.documentAcknowledgment.findMany({
    where: {
      orgId: ctx.orgId,
      documentId,
      documentVersion: doc.version,
    },
    select: {
      workerId: true,
      acknowledgedAt: true,
      signatureMethod: true,
      ip: true,
      scrolledToEnd: true,
      readingTimeMs: true,
    },
  })
  const ackByWorker = new Map(acks.map((a) => [a.workerId, a]))

  // Mezclar: cada worker target con su estado de firma
  const now = Date.now()
  const lastNotifiedMs = doc.lastNotifiedAt ? new Date(doc.lastNotifiedAt).getTime() : null
  const items = targets.map((w) => {
    const ack = ackByWorker.get(w.id)
    const daysSinceNotif = lastNotifiedMs
      ? Math.floor((now - lastNotifiedMs) / (1000 * 60 * 60 * 24))
      : null
    return {
      workerId: w.id,
      firstName: w.firstName,
      lastName: w.lastName,
      email: w.email,
      regimenLaboral: w.regimenLaboral,
      department: w.department,
      position: w.position,
      status: ack ? 'signed' : 'pending',
      acknowledgedAt: ack?.acknowledgedAt?.toISOString() ?? null,
      signatureMethod: ack?.signatureMethod ?? null,
      ip: ack?.ip ?? null,
      scrolledToEnd: ack?.scrolledToEnd ?? null,
      readingTimeMs: ack?.readingTimeMs ?? null,
      daysSinceNotif,
    }
  })

  const signed = items.filter((i) => i.status === 'signed')
  const pending = items.filter((i) => i.status === 'pending')

  return NextResponse.json({
    docId: doc.id,
    docTitle: doc.title,
    docVersion: doc.version,
    lastNotifiedAt: doc.lastNotifiedAt?.toISOString() ?? null,
    summary: {
      total: items.length,
      signed: signed.length,
      pending: pending.length,
      signedPct: items.length > 0 ? Math.round((signed.length / items.length) * 100) : 0,
    },
    items,
  })
})
