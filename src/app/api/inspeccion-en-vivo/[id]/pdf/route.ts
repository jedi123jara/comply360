/**
 * GET /api/inspeccion-en-vivo/[id]/pdf
 *
 * Generates a professional PDF report for a completed live inspection.
 * Includes: score, hallazgos table, multa breakdown, subsanation plan,
 * evidence inventory, and inspector/company signatures.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { HallazgoInspeccion, ResultadoSimulacro } from '@/lib/compliance/simulacro-engine'
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

function drawBox(doc: JsPDFDoc, label: string, value: string, x: number, y: number, w: number, color: readonly [number, number, number]) {
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

export const GET = withAuthParams<{ id: string }>(async (_req, ctx, params) => {
  try {
    const session = await prisma.inspeccionEnVivo.findUnique({
      where: { id: params.id },
      include: {
        organization: { select: { name: true, razonSocial: true, ruc: true } },
      },
    })

    if (!session || session.orgId !== ctx.orgId) {
      return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
    }

    const org = session.organization
    const hallazgos = (session.hallazgosJson ?? []) as unknown as HallazgoInspeccion[]
    const resultado = (session.resultadoJson ?? null) as unknown as ResultadoSimulacro | null
    const evidencias = (session.evidenciasJson ?? {}) as Record<string, string[]>
    const score = session.scoreInspeccion ?? resultado?.scoreSimulacro ?? 0
    const multaTotal = resultado?.multaTotal ?? Number(session.multaEstimada ?? 0)
    const multaSub90 = resultado?.multaConSubsanacion ?? Math.round(multaTotal * 0.1)
    const multaSub70 = resultado?.multaConSubsanacionDurante ?? Math.round(multaTotal * 0.3)

    const incumplimientos = hallazgos.filter(h => h.estado === 'NO_CUMPLE' || h.estado === 'PARCIAL')
    const totalEvidencias = Object.values(evidencias).reduce((sum, arr) => sum + arr.length, 0)

    const fechaInicio = new Date(session.startedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
    const horaInicio = new Date(session.startedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

    // ─── Build PDF ────────────────────────────────────────────────

    const doc = await createPDFDoc()
    const orgInfo = { name: org.name, razonSocial: org.razonSocial, ruc: org.ruc }
    const headerArgs = { title: 'Informe de Inspeccion en Vivo', org: orgInfo, subtitle: 'COMPLY360 — Modo Crisis' }

    addHeader(doc, headerArgs.title, orgInfo, headerArgs.subtitle)
    let y = 56

    // ── I. Datos ──
    y = sectionTitle(doc, 'I. Datos de la Inspeccion', y)
    y = kv(doc, 'Empresa', org.razonSocial ?? org.name, 14, y)
    if (org.ruc) y = kv(doc, 'RUC', org.ruc, 14, y)
    y = kv(doc, 'Tipo de inspeccion', session.tipo, 14, y)
    y = kv(doc, 'Fecha y hora de inicio', `${fechaInicio} — ${horaInicio} hrs.`, 14, y)
    if (session.inspectorName) y = kv(doc, 'Inspector SUNAFIL', session.inspectorName, 14, y)
    if (session.inspectorDNI) y = kv(doc, 'DNI Inspector', session.inspectorDNI, 14, y)
    if (session.ordenInspeccion) y = kv(doc, 'Orden de Inspeccion', session.ordenInspeccion, 14, y)
    y = kv(doc, 'Estado', session.status === 'COMPLETED' ? 'FINALIZADA' : session.status, 14, y)
    y = kv(doc, 'Evidencias adjuntadas', String(totalEvidencias), 14, y)
    y += 4

    // ── II. Resultado ──
    y = sectionTitle(doc, 'II. Resultado Global', y)

    const [sr, sg, sb] = score >= 80 ? [34, 197, 94] as const : score >= 60 ? [245, 158, 11] as const : [239, 68, 68] as const
    doc.setFontSize(28)
    doc.setTextColor(sr, sg, sb)
    doc.setFont('helvetica', 'bold')
    doc.text(`${score}/100`, 14, y + 10)
    doc.setFontSize(10)
    doc.text(score >= 80 ? 'NIVEL ACEPTABLE' : score >= 60 ? 'EN RIESGO' : 'NIVEL CRITICO', 50, y + 6)
    doc.setFontSize(9)
    doc.setTextColor(239, 68, 68)
    doc.text(`Multa estimada: S/ ${multaTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 50, y + 13)
    y += 22

    // Summary boxes
    const bw = 40
    const bg = 4
    drawBox(doc, 'Cumple', String(resultado?.cumple ?? 0), 14, y, bw, [34, 197, 94])
    drawBox(doc, 'Parcial', String(resultado?.parcial ?? 0), 14 + bw + bg, y, bw, [245, 158, 11])
    drawBox(doc, 'Incumple', String(resultado?.noCumple ?? 0), 14 + (bw + bg) * 2, y, bw, [239, 68, 68])
    drawBox(doc, 'Total', String(resultado?.totalSolicitudes ?? hallazgos.length), 14 + (bw + bg) * 3, y, bw, [30, 58, 110])
    y += 26

    // ── III. Hallazgos ──
    y = checkPageBreak(doc, y, 80, headerArgs)
    y = sectionTitle(doc, 'III. Hallazgos Detallados', y)

    const hCols = [
      { header: '#', x: 14 },
      { header: 'Documento', x: 20 },
      { header: 'Base Legal', x: 90 },
      { header: 'Estado', x: 132 },
      { header: 'Gravedad', x: 156 },
      { header: 'Multa', x: 185, align: 'right' as const },
    ]

    const hRows = hallazgos.map((h, i) => {
      const estado = h.estado === 'CUMPLE' ? 'OK' : h.estado === 'PARCIAL' ? 'PARCIAL' : h.estado === 'NO_CUMPLE' ? 'FALTA' : 'N/A'
      return [
        String(i + 1),
        (h.documentoLabel ?? '').substring(0, 35),
        (h.baseLegal ?? '').substring(0, 20),
        estado,
        h.gravedad ?? '',
        h.multaPEN ? `S/${h.multaPEN.toLocaleString('es-PE')}` : '—',
      ]
    })

    y = drawTable(doc, hCols, hRows, y, { headerArgs, zebraFill: true, fontSize: 7, rowHeight: 5.5 })
    y += 6

    // ── IV. Escala de Multas ──
    y = checkPageBreak(doc, y, 60, headerArgs)
    y = sectionTitle(doc, 'IV. Escala de Multas segun Subsanacion', y)

    const mCols = [
      { header: 'Escenario', x: 14 },
      { header: 'Descuento', x: 120 },
      { header: 'Multa', x: 185, align: 'right' as const },
    ]
    const mRows = [
      ['Sin subsanacion', '0%', `S/ ${multaTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`],
      ['Subsanacion DURANTE inspeccion', 'Hasta 70%', `S/ ${multaSub70.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`],
      ['Subsanacion ANTES de inspeccion', '90%', `S/ ${multaSub90.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`],
    ]
    y = drawTable(doc, mCols, mRows, y, { headerArgs, fontSize: 8, rowHeight: 7 })
    y += 6

    // ── V. Plan de Subsanacion ──
    if (incumplimientos.length > 0) {
      y = checkPageBreak(doc, y, 60, headerArgs)
      y = sectionTitle(doc, 'V. Acciones de Subsanacion Requeridas', y)

      const sCols = [
        { header: '#', x: 14 },
        { header: 'Infraccion', x: 20 },
        { header: 'Plazo', x: 130 },
        { header: 'Fecha Limite', x: 160 },
      ]
      const sRows = incumplimientos.slice(0, 20).map((h, i) => {
        const dias = h.gravedad === 'MUY_GRAVE' ? 10 : h.gravedad === 'GRAVE' ? 30 : 15
        const deadline = new Date(session.startedAt)
        deadline.setDate(deadline.getDate() + dias)
        return [
          String(i + 1),
          (h.documentoLabel ?? '').substring(0, 50),
          `${dias} dias`,
          deadline.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        ]
      })
      y = drawTable(doc, sCols, sRows, y, { headerArgs, zebraFill: true, fontSize: 7 })
      y += 6
    }

    // ── Firmas ──
    y = checkPageBreak(doc, y, 50, headerArgs)
    y += 10
    const sigY = y + 20

    doc.setDrawColor(30, 30, 30)
    doc.line(14, sigY, 85, sigY)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(org.razonSocial ?? org.name, 14, sigY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    if (org.ruc) doc.text(`RUC: ${org.ruc}`, 14, sigY + 9)
    doc.text('Representante Legal / RRHH', 14, sigY + 13)

    doc.line(115, sigY, 196, sigY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(session.inspectorName ?? 'Inspector SUNAFIL', 115, sigY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    if (session.inspectorDNI) doc.text(`DNI: ${session.inspectorDNI}`, 115, sigY + 9)
    if (session.ordenInspeccion) doc.text(`Orden: ${session.ordenInspeccion}`, 115, sigY + 13)

    // Disclaimer
    doc.setFontSize(6.5)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'Informe generado por COMPLY360 durante inspeccion en vivo. Referencial y preventivo. Base: R.M. 199-2016-TR, D.S. 019-2006-TR, Ley 28806.',
      14, sigY + 22, { maxWidth: 180 },
    )

    const filename = `COMPLY360_Inspeccion_${score}pts_${new Date().toISOString().split('T')[0]}.pdf`
    return finalizePDF(doc, filename)
  } catch (error) {
    console.error('[InspeccionEnVivo PDF] Error:', error)
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 })
  }
})
