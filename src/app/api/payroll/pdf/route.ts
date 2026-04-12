/**
 * GET /api/payroll/pdf?periodo=YYYY-MM
 *
 * Genera un PDF resumen de la planilla del período:
 * portada con totales + tabla detallada por trabajador.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  createPDFDoc,
  finalizePDF,
  addHeader,
  sectionTitle,
  drawTable,
  type TableColumn,
} from '@/lib/pdf/server-pdf'

export const runtime = 'nodejs'

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPeriodo(p: string): string {
  const [y, m] = p.split('-')
  return `${MESES[parseInt(m ?? '1', 10)]} ${y}`
}

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') ?? ''

  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ error: 'Período inválido' }, { status: 400 })
  }

  const orgId = ctx.orgId
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, razonSocial: true, ruc: true },
  })

  const workers = await prisma.worker.findMany({
    where: { orgId, status: 'ACTIVE' },
    orderBy: [{ department: 'asc' }, { lastName: 'asc' }],
    include: {
      payslips: {
        where: { periodo },
        take: 1,
        select: {
          totalIngresos: true,
          totalDescuentos: true,
          netoPagar: true,
          aporteAfpOnp: true,
          rentaQuintaCat: true,
          essalud: true,
          status: true,
        },
      },
    },
  })

  const withPayslip = workers.filter(w => w.payslips[0])
  const totalIngresos = withPayslip.reduce((s, w) => s + Number(w.payslips[0]!.totalIngresos), 0)
  const totalDescuentos = withPayslip.reduce((s, w) => s + Number(w.payslips[0]!.totalDescuentos), 0)
  const totalNeto = withPayslip.reduce((s, w) => s + Number(w.payslips[0]!.netoPagar), 0)
  const totalEssalud = withPayslip.reduce((s, w) => s + Number(w.payslips[0]!.essalud ?? 0), 0)
  const totalAfpOnp = withPayslip.reduce((s, w) => s + Number(w.payslips[0]!.aporteAfpOnp ?? 0), 0)
  const totalRenta = withPayslip.reduce((s, w) => s + Number(w.payslips[0]!.rentaQuintaCat ?? 0), 0)

  const doc = await createPDFDoc()
  const W = doc.internal.pageSize.getWidth()
  const headerOrg = { name: org?.name, razonSocial: org?.razonSocial, ruc: org?.ruc }
  const periodoLabel = fmtPeriodo(periodo)

  addHeader(doc, 'PLANILLA DE REMUNERACIONES', headerOrg, periodoLabel)

  let y = 52

  // ── KPI summary boxes ────────────────────────────────────────────────────────
  const boxW = (W - 28 - 8) / 3
  const kpis: { label: string; value: string; color: [number, number, number] }[] = [
    { label: 'Masa Salarial (Ingresos)', value: `S/ ${fmt(totalIngresos)}`, color: [30, 58, 110] },
    { label: 'Neto a Pagar', value: `S/ ${fmt(totalNeto)}`, color: [22, 163, 74] },
    { label: 'Costo Empleador', value: `S/ ${fmt(totalIngresos + totalEssalud)}`, color: [124, 58, 237] },
  ]

  for (let i = 0; i < kpis.length; i++) {
    const kpi = kpis[i]
    const bx = 14 + i * (boxW + 4)
    doc.setFillColor(...kpi.color)
    doc.rect(bx, y, boxW, 18, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(kpi.label, bx + 3, y + 6)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(kpi.value, bx + 3, y + 14)
  }
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  y += 26

  // ── Secondary metrics ─────────────────────────────────────────────────────────
  y = sectionTitle(doc, 'RESUMEN DE APORTES Y DESCUENTOS', y)
  const metrics = [
    { label: 'Total AFP/ONP Trabajadores', value: `S/ ${fmt(totalAfpOnp)}` },
    { label: 'Renta 5ta Categoría Retenida', value: `S/ ${fmt(totalRenta)}` },
    { label: 'Total Descuentos Trabajadores', value: `S/ ${fmt(totalDescuentos)}` },
    { label: 'EsSalud Empleador (9%)', value: `S/ ${fmt(totalEssalud)}` },
    { label: 'Trabajadores con boleta', value: `${withPayslip.length} / ${workers.length}` },
  ]

  const halfW = (W - 28) / 2
  for (let i = 0; i < metrics.length; i++) {
    const col = i % 2 === 0 ? 14 : 14 + halfW + 4
    if (i % 2 === 0 && i > 0) y += 6
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(metrics[i].label, col, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(metrics[i].value, col + halfW - 4, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    if (i % 2 === 1) y += 6
  }
  y += 10

  // ── Detail table ──────────────────────────────────────────────────────────────
  y = sectionTitle(doc, 'DETALLE POR TRABAJADOR', y)

  const columns: TableColumn[] = [
    { header: 'DNI', x: 14, width: 18 },
    { header: 'Trabajador', x: 36, width: 50 },
    { header: 'Área', x: 88, width: 30 },
    { header: 'Ingresos', x: 122, align: 'right' },
    { header: 'Descuentos', x: 148, align: 'right' },
    { header: 'Neto', x: 175, align: 'right' },
    { header: 'EsSalud', x: 197, align: 'right' },
  ]

  const rows: string[][] = []
  let runningIngresos = 0
  let runningDescuentos = 0
  let runningNeto = 0
  let runningEssalud = 0

  for (const w of workers) {
    const p = w.payslips[0]
    if (!p) {
      rows.push([w.dni, `${w.lastName}, ${w.firstName}`.slice(0, 30), w.department?.slice(0, 14) ?? '', '—', '—', 'PENDIENTE', '—'])
      continue
    }
    const ing = Number(p.totalIngresos)
    const des = Number(p.totalDescuentos)
    const net = Number(p.netoPagar)
    const ess = Number(p.essalud ?? 0)
    runningIngresos += ing
    runningDescuentos += des
    runningNeto += net
    runningEssalud += ess
    rows.push([
      w.dni,
      `${w.lastName}, ${w.firstName}`.slice(0, 32),
      (w.department ?? '').slice(0, 14),
      fmt(ing),
      fmt(des),
      fmt(net),
      fmt(ess),
    ])
  }

  // Totals row
  rows.push([
    '', 'TOTALES', '',
    fmt(runningIngresos),
    fmt(runningDescuentos),
    fmt(runningNeto),
    fmt(runningEssalud),
  ])

  y = drawTable(doc, columns, rows, y, {
    zebraFill: true,
    rowHeight: 5.5,
    fontSize: 7.5,
    headerArgs: {
      title: 'PLANILLA DE REMUNERACIONES',
      org: headerOrg,
      subtitle: periodoLabel,
    },
  })

  // ── Legal footnote ────────────────────────────────────────────────────────────
  y += 6
  doc.setFontSize(6.5)
  doc.setTextColor(150, 150, 150)
  doc.text(
    'Documento generado por COMPLY360. Planilla de remuneraciones conforme D.S. 003-97-TR y D.S. 009-2011-TR. ' +
    'EsSalud calculado a la tasa vigente del 9% (Ley 26790).',
    14, y, { maxWidth: W - 28 },
  )

  const fileName = `planilla-${periodo}.pdf`
  return finalizePDF(doc, fileName)
})
