import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  addHeader,
  createPDFDoc,
  finalizePDF,
  kv,
  sectionTitle,
  checkPageBreak,
} from '@/lib/pdf/server-pdf'

/**
 * GET /api/sst/plan-anual/pdf?ano=2026
 *
 * PDF formal del Plan Anual SST conforme al Art. 38 Ley 29783 + R.M. 050-2013-TR.
 * Estructura oficial:
 *   1. Identificación de la organización
 *   2. Política y objetivos del SGSST para el año
 *   3. Cronograma mensual de actividades (12 meses × N actividades)
 *   4. Asignación presupuestal
 *   5. Cuadro de cumplimiento (estado por actividad)
 *   6. Firmas del responsable + comité
 *
 * El cronograma muestra actividades agrupadas por mes, con marcas (✓ /
 * en curso / pendiente) según el estado.
 */

interface ActividadPlan {
  id: string
  titulo: string
  area:
    | 'IPERC'
    | 'CAPACITACION'
    | 'INSPECCION'
    | 'EMO'
    | 'SIMULACRO'
    | 'AUDITORIA'
    | 'COMITE'
    | 'OTRO'
  mes: number
  responsable?: string | null
  estado: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA'
  notas?: string | null
}

interface PlanData {
  ano: number
  objetivos: string[]
  actividades: ActividadPlan[]
  presupuestoSoles?: number | null
}

const MESES_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const AREA_LABELS: Record<ActividadPlan['area'], string> = {
  IPERC: 'IPERC',
  CAPACITACION: 'Capacitación',
  INSPECCION: 'Inspección',
  EMO: 'EMO',
  SIMULACRO: 'Simulacro',
  AUDITORIA: 'Auditoría',
  COMITE: 'Comité SST',
  OTRO: 'Otro',
}

const ESTADO_LABELS: Record<ActividadPlan['estado'], string> = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En curso',
  COMPLETADA: 'Completada',
}

