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
} from '@/lib/pdf/server-pdf'
import {
  buildPublicSlug,
  buildPublicVerifyUrl,
  computeFingerprint,
  accidentePayload,
} from '@/lib/sst/traceability'

// =============================================
// GET /api/sst/accidentes/[id]/investigacion/[invId]/pdf
// PDF formal de la investigación de accidente — Ley 29783 Art. 58.
// =============================================

interface Causa {
  tipo: string
  descripcion: string
}
interface Accion {
  accion: string
  responsable?: string | null
  plazo?: string | null
  estado?: string
}

const CAUSA_INMEDIATA_LABEL: Record<string, string> = {
  ACTO_INSEGURO: 'Acto inseguro',
  CONDICION_INSEGURA: 'Condición insegura',
}

const CAUSA_BASICA_LABEL: Record<string, string> = {
  FACTOR_PERSONAL: 'Factor personal',
  FACTOR_TRABAJO: 'Factor de trabajo',
}

const TIPO_ACCIDENTE_LABEL: Record<string, string> = {
  MORTAL: 'Accidente Mortal',
  NO_MORTAL: 'Accidente No Mortal',
  INCIDENTE_PELIGROSO: 'Incidente Peligroso',
  ENFERMEDAD_OCUPACIONAL: 'Enfermedad Ocupacional',
}

