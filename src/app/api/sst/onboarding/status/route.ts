import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/sst/onboarding/status — Progreso del onboarding SST Premium
//
// Devuelve un snapshot del estado actual del módulo SST para guiar al
// usuario por el wizard. Idempotente y barato (5 counts agregados).
// =============================================
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId

  const [sedes, puestos, iperBases, ipercVigentes, accidentes] = await Promise.all([
    prisma.sede.count({ where: { orgId } }),
    prisma.puestoTrabajo.count({ where: { orgId } }),
    prisma.iPERCBase.count({ where: { orgId } }),
    prisma.iPERCBase.count({ where: { orgId, estado: 'VIGENTE' } }),
    prisma.accidente.count({ where: { orgId } }),
  ])

  // Recursos rápidos para el wizard: si ya hay sede o puesto, ofrecer el más reciente
  // como punto de partida para los siguientes pasos.
  const ultimaSede =
    sedes > 0
      ? await prisma.sede.findFirst({
          where: { orgId },
          orderBy: { createdAt: 'desc' },
          select: { id: true, nombre: true, tipoInstalacion: true, _count: { select: { puestos: true, iperBases: true } } },
        })
      : null

  const ultimoIperc =
    iperBases > 0
      ? await prisma.iPERCBase.findFirst({
          where: { orgId },
          orderBy: { createdAt: 'desc' },
          select: { id: true, version: true, estado: true, sede: { select: { id: true, nombre: true } } },
        })
      : null

  const steps = [
    {
      key: 'sede',
      label: 'Registrar primera sede',
      done: sedes > 0,
      count: sedes,
    },
    {
      key: 'puesto',
      label: 'Crear primer puesto de trabajo',
      done: puestos > 0,
      count: puestos,
    },
    {
      key: 'iperc',
      label: 'Iniciar matriz IPERC',
      done: iperBases > 0,
      count: iperBases,
    },
    {
      key: 'aprobar',
      label: 'Aprobar y publicar IPERC',
      done: ipercVigentes > 0,
      count: ipercVigentes,
    },
  ]

  const completados = steps.filter((s) => s.done).length
  const total = steps.length
  const completo = completados === total

  return NextResponse.json({
    completo,
    completados,
    total,
    porcentaje: Math.round((completados / total) * 100),
    steps,
    counts: { sedes, puestos, iperBases, ipercVigentes, accidentes },
    ultimaSede,
    ultimoIperc,
  })
})
