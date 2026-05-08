import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import {
  addHeader,
  createPDFDoc,
  finalizePDF,
  kv,
  sectionTitle,
  checkPageBreak,
} from '@/lib/pdf/server-pdf'

// =============================================
// GET /api/sst/memoria-anual/pdf?ano=2026
// PDF formal de la Memoria Anual SST.
// =============================================

interface MemoriaData {
  ano: number
  resumenEjecutivo?: string | null
  cumplimientoPorcentaje?: number | null
  indicadores?: {
    accidentesMortales?: number
    accidentesNoMortales?: number
    incidentesPeligrosos?: number
    enfermedadesOcupacionales?: number
    diasPerdidos?: number
    indiceFrecuencia?: number
    indiceGravedad?: number
    indiceAccidentabilidad?: number
    capacitacionesRealizadas?: number
    capacitacionesPlanificadas?: number
    simulacrosRealizados?: number
    visitasFieldAudit?: number
  }
  cumplimientoActividades?: Array<{
    actividad: string
    planificada: boolean
    ejecutada: boolean
    observaciones?: string | null
  }>
  conclusiones?: string | null
  recomendacionesProximoAno?: string[]
}

export const GET = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const ano = parseInt(searchParams.get('ano') ?? new Date().getFullYear().toString(), 10)
  if (!Number.isFinite(ano)) {
    return NextResponse.json({ error: 'Año inválido' }, { status: 400 })
  }

  const memoria = await prisma.sstRecord.findFirst({
    where: { orgId: ctx.orgId, type: 'PLAN_ANUAL', title: `memoria-${ano}` },
    orderBy: { updatedAt: 'desc' },
  })

  if (!memoria) {
    return NextResponse.json(
      { error: `No hay Memoria Anual ${ano} registrada` },
      { status: 404 },
    )
  }

  const data = memoria.data as unknown as MemoriaData

  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { name: true, razonSocial: true, ruc: true },
  })

  const doc = await createPDFDoc()
  const orgInfo = {
    name: org?.name ?? 'Organización',
    razonSocial: org?.razonSocial ?? null,
    ruc: org?.ruc ?? null,
  }
  addHeader(
    doc,
    `Memoria Anual SST ${ano}`,
    orgInfo,
    'Ley 29783 · Rendición de cuentas del SGSST',
  )
  const headerArgs = {
    title: `Memoria Anual SST ${ano}`,
    org: orgInfo,
    subtitle: `Año ${ano}`,
  }

  let y = 56

  // 1. Resumen ejecutivo
  if (data.resumenEjecutivo) {
    y = sectionTitle(doc, '1. Resumen ejecutivo', y)
    doc.setFontSize(9)
    const lines = data.resumenEjecutivo.match(/.{1,90}/g) ?? []
    for (const ln of lines) {
      y = checkPageBreak(doc, y, 5, headerArgs)
      doc.text(ln, 14, y)
      y += 5
    }
    y += 4
  }

  // 2. Indicadores OIT
  y = checkPageBreak(doc, y, 50, headerArgs)
  y = sectionTitle(doc, '2. Indicadores SST', y)
  const ind = data.indicadores ?? {}

  // Tabla 2 columnas
  const indicadoresList: Array<[string, string]> = [
    ['Accidentes mortales', String(ind.accidentesMortales ?? 0)],
    ['Accidentes no mortales', String(ind.accidentesNoMortales ?? 0)],
    ['Incidentes peligrosos', String(ind.incidentesPeligrosos ?? 0)],
    ['Enfermedades ocupacionales', String(ind.enfermedadesOcupacionales ?? 0)],
    ['Días perdidos', String(ind.diasPerdidos ?? 0)],
    ['Índice frecuencia', String(ind.indiceFrecuencia ?? 0)],
    ['Índice gravedad', String(ind.indiceGravedad ?? 0)],
    ['Índice accidentabilidad', String(ind.indiceAccidentabilidad ?? 0)],
    ['Capacitaciones realizadas', `${ind.capacitacionesRealizadas ?? 0} / ${ind.capacitacionesPlanificadas ?? 0}`],
    ['Simulacros realizados', String(ind.simulacrosRealizados ?? 0)],
    ['Visitas Field Audit', String(ind.visitasFieldAudit ?? 0)],
  ]
  for (const [k, v] of indicadoresList) {
    y = checkPageBreak(doc, y, 5, headerArgs)
    y = kv(doc, k, v, 14, y)
  }
  y += 4

  // 3. Cumplimiento del Plan Anual
  if (data.cumplimientoActividades && data.cumplimientoActividades.length > 0) {
    y = checkPageBreak(doc, y, 30, headerArgs)
    const totalPlan = data.cumplimientoActividades.length
    const totalEjec = data.cumplimientoActividades.filter((a) => a.ejecutada).length
    y = sectionTitle(
      doc,
      `3. Cumplimiento del Plan Anual (${totalEjec}/${totalPlan} = ${Math.round((totalEjec / totalPlan) * 100)}%)`,
      y,
    )

    doc.setFontSize(8)
    doc.setFillColor(238, 242, 247)
    doc.rect(14, y, 182, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('Actividad', 16, y + 4)
    doc.text('Planificada', 130, y + 4)
    doc.text('Ejecutada', 160, y + 4)
    doc.setFont('helvetica', 'normal')
    y += 6

    for (const act of data.cumplimientoActividades.slice(0, 50)) {
      y = checkPageBreak(doc, y, 6, headerArgs)
      const titleLine = act.actividad.slice(0, 60)
      doc.text(titleLine, 16, y + 4)
      doc.text(act.planificada ? '✓' : '—', 138, y + 4)
      const ejecColor: [number, number, number] = act.ejecutada
        ? [16, 185, 129]
        : [220, 38, 38]
      doc.setTextColor(ejecColor[0], ejecColor[1], ejecColor[2])
      doc.text(act.ejecutada ? '✓ Ejecutada' : '✗ Pendiente', 168, y + 4)
      doc.setTextColor(60, 60, 60)
      doc.setDrawColor(225, 232, 240)
      doc.line(14, y + 6, 196, y + 6)
      y += 6
    }
    if (data.cumplimientoActividades.length > 50) {
      y += 2
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text(
        `+ ${data.cumplimientoActividades.length - 50} actividades adicionales no mostradas en este resumen`,
        14,
        y + 4,
      )
      doc.setTextColor(60, 60, 60)
      y += 10
    } else {
      y += 4
    }
  }

  // 4. Conclusiones
  if (data.conclusiones) {
    y = checkPageBreak(doc, y, 30, headerArgs)
    y = sectionTitle(doc, '4. Conclusiones', y)
    doc.setFontSize(9)
    const lines = data.conclusiones.match(/.{1,90}/g) ?? []
    for (const ln of lines) {
      y = checkPageBreak(doc, y, 5, headerArgs)
      doc.text(ln, 14, y)
      y += 5
    }
    y += 4
  }

  // 5. Recomendaciones próximo año
  if (data.recomendacionesProximoAno && data.recomendacionesProximoAno.length > 0) {
    y = checkPageBreak(doc, y, 20, headerArgs)
    y = sectionTitle(doc, `5. Recomendaciones para ${ano + 1}`, y)
    doc.setFontSize(9)
    for (let i = 0; i < data.recomendacionesProximoAno.length; i++) {
      y = checkPageBreak(doc, y, 5, headerArgs)
      const lines = (data.recomendacionesProximoAno[i] ?? '').match(/.{1,85}/g) ?? []
      for (let j = 0; j < lines.length; j++) {
        const txt = j === 0 ? `${i + 1}. ${lines[j]}` : `   ${lines[j]}`
        doc.text(txt, 14, y)
        y += 5
      }
    }
    y += 4
  }

  // Firmas
  y = checkPageBreak(doc, y, 30, headerArgs)
  y = sectionTitle(doc, 'Aprobaciones', y)
  y += 14
  doc.setDrawColor(120, 120, 120)
  doc.line(14, y, 90, y)
  doc.line(120, y, 196, y)
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Responsable SST', 14, y + 4)
  doc.text('Comité SST · Empleador', 120, y + 4)

  return finalizePDF(doc, `memoria-anual-sst-${ano}.pdf`)
})
