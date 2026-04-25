/**
 * GET /api/reports/compliance-pdf
 *
 * Genera el reporte ejecutivo de Compliance Laboral en PDF usando
 * @react-pdf/renderer (layout profesional, tipografía consistente).
 *
 * Reemplaza la versión previa basada en jsPDF. La lógica de datos (score,
 * counts) se conserva tal cual — solo cambió la capa de rendering.
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { calculateComplianceScore } from '@/lib/compliance/score-calculator'
import { ComplianceExecutivePDF } from '@/lib/pdf/react-pdf/compliance-executive'

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId

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
    return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
  }

  const score = await calculateComplianceScore(orgId)

  const [activeWorkers, activeAlerts, activeContracts, criticalAlerts] = await Promise.all([
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
    prisma.workerAlert.count({ where: { orgId, resolvedAt: null } }),
    prisma.contract.count({
      where: { orgId, status: { notIn: ['EXPIRED', 'ARCHIVED'] } },
    }),
    prisma.workerAlert.count({
      where: { orgId, resolvedAt: null, severity: 'CRITICAL' },
    }),
  ])

  const buffer = await renderToBuffer(
    <ComplianceExecutivePDF
      data={{
        org: {
          name: org.name ?? org.razonSocial ?? 'Empresa',
          razonSocial: org.razonSocial,
          ruc: org.ruc,
          sector: org.sector,
          plan: org.plan,
          regimenPrincipal: org.regimenPrincipal,
        },
        scoreGlobal: score.scoreGlobal,
        multaPotencial: score.multaPotencial,
        activeWorkers,
        activeAlerts,
        criticalAlerts,
        activeContracts,
        breakdown: score.breakdown,
      }}
    />,
  )

  // @react-pdf/renderer devuelve Buffer — copia a ArrayBuffer para satisfacer BodyInit.
  const ab = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(ab).set(buffer)
  return new NextResponse(new Blob([ab], { type: 'application/pdf' }), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="reporte-compliance-ejecutivo.pdf"',
      'Cache-Control': 'no-store',
    },
  })
})
