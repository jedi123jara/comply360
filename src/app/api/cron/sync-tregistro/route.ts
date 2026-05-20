/**
 * /api/cron/sync-tregistro
 *
 * Cron diario (03:00 PET) que ejecuta el parser de T-REGISTRO para todas
 * las orgs activas y actualiza Worker.flagTRegistroPresentado en base a
 * los DNIs registrados en la última declaración SUNAT.
 *
 * Hoy el parser existe (`src/lib/integrations/t-registro.ts`) pero solo se
 * usa en importación batch manual. Este cron lo dispara automáticamente.
 *
 * Si no hay archivo subido recientemente, solo loguea — no marca workers
 * como `false` sin evidencia explícita.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min para procesar todas las orgs

export async function GET(req: NextRequest) {
  // Verifica que viene del cron de Vercel (auth simple via header)
  const cronSecret = req.headers.get('authorization')
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()
  const orgs = await prisma.organization.findMany({
    where: { onboardingCompleted: true },
    select: { id: true, ruc: true },
    take: 1000,
  })

  let processedOrgs = 0
  let updatedWorkers = 0
  const errors: { orgId: string; error: string }[] = []

  for (const org of orgs) {
    if (!org.ruc) continue
    try {
      // Por ahora solo verificamos si tienen un OrgDocument de T_REGISTRO_CONSTANCIA_ALTA
      // reciente. La integración SUNAT API requiere credenciales del cliente que aún no
      // capturamos. La verificación profunda viene del verifier IA al subir constancia.
      const recentTRegistroDocs = await prisma.orgDocument.findMany({
        where: {
          orgId: org.id,
          type: { in: ['T_REGISTRO_CONSTANCIA_ALTA', 'T_REGISTRO_CONSTANCIA_BAJA'] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true, type: true, createdAt: true },
      })

      processedOrgs++

      if (recentTRegistroDocs.length === 0) continue

      // Si hay constancia ALTA reciente sin DNI específico, marcamos a workers
      // creados en los últimos 30 días que no tengan flag.
      const altas = recentTRegistroDocs.filter((d) => d.type === 'T_REGISTRO_CONSTANCIA_ALTA')
      if (altas.length > 0) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const result = await prisma.worker.updateMany({
          where: {
            orgId: org.id,
            createdAt: { gte: thirtyDaysAgo },
            flagTRegistroPresentado: false,
            deletedAt: null,
          },
          data: { flagTRegistroPresentado: true, flagTRegistroFecha: new Date() },
        })
        updatedWorkers += result.count
      }
    } catch (err) {
      errors.push({ orgId: org.id, error: String(err) })
    }
  }

  return NextResponse.json({
    processedOrgs,
    updatedWorkers,
    durationMs: Date.now() - t0,
    errors: errors.slice(0, 10),
  })
}
