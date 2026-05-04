/**
 * /api/org-documents/[id]
 *
 * Endpoint genérico para administrar OrgDocument con auto-trigger de
 * notificación a workers (Idea 1, Fase 2).
 *
 * GET   — lee metadata + progress de acuses
 * PATCH — actualiza metadata. Si acknowledgmentRequired=true Y se cambia
 *         contenido relevante (bumpea version), dispara notifyWorkersOfDocUpdate
 *         en background (fire-and-forget).
 *
 * Auth: ADMIN+ de la org del documento.
 *
 * NOTA: para crear OrgDocument se usan endpoints específicos por tipo
 * (compliance-docs/generate, org-templates). Este endpoint es solo para
 * UPDATE — donde está el auto-trigger crítico.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  notifyWorkersOfDocUpdate,
  getAcknowledgmentProgress,
} from '@/lib/documents/acknowledgments'
import { isOrgTemplate } from '@/lib/templates/org-template-engine'

function extractDocId(req: NextRequest): string | null {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const idx = segments.indexOf('org-documents')
  if (idx === -1 || !segments[idx + 1]) return null
  return segments[idx + 1]
}

// ─── GET ────────────────────────────────────────────────────────────────
export const GET = withRole('MEMBER', async (req: NextRequest, ctx: AuthContext) => {
  const documentId = extractDocId(req)
  if (!documentId) return NextResponse.json({ error: 'documentId requerido' }, { status: 400 })

  const doc = await prisma.orgDocument.findFirst({
    where: { id: documentId, orgId: ctx.orgId },
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      fileUrl: true,
      version: true,
      isPublishedToWorkers: true,
      publishedAt: true,
      validUntil: true,
      acknowledgmentRequired: true,
      acknowledgmentDeadlineDays: true,
      scopeFilter: true,
      lastNotifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
  if (isOrgTemplate(doc)) {
    return NextResponse.json({ error: 'Usa /api/org-templates para administrar plantillas' }, { status: 409 })
  }

  // Si requiere ack, incluir progreso (cuántos firmaron)
  let progress = null
  if (doc.acknowledgmentRequired) {
    progress = await getAcknowledgmentProgress(ctx.orgId, documentId)
  }

  return NextResponse.json({ document: doc, progress })
})

// ─── PATCH ──────────────────────────────────────────────────────────────
export const PATCH = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const documentId = extractDocId(req)
  if (!documentId) return NextResponse.json({ error: 'documentId requerido' }, { status: 400 })

  let body: {
    title?: string
    description?: string
    fileUrl?: string
    isPublishedToWorkers?: boolean
    validUntil?: string | null
    acknowledgmentRequired?: boolean
    acknowledgmentDeadlineDays?: number | null
    scopeFilter?: Record<string, unknown> | null
    /** Si true, considera que el contenido cambió → bumpea version → trigger notify. */
    contentChanged?: boolean
    /** Si true, fuerza notify aunque la version no haya cambiado (recordatorio manual). */
    forceNotify?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  // Verificar ownership
  const existing = await prisma.orgDocument.findFirst({
    where: { id: documentId, orgId: ctx.orgId },
    select: { id: true, version: true, acknowledgmentRequired: true, title: true, description: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
  }
  if (isOrgTemplate(existing)) {
    return NextResponse.json({ error: 'Usa /api/org-templates para administrar plantillas' }, { status: 409 })
  }

  // Construir el update
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {}

  if (typeof body.title === 'string') updateData.title = body.title.slice(0, 200)
  if (body.description !== undefined) updateData.description = body.description
  if (body.fileUrl !== undefined) updateData.fileUrl = body.fileUrl
  if (typeof body.isPublishedToWorkers === 'boolean') {
    updateData.isPublishedToWorkers = body.isPublishedToWorkers
    if (body.isPublishedToWorkers && !existing) {
      updateData.publishedAt = new Date()
    }
  }
  if ('validUntil' in body) {
    updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null
  }
  if (typeof body.acknowledgmentRequired === 'boolean') {
    updateData.acknowledgmentRequired = body.acknowledgmentRequired
  }
  if ('acknowledgmentDeadlineDays' in body) {
    updateData.acknowledgmentDeadlineDays = body.acknowledgmentDeadlineDays
  }
  if ('scopeFilter' in body) {
    updateData.scopeFilter = body.scopeFilter ?? null
  }

  // Bump version si el contenido cambió — esto dispara el auto-trigger
  const willBumpVersion = body.contentChanged === true
  if (willBumpVersion) {
    updateData.version = existing.version + 1
  }

  // Aplicar el update
  const updated = await prisma.orgDocument.update({
    where: { id: documentId },
    data: updateData,
    select: {
      id: true,
      title: true,
      version: true,
      acknowledgmentRequired: true,
      isPublishedToWorkers: true,
      updatedAt: true,
    },
  })

  // ─── Auto-trigger de notificación ─────────────────────────────────────
  // Disparar SOLO si:
  //   1. Marcado como requiere ack (después del update — para detectar
  //      el caso "admin acaba de marcar el checkbox por primera vez")
  //   2. Y (versión cambió) O (forceNotify explícito)
  let notifyResult: Awaited<ReturnType<typeof notifyWorkersOfDocUpdate>> | null = null
  const shouldNotify = updated.acknowledgmentRequired && (willBumpVersion || body.forceNotify === true)

  if (shouldNotify) {
    try {
      notifyResult = await notifyWorkersOfDocUpdate({
        orgId: ctx.orgId,
        documentId,
        forceEmail: body.forceNotify === true,
      })
    } catch (err) {
      // El update ya pasó — no rollback. Logueamos pero seguimos OK.
      console.error('[org-document.PATCH] notify failed:', err)
    }
  }

  return NextResponse.json({
    document: updated,
    versionBumped: willBumpVersion,
    notifyResult,
  })
})
