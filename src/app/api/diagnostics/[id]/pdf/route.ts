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
import { formatSoles } from '@/lib/format/peruvian'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import { QUESTION_COUNT, areaLabel, areaWeight, formatPlazo } from '@/app/dashboard/diagnostico/_lib/diagnostic-meta'
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
      return NextResponse.json({ error: 'Diagnóstico no encontrado' }, { status: 404 })
    }

    // Parse JSON fields (Prisma JsonValue → known types via unknown)
    const scoreByArea = (diagnostic.scoreByArea ?? {}) as unknown as Record<string, number>
    const gapAnalysis = (diagnostic.gapAnalysis ?? []) as unknown as GapItem[]
    const actionPlan = (diagnostic.actionPlan ?? []) as unknown as ActionItem[]

    const org = diagnostic.organization
    const score = diagnostic.scoreGlobal
    const multa = Number(diagnostic.totalMultaRiesgo)

    // Cifras reales: cuántas preguntas respondió esta empresa (el servidor filtra
    // según régimen y tamaño), con el total del banco como respaldo.
    const answeredCount = Array.isArray(diagnostic.questionsJson) ? diagnostic.questionsJson.length : 0
    const fallbackCount = diagnostic.type === 'EXPRESS' ? QUESTION_COUNT.EXPRESS : QUESTION_COUNT.FULL
    const questionCount = answeredCount > 0 ? answeredCount : fallbackCount
    const typeName = diagnostic.type === 'EXPRESS'
      ? 'Express'
      : diagnostic.type === 'SIMULATION'
        ? 'Simulacro de inspección'
        : 'Completo'
    const type = `${typeName} (${questionCount} preguntas evaluadas)`

    // ─── Build PDF ────────────────────────────────────────────────────────

    const doc = await createPDFDoc()
    const headerArgs = {
      title: 'Informe de Diagnóstico de Compliance',
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
      : 'CRÍTICO — Acción inmediata requerida'
    doc.text(label, 55, y + 6)

    // Multa potencial
    doc.setFontSize(10)
    doc.setTextColor(239, 68, 68)
    doc.text(`Multa potencial estimada: ${formatSoles(multa)}`, 55, y + 14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)

    y += 26

    // ── 2. Metadata ──

    y = kv(doc, 'Tipo de diagnóstico', type, 14, y)
    y = kv(doc, 'Fecha de realización', new Date(diagnostic.completedAt ?? diagnostic.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }), 14, y)
    y = kv(doc, 'Empresa', org.razonSocial ?? org.name ?? '', 14, y)
    if (org.ruc) y = kv(doc, 'RUC', org.ruc, 14, y)
    if (org.sector) y = kv(doc, 'Sector', org.sector, 14, y)
    y += 4

    // ── 3. Area breakdown chart ──

    y = checkPageBreak(doc, y, 200, headerArgs)
    y = sectionTitle(doc, 'Score por Área', y)

    // Nombres y pesos reales de cada área (mismo dato que usa el motor)
    const chartItems = Object.entries(scoreByArea)
      .map(([key, areaScore]) => ({
        label: areaLabel(key),
        score: areaScore,
        weight: areaWeight(key) ?? 10,
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
      // TODO: revisar ancho columna tras refactor formato
      const columns = [
        { header: '#', x: 14 },
        { header: 'Hallazgo', x: 20 },
        { header: 'Base Legal', x: 120 },
        { header: 'Gravedad', x: 155 },
        { header: 'Multa', x: 180 },
      ]

      const rows = gapAnalysis.slice(0, 15).map((gap, i) => [
        String(i + 1),
        gap.text.length > 55 ? gap.text.substring(0, 52) + '...' : gap.text,
        gap.baseLegal.length > 18 ? gap.baseLegal.substring(0, 15) + '...' : gap.baseLegal,
        gap.gravedad === 'MUY_GRAVE' ? 'MUY GRAVE' : gap.gravedad,
        formatSoles(gap.multaPEN),
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
    y = sectionTitle(doc, 'Plan de Acción Sugerido', y)

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
        doc.text(formatPlazo(item.plazoSugerido ?? ''), 180, y, { align: 'right' })
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
        doc.text(`Multa evitable: ${formatSoles(item.multaEvitable)}`, 20, y)
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
      'Este informe es referencial y no constituye asesoría legal. Las multas estimadas se calculan según D.S. 019-2006-TR',
      14, y, { maxWidth: 180 },
    )
    y += 4
    doc.text(
      `con UIT = ${formatSoles(PERU_LABOR.UIT)}. Los montos reales dependen de factores adicionales evaluados por SUNAFIL durante la inspección.`,
      14, y, { maxWidth: 180 },
    )

    // ─── Finalize ────────────────────────────────────────────────────────

    const filename = `COMPLY360_Diagnostico_${score}pts_${new Date().toISOString().split('T')[0]}.pdf`
    return finalizePDF(doc, filename)
  } catch (error) {
    console.error('[Diagnostic PDF] Error:', error)
    return NextResponse.json({ error: 'Error al generar el PDF del diagnóstico' }, { status: 500 })
  }
})
