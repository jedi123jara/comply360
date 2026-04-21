import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { calculateComplianceScore } from '@/lib/compliance/score-calculator'
import {
  createPDFDoc,
  finalizePDF,
  addHeader,
  sectionTitle,
  kv,
  drawScoreBadge,
  drawBarChart,
  drawTable,
  checkPageBreak,
} from '@/lib/pdf/server-pdf'

// ── Helpers ─────────────────────────────────────────────────────────────
function fmtMoney(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

// =============================================
// GET /api/reports/compliance-pdf
// Generates a comprehensive compliance PDF report
// for the authenticated user's organization.
// =============================================
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId

  // 1. Load org info
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      razonSocial: true,
      ruc: true,
      sector: true,
      sizeRange: true,
      plan: true,
      regimenPrincipal: true,
    },
  })

  if (!org) {
    return NextResponse.json({ error: 'Organizacion no encontrada' }, { status: 404 })
  }

  // 2. Calculate compliance score (also persists snapshot)
  const score = await calculateComplianceScore(orgId)

  // 3. Fetch additional counts in parallel
  const [
    activeWorkers,
    activeAlerts,
    activeContracts,
    criticalAlerts,
  ] = await Promise.all([
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
    prisma.workerAlert.count({ where: { orgId, resolvedAt: null } }),
    prisma.contract.count({
      where: { orgId, status: { notIn: ['EXPIRED', 'ARCHIVED'] } },
    }),
    prisma.workerAlert.count({
      where: { orgId, resolvedAt: null, severity: 'CRITICAL' },
    }),
  ])

  // 4. Build PDF
  const doc = await createPDFDoc()
  const orgInfo = {
    name: org.name ?? undefined,
    razonSocial: org.razonSocial,
    ruc: org.ruc,
  }

  // ── Page 1: Header + Score ──────────────────────────────────────────
  addHeader(doc, 'REPORTE DE COMPLIANCE LABORAL', orgInfo)

  let y = 52

  // Company details
  y = sectionTitle(doc, 'DATOS DE LA EMPRESA', y)
  y = kv(doc, 'Razon Social', org.razonSocial || org.name || '—', 14, y, 40)
  y = kv(doc, 'RUC', org.ruc || 'No registrado', 14, y, 40)
  y = kv(doc, 'Sector', org.sector || 'No especificado', 14, y, 40)
  y = kv(doc, 'Plan', org.plan || '—', 14, y, 40)
  y = kv(doc, 'Regimen', (org.regimenPrincipal || 'GENERAL').replace(/_/g, ' '), 14, y, 40)
  y = kv(doc, 'Fecha del reporte', fmtDate(new Date()), 14, y, 40)
  y += 4

  // ── Score Global ────────────────────────────────────────────────────
  y = sectionTitle(doc, 'SCORE GLOBAL DE COMPLIANCE', y)

  // Draw the score badge
  drawScoreBadge(doc, score.scoreGlobal, 40, y + 10, 'large')

  // Score interpretation text
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  const scoreLabel = score.scoreGlobal >= 80
    ? 'CUMPLIMIENTO SATISFACTORIO'
    : score.scoreGlobal >= 60
      ? 'REQUIERE ATENCION'
      : 'RIESGO CRITICO'
  const [sr, sg, sb] = score.scoreGlobal >= 80
    ? [34, 197, 94]
    : score.scoreGlobal >= 60
      ? [245, 158, 11]
      : [239, 68, 68]
  doc.setTextColor(sr, sg, sb)
  doc.text(`${score.scoreGlobal}/100`, 65, y + 8)
  doc.setFontSize(9)
  doc.text(scoreLabel, 65, y + 15)
  doc.setTextColor(60, 60, 60)
  doc.setFont('helvetica', 'normal')
  y += 30

  // ── Key metrics ─────────────────────────────────────────────────────
  y = sectionTitle(doc, 'METRICAS PRINCIPALES', y)
  y = kv(doc, 'Total trabajadores activos', String(activeWorkers), 14, y, 55)
  y = kv(doc, 'Alertas pendientes', String(activeAlerts), 14, y, 55)
  y = kv(doc, 'Alertas criticas', String(criticalAlerts), 14, y, 55)
  y = kv(doc, 'Contratos activos', String(activeContracts), 14, y, 55)
  y = kv(doc, 'Multa potencial estimada', `S/ ${fmtMoney(score.multaPotencial)}`, 14, y, 55)
  y += 4

  // ── Breakdown by area (bar chart) ──────────────────────────────────
  y = checkPageBreak(doc, y, 220, { title: 'REPORTE DE COMPLIANCE LABORAL', org: orgInfo })
  y = sectionTitle(doc, 'DESGLOSE POR AREA', y)
  y = drawBarChart(doc, score.breakdown, 14, y)
  y += 6

  // ── Breakdown table ─────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 220, { title: 'REPORTE DE COMPLIANCE LABORAL', org: orgInfo })
  y = sectionTitle(doc, 'DETALLE DE AREAS', y)

  y = drawTable(
    doc,
    [
      { header: 'Area', x: 14, width: 50 },
      { header: 'Score', x: 75, width: 15, align: 'right' as const },
      { header: 'Peso', x: 100, width: 12, align: 'right' as const },
      { header: 'Detalle', x: 118, width: 70 },
    ],
    score.breakdown.map(item => [
      item.label,
      `${item.score}/100`,
      `${item.weight}%`,
      item.detail.substring(0, 50),
    ]),
    y,
    {
      fontSize: 8,
      zebraFill: true,
      headerArgs: { title: 'REPORTE DE COMPLIANCE LABORAL', org: orgInfo },
    },
  )
  y += 6

  // ── Multa potencial section ─────────────────────────────────────────
  y = checkPageBreak(doc, y, 250, { title: 'REPORTE DE COMPLIANCE LABORAL', org: orgInfo })
  y = sectionTitle(doc, 'ESTIMACION DE MULTA POTENCIAL', y)

  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(
    'La multa potencial es una estimacion basada en las alertas pendientes y documentos faltantes,',
    14, y,
  )
  y += 5
  doc.text(
    'calculada segun el cuadro de infracciones del D.S. 019-2006-TR y la UIT vigente (S/ 5,500).',
    14, y,
  )
  y += 8

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(239, 68, 68)
  doc.text(`S/ ${fmtMoney(score.multaPotencial)}`, 14, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  y += 8

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(
    'Nota: Subsanacion voluntaria antes de inspeccion reduce la multa en 90% (Art. 40 Ley 28806).',
    14, y,
  )
  y += 12

  // ── Footer line ─────────────────────────────────────────────────────
  y = checkPageBreak(doc, y)
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, 196, y)
  y += 6
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Generado por COMPLY360 — comply360.pe', 14, y)
  doc.text('Este documento es informativo. No constituye asesoria legal.', 14, y + 5)

  return finalizePDF(doc, 'reporte-compliance-laboral.pdf')
})
