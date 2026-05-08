import { NextRequest, NextResponse } from 'next/server'
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

const CARGO_LABEL: Record<string, string> = {
  PRESIDENTE: 'Presidente',
  SECRETARIO: 'Secretario',
  MIEMBRO: 'Miembro',
}

const ORIGEN_LABEL: Record<string, string> = {
  REPRESENTANTE_EMPLEADOR: 'Representante del empleador',
  REPRESENTANTE_TRABAJADORES: 'Representante de los trabajadores',
}

// =============================================
// GET /api/sst/comites/[id]/acta-pdf — Acta de instalación del Comité SST
// Formato R.M. 245-2021-TR. Incluye lista de miembros activos con cargo y
// origen, mandato y espacio para firmas.
// =============================================
export const GET = withPlanGateParams<{ id: string }>('sst_completo', 
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const comite = await prisma.comiteSST.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        organization: { select: { name: true, razonSocial: true, ruc: true } },
        miembros: {
          where: { fechaBaja: null },
          orderBy: [{ cargo: 'asc' }, { fechaAlta: 'asc' }],
          include: {
            worker: {
              select: { firstName: true, lastName: true, dni: true, position: true },
            },
          },
        },
      },
    })

    if (!comite) {
      return NextResponse.json({ error: 'Comité no encontrado' }, { status: 404 })
    }

    const doc = await createPDFDoc()
    const orgInfo = {
      name: comite.organization.name ?? 'Organización',
      razonSocial: comite.organization.razonSocial ?? null,
      ruc: comite.organization.ruc ?? null,
    }
    addHeader(
      doc,
      'Acta de instalación · Comité SST',
      orgInfo,
      `Mandato ${comite.mandatoInicio.toLocaleDateString('es-PE')} → ${comite.mandatoFin.toLocaleDateString('es-PE')}`,
    )
    const headerArgs = {
      title: 'Acta de instalación · Comité SST',
      org: orgInfo,
      subtitle: 'R.M. 245-2021-TR',
    }

    let y = 56

    y = sectionTitle(doc, 'Datos del Comité', y)
    y = kv(doc, 'Empresa', orgInfo.razonSocial ?? orgInfo.name, 14, y)
    if (orgInfo.ruc) y = kv(doc, 'RUC', orgInfo.ruc, 14, y)
    y = kv(doc, 'Estado', comite.estado, 14, y)
    y = kv(
      doc,
      'Inicio del mandato',
      comite.mandatoInicio.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      14,
      y,
    )
    y = kv(
      doc,
      'Fin del mandato',
      comite.mandatoFin.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      14,
      y,
    )
    y += 4

    // Acta texto
    y = checkPageBreak(doc, y, 30, headerArgs)
    y = sectionTitle(doc, 'Acta', y)
    doc.setFontSize(9)
    const acta = `En la fecha indicada, los representantes del empleador y de los trabajadores, conforme a la Ley 29783 — Ley de Seguridad y Salud en el Trabajo y su Reglamento (R.M. 245-2021-TR), declaran la INSTALACIÓN del Comité Paritario de Seguridad y Salud en el Trabajo de la empresa.

El Comité tendrá el mandato de dos (2) años calendario, a contar desde la fecha de instalación, y sus funciones se regirán por la normativa vigente, en particular los artículos 38º al 42º del Reglamento de la Ley 29783.`

    const lines = acta.split(/\n+/)
    for (const block of lines) {
      const wrapped = block.match(/.{1,95}/g) ?? [block]
      for (const ln of wrapped) {
        y = checkPageBreak(doc, y, 5, headerArgs)
        doc.text(ln, 14, y)
        y += 4.5
      }
      y += 2
    }
    y += 4

    // Miembros
    y = checkPageBreak(doc, y, 20, headerArgs)
    y = sectionTitle(doc, `Miembros del Comité (${comite.miembros.length})`, y)

    if (comite.miembros.length === 0) {
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text('No hay miembros registrados.', 14, y)
      doc.setTextColor(60, 60, 60)
      y += 6
    } else {
      // Header
      doc.setFillColor(238, 242, 247)
      doc.rect(14, y, 182, 6, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('Cargo', 16, y + 4)
      doc.text('Nombre', 50, y + 4)
      doc.text('DNI', 110, y + 4)
      doc.text('Representa a', 135, y + 4)
      doc.setFont('helvetica', 'normal')
      y += 6

      for (const m of comite.miembros) {
        y = checkPageBreak(doc, y, 6, headerArgs)
        doc.setFontSize(8)
        doc.text(CARGO_LABEL[m.cargo] ?? m.cargo, 16, y + 4)
        doc.text(`${m.worker.firstName} ${m.worker.lastName}`, 50, y + 4)
        doc.text(m.worker.dni, 110, y + 4)
        doc.text(ORIGEN_LABEL[m.origen] ?? m.origen, 135, y + 4)
        doc.setDrawColor(225, 232, 240)
        doc.line(14, y + 6, 196, y + 6)
        y += 6
      }
    }

    y += 8

    // Espacio firmas: 2 columnas con líneas
    y = checkPageBreak(doc, y, 60, headerArgs)
    y = sectionTitle(doc, 'Firmas', y)
    y += 18

    // Firmas en grid 2 columnas
    let yFirmas = y
    const colWidth = 90
    let colIdx = 0
    for (const m of comite.miembros.slice(0, 6)) {
      const x = 14 + colIdx * colWidth
      doc.setDrawColor(120, 120, 120)
      doc.line(x, yFirmas, x + 76, yFirmas)
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text(`${m.worker.firstName} ${m.worker.lastName}`, x, yFirmas + 4)
      doc.text(`${CARGO_LABEL[m.cargo]} · DNI ${m.worker.dni}`, x, yFirmas + 8)
      doc.setTextColor(60, 60, 60)
      colIdx++
      if (colIdx >= 2) {
        colIdx = 0
        yFirmas += 22
        if (yFirmas > 270) break
      }
    }

    return finalizePDF(doc, `acta-comite-sst-${comite.id}.pdf`)
  },
)

