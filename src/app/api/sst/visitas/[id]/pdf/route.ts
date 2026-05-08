import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import {
  addHeader,
  createPDFDoc,
  finalizePDF,
  kv,
  sectionTitle,
  checkPageBreak,
} from '@/lib/pdf/server-pdf'
import {
  buildPublicSlug,
  buildPublicVerifyUrl,
  computeFingerprint,
  visitaPayload,
} from '@/lib/sst/traceability'

const SEV_COLOR: Record<string, [number, number, number]> = {
  TRIVIAL: [16, 185, 129],
  TOLERABLE: [6, 182, 212],
  MODERADO: [245, 158, 11],
  IMPORTANTE: [239, 68, 68],
  INTOLERABLE: [220, 38, 38],
}

const TIPO_LABEL: Record<string, string> = {
  PELIGRO_NUEVO: 'Peligro nuevo',
  PROCEDIMIENTO_INCUMPLIDO: 'Procedimiento incumplido',
  EPP_AUSENTE: 'EPP ausente',
  SENALIZACION_FALTANTE: 'Señalización faltante',
  EXTINTOR_VENCIDO: 'Extintor vencido',
  RUTA_EVACUACION_BLOQUEADA: 'Ruta evacuación bloqueada',
  OTRO: 'Otro',
}

// =============================================
// GET /api/sst/visitas/[id]/pdf — Informe Field Audit
// =============================================
export const GET = withPlanGateParams<{ id: string }>('sst_completo', 
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const visita = await prisma.visitaFieldAudit.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        sede: true,
        colaborador: true,
        organization: {
          select: { name: true, razonSocial: true, ruc: true },
        },
        hallazgos: {
          orderBy: [{ severidad: 'desc' }, { createdAt: 'asc' }],
        },
      },
    })
    if (!visita) {
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
    }

    // Sello
    const sealPayload = visitaPayload(
      {
        id: visita.id,
        orgId: visita.orgId,
        sedeId: visita.sedeId,
        colaboradorId: visita.colaboradorId,
        fechaProgramada: visita.fechaProgramada,
        fechaCierreOficina: visita.fechaCierreOficina,
        estado: visita.estado,
      },
      visita.hallazgos.map((h) => ({
        tipo: h.tipo,
        severidad: h.severidad,
        descripcion: h.descripcion,
      })),
    )
    const fingerprint = computeFingerprint(sealPayload)
    const slug = buildPublicSlug('VISITA', fingerprint)
    const publicUrl = buildPublicVerifyUrl(slug)
    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 128,
      margin: 0,
      color: { dark: '#0f172a', light: '#ffffff' },
    })

    const doc = await createPDFDoc()
    const orgInfo = {
      name: visita.organization.name ?? 'Organización',
      razonSocial: visita.organization.razonSocial ?? null,
      ruc: visita.organization.ruc ?? null,
    }
    addHeader(
      doc,
      'Informe Field Audit SST',
      orgInfo,
      `${visita.sede.nombre} · ${new Date(visita.fechaProgramada).toLocaleDateString('es-PE')}`,
    )
    const headerArgs = {
      title: 'Informe Field Audit SST',
      org: orgInfo,
      subtitle: visita.sede.nombre,
    }

    let y = 56

    y = sectionTitle(doc, '1. Datos de la visita', y)
    y = kv(doc, 'Sede', `${visita.sede.nombre} (${visita.sede.tipoInstalacion})`, 14, y)
    y = kv(doc, 'Dirección', visita.sede.direccion, 14, y)
    y = kv(
      doc,
      'Inspector asignado',
      `${visita.colaborador.nombre} ${visita.colaborador.apellido} · DNI ${visita.colaborador.dni}`,
      14,
      y,
    )
    y = kv(
      doc,
      'Fecha programada',
      new Date(visita.fechaProgramada).toLocaleString('es-PE'),
      14,
      y,
    )
    if (visita.fechaInicioCampo)
      y = kv(
        doc,
        'Inicio en campo',
        new Date(visita.fechaInicioCampo).toLocaleString('es-PE'),
        14,
        y,
      )
    if (visita.fechaCierreOficina)
      y = kv(
        doc,
        'Cierre en oficina',
        new Date(visita.fechaCierreOficina).toLocaleString('es-PE'),
        14,
        y,
      )
    y = kv(doc, 'Estado', visita.estado, 14, y)
    y += 4

    if (visita.notasInspector) {
      y = sectionTitle(doc, '2. Notas del inspector', y)
      doc.setFontSize(9)
      const lines = visita.notasInspector.match(/.{1,90}/g) ?? []
      for (const ln of lines) {
        y = checkPageBreak(doc, y, 5, headerArgs)
        doc.text(ln, 14, y)
        y += 5
      }
      y += 4
    }

    // Hallazgos
    y = checkPageBreak(doc, y, 10, headerArgs)
    y = sectionTitle(doc, `3. Hallazgos (${visita.hallazgos.length})`, y)

    if (visita.hallazgos.length === 0) {
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text('No se registraron hallazgos en esta visita.', 14, y)
      doc.setTextColor(60, 60, 60)
      y += 8
    } else {
      for (const h of visita.hallazgos) {
        y = checkPageBreak(doc, y, 24, headerArgs)
        // Barra severidad
        const color = SEV_COLOR[h.severidad] ?? [120, 120, 120]
        doc.setFillColor(color[0], color[1], color[2])
        doc.rect(14, y, 4, 18, 'F')

        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(`${h.severidad} · ${TIPO_LABEL[h.tipo] ?? h.tipo}`, 22, y + 4)
        doc.setFont('helvetica', 'normal')

        const descLines = (h.descripcion ?? '').match(/.{1,90}/g)?.slice(0, 2) ?? []
        let yLine = y + 9
        for (const ln of descLines) {
          doc.text(ln, 22, yLine)
          yLine += 4
        }

        doc.setFont('helvetica', 'bold')
        doc.text('Acción propuesta:', 22, y + 17)
        doc.setFont('helvetica', 'normal')
        const accionLines = (h.accionPropuesta ?? '').match(/.{1,70}/g)?.slice(0, 1) ?? []
        if (accionLines[0]) doc.text(accionLines[0], 56, y + 17)

        y += 22
      }
    }

    y += 4

    // Sello
    y = checkPageBreak(doc, y, 50, headerArgs)
    y = sectionTitle(doc, '4. Sello de integridad', y)
    ;(
      doc as unknown as {
        addImage: (
          img: string,
          fmt: string,
          x: number,
          y: number,
          w: number,
          h: number,
        ) => void
      }
    ).addImage(qrDataUrl, 'PNG', 14, y, 28, 28)
    doc.setFontSize(8)
    doc.text('Verificación pública:', 48, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.text(publicUrl, 48, y + 10)
    doc.setFontSize(7)
    doc.setFont('courier', 'normal')
    doc.text(fingerprint.slice(0, 64), 48, y + 16, { maxWidth: 145 })
    doc.setFont('helvetica', 'normal')
    y += 32

    // Firmas
    doc.setDrawColor(120, 120, 120)
    doc.line(14, y, 90, y)
    doc.line(120, y, 196, y)
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text('Inspector', 14, y + 4)
    doc.text('Responsable de la sede', 120, y + 4)

    return finalizePDF(doc, `field-audit-${visita.id}.pdf`)
  },
)

