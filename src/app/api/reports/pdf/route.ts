import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  createPDFDoc,
  finalizePDF,
  addHeader,
  sectionTitle,
  kv,
  drawTable,
  checkPageBreak,
} from '@/lib/pdf/server-pdf'

// ── Helpers ─────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// =============================================
// GET /api/reports/pdf — Download report as PDF
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'trabajadores'

  // Load org info
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, razonSocial: true, ruc: true },
  })

  if (!org) {
    return NextResponse.json({ error: 'Organizacion no encontrada' }, { status: 404 })
  }

  const doc = await createPDFDoc()
  const headerOrg: OrgInfo = { name: org.name ?? undefined, razonSocial: org.razonSocial, ruc: org.ruc }

  if (type === 'trabajadores') {
    return buildTrabajadoresReport(doc, headerOrg, orgId)
  }
  if (type === 'cumplimiento') {
    return buildCumplimientoReport(doc, headerOrg, orgId)
  }
  if (type === 'contratos') {
    return buildContratosReport(doc, headerOrg, orgId)
  }
  if (type === 'alertas') {
    return buildAlertasReport(doc, headerOrg, orgId)
  }

  // Default: trabajadores
  return buildTrabajadoresReport(doc, headerOrg, orgId)
})

// ── Reporte de Trabajadores ─────────────────────────────────────────────

type OrgInfo = { name?: string; razonSocial?: string | null; ruc?: string | null }

async function buildTrabajadoresReport(
  doc: Awaited<ReturnType<typeof createPDFDoc>>,
  org: OrgInfo,
  orgId: string,
) {
  addHeader(doc, 'REPORTE DE TRABAJADORES', org)

  const workers = await prisma.worker.findMany({
    where: { orgId, status: { not: 'TERMINATED' } },
    select: {
      firstName: true, lastName: true, dni: true,
      position: true, department: true, regimenLaboral: true,
      sueldoBruto: true, status: true, legajoScore: true,
      fechaIngreso: true,
    },
    orderBy: { lastName: 'asc' },
    take: 500,
  })

  let y = 52
  y = sectionTitle(doc, `PLANILLA DE TRABAJADORES (${workers.length})`, y)

  if (workers.length === 0) {
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text('No hay trabajadores registrados.', 14, y)
    return finalizePDF(doc, 'reporte-trabajadores.pdf')
  }

  y = drawTable(doc,
    [
      { header: 'Apellidos y Nombres', x: 14, width: 45 },
      { header: 'DNI', x: 60, width: 20 },
      { header: 'Cargo', x: 82, width: 30 },
      { header: 'Regimen', x: 114, width: 25 },
      { header: 'Sueldo', x: 142, width: 20, align: 'right' as const },
      { header: 'Legajo', x: 166, width: 15, align: 'right' as const },
      { header: 'Estado', x: 184, width: 12 },
    ],
    workers.map(w => [
      `${w.lastName} ${w.firstName}`.substring(0, 30),
      w.dni,
      (w.position || '—').substring(0, 20),
      (w.regimenLaboral || '').replace(/_/g, ' ').substring(0, 15),
      `S/ ${fmt(Number(w.sueldoBruto))}`,
      `${w.legajoScore ?? 0}%`,
      w.status || 'ACTIVE',
    ]),
    y,
    { fontSize: 7, zebraFill: true },
  )

  return finalizePDF(doc, 'reporte-trabajadores.pdf')
}

// ── Reporte de Cumplimiento ─────────────────────────────────────────────