export const GET = withAuthParams<{ id: string; invId: string }>(
  async (_req: NextRequest, ctx: AuthContext, { id, invId }) => {
    const accidente = await prisma.accidente.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        sede: true,
        worker: {
          select: {
            firstName: true,
            lastName: true,
            dni: true,
            position: true,
            fechaIngreso: true,
            regimenLaboral: true,
          },
        },
        organization: {
          select: { name: true, razonSocial: true, ruc: true },
        },
      },
    })
    if (!accidente) {
      return NextResponse.json({ error: 'Accidente no encontrado' }, { status: 404 })
    }

    const investigacion = await prisma.investigacionAccidente.findFirst({
      where: { id: invId, accidenteId: id },
    })
    if (!investigacion) {
      return NextResponse.json({ error: 'Investigación no encontrada' }, { status: 404 })
    }

    // Sello de trazabilidad del accidente (vincula la investigación)
    const sealPayload = accidentePayload({
      id: accidente.id,
      orgId: accidente.orgId,
      sedeId: accidente.sedeId,
      workerId: accidente.workerId,
      tipo: accidente.tipo,
      fechaHora: accidente.fechaHora,
      plazoLegalHoras: accidente.plazoLegalHoras,
      satEstado: accidente.satEstado,
      satNumeroManual: accidente.satNumeroManual,
      satFechaEnvioManual: accidente.satFechaEnvioManual,
    })
    const fingerprint = computeFingerprint(sealPayload)
    const slug = buildPublicSlug('ACCIDENTE', fingerprint)
    const publicUrl = buildPublicVerifyUrl(slug)
    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 128,
      margin: 0,
      color: { dark: '#0f172a', light: '#ffffff' },
    })

    const doc = await createPDFDoc()
    const orgInfo = {
      name: accidente.organization.name ?? 'Organización',
      razonSocial: accidente.organization.razonSocial ?? null,
      ruc: accidente.organization.ruc ?? null,
    }
    addHeader(
      doc,
      'Investigación de Accidente de Trabajo',
      orgInfo,
      `Ley 29783 Art. 58 · ${TIPO_ACCIDENTE_LABEL[accidente.tipo] ?? accidente.tipo}`,
    )
    const headerArgs = {
      title: 'Investigación de Accidente',
      org: orgInfo,
      subtitle: TIPO_ACCIDENTE_LABEL[accidente.tipo] ?? accidente.tipo,
    }

    let y = 56

    // 1. Datos del evento
    y = sectionTitle(doc, '1. Datos del evento', y)
    y = kv(doc, 'Tipo', TIPO_ACCIDENTE_LABEL[accidente.tipo] ?? accidente.tipo, 14, y)
    y = kv(
      doc,
      'Fecha y hora del evento',
      `${accidente.fechaHora.toLocaleDateString('es-PE')} ${accidente.fechaHora.toLocaleTimeString('es-PE')}`,
      14,
      y,
    )
    y = kv(doc, 'Sede', `${accidente.sede.nombre} (${accidente.sede.tipoInstalacion})`, 14, y)
    y = kv(doc, 'Dirección', accidente.sede.direccion, 14, y)
    y = kv(
      doc,
      'Ubicación',
      `${accidente.sede.distrito} / ${accidente.sede.provincia} / ${accidente.sede.departamento}`,
      14,
      y,
    )
    y += 4

    // 2. Trabajador afectado
    if (accidente.worker) {
      y = sectionTitle(doc, '2. Trabajador afectado', y)
      y = kv(
        doc,
        'Nombre completo',
        `${accidente.worker.firstName} ${accidente.worker.lastName}`,
        14,
        y,
      )
      y = kv(doc, 'DNI', accidente.worker.dni, 14, y)
      if (accidente.worker.position) y = kv(doc, 'Puesto', accidente.worker.position, 14, y)
      y = kv(doc, 'Régimen laboral', accidente.worker.regimenLaboral, 14, y)
      y = kv(
        doc,
        'Fecha de ingreso',
        new Date(accidente.worker.fechaIngreso).toLocaleDateString('es-PE'),
        14,
        y,
      )
      y += 4
    }

    // 3. Descripción
    y = checkPageBreak(doc, y, 30, headerArgs)
    y = sectionTitle(doc, '3. Descripción del evento', y)
    doc.setFontSize(9)
    const descLines = (accidente.descripcion ?? '').match(/.{1,90}/g) ?? []
    for (const ln of descLines) {
      y = checkPageBreak(doc, y, 5, headerArgs)
      doc.text(ln, 14, y)
      y += 5
    }
    y += 4

    // 4. Datos de la investigación
    y = checkPageBreak(doc, y, 20, headerArgs)
    y = sectionTitle(doc, '4. Investigación realizada', y)
    y = kv(
      doc,
      'Fecha de investigación',
      investigacion.fechaInvestigacion.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      14,
      y,
    )
    y += 4

    // 5. Causas inmediatas
    y = checkPageBreak(doc, y, 30, headerArgs)
    y = sectionTitle(doc, '5. Causas inmediatas', y)
    const causasInm = (investigacion.causasInmediatas as Causa[] | null) ?? []
    if (causasInm.length === 0) {
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text('Sin causas inmediatas registradas.', 14, y)
      doc.setTextColor(60, 60, 60)
      y += 6
    } else {
      doc.setFontSize(9)
      for (const c of causasInm) {
        y = checkPageBreak(doc, y, 8, headerArgs)
        // Bullet con tipo en negrita
        doc.setFont('helvetica', 'bold')
        doc.text(`• ${CAUSA_INMEDIATA_LABEL[c.tipo] ?? c.tipo}:`, 14, y)
        doc.setFont('helvetica', 'normal')
        const lines = c.descripcion.match(/.{1,80}/g) ?? []
        for (let i = 0; i < lines.length; i++) {
          doc.text(lines[i], i === 0 ? 60 : 18, y + i * 5)
        }
        y += Math.max(5, lines.length * 5) + 2
      }
    }
    y += 2

    // 6. Causas básicas
    y = checkPageBreak(doc, y, 30, headerArgs)
    y = sectionTitle(doc, '6. Causas básicas (raíz)', y)
    const causasBas = (investigacion.causasBasicas as Causa[] | null) ?? []
    if (causasBas.length === 0) {
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text('Sin causas básicas registradas.', 14, y)
      doc.setTextColor(60, 60, 60)
      y += 6
    } else {
      doc.setFontSize(9)
      for (const c of causasBas) {
        y = checkPageBreak(doc, y, 8, headerArgs)
        doc.setFont('helvetica', 'bold')
        doc.text(`• ${CAUSA_BASICA_LABEL[c.tipo] ?? c.tipo}:`, 14, y)
        doc.setFont('helvetica', 'normal')
        const lines = c.descripcion.match(/.{1,80}/g) ?? []
        for (let i = 0; i < lines.length; i++) {
          doc.text(lines[i], i === 0 ? 60 : 18, y + i * 5)
        }
        y += Math.max(5, lines.length * 5) + 2
      }
    }
    y += 2

    // 7. Acciones correctivas
    y = checkPageBreak(doc, y, 40, headerArgs)
    y = sectionTitle(doc, '7. Acciones correctivas / preventivas', y)
    const acciones = (investigacion.accionesCorrectivas as Accion[] | null) ?? []
    if (acciones.length === 0) {
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text('Sin acciones registradas. Pendiente de definir.', 14, y)
      doc.setTextColor(60, 60, 60)
      y += 6
    } else {
      // Tabla simple
      doc.setFontSize(8)
      doc.setFillColor(238, 242, 247)
      doc.rect(14, y, 182, 6, 'F')
      doc.setFont('helvetica', 'bold')
      doc.text('Acción', 16, y + 4)
      doc.text('Responsable', 110, y + 4)
      doc.text('Plazo', 150, y + 4)
      doc.text('Estado', 178, y + 4)
      doc.setFont('helvetica', 'normal')
      y += 6

      for (const a of acciones) {
        y = checkPageBreak(doc, y, 10, headerArgs)
        const accionLines = (a.accion ?? '').match(/.{1,55}/g) ?? ['']
        const rowH = Math.max(6, accionLines.length * 4 + 2)
        for (let i = 0; i < accionLines.length; i++) {
          doc.text(accionLines[i], 16, y + 4 + i * 4)
        }
        if (a.responsable) doc.text(a.responsable.slice(0, 24), 110, y + 4)
        if (a.plazo) {
          const d = new Date(a.plazo)
          if (!isNaN(d.getTime())) doc.text(d.toLocaleDateString('es-PE'), 150, y + 4)
        }
        doc.text(a.estado ?? 'PENDIENTE', 178, y + 4)
        doc.setDrawColor(225, 232, 240)
        doc.line(14, y + rowH, 196, y + rowH)
        y += rowH
      }
    }
    y += 4

    // 8. Sello + firmas
    y = checkPageBreak(doc, y, 60, headerArgs)
    y = sectionTitle(doc, '8. Sello de trazabilidad', y)
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
    doc.text('Verificación pública del accidente:', 48, y + 5)
    doc.text(publicUrl, 48, y + 10)
    doc.setFontSize(7)
    doc.setFont('courier', 'normal')
    doc.text(fingerprint.slice(0, 64), 48, y + 16, { maxWidth: 145 })
    doc.setFont('helvetica', 'normal')
    y += 36

    // Firmas
    y = checkPageBreak(doc, y, 30, headerArgs)
    doc.setDrawColor(120, 120, 120)
    doc.line(14, y, 90, y)
    doc.line(120, y, 196, y)
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text('Investigador (responsable SST)', 14, y + 4)
    doc.text('Aprobación Comité SST / Empleador', 120, y + 4)

    return finalizePDF(doc, `investigacion-${accidente.id}-${investigacion.id}.pdf`)
  },
)
