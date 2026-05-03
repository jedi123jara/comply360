import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  addHeader,
  createPDFDoc,
  finalizePDF,
  kv,
  sectionTitle,
} from '@/lib/pdf/server-pdf'
import {
  calcularPlazoSat,
  formularioSatLabel,
  type TipoAccidente,
} from '@/lib/sst/sat-deadline'

// =============================================
// GET /api/sst/accidentes/[id]/pdf-sat
//
// Genera el PDF imprimible del formulario SAT pre-llenado (D.S. 006-2022-TR
// + R.M. 144-2022-TR) para presentación física en mesa de partes o como
// referencia mientras el cliente notifica en gob.pe/774.
//
// COMPLY360 NO ejecuta la notificación: solo genera el documento de apoyo.
// =============================================
export const GET = withAuthParams<{ id: string }>(
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
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
            sctr: true,
          },
        },
      },
    })
    if (!accidente) {
      return NextResponse.json({ error: 'Accidente no encontrado' }, { status: 404 })
    }

    const org = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: {
        name: true,
        razonSocial: true,
        ruc: true,
        sector: true,
        ciiu: true,
        address: true,
        repNombre: true,
        repDni: true,
        repCargo: true,
      },
    })

    const plazo = calcularPlazoSat(accidente.tipo as TipoAccidente, accidente.fechaHora)
    const formLabel = formularioSatLabel(plazo.formularioSat)

    const doc = await createPDFDoc()
    const orgInfo = {
      name: org?.name ?? 'Organización',
      razonSocial: org?.razonSocial ?? null,
      ruc: org?.ruc ?? null,
    }
    addHeader(
      doc,
      'Notificación SAT — Documento de apoyo',
      orgInfo,
      `${formLabel} · D.S. 006-2022-TR`,
    )

    let y = 56

    // ── Aviso legal ──
    doc.setFontSize(9)
    doc.setTextColor(140, 70, 0)
    doc.text(
      'Este documento es un apoyo para presentación. La notificación oficial debe realizarse',
      14,
      y,
    )
    doc.text(
      'manualmente en https://www.gob.pe/774 o en mesa de partes del MTPE.',
      14,
      y + 5,
    )
    doc.setTextColor(60, 60, 60)
    y += 14

    // ── 1. Datos del empleador ──
    y = sectionTitle(doc, '1. Datos del empleador', y)
    y = kv(doc, 'Razón social', org?.razonSocial ?? org?.name ?? '—', 14, y)
    if (org?.ruc) y = kv(doc, 'RUC', org.ruc, 14, y)
    if (org?.ciiu) y = kv(doc, 'CIIU', org.ciiu, 14, y)
    if (org?.sector) y = kv(doc, 'Sector', org.sector, 14, y)
    if (org?.address) y = kv(doc, 'Domicilio fiscal', org.address, 14, y)
    if (org?.repNombre)
      y = kv(
        doc,
        'Representante legal',
        `${org.repNombre}${org.repDni ? ` · DNI ${org.repDni}` : ''}${org.repCargo ? ` · ${org.repCargo}` : ''}`,
        14,
        y,
      )
    y += 4

    // ── 2. Datos de la sede del evento ──
    y = sectionTitle(doc, '2. Centro de trabajo donde ocurrió el evento', y)
    y = kv(doc, 'Sede', accidente.sede.nombre, 14, y)
    y = kv(doc, 'Tipo de instalación', accidente.sede.tipoInstalacion, 14, y)
    y = kv(doc, 'Dirección', accidente.sede.direccion, 14, y)
    y = kv(
      doc,
      'Distrito / Provincia / Departamento',
      `${accidente.sede.distrito} / ${accidente.sede.provincia} / ${accidente.sede.departamento}`,
      14,
      y,
    )
    y = kv(doc, 'Ubigeo INEI', accidente.sede.ubigeo, 14, y)
    y += 4

    // ── 3. Datos del trabajador (si aplica) ──
    if (accidente.worker) {
      y = sectionTitle(doc, '3. Datos del trabajador afectado', y)
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
      y = kv(doc, 'Cobertura SCTR', accidente.worker.sctr ? 'Sí' : 'No', 14, y)
      y += 4
    }

    // ── 4. Datos del evento ──
    y = sectionTitle(doc, '4. Datos del evento', y)
    const tipoLabel: Record<string, string> = {
      MORTAL: 'Accidente de trabajo MORTAL',
      NO_MORTAL: 'Accidente de trabajo NO MORTAL',
      INCIDENTE_PELIGROSO: 'Incidente peligroso',
      ENFERMEDAD_OCUPACIONAL: 'Enfermedad ocupacional',
    }
    y = kv(doc, 'Tipo de evento', tipoLabel[accidente.tipo] ?? accidente.tipo, 14, y)
    y = kv(
      doc,
      'Fecha y hora del evento',
      `${accidente.fechaHora.toLocaleDateString('es-PE')} ${accidente.fechaHora.toLocaleTimeString('es-PE')}`,
      14,
      y,
    )
    y += 2

    // Descripción larga (con wrap manual simple)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Descripción del evento:', 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    const desc = accidente.descripcion ?? '—'
    const lineWidth = 180
    const charPerLine = Math.floor(lineWidth / 1.5)
    const lines: string[] = []
    let remaining = desc
    while (remaining.length > 0) {
      lines.push(remaining.slice(0, charPerLine))
      remaining = remaining.slice(charPerLine)
    }
    for (const ln of lines) {
      doc.text(ln, 14, y)
      y += 5
    }
    y += 4

    // ── 5. Plazo legal ──
    y = sectionTitle(doc, '5. Plazo legal de notificación', y)
    y = kv(doc, 'Formulario SAT que aplica', formLabel, 14, y)
    y = kv(doc, 'Plazo', plazo.descripcion, 14, y)
    y = kv(
      doc,
      'Fecha límite calculada',
      plazo.deadline.toLocaleString('es-PE'),
      14,
      y,
    )
    y = kv(doc, 'Obligado a notificar', plazo.obligadoNotificar.replace('_', ' '), 14, y)
    y = kv(doc, 'Base legal', plazo.baseLegal, 14, y)
    y += 8

    // ── 6. Firma ──
    y = sectionTitle(doc, '6. Firma del responsable', y)
    y += 14
    doc.setDrawColor(120, 120, 120)
    doc.line(14, y, 90, y)
    doc.line(120, y, 196, y)
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text('Firma representante legal', 14, y + 4)
    doc.text('Sello empresa', 120, y + 4)

    return finalizePDF(doc, `notificacion-sat-${accidente.id}.pdf`)
  },
)
