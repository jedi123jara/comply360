/**
 * GET  /api/decisiones/sunafil — Snapshot del estado SUNAFIL (último diagnóstico,
 *                                tareas críticas, score, multa potencial).
 * POST /api/decisiones/sunafil — Crea ComplianceTask agregadora "Plan SUNAFIL"
 *                                con resumen de acciones priorizadas.
 *
 * Wizard simple — no inicia inspección real, solo organiza el plan de
 * preparación y deja una tarea de seguimiento.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

interface SunafilSnapshot {
  lastDiagnostic: {
    id: string
    type: string
    scoreGlobal: number
    completedAt: string | null
    createdAt: string
  } | null
  openTasks: number
  criticalTasks: number
  topTasks: Array<{
    id: string
    title: string
    gravedad: string
    multaEvitable: number
    dueDate: string | null
    area: string
  }>
  multaEvitableTotal: number
}

async function buildSnapshot(orgId: string): Promise<SunafilSnapshot> {
  const [lastDiagnostic, tasks, multaAggregate] = await Promise.all([
    prisma.complianceDiagnostic.findFirst({
      where: { orgId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        type: true,
        scoreGlobal: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    prisma.complianceTask.findMany({
      where: {
        orgId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      take: 10,
    }),
    prisma.complianceTask.aggregate({
      where: {
        orgId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      _sum: { multaEvitable: true },
    }),
  ])

  const openTasks = await prisma.complianceTask.count({
    where: { orgId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
  })
  const criticalTasks = await prisma.complianceTask.count({
    where: { orgId, status: { in: ['PENDING', 'IN_PROGRESS'] }, gravedad: 'MUY_GRAVE' },
  })

  return {
    lastDiagnostic: lastDiagnostic
      ? {
          id: lastDiagnostic.id,
          type: lastDiagnostic.type,
          scoreGlobal: lastDiagnostic.scoreGlobal,
          completedAt: lastDiagnostic.completedAt?.toISOString() ?? null,
          createdAt: lastDiagnostic.createdAt.toISOString(),
        }
      : null,
    openTasks,
    criticalTasks,
    topTasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      gravedad: t.gravedad,
      multaEvitable: t.multaEvitable ? Number(t.multaEvitable) : 0,
      dueDate: t.dueDate?.toISOString() ?? null,
      area: t.area,
    })),
    multaEvitableTotal: Number(multaAggregate._sum.multaEvitable ?? 0),
  }
}

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const snapshot = await buildSnapshot(ctx.orgId)
  return NextResponse.json({ data: snapshot })
})

export const POST = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const snapshot = await buildSnapshot(ctx.orgId)

  const description = snapshot.lastDiagnostic
    ? `Plan de preparación para inspección SUNAFIL basado en diagnóstico del ${new Date(snapshot.lastDiagnostic.createdAt).toLocaleDateString('es-PE')} (score ${snapshot.lastDiagnostic.scoreGlobal}/100). ${snapshot.openTasks} tareas abiertas (${snapshot.criticalTasks} críticas). Multa evitable estimada: S/${snapshot.multaEvitableTotal.toLocaleString('es-PE')}.`
    : `Plan de preparación inicial para inspección SUNAFIL. No hay diagnóstico previo — el primer paso es correr /dashboard/diagnostico.`

  const task = await prisma.complianceTask.create({
    data: {
      orgId: ctx.orgId,
      sourceId: `sunafil-prep:${Date.now()}`,
      area: 'SUNAFIL',
      priority: 1,
      title: `Plan de preparación SUNAFIL (${new Date().toLocaleDateString('es-PE')})`,
      description,
      baseLegal: 'Ley 28806 · D.S. 019-2006-TR',
      gravedad: snapshot.criticalTasks > 0 ? 'GRAVE' : 'LEVE',
      multaEvitable: snapshot.multaEvitableTotal,
      plazoSugerido: 'Corto plazo (30 dias)',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  })

  return NextResponse.json(
    {
      data: {
        snapshot,
        taskId: task.id,
      },
      links: {
        diagnostico: '/dashboard/diagnostico',
        simulacro: '/dashboard/simulacro',
        sunafilReady: '/dashboard/sunafil-ready',
        planAccion: '/dashboard/plan-accion',
      },
    },
    { status: 201 },
  )
})
