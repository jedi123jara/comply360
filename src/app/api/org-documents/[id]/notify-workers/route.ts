/**
 * POST /api/org-documents/:id/notify-workers
 *
 * Trigger manual del admin para notificar a los workers que un documento
 * fue actualizado y requiere firma de acuse.
 *
 * Auth: Admin+ de la org del documento.
 *
 * Body opcional: { force: boolean } — si true, salta el throttle de 7 días.
 *   Útil para "Recordar a todos los pendientes" después de varios días.
 *
 * Comportamiento:
 *   - Resuelve workers en scope (resolveTargetedWorkers)
 *   - Envía email + push (push viene en Fase 4)
 *   - Si throttled (envió email hace <7 días), saltea email pero igual
 *     actualiza el banner del worker
 *   - AuditLog para trazabilidad
 *
 * Response: { targetsCount, emailsSent, throttled }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { notifyWorkersOfDocUpdate } from '@/lib/documents/acknowledgments'

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  // Extraer documentId del path
  const url = new URL(req.url)
  const segments = url.pathname.split('/')
  const documentId = segments[segments.indexOf('org-documents') + 1]
  if (!documentId) {
    return NextResponse.json({ error: 'documentId requerido' }, { status: 400 })
  }

  // Body opcional
  let body: { force?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    // OK — body opcional
  }

  // Verificar que el doc pertenezca a la org y requiera ack
  const doc = await prisma.orgDocument.findFirst({
    where: { id: documentId, orgId: ctx.orgId },
    select: { id: true, acknowledgmentRequired: true, title: true },
  })
  if (!doc) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
  }
  if (!doc.acknowledgmentRequired) {
    return NextResponse.json(
      {
        error: 'Este documento no requiere acuse de recibo. Edítalo y marca la opción primero.',
        code: 'ACK_NOT_REQUIRED',
      },
      { status: 400 },
    )
  }

  try {
    const result = await notifyWorkersOfDocUpdate({
      orgId: ctx.orgId,
      documentId,
      forceEmail: body.force === true,
    })

    return NextResponse.json({
      success: true,
      docTitle: doc.title,
      ...result,
    })
  } catch (err) {
    console.error('[notify-workers] Error:', err)
    return NextResponse.json(
      {
        error: 'No pudimos notificar a los trabajadores. Inténtalo de nuevo.',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    )
  }
})
