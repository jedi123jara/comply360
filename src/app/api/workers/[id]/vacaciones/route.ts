/**
 * GET  /api/workers/[id]/vacaciones  — Registros de vacaciones de un trabajador
 * POST /api/workers/[id]/vacaciones  — Crear nuevo período vacacional
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

const MYPE_REGIMENS = ['MYPE_MICRO', 'MYPE_PEQUENA']

export const GET = withAuthParams<{ id: string }>(
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const { id: workerId } = params

    // Select EXPLÍCITO: solo los campos que realmente usamos. Antes usábamos
    // `include: { vacations }` que hace SELECT * implícito sobre worker, y si
    // alguna columna nueva (expectedClockInHour, etc.) no existe en DB porque
    // las migraciones no se aplicaron, esto trona con 500. Esto evita ese bug.
    let worker
    try {
      worker = await prisma.worker.findFirst({
        where: { id: workerId, orgId: ctx.orgId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          department: true,
          fechaIngreso: true,
          regimenLaboral: true,
          vacations: {
            orderBy: { periodoInicio: 'asc' },
            select: {
              id: true,
              periodoInicio: true,
              periodoFin: true,
              diasCorresponden: true,
              diasGozados: true,
              diasPendientes: true,
              fechaGoce: true,
              esDoble: true,
              createdAt: true,
            },
          },
        },
      })
    } catch (err) {
      console.error(
        '[vacaciones/GET] worker fetch failed',
        err instanceof Error ? err.message : err,
      )
      return NextResponse.json(
        {
          error:
            'No se pudieron cargar las vacaciones. La base de datos necesita actualizarse desde /dashboard/admin/db-sync',
          code: 'DB_SCHEMA_MISMATCH',
          detail: err instanceof Error ? err.message.slice(0, 200) : String(err),
        },
        { status: 500 },
      )
    }

    if (!worker) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    const diasPorAnio = MYPE_REGIMENS.includes(worker.regimenLaboral) ? 15 : 30
    const anosServicio = Math.floor(
      (Date.now() - worker.fechaIngreso.getTime()) / (365.25 * 24 * 3600 * 1000),
    )

    const records = worker.vacations
    const totalDiasPendientes = records.reduce((s, r) => s + r.diasPendientes, 0)
    const periodosSinGoce = records.filter((r) => r.diasGozados === 0).length

    return NextResponse.json({
      worker: {
        id: worker.id,
        firstName: worker.firstName,
        lastName: worker.lastName,
        position: worker.position ?? '',
        department: worker.department ?? '',
        fechaIngreso: worker.fechaIngreso,
        regimenLaboral: worker.regimenLaboral,
        anosServicio,
        diasPorAnio,
      },
      records,
      summary: {
        totalPeriodos: records.length,
        totalDiasPendientes,
        periodosSinGoce,
        tieneRiesgoDoble: periodosSinGoce >= 2,
        periodosEsperados: anosServicio,
        periodsWithoutRecord: Math.max(0, anosServicio - records.length),
      },
    })
  },
)

export const POST = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, params) => {
    const { id: workerId } = params

    const worker = await prisma.worker.findFirst({
      where: { id: workerId, orgId: ctx.orgId },
      select: { id: true, regimenLaboral: true },
    })
    if (!worker) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    const body = await req.json() as {
      periodoInicio: string
      periodoFin: string
      diasCorresponden?: number
      diasGozados?: number
      fechaGoce?: string
    }

    const { periodoInicio, periodoFin, diasGozados = 0, fechaGoce } = body

    if (!periodoInicio || !periodoFin) {
      return NextResponse.json(
        { error: 'periodoInicio y periodoFin son requeridos' },
        { status: 400 },
      )
    }

    const diasPorAnio = MYPE_REGIMENS.includes(worker.regimenLaboral) ? 15 : 30
    const dias = body.diasCorresponden ?? diasPorAnio
    const gozados = Math.min(diasGozados, dias)

    const record = await prisma.vacationRecord.create({
      data: {
        workerId,
        periodoInicio: new Date(periodoInicio),
        periodoFin: new Date(periodoFin),
        diasCorresponden: dias,
        diasGozados: gozados,
        diasPendientes: dias - gozados,
        fechaGoce: fechaGoce ? new Date(fechaGoce) : null,
        esDoble: false,
      },
    })

    return NextResponse.json(record, { status: 201 })
  },
)
