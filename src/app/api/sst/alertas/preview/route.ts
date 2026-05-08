import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { evaluarReglasSst, resumirAlertas } from '@/lib/sst/calendar-engine'

// =============================================
// GET /api/sst/alertas/preview
//
// Devuelve qué alertas SST se generarían AHORA según las reglas del
// calendarizador, sin persistir nada. Útil para debugging y para mostrar
// el estado actual en el dashboard SST.
// =============================================
export const GET = withPlanGate('sst_completo', async (_req: NextRequest, ctx: AuthContext) => {
  const [emos, ipercs, accidentes, comites] = await Promise.all([
    prisma.eMO.findMany({
      where: { orgId: ctx.orgId, proximoExamenAntes: { not: null } },
      select: { id: true, workerId: true, proximoExamenAntes: true },
    }),
    prisma.iPERCBase.findMany({
      where: { orgId: ctx.orgId, estado: 'VIGENTE', fechaAprobacion: { not: null } },
      select: { id: true, sedeId: true, estado: true, fechaAprobacion: true },
    }),
    prisma.accidente.findMany({
      where: {
        orgId: ctx.orgId,
        satEstado: { in: ['PENDIENTE', 'EN_PROCESO', 'RECHAZADO'] },
      },
      select: {
        id: true,
        workerId: true,
        fechaHora: true,
        plazoLegalHoras: true,
        satEstado: true,
      },
    }),
    prisma.comiteSST.findMany({
      where: { orgId: ctx.orgId, estado: 'VIGENTE' },
      select: { id: true, estado: true, mandatoFin: true },
    }),
  ])

  const proyectadas = evaluarReglasSst(
    {
      emos: emos.map((e) => ({
        id: e.id,
        workerId: e.workerId,
        proximoExamenAntes: e.proximoExamenAntes,
      })),
      ipercBases: ipercs.map((i) => ({
        id: i.id,
        sedeId: i.sedeId,
        estado: i.estado,
        fechaAprobacion: i.fechaAprobacion,
      })),
      accidentes: accidentes.map((a) => ({
        id: a.id,
        workerId: a.workerId,
        fechaHora: a.fechaHora,
        plazoLegalHoras: a.plazoLegalHoras,
        satEstado: a.satEstado,
      })),
      comites: comites.map((c) => ({
        id: c.id,
        estado: c.estado,
        mandatoFin: c.mandatoFin,
      })),
    },
    new Date(),
  )

  return NextResponse.json({
    alertas: proyectadas.map((a) => ({
      type: a.type,
      severity: a.severity,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate?.toISOString() ?? null,
      workerId: a.workerId,
      fingerprint: a.fingerprint,
    })),
    resumen: resumirAlertas(proyectadas),
    snapshot: {
      emos: emos.length,
      ipercVigentes: ipercs.length,
      accidentesAbiertos: accidentes.length,
      comitesVigentes: comites.length,
    },
  })
})
