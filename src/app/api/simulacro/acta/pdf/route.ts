/**
 * POST /api/simulacro/acta/pdf
 *
 * Generates a downloadable PDF of the Acta de Requerimiento Virtual.
 * Uses jsPDF server-side to produce a professional PDF without browser dependencies.
 *
 * Body:
 *   diagnosticId  string — ID of ComplianceDiagnostic type SIMULATION
 *   orgName       string — Organization name
 *   ruc           string — Organization RUC
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import {
  createPDFDoc,
  addHeader,
  sectionTitle,
  kv,
  drawTable,
  checkPageBreak,
  finalizePDF,
  type JsPDFDoc,
} from '@/lib/pdf/server-pdf'

// ─── Types ──────────────────────────────────────────────────────────────────

interface HallazgoItem {
  solicitudId?: string
  estado?: string
  documentoLabel?: string
  baseLegal?: string
  gravedad?: string
  multaUIT?: number
  multaPEN?: number
  mensaje?: string
}

interface SimulacroData {
  tipo?: string
  hallazgos?: HallazgoItem[]
  multaTotal?: number
  multaConSubsanacion?: number
  multaConSubsanacionDurante?: number
  infraccionesLeves?: number
  infraccionesGraves?: number
  infraccionesMuyGraves?: number
  cumple?: number
  parcial?: number
  noCumple?: number
  totalSolicitudes?: number
}

// ─── Helper: draw summary box ───────────────────────────────────────────────

function drawSummaryBox(
  doc: JsPDFDoc,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  color: readonly [number, number, number],
) {
  doc.setFillColor(color[0], color[1], color[2])
  doc.rect(x, y, w, 18, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(value, x + w / 2, y + 9, { align: 'center' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(label, x + w / 2, y + 15, { align: 'center' })

  doc.setTextColor(60, 60, 60)
}

// ─── Route handler ──────────────────────────────────────────────────────────

export const POST = withPlanGate('simulacro_basico', async (req: NextRequest, ctx: AuthContext) => {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const diagnosticId = typeof body.diagnosticId === 'string' ? body.diagnosticId : undefined
  const orgName = typeof body.orgName === 'string' ? body.orgName : 'Empresa'
  const ruc = typeof body.ruc === 'string' ? body.ruc : ''

  if (!diagnosticId) {
    return NextResponse.json({ error: 'diagnosticId is required' }, { status: 400 })
  }

  const diagnostic = await prisma.complianceDiagnostic.findFirst({
    where: { id: diagnosticId, orgId: ctx.orgId, type: 'SIMULATION' },
    select: { id: true, scoreGlobal: true, questionsJson: true, createdAt: true },
  })

  if (!diagnostic) {
    return NextResponse.json({ error: 'Simulacro no encontrado' }, { status: 404 })
  }

  const sim = diagnostic.questionsJson as unknown as SimulacroData
  const hallazgos = sim.hallazgos ?? []
  const score = diagnostic.scoreGlobal
  const multaTotal = sim.multaTotal ?? 0
  const multaSub90 = sim.multaConSubsanacion ?? (multaTotal * 0.10)
  const multaSub70 = sim.multaConSubsanacionDurante ?? (multaTotal * 0.30)
  const incumplimientos = hallazgos.filter(h => h.estado === 'NO_CUMPLE' || h.estado === 'PARCIAL')

  const fechaActa = new Date(diagnostic.createdAt).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  try {
    const doc = await createPDFDoc()
    const org = { name: orgName, ruc }
    const headerArgs = { title: 'Acta de Requerimiento Virtual', org, subtitle: `Formato R.M. 199-2016-TR` }

    addHeader(doc, headerArgs.title, org, headerArgs.subtitle)
    let y = 56

    // ── I. Datos de la Inspeccion ──

    y = sectionTitle(doc, 'I. Datos de la Inspeccion', y)
    y = kv(doc, 'Empresa', orgName, 14, y)
    if (ruc) y = kv(doc, 'RUC', ruc, 14, y)
    y = kv(doc, 'Tipo de inspeccion', sim.tipo ?? 'PREVENTIVA', 14, y)
    y = kv(doc, 'Fecha del simulacro', fechaActa, 14, y)
    y = kv(doc, 'Documentos revisados', String(sim.totalSolicitudes ?? hallazgos.length), 14, y)
    y = kv(doc, 'N Expediente', String(diagnostic.id).slice(-12).toUpperCase(), 14, y)
    y += 4

    // ── II. Resultado Global ──

    y = sectionTitle(doc, 'II. Resultado Global del Simulacro', y)

    // Score (big number)
    doc.setFontSize(28)
    const [sr, sg, sb] = score >= 80 ? [34, 197, 94] as const : score >= 60 ? [245, 158, 11] as const : [239, 68, 68] as const
    doc.setTextColor(sr, sg, sb)
    doc.setFont('helvetica', 'bold')
    doc.text(`${score}/100`, 14, y + 10)

    doc.setFontSize(10)
    const label = score >= 80 ? 'NIVEL ACEPTABLE DE COMPLIANCE' : score >= 60 ? 'NIVEL EN RIESGO' : 'NIVEL CRITICO'
    doc.text(label, 50, y + 6)

    doc.setFontSize(9)
    doc.setTextColor(239, 68, 68)
    doc.text(`Multa total estimada: S/ ${multaTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 50, y + 13)
    y += 22

    // Summary boxes
    const boxW = 40
    const gap = 4
    drawSummaryBox(doc, 'Cumple', String(sim.cumple ?? 0), 14, y, boxW, [34, 197, 94])
    drawSummaryBox(doc, 'Parcial', String(sim.parcial ?? 0), 14 + boxW + gap, y, boxW, [245, 158, 11])
    drawSummaryBox(doc, 'Incumple', String(sim.noCumple ?? 0), 14 + (boxW + gap) * 2, y, boxW, [239, 68, 68])
    drawSummaryBox(doc, 'Total', String(sim.totalSolicitudes ?? 0), 14 + (boxW + gap) * 3, y, boxW, [30, 58, 110])
    y += 26

    // Infracciones by severity
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'normal')
    doc.text(`Leves: ${sim.infraccionesLeves ?? 0}  |  Graves: ${sim.infraccionesGraves ?? 0}  |  Muy Graves: ${sim.infraccionesMuyGraves ?? 0}`, 14, y)
    y += 8

    // ── III. Hallazgos ──

    y = checkPageBreak(doc, y, 120, headerArgs)
    y = sectionTitle(doc, 'III. Hallazgos por Requerimiento', y)

    if (hallazgos.length > 0) {
      const columns = [
        { header: '#', x: 14 },
        { header: 'Documento', x: 20 },
        { header: 'Base Legal', x: 90 },
        { header: 'Estado', x: 130 },
        { header: 'Gravedad', x: 155 },
        { header: 'Multa (S/)', x: 185, align: 'right' as const },
      ]

      const rows = hallazgos.map((h, i) => {
        const estadoStr = h.estado === 'CUMPLE' ? 'CUMPLE' : h.estado === 'PARCIAL' ? 'PARCIAL' : h.estado === 'NO_CUMPLE' ? 'INCUMPLE' : 'N/A'
        return [
          String(i + 1),
          (h.documentoLabel ?? '').substring(0, 35),
          (h.baseLegal ?? '').substring(0, 20),
          estadoStr,
          h.gravedad ?? '',
          h.multaPEN ? h.multaPEN.toLocaleString('es-PE') : '0',
        ]
      })

      y = drawTable(doc, columns, rows, y, { headerArgs, zebraFill: true, rowHeight: 5.5, fontSize: 7 })
      y += 6
    }

    // ── IV. Escala de Multas ──

    y = checkPageBreak(doc, y, 80, headerArgs)
    y = sectionTitle(doc, 'IV. Escala de Multas segun Subsanacion', y)

    const multaColumns = [
      { header: 'Escenario', x: 14 },
      { header: 'Base Legal', x: 80 },
      { header: 'Descuento', x: 130 },
      { header: 'Multa (S/)', x: 185, align: 'right' as const },
    ]

    const multaRows = [
      ['Sin subsanacion (integra)', 'D.S. 019-2006-TR', '0%', `S/ ${multaTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`],
      ['Subsanacion DURANTE inspeccion', 'Ley 28806, Art. 40', 'Hasta 70%', `S/ ${multaSub70.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`],
      ['Subsanacion ANTES de inspeccion', 'Ley 28806, Art. 40', '90%', `S/ ${multaSub90.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`],
    ]

    y = drawTable(doc, multaColumns, multaRows, y, { headerArgs, fontSize: 8, rowHeight: 7 })
    y += 6

    // ── V. Plan de Subsanacion ──

    if (incumplimientos.length > 0) {
      y = checkPageBreak(doc, y, 80, headerArgs)
      y = sectionTitle(doc, 'V. Requerimiento de Subsanacion', y)

      doc.setFontSize(7.5)
      doc.setTextColor(100, 100, 100)
      doc.text('Conforme al Art. 13 D.S. 019-2006-TR y Art. 40 Ley 28806, se requiere subsanar:', 14, y)
      y += 5

      const subColumns = [
        { header: '#', x: 14 },
        { header: 'Infraccion', x: 20 },
        { header: 'Medida Requerida', x: 80 },
        { header: 'Plazo', x: 155 },
        { header: 'Fecha Limite', x: 175 },
      ]

      const subRows = incumplimientos.slice(0, 20).map((h, i) => {
        const dias = h.gravedad === 'MUY_GRAVE' ? 10 : h.gravedad === 'GRAVE' ? 30 : 15
        const deadline = new Date(diagnostic.createdAt)
        deadline.setDate(deadline.getDate() + dias)
        return [
          String(i + 1),
          (h.documentoLabel ?? '').substring(0, 28),
          (h.mensaje ?? 'Regularizar conforme a base legal').substring(0, 38),
          `${dias} dias`,
          deadline.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
        ]
      })

      y = drawTable(doc, subColumns, subRows, y, { headerArgs, zebraFill: true, fontSize: 7 })
      y += 4

      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text('(*) El empleador que subsane la totalidad de las infracciones puede acogerse al 90% de descuento (Art. 40 Ley 28806).', 14, y, { maxWidth: 180 })
      y += 8
    }

    // ── VI. Firmas ──

    y = checkPageBreak(doc, y, 60, headerArgs)
    y += 10

    // Signature lines
    const sigY = y + 20
    doc.setDrawColor(30, 30, 30)

    // Left signature
    doc.line(14, sigY, 85, sigY)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(orgName, 14, sigY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(ruc ? `RUC: ${ruc}` : '', 14, sigY + 9)
    doc.text('Representante Legal / RRHH', 14, sigY + 13)

    // Right signature
    doc.line(115, sigY, 196, sigY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Inspector SUNAFIL Virtual', 115, sigY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('Sistema COMPLY360', 115, sigY + 9)
    doc.text('Modulo de Simulacro', 115, sigY + 13)

    // ── Disclaimer ──

    const dy = sigY + 22
    doc.setFontSize(6.5)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'AVISO: Este documento es generado por el modulo de Simulacro de COMPLY360 y tiene caracter orientativo. No constituye un acto administrativo de SUNAFIL. Base: R.M. 199-2016-TR, D.S. 019-2006-TR, Ley 28806.',
      14, dy, { maxWidth: 180 },
    )

    // ─── Finalize ────────────────────────────────────────────────────────

    const filename = `COMPLY360_Acta_Simulacro_${score}pts_${new Date().toISOString().split('T')[0]}.pdf`
    return finalizePDF(doc, filename)
  } catch (error) {
    console.error('[Simulacro Acta PDF] Error:', error)
    return NextResponse.json({ error: 'Error al generar PDF del acta' }, { status: 500 })
  }
})

