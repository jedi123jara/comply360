import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  addHeader,
  createPDFDoc,
  finalizePDF,
  kv,
  sectionTitle,
  checkPageBreak,
  type JsPDFDoc,
} from '@/lib/pdf/server-pdf'
import {
  buildPublicSlug,
  buildPublicVerifyUrl,
  computeFingerprint,
  ipercPayload,
} from '@/lib/sst/traceability'

// =============================================
// GET /api/sst/iperc-bases/[id]/pdf
//
// Genera el PDF de la matriz IPERC en formato oficial SUNAFIL R.M. 050-2013-TR
// Anexo 3, con sello criptográfico QR + hash SHA-256 al pie.
// =============================================

const CLAS_COLOR: Record<string, [number, number, number]> = {
  TRIVIAL: [16, 185, 129],
  TOLERABLE: [6, 182, 212],
  MODERADO: [245, 158, 11],
  IMPORTANTE: [239, 68, 68],
  INTOLERABLE: [220, 38, 38],
}

const CLAS_LABEL: Record<string, string> = {
  TRIVIAL: 'Trivial',
  TOLERABLE: 'Tolerable',
  MODERADO: 'Moderado',
  IMPORTANTE: 'Importante',
  INTOLERABLE: 'Intolerable',
}

function drawClasBadge(doc: JsPDFDoc, label: string, value: string, x: number, y: number) {
  const color = CLAS_COLOR[value] ?? [120, 120, 120]
  doc.setFillColor(color[0], color[1], color[2])
  doc.rect(x, y - 3.5, 24, 5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(label, x + 12, y, { align: 'center' })
  doc.setTextColor(60, 60, 60)
  doc.setFont('helvetica', 'normal')
}

export const GET = withAuthParams<{ id: string }>(
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const iperc = await prisma.iPERCBase.findFirst({
      where: { id, orgId: ctx.orgId },
      select: {
        id: true,
        orgId: true,
        sedeId: true,
        version: true,
        estado: true,
        fechaAprobacion: true,
        hashSha256: true,
        sede: {
          select: {
            nombre: true,
            tipoInstalacion: true,
            direccion: true,
            distrito: true,
            provincia: true,
            departamento: true,
            ubigeo: true,
          },
        },
        organization: {
          select: {
            name: true,
            razonSocial: true,
            ruc: true,
            ciiu: true,
            sector: true,
          },
        },
      },
    })
    if (!iperc) {
      return NextResponse.json({ error: 'IPERC no encontrado' }, { status: 404 })
    }

    const filas = await prisma.iPERCFila.findMany({
      where: { iperBaseId: id },
      orderBy: [{ nivelRiesgo: 'desc' }, { proceso: 'asc' }],
      include: {
        // Relación con peligro opcional
      },
    })

    // Sello
    const sealPayload = ipercPayload(
      {
        id: iperc.id,
        orgId: iperc.orgId,
        sedeId: iperc.sedeId,
        version: iperc.version,
        estado: iperc.estado,
        fechaAprobacion: iperc.fechaAprobacion,
      },
      filas.map((f) => ({
        proceso: f.proceso,
        actividad: f.actividad,
        tarea: f.tarea,
        nivelRiesgo: f.nivelRiesgo,
        clasificacion: f.clasificacion,
      })),
    )
    const fingerprint = computeFingerprint(sealPayload)
    const slug = buildPublicSlug('IPERC', fingerprint)
    const publicUrl = buildPublicVerifyUrl(slug)
    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 128,
      margin: 0,
      color: { dark: '#0f172a', light: '#ffffff' },
    })

    const doc = await createPDFDoc()
    const orgInfo = {
      name: iperc.organization.name ?? 'Organización',
      razonSocial: iperc.organization.razonSocial ?? null,
      ruc: iperc.organization.ruc ?? null,
    }

    addHeader(
      doc,
      `Matriz IPERC v${iperc.version}`,
      orgInfo,
      `R.M. 050-2013-TR · Sede: ${iperc.sede.nombre}`,
    )

    let y = 56

    // ── Datos generales ────────────────────────────────────────────────
    y = sectionTitle(doc, '1. Datos generales', y)
    y = kv(doc, 'Sede', `${iperc.sede.nombre} (${iperc.sede.tipoInstalacion})`, 14, y)
    y = kv(doc, 'Dirección', iperc.sede.direccion, 14, y)
    y = kv(
      doc,
      'Ubicación',
      `${iperc.sede.distrito} / ${iperc.sede.provincia} / ${iperc.sede.departamento} (Ubigeo ${iperc.sede.ubigeo})`,
      14,
      y,
    )
    y = kv(doc, 'Versión IPERC', String(iperc.version), 14, y)
    y = kv(doc, 'Estado', iperc.estado, 14, y)
    if (iperc.fechaAprobacion) {
      y = kv(
        doc,
        'Fecha aprobación',
        iperc.fechaAprobacion.toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        14,
        y,
      )
    }
    y += 4

    // ── Resumen por clasificación ──────────────────────────────────────
    y = sectionTitle(doc, '2. Resumen por clasificación', y)
    const summary: Record<string, number> = {
      TRIVIAL: 0,
      TOLERABLE: 0,
      MODERADO: 0,
      IMPORTANTE: 0,
      INTOLERABLE: 0,
    }
    for (const f of filas) summary[f.clasificacion] = (summary[f.clasificacion] ?? 0) + 1

    let xSum = 14
    for (const [clas, count] of Object.entries(summary)) {
      const color = CLAS_COLOR[clas] ?? [120, 120, 120]
      doc.setFillColor(color[0], color[1], color[2])
      doc.rect(xSum, y, 36, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(`${CLAS_LABEL[clas] ?? clas}: ${count}`, xSum + 18, y + 4.5, { align: 'center' })
      xSum += 38
    }
    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'normal')
    y += 14

    // ── Tabla de filas ─────────────────────────────────────────────────
    const headerArgs = {
      title: `Matriz IPERC v${iperc.version}`,
      org: orgInfo,
      subtitle: `Sede ${iperc.sede.nombre}`,
    }
    y = checkPageBreak(doc, y, 30, headerArgs)
    y = sectionTitle(doc, `3. Matriz P × S oficial SUNAFIL (${filas.length} filas)`, y)

    // Encabezados de tabla
    doc.setFillColor(238, 242, 247)
    doc.rect(14, y, 182, 6, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text('Proceso · Actividad · Tarea', 16, y + 4)
    doc.text('Riesgo', 90, y + 4)
    doc.text('P', 138, y + 4, { align: 'center' })
    doc.text('Pr', 144, y + 4, { align: 'center' })
    doc.text('C', 150, y + 4, { align: 'center' })
    doc.text('E', 156, y + 4, { align: 'center' })
    doc.text('IP', 163, y + 4, { align: 'center' })
    doc.text('S', 169, y + 4, { align: 'center' })
    doc.text('NR', 175, y + 4, { align: 'center' })
    doc.text('Clasificación', 188, y + 4, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    y += 6

    // Filas
    for (const f of filas) {
      // Wrap manual proceso·actividad·tarea
      const ptText = `${f.proceso} · ${f.actividad} · ${f.tarea}`.slice(0, 70)
      const riesgoText = f.riesgo.slice(0, 50)
      const rowH = 7

      y = checkPageBreak(doc, y, rowH + 5, headerArgs)

      doc.setFontSize(7)
      doc.text(ptText, 16, y + 4)
      doc.text(riesgoText, 90, y + 4)
      doc.text(String(f.indicePersonas), 138, y + 4, { align: 'center' })
      doc.text(String(f.indiceProcedimiento), 144, y + 4, { align: 'center' })
      doc.text(String(f.indiceCapacitacion), 150, y + 4, { align: 'center' })
      doc.text(String(f.indiceExposicion), 156, y + 4, { align: 'center' })
      doc.setFont('helvetica', 'bold')
      doc.text(String(f.indiceProbabilidad), 163, y + 4, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.text(String(f.indiceSeveridad), 169, y + 4, { align: 'center' })
      doc.setFont('helvetica', 'bold')
      doc.text(String(f.nivelRiesgo), 175, y + 4, { align: 'center' })
      drawClasBadge(doc, CLAS_LABEL[f.clasificacion] ?? f.clasificacion, f.clasificacion, 182, y + 4)
      doc.setFont('helvetica', 'normal')

      // Línea separadora
      doc.setDrawColor(225, 232, 240)
      doc.line(14, y + rowH, 196, y + rowH)
      y += rowH
    }

    y += 4

    // ── Sello criptográfico ────────────────────────────────────────────
    y = checkPageBreak(doc, y, 80, headerArgs)
    y = sectionTitle(doc, '4. Sello criptográfico de integridad', y)

    // QR a la izquierda
    ;(doc as unknown as { addImage: (img: string, fmt: string, x: number, y: number, w: number, h: number) => void }).addImage(qrDataUrl, 'PNG', 14, y, 30, 30)
    // Texto al lado
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Verificación pública:', 50, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.text(publicUrl, 50, y + 10)
    doc.setFontSize(7)
    doc.text('Hash SHA-256 del registro:', 50, y + 17)
    doc.setFont('courier', 'normal')
    doc.text(fingerprint.slice(0, 64), 50, y + 22, { maxWidth: 140 })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text(
      'Cualquier modificación posterior cambiaría el hash y el sello sería rechazado.',
      50,
      y + 30,
    )
    doc.setTextColor(60, 60, 60)
    y += 36

    // ── Espacio para firmas ────────────────────────────────────────────
    y = checkPageBreak(doc, y, 30, headerArgs)
    y = sectionTitle(doc, '5. Aprobaciones', y)
    y += 14
    doc.setDrawColor(120, 120, 120)
    doc.line(14, y, 90, y)
    doc.line(120, y, 196, y)
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text('Responsable SST', 14, y + 4)
    doc.text('Empleador / Representante legal', 120, y + 4)

    return finalizePDF(doc, `iperc-v${iperc.version}-${iperc.sede.nombre}.pdf`)
  },
)
