/**
 * GET /api/diagnostics/[id]/pdf
 *
 * Generates a downloadable PDF report for a completed compliance diagnostic.
 * Includes:
 *   - Global score with color-coded badge
 *   - Area-by-area breakdown with bar charts
 *   - Gap analysis — top 20 items by priority
 *   - Action plan with plazos and multa evitable
 *   - Summary statistics
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import {
  createPDFDoc,
  addHeader,
  sectionTitle,
  kv,
  drawBarChart,
  drawTable,
  checkPageBreak,
  finalizePDF,
} from '@/lib/pdf/server-pdf'

// ─── Types extracted from DB JSON fields ────────────────────────────────────

interface AreaScore {
  area: string
  label: string
  score: number
  weight: number
  totalQuestions: number
  answeredYes: number
  answeredPartial: number
  answeredNo: number
  multaEstimada: number
}

interface GapItem {
  questionId: string
  text: string
  baseLegal: string
  gravedad: string
  multaUIT: number
  multaPEN: number
  answer: string
  priority: number
}

interface ActionItem {
  priority: number
  areaLabel: string
  action: string
  baseLegal: string
  multaEvitable: number
  plazoSugerido: string
}

// ─── Route handler ──────────────────────────────────────────────────────────

export const GET = withAuthParams<{ id: string }>(async (_req, ctx, params) => {
  try {
    const { id } = params

    // Load diagnostic with org info
    const diagnostic = await prisma.complianceDiagnostic.findUnique({
      where: { id },
      include: {
        organization: {
          select: { name: true, razonSocial: true, ruc: true, sector: true },
        },
      },
    })

    if (!diagnostic || diagnostic.orgId !== ctx.orgId) {
      return NextResponse.json({ error: 'Diagnostico no encontrado' }, { status: 404 })
    }

    // Parse JSON fields (Prisma JsonValue → known types via unknown)
    const scoreByArea = (diagnostic.scoreByArea ?? {}) as unknown as Record<string, number>
    const gapAnalysis = (diagnostic.gapAnalysis ?? []) as unknown as GapItem[]
    const actionPlan = (diagnostic.actionPlan ?? []) as unknown as ActionItem[]

    // Reconstruct areaScores from scoreByArea if questionsJson has the detail
    const questionsJson = diagnostic.questionsJson as unknown
    const areaScores: AreaScore[] = Array.isArray(questionsJson)
      ? [] // answers-only format — we'll use scoreByArea for the chart
      : ((questionsJson as Record<string, unknown>)?.areaScores as AreaScore[] ?? [])

    const org = diagnostic.organization
    const score = diagnostic.scoreGlobal
    const multa = Number(diagnostic.totalMultaRiesgo)
    const type = diagnostic.type === 'EXPRESS' ? 'Express (20 preguntas)' : 'Completo (135 preguntas)'

    // ─── Build PDF ────────────────────────────────────────────────────────

    const doc = await createPDFDoc()
    const headerArgs = {
      title: 'Informe de Diagnostico de Compliance',
      org: { name: org.name, razonSocial: org.razonSocial, ruc: org.ruc },
      subtitle: type,
    }

    addHeader(doc, headerArgs.title, headerArgs.org, headerArgs.subtitle)
    let y = 56

    // ── 1. Score global hero section ──

    y = sectionTitle(doc, 'Score Global de Compliance', y)

    // Score value (big number)
    doc.setFontSize(36)
    const [sr, sg, sb] = score >= 80 ? [34, 197, 94] : score >= 60 ? [245, 158, 11] : [239, 68, 68]
    doc.setTextColor(sr, sg, sb)
    doc.setFont('helvetica', 'bold')
    doc.text(`${score}/100`, 14, y + 14)

    // Label
    doc.setFontSize(11)
    const label = score >= 80 ? 'CUMPLE — Buen nivel de compliance'
      : score >= 60 ? 'EN RIESGO — Necesita mejoras urgentes'
      : 'CRITICO — Accion inmediata requerida'
    doc.text(label, 55, y + 6)

    // Multa potencial
    doc.setFontSize(10)
    doc.setTextColor(239, 68, 68)
    doc.text(`Multa potencial estimada: S/ ${multa.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 55, y + 14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)

    y += 26

    // ── 2. Metadata ──

    y = kv(doc, 'Tipo de diagnostico', type, 14, y)
    y = kv(doc, 'Fecha de realizacion', new Date(diagnostic.completedAt ?? diagnostic.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }), 14, y)
    y = kv(doc, 'Empresa', org.razonSocial ?? org.name ?? '', 14, y)
    if (org.ruc) y = kv(doc, 'RUC', org.ruc, 14, y)
    if (org.sector) y = kv(doc, 'Sector', org.sector, 14, y)
    y += 4

    // ── 3. Area breakdown chart ──

    y = checkPageBreak(doc, y, 200, headerArgs)
    y = sectionTitle(doc, 'Score por Area', y)

    // Build area items from scoreByArea
    const AREA_LABELS: Record<string, { label: string; weight: number }> = {
      contratos_registro:            { label: 'Contratos y Registro', weight: 14 },
      remuneraciones_beneficios:     { label: 'Remuneraciones y Beneficios', weight: 18 },
      jornada_descansos:             { label: 'Jornada y Descansos', weight: 10 },
      sst:                           { label: 'SST', weight: 19 },
      documentos_obligatorios:       { label: 'Documentos Obligatorios', weight: 14 },
      relaciones_laborales:          { label: 'Relaciones Laborales', weight: 5 },
      igualdad_nodiscriminacion:     { label: 'Igualdad y No Discriminacion', weight: 7 },
      trabajadores_especiales:       { label: 'Trabajadores Especiales', weight: 5 },
      tercerizacion_intermediacion:  { label: 'Tercerizacion', weight: 4 },
      hostigamiento_sexual_detallado: { label: 'Hostigamiento Sexual', weight: 4 },
    }

    const chartItems = Object.entries(scoreByArea)
      .map(([key, areaScore]) => ({
        label: AREA_LABELS[key]?.label ?? key,
        score: areaScore,
        weight: AREA_LABELS[key]?.weight ?? 10,
      }))
      .sort((a, b) => a.score - b.score) // worst first

    if (chartItems.length > 0) {
      y = drawBarChart(doc, chartItems, 14, y)
      y += 6
    }

    // ── 4. Gap Analysis ──

    y = checkPageBreak(doc, y, 120, headerArgs)
    y = sectionTitle(doc, `Brechas Detectadas (Top ${Math.min(gapAnalysis.length, 15)})`, y)

    if (gapAnalysis.length > 0) {
      const columns = [
        { header: '#', x: 14 },
        { header: 'Hallazgo', x: 20 },
        { header: 'Base Legal', x: 120 },
        { header: 'Gravedad', x: 155 },
        { header: 'Multa (S/)', x: 180 },
      ]

      const rows = gapAnalysis.slice(0, 15).map((gap, i) => [
        String(i + 1),
        gap.text.length > 55 ? gap.text.substring(0, 52) + '...' : gap.text,
        gap.baseLegal.length > 18 ? gap.baseLegal.substring(0, 15) + '...' : gap.baseLegal,
        gap.gravedad === 'MUY_GRAVE' ? 'MUY GRAVE' : gap.gravedad,
        gap.multaPEN.toLocaleString('es-PE'),
      ])

      y = drawTable(doc, columns, rows, y, { headerArgs, zebraFill: true, rowHeight: 6 })
      y += 6
    } else {
      doc.setFontSize(9)
      doc.text('No se detectaron brechas de compliance.', 14, y)
      y += 8
    }

    // ── 5. Action Plan ──

    y = checkPageBreak(doc, y, 100, headerArgs)
    y = sectionTitle(doc, 'Plan de Accion Sugerido', y)

    if (actionPlan.length > 0) {
      for (let i = 0; i < Math.min(actionPlan.length, 10); i++) {
        const item = actionPlan[i]
        y = checkPageBreak(doc, y, 250, headerArgs)

        // Priority badge
        doc.setFillColor(sr, sg, sb)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text(`${item.priority}.`, 14, y)

        // Area
        doc.setTextColor(...([30, 58, 110] as [number, number, number]))
        doc.text(item.areaLabel, 20, y)

        // Plazo
        doc.setFontSize(7)
        doc.setTextColor(150, 150, 150)
        doc.text(item.plazoSugerido, 180, y, { align: 'right' })
        y += 4

        // Action text
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.setFontSize(7.5)
        const actionText = item.action.length > 120 ? item.action.substring(0, 117) + '...' : item.action
        doc.text(actionText, 20, y, { maxWidth: 160 })
        y += 4

        // Multa evitable
        doc.setFontSize(7)
        doc.setTextColor(239, 68, 68)
        doc.text(`Multa evitable: S/ ${item.multaEvitable.toLocaleString('es-PE')}`, 20, y)
        doc.setTextColor(150, 150, 150)
        doc.text(`Base legal: ${item.baseLegal}`, 90, y)
        y += 7

        // Separator line
        doc.setDrawColor(230, 230, 230)
        doc.line(20, y - 2, 190, y - 2)
      }
    } else {
      doc.setFontSize(9)
      doc.text('No se generaron acciones correctivas.', 14, y)
      y += 8
    }

    // ── 6. Disclaimer footer ──

    y = checkPageBreak(doc, y, 250, headerArgs)
    y += 8
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'Este informe es referencial y no constituye asesoria legal. Las multas estimadas se calculan segun D.S. 019-2006-TR',
      14, y, { maxWidth: 180 },
    )
    y += 4
    doc.text(
      'con UIT 2026 = S/ 5,500. Los montos reales dependen de factores adicionales evaluados por SUNAFIL durante la inspeccion.',
      14, y, { maxWidth: 180 },
    )

    // ─── Finalize ────────────────────────────────────────────────────────

    const filename = `COMPLY360_Diagnostico_${score}pts_${new Date().toISOString().split('T')[0]}.pdf`
    return finalizePDF(doc, filename)
  } catch (error) {
    console.error('[Diagnostic PDF] Error:', error)
    return NextResponse.json({ error: 'Error al generar PDF del diagnostico' }, { status: 500 })
  }
})