const ESTADO_COLORS: Record<ActividadPlan['estado'], [number, number, number]> = {
  PENDIENTE: [120, 120, 120],
  EN_CURSO: [217, 119, 6],
  COMPLETADA: [16, 185, 129],
}

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const ano = parseInt(searchParams.get('ano') ?? new Date().getFullYear().toString(), 10)
  if (!Number.isFinite(ano)) {
    return NextResponse.json({ error: 'Año inválido' }, { status: 400 })
  }

  const record = await prisma.sstRecord.findFirst({
    where: { orgId: ctx.orgId, type: 'PLAN_ANUAL', title: String(ano) },
    orderBy: { updatedAt: 'desc' },
  })

  if (!record) {
    return NextResponse.json(
      { error: `No hay Plan Anual ${ano} registrado` },
      { status: 404 },
    )
  }

  const data = record.data as unknown as PlanData
  const actividades = data.actividades ?? []
  const objetivos = data.objetivos ?? []

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
    `Plan Anual SST ${ano}`,
    orgInfo,
    'Ley 29783 Art. 38 · R.M. 050-2013-TR',
  )
  const headerArgs = {
    title: `Plan Anual SST ${ano}`,
    org: orgInfo,
    subtitle: `Año ${ano}`,
  }

  let y = 56

  // ── 1. Datos de la organización ─────────────────────────────────────────
  y = sectionTitle(doc, '1. Identificación de la organización', y)
  y = kv(doc, 'Razón social', orgInfo.razonSocial ?? orgInfo.name, 14, y)
  if (orgInfo.ruc) y = kv(doc, 'RUC', orgInfo.ruc, 14, y)
  y = kv(doc, 'Período', `${ano} (01/01/${ano} – 31/12/${ano})`, 14, y)
  y = kv(doc, 'Marco legal', 'Ley 29783, D.S. 005-2012-TR, R.M. 050-2013-TR', 14, y)
  y += 4

  // ── 2. Objetivos del SGSST ───────────────────────────────────────────────
  y = checkPageBreak(doc, y, 30, headerArgs)
  y = sectionTitle(doc, `2. Objetivos del SGSST para el año ${ano}`, y)
  if (objetivos.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(140, 140, 140)
    doc.text('(Sin objetivos definidos — agregar en la edición del plan)', 14, y)
    doc.setTextColor(60, 60, 60)
    y += 6
  } else {
    doc.setFontSize(9)
    for (let i = 0; i < objetivos.length; i++) {
      y = checkPageBreak(doc, y, 6, headerArgs)
      const lines = objetivos[i].match(/.{1,90}/g) ?? [objetivos[i]]
      doc.setFont('helvetica', 'bold')
      doc.text(`${i + 1}.`, 14, y)
      doc.setFont('helvetica', 'normal')
      doc.text(lines[0], 20, y)
      y += 5
      for (let j = 1; j < lines.length; j++) {
        y = checkPageBreak(doc, y, 5, headerArgs)
        doc.text(lines[j], 20, y)
        y += 5
      }
      y += 1
    }
  }
  y += 3

  // ── 3. Presupuesto ───────────────────────────────────────────────────────
  if (data.presupuestoSoles != null && data.presupuestoSoles > 0) {
    y = checkPageBreak(doc, y, 16, headerArgs)
    y = sectionTitle(doc, '3. Asignación presupuestal', y)
    y = kv(
      doc,
      'Presupuesto SST',
      `S/ ${data.presupuestoSoles.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      14,
      y,
    )
    y += 4
  }

  // ── 4. Cronograma de actividades ────────────────────────────────────────
  y = checkPageBreak(doc, y, 30, headerArgs)
  const total = actividades.length
  const completadas = actividades.filter((a) => a.estado === 'COMPLETADA').length
  const pct = total > 0 ? Math.round((completadas / total) * 100) : 0
  y = sectionTitle(
    doc,
    `4. Cronograma de actividades (${completadas}/${total} = ${pct}% completadas)`,
    y,
  )

  if (total === 0) {
    doc.setFontSize(9)
    doc.setTextColor(140, 140, 140)
    doc.text('(Sin actividades cargadas en el plan)', 14, y)
    doc.setTextColor(60, 60, 60)
    y += 6
  } else {
    // Agrupamos por mes
    const porMes = new Map<number, ActividadPlan[]>()
    for (const act of actividades) {
      const list = porMes.get(act.mes) ?? []
      list.push(act)
      porMes.set(act.mes, list)
    }

    for (let mes = 1; mes <= 12; mes++) {
      const acts = porMes.get(mes)
      if (!acts || acts.length === 0) continue

      // Header del mes
      y = checkPageBreak(doc, y, 12, headerArgs)
      doc.setFillColor(238, 242, 247)
      doc.rect(14, y, 182, 6, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(`${MESES_LABELS[mes - 1]} (${acts.length} ${acts.length === 1 ? 'actividad' : 'actividades'})`, 16, y + 4)
      doc.setFont('helvetica', 'normal')
      y += 6

      for (const act of acts) {
        y = checkPageBreak(doc, y, 6, headerArgs)
        // Columna área
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.text(AREA_LABELS[act.area], 16, y + 4)
        doc.setTextColor(60, 60, 60)
        // Título
        doc.setFontSize(9)
        const titleSnippet = act.titulo.length > 50 ? act.titulo.slice(0, 50) + '…' : act.titulo
        doc.text(titleSnippet, 50, y + 4)
        // Responsable
        if (act.responsable) {
          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          doc.text(act.responsable.slice(0, 20), 130, y + 4)
          doc.setTextColor(60, 60, 60)
        }
        // Estado
        const color = ESTADO_COLORS[act.estado]
        doc.setTextColor(color[0], color[1], color[2])
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(ESTADO_LABELS[act.estado], 168, y + 4)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        // Línea separadora
        doc.setDrawColor(230, 235, 240)
        doc.line(14, y + 6, 196, y + 6)
        y += 6
      }
      y += 2
    }
  }

  y += 3

  // ── 5. Cuadro resumen por área ──────────────────────────────────────────
  if (total > 0) {
    y = checkPageBreak(doc, y, 50, headerArgs)
    y = sectionTitle(doc, '5. Resumen por área', y)
    const porArea = new Map<ActividadPlan['area'], { total: number; completadas: number }>()
    for (const act of actividades) {
      const cur = porArea.get(act.area) ?? { total: 0, completadas: 0 }
      cur.total++
      if (act.estado === 'COMPLETADA') cur.completadas++
      porArea.set(act.area, cur)
    }

    doc.setFontSize(8)
    doc.setFillColor(238, 242, 247)
    doc.rect(14, y, 182, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('Área', 16, y + 4)
    doc.text('Planificadas', 110, y + 4)
    doc.text('Completadas', 145, y + 4)
    doc.text('% Avance', 178, y + 4)
    doc.setFont('helvetica', 'normal')
    y += 6

    for (const [area, st] of porArea.entries()) {
      y = checkPageBreak(doc, y, 6, headerArgs)
      const pctArea = st.total > 0 ? Math.round((st.completadas / st.total) * 100) : 0
      doc.text(AREA_LABELS[area], 16, y + 4)
      doc.text(String(st.total), 116, y + 4)
      doc.text(String(st.completadas), 151, y + 4)
      const pctColor: [number, number, number] = pctArea >= 80
        ? [16, 185, 129]
        : pctArea >= 50
        ? [217, 119, 6]
        : [220, 38, 38]
      doc.setTextColor(pctColor[0], pctColor[1], pctColor[2])
      doc.setFont('helvetica', 'bold')
      doc.text(`${pctArea}%`, 184, y + 4)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      doc.setDrawColor(230, 235, 240)
      doc.line(14, y + 6, 196, y + 6)
      y += 6
    }
    y += 4
  }

  // ── 6. Firmas ────────────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 50, headerArgs)
  y = sectionTitle(doc, '6. Aprobación', y)
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(
    'Este Plan Anual debe ser aprobado por el Comité SST y firmado por el responsable del SGSST.',
    14,
    y,
  )
  doc.text(
    'Conservar el documento físico firmado en el libro de actas del Comité (R.M. 245-2021-TR).',
    14,
    y + 5,
  )
  doc.setTextColor(60, 60, 60)
  y += 16

  // Cuadro de firmas (2 columnas)
  doc.setDrawColor(180, 188, 200)
  doc.line(20, y + 14, 90, y + 14)
  doc.line(110, y + 14, 180, y + 14)
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  doc.text('Responsable del SGSST', 22, y + 19)
  doc.text('Presidente del Comité SST', 112, y + 19)
  doc.setFontSize(7)
  doc.setTextColor(140, 140, 140)
  doc.text('Nombre, cargo y fecha', 22, y + 24)
  doc.text('Nombre, cargo y fecha', 112, y + 24)

  return finalizePDF(doc, `plan-anual-sst-${ano}.pdf`)
})
