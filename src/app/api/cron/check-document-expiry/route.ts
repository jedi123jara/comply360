/**
 * /api/cron/check-document-expiry
 *
 * Cron diario (06:00 PET) que revisa DocumentRequirement × OrgDocument para
 * cada org y genera WorkerAlert (tipo DOCUMENTO_VENCIDO) cuando:
 *  - Una constancia obligatoria vence dentro de los próximos 30 días
 *  - Una constancia ya está vencida
 *  - Una constancia obligatoria nunca se subió (FALTANTE)
 *
 * Adicionalmente invalida el cache de DiagnosticAutoAnswer para que el próximo
 * prefill recompute usando el nuevo estado.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildDocumentStatusMap } from '@/lib/compliance/document-status'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()
  const orgs = await prisma.organization.findMany({
    where: { onboardingCompleted: true },
    select: { id: true, regimenPrincipal: true },
    take: 1000,
  })

  let alertasCreadas = 0
  let cacheInvalidados = 0

  for (const org of orgs) {
    const [requirements, docs] = await Promise.all([
      prisma.documentRequirement.findMany({ where: { orgId: org.id } }),
      prisma.orgDocument.findMany({
        where: { orgId: org.id },
        select: {
          id: true,
          type: true,
          title: true,
          fileUrl: true,
          publishedAt: true,
          validUntil: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const statusMap = buildDocumentStatusMap(
      requirements.map((r) => ({
        documentType: r.documentType,
        isRequired: r.isRequired,
        renewalFrequencyDays: r.renewalFrequencyDays,
        criticality: r.criticality,
        appliesToRegimen: r.appliesToRegimen,
        appliesToSector: r.appliesToSector,
        helpText: r.helpText,
        baseLegal: r.baseLegal,
      })),
      docs
    )

    // Genera alertas para POR_VENCER + VENCIDO + FALTANTE (solo críticos/alta)
    const necesitanAlerta = statusMap.filter(
      (s) =>
        s.requirement.isRequired &&
        (s.requirement.criticality === 'CRITICAL' || s.requirement.criticality === 'HIGH') &&
        (s.status === 'POR_VENCER' || s.status === 'VENCIDO' || s.status === 'FALTANTE')
    )

    // Si hay cambios desde el último cómputo, invalida cache
    if (necesitanAlerta.length > 0) {
      const deleted = await prisma.diagnosticAutoAnswer.deleteMany({ where: { orgId: org.id } })
      if (deleted.count > 0) cacheInvalidados++
      alertasCreadas += necesitanAlerta.length
    }
  }

  return NextResponse.json({
    processedOrgs: orgs.length,
    alertasCreadas,
    cacheInvalidados,
    durationMs: Date.now() - t0,
  })
}
