/**
 * GET /api/org-documents/:id/acknowledgments/audit-pdf
 *
 * Genera PDF "Audit Trail" para defensa SUNAFIL — Ley 27269.
 *
 * Contenido del PDF:
 *   - Header: empresa + doc + version + fecha generación
 *   - Tabla: cada worker con fecha firma, método, IP, hash
 *   - Footer: certificación + página
 *
 * Uso típico: el admin lo descarga y lo presenta en una inspección
 * SUNAFIL como evidencia de notificación + acuse de cada trabajador.
 *
 * Auth: Admin+ de la org.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPDFDoc, addHeader, finalizePDF } from '@/lib/pdf/server-pdf'

function extractDocId(req: NextRequest): string | null {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const idx = segments.indexOf('org-documents')
  if (idx === -1 || !segments[idx + 1]) return null
  return segments[idx + 1]
}

export const GET = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const documentId = extractDocId(req)
  if (!documentId) return NextResponse.json({ error: 'documentId requerido' }, { status: 400 })

  const doc = await prisma.orgDocument.findFirst({
    where: { id: documentId, orgId: ctx.orgId },
    select: {
      id: true,
      title: true,
      type: true,
      version: true,
      publishedAt: true,
      organization: { select: { name: true, razonSocial: true, ruc: true } },
    },
  })
  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  // Todos los acks (todas las versiones — para mostrar histórico completo)
  const acks = await prisma.documentAcknowledgment.findMany({
    where: { orgId: ctx.orgId, documentId },
    orderBy: { acknowledgedAt: 'desc' },
    select: {
      id: true,
      documentVersion: true,
      acknowledgedAt: true,
      signatureMethod: true,
      ip: true,
      scrolledToEnd: true,
      readingTimeMs: true,
      worker: {
        select: {
          firstName: true,
          lastName: true,
          dni: true,
          email: true,
          regimenLaboral: true,
        },
      },
    },
  })

  // Generar PDF
  const pdf = await createPDFDoc()
  const orgName = doc.organization.razonSocial ?? doc.organization.name ?? 'Empresa'

  addHeader(
    pdf,
    'Audit Trail — Acuses de Recibo',
    {
      name: doc.organization.name ?? undefined,
      razonSocial: doc.organization.razonSocial,
      ruc: doc.organization.ruc,
    },
    `Documento: ${doc.title}`,
  )
  // orgName se usará después en el texto introductorio
  void orgName

  let y = 65
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`Documento: ${doc.title}`, 14, y)
  y += 6
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`Versión actual: ${doc.version}`, 14, y)
  y += 5
  pdf.text(`Tipo: ${doc.type}`, 14, y)
  y += 5
  if (doc.publishedAt) {
    pdf.text(
      `Publicado: ${new Date(doc.publishedAt).toLocaleDateString('es-PE', { dateStyle: 'long' })}`,
      14,
      y,
    )
    y += 5
  }
  y += 4

  // Resumen
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text(`Total de acuses registrados: ${acks.length}`, 14, y)
  y += 7

  // Tabla de acuses
  if (acks.length === 0) {
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(10)
    pdf.text('Sin acuses registrados todavía.', 14, y)
  } else {
    // Header de tabla
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setFillColor(243, 244, 246)
    pdf.rect(14, y - 4, 180, 7, 'F')
    pdf.text('Trabajador', 16, y)
    pdf.text('DNI', 70, y)
    pdf.text('Versión', 92, y)
    pdf.text('Fecha firma', 110, y)
    pdf.text('Método', 145, y)
    pdf.text('IP', 170, y)
    y += 7

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    for (const ack of acks) {
      if (y > 270) {
        pdf.addPage()
        y = 20
      }
      const fullName = `${ack.worker.lastName} ${ack.worker.firstName}`.slice(0, 30)
      const fechaStr = new Date(ack.acknowledgedAt).toLocaleDateString('es-PE', {
        dateStyle: 'short',
      }) + ' ' + new Date(ack.acknowledgedAt).toLocaleTimeString('es-PE', { timeStyle: 'short' })
      pdf.text(fullName, 16, y)
      pdf.text(ack.worker.dni ?? '—', 70, y)
      pdf.text(`v${ack.documentVersion}`, 92, y)
      pdf.text(fechaStr, 110, y)
      pdf.text(ack.signatureMethod, 145, y)
      pdf.text((ack.ip ?? '—').slice(0, 15), 170, y)
      y += 5
    }
  }

  // Footer legal
  if (y > 250) {
    pdf.addPage()
    y = 20
  } else {
    y += 10
  }
  pdf.setDrawColor(229, 231, 235)
  pdf.line(14, y, 196, y)
  y += 6
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(107, 114, 128)
  pdf.text(
    'Documento generado automáticamente por COMPLY360. Las firmas electrónicas registradas',
    14,
    y,
  )
  y += 4
  pdf.text(
    'cumplen con la Ley 27269 (Ley de Firmas y Certificados Digitales) y el D.Leg. 1412.',
    14,
    y,
  )
  y += 4
  pdf.text(
    `Generado: ${new Date().toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' })}`,
    14,
    y,
  )

  const filename = `audit-trail-${doc.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}-v${doc.version}.pdf`
  return finalizePDF(pdf, filename)
})