async function buildCumplimientoReport(
  doc: Awaited<ReturnType<typeof createPDFDoc>>,
  org: OrgInfo,
  orgId: string,
) {
  const { calculateComplianceScore } = await import('@/lib/compliance/score-calculator')
  addHeader(doc, 'REPORTE DE CUMPLIMIENTO NORMATIVO', org)

  let y = 52

  // Score
  const score = await calculateComplianceScore(orgId)
  y = sectionTitle(doc, 'SCORE DE COMPLIANCE', y)
  y = kv(doc, 'Score Global', `${score.scoreGlobal}/100`, 14, y, 45)
  y = kv(doc, 'Multa Potencial', `S/ ${fmt(score.multaPotencial)}`, 14, y, 45)
  y += 4

  // Breakdown
  y = sectionTitle(doc, 'DESGLOSE POR AREA', y)
  for (const item of score.breakdown) {
    y = kv(doc, item.label, `${item.score}/100 (peso: ${Math.round(item.weight * 100)}%)`, 14, y, 60)
    if (item.detail) {
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text(item.detail, 76, y - 3)
    }
  }
  y += 4

  // Alerts summary
  const alerts = await prisma.workerAlert.groupBy({
    by: ['severity'],
    where: { orgId, resolvedAt: null },
    _count: true,
  })
  y = checkPageBreak(doc, y)
  y = sectionTitle(doc, 'ALERTAS PENDIENTES', y)
  for (const a of alerts) {
    y = kv(doc, a.severity, `${a._count} alertas`, 14, y, 45)
  }

  return finalizePDF(doc, 'reporte-cumplimiento.pdf')
}

// ── Reporte de Contratos ────────────────────────────────────────────────

async function buildContratosReport(
  doc: Awaited<ReturnType<typeof createPDFDoc>>,
  org: OrgInfo,
  orgId: string,
) {
  addHeader(doc, 'REPORTE DE CONTRATOS', org)

  const contracts = await prisma.contract.findMany({
    where: { orgId },
    select: {
      title: true, type: true, status: true,
      createdAt: true, expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  let y = 52
  y = sectionTitle(doc, `CONTRATOS REGISTRADOS (${contracts.length})`, y)

  if (contracts.length === 0) {
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text('No hay contratos registrados.', 14, y)
    return finalizePDF(doc, 'reporte-contratos.pdf')
  }

  y = drawTable(doc,
    [
      { header: 'Titulo', x: 14, width: 55 },
      { header: 'Tipo', x: 72, width: 30 },
      { header: 'Estado', x: 105, width: 20 },
      { header: 'Creado', x: 128, width: 25 },
      { header: 'Vencimiento', x: 156, width: 25 },
    ],
    contracts.map(c => [
      (c.title || '—').substring(0, 40),
      (c.type || '—').replace(/_/g, ' ').substring(0, 20),
      c.status || '—',
      c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-PE') : '—',
      c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('es-PE') : '—',
    ]),
    y,
    { fontSize: 8, zebraFill: true },
  )

  return finalizePDF(doc, 'reporte-contratos.pdf')
}

// ── Reporte de Alertas ──────────────────────────────────────────────────

async function buildAlertasReport(
  doc: Awaited<ReturnType<typeof createPDFDoc>>,
  org: OrgInfo,
  orgId: string,
) {
  addHeader(doc, 'REPORTE DE ALERTAS Y RIESGOS', org)

  const alerts = await prisma.workerAlert.findMany({
    where: { orgId, resolvedAt: null },
    include: { worker: { select: { firstName: true, lastName: true } } },
    orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  })

  let y = 52
  y = sectionTitle(doc, `ALERTAS PENDIENTES (${alerts.length})`, y)

  if (alerts.length === 0) {
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text('No hay alertas pendientes.', 14, y)
    return finalizePDF(doc, 'reporte-alertas.pdf')
  }

  y = drawTable(doc,
    [
      { header: 'Severidad', x: 14, width: 18 },
      { header: 'Titulo', x: 34, width: 55 },
      { header: 'Trabajador', x: 92, width: 35 },
      { header: 'Tipo', x: 130, width: 30 },
      { header: 'Fecha', x: 163, width: 25 },
    ],
    alerts.map(a => [
      a.severity,
      a.title.substring(0, 40),
      `${a.worker.firstName} ${a.worker.lastName}`.substring(0, 25),
      a.type.replace(/_/g, ' ').substring(0, 20),
      a.createdAt.toLocaleDateString('es-PE'),
    ]),
    y,
    { fontSize: 7, zebraFill: true },
  )

  return finalizePDF(doc, 'reporte-alertas.pdf')
}
