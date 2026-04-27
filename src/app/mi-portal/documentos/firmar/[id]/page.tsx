/**
 * /mi-portal/documentos/firmar/[id]
 *
 * Página de lectura + firma de un OrgDocument por el worker.
 *
 * Server Component: valida que el doc requiera firma, que el worker esté
 * en scope y que la versión sea la actual antes de renderizar.
 *
 * El componente cliente FirmaDocClient hace:
 *   - Render del documento (description o fileUrl)
 *   - Tracker de scroll en tiempo real (debe llegar al final)
 *   - Tracker de tiempo en página (debe ser ≥ 30s)
 *   - Modal de firma con 3 métodos: SIMPLE | OTP_EMAIL | BIOMETRIC (WebAuthn)
 *   - POST /api/mi-portal/acknowledgments con toda la evidencia
 */

import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FirmaDocClient } from './client'

export const dynamic = 'force-dynamic'

export default async function FirmarDocPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/sign-in')
  if (ctx.role !== 'WORKER') redirect('/post-login')

  const { id } = await params

  // Worker entry vinculado
  const worker = await prisma.worker.findFirst({
    where: { userId: ctx.userId, orgId: ctx.orgId, status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true },
  })
  if (!worker) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900">No estás vinculado a una empresa</h1>
        <p className="mt-2 text-slate-600">Necesitas estar en planilla para firmar documentos.</p>
      </div>
    )
  }

  // Doc + verificar que requiere ack
  const doc = await prisma.orgDocument.findFirst({
    where: { id, orgId: ctx.orgId, acknowledgmentRequired: true },
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      fileUrl: true,
      version: true,
      acknowledgmentDeadlineDays: true,
      lastNotifiedAt: true,
      organization: { select: { name: true, razonSocial: true } },
    },
  })
  if (!doc) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Documento no encontrado</h1>
        <p className="mt-2 text-slate-600">
          O bien no existe, o ya no requiere firma. Contacta a tu empresa si crees que es un error.
        </p>
      </div>
    )
  }

  // Verificar si ya firmó esta versión
  const existingAck = await prisma.documentAcknowledgment.findUnique({
    where: {
      workerId_documentId_documentVersion: {
        workerId: worker.id,
        documentId: doc.id,
        documentVersion: doc.version,
      },
    },
    select: { id: true, acknowledgedAt: true, signatureMethod: true },
  })

  return (
    <FirmaDocClient
      doc={{
        id: doc.id,
        type: doc.type,
        title: doc.title,
        description: doc.description ?? '',
        fileUrl: doc.fileUrl,
        version: doc.version,
        deadlineDays: doc.acknowledgmentDeadlineDays,
        lastNotifiedAt: doc.lastNotifiedAt?.toISOString() ?? null,
      }}
      orgName={doc.organization.razonSocial ?? doc.organization.name ?? 'tu empresa'}
      workerName={`${worker.firstName} ${worker.lastName}`}
      alreadySigned={
        existingAck
          ? {
              acknowledgedAt: existingAck.acknowledgedAt.toISOString(),
              signatureMethod: existingAck.signatureMethod,
            }
          : null
      }
    />
  )
}
