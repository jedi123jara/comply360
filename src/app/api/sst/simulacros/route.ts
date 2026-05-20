/**
 * /api/sst/simulacros — CRUD simulacros de emergencia (INDECI).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

export const GET = withPlanGate('diagnostico', async (_req: NextRequest, ctx: AuthContext) => {
  const rows = await prisma.simulacro.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { fechaProgramada: 'desc' },
  })
  return NextResponse.json({ simulacros: rows })
})

export const POST = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const {
      tipo,
      fechaProgramada,
      fechaEjecutada,
      sedeId,
      participantesCount,
      brigadistasCount,
      duracionMinutos,
      observaciones,
      actaUrl,
      fotoEvidenciaUrl,
      estado,
    } = body as {
      tipo: string
      fechaProgramada: string
      fechaEjecutada?: string
      sedeId?: string
      participantesCount?: number
      brigadistasCount?: number
      duracionMinutos?: number
      observaciones?: string
      actaUrl?: string
      fotoEvidenciaUrl?: string
      estado?: string
    }
    if (!tipo || !fechaProgramada) {
      return NextResponse.json({ error: 'tipo y fechaProgramada requeridos' }, { status: 400 })
    }
    const created = await prisma.simulacro.create({
      data: {
        orgId: ctx.orgId,
        tipo,
        sedeId: sedeId ?? null,
        fechaProgramada: new Date(fechaProgramada),
        fechaEjecutada: fechaEjecutada ? new Date(fechaEjecutada) : null,
        participantesCount: participantesCount ?? null,
        brigadistasCount: brigadistasCount ?? null,
        duracionMinutos: duracionMinutos ?? null,
        observaciones: observaciones ?? null,
        actaUrl: actaUrl ?? null,
        fotoEvidenciaUrl: fotoEvidenciaUrl ?? null,
        estado: estado ?? 'PROGRAMADO',
      },
    })
    return NextResponse.json({ simulacro: created }, { status: 201 })
  } catch (err) {
    console.error('[sst/simulacros POST]', err)
    return NextResponse.json({ error: 'Failed', detail: String(err) }, { status: 500 })
  }
})

export const PATCH = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const { id, ...patch } = body as Record<string, unknown> & { id: string }
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    // Normalize fechas
    if (patch.fechaProgramada) patch.fechaProgramada = new Date(patch.fechaProgramada as string)
    if (patch.fechaEjecutada) patch.fechaEjecutada = new Date(patch.fechaEjecutada as string)
    const updated = await prisma.simulacro.updateMany({
      where: { id, orgId: ctx.orgId },
      data: patch as never,
    })
    return NextResponse.json({ updated: updated.count })
  } catch (err) {
    console.error('[sst/simulacros PATCH]', err)
    return NextResponse.json({ error: 'Failed', detail: String(err) }, { status: 500 })
  }
})
