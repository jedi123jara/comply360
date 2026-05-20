/**
 * /api/cuadro-categorias — Cuadro de Categorías y Funciones (Ley 30709).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

export const GET = withPlanGate('diagnostico', async (_req: NextRequest, ctx: AuthContext) => {
  const cuadros = await prisma.cuadroCategorias.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { vigenteDesde: 'desc' },
    include: { categorias: { orderBy: { codigo: 'asc' } } },
  })
  return NextResponse.json({ cuadros })
})

export const POST = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const {
      vigenteDesde,
      vigenteHasta,
      metodologia,
      pdfUrl,
      categorias,
    } = body as {
      vigenteDesde: string
      vigenteHasta?: string | null
      metodologia: string
      pdfUrl?: string | null
      categorias: Array<{
        codigo: string
        nombre: string
        descripcion: string
        rangoSalarialMin: number
        rangoSalarialMax: number
        conocimientosRequeridos: string
        responsabilidad: string
        esfuerzoFisico: string
        condicionesAmbientales: string
      }>
    }
    if (!vigenteDesde || !metodologia) {
      return NextResponse.json({ error: 'vigenteDesde y metodologia requeridos' }, { status: 400 })
    }
    if (!Array.isArray(categorias) || categorias.length < 3) {
      return NextResponse.json(
        { error: 'Se requieren al menos 3 categorías (Ley 30709)' },
        { status: 400 }
      )
    }
    // Versión = max existente + 1
    const max = await prisma.cuadroCategorias.aggregate({
      where: { orgId: ctx.orgId },
      _max: { version: true },
    })
    const created = await prisma.cuadroCategorias.create({
      data: {
        orgId: ctx.orgId,
        version: (max._max.version ?? 0) + 1,
        vigenteDesde: new Date(vigenteDesde),
        vigenteHasta: vigenteHasta ? new Date(vigenteHasta) : null,
        metodologia,
        pdfUrl: pdfUrl ?? null,
        categorias: {
          create: categorias.map((c) => ({
            codigo: c.codigo,
            nombre: c.nombre,
            descripcion: c.descripcion,
            rangoSalarialMin: c.rangoSalarialMin,
            rangoSalarialMax: c.rangoSalarialMax,
            conocimientosRequeridos: c.conocimientosRequeridos,
            responsabilidad: c.responsabilidad,
            esfuerzoFisico: c.esfuerzoFisico,
            condicionesAmbientales: c.condicionesAmbientales,
          })),
        },
      },
      include: { categorias: true },
    })
    return NextResponse.json({ cuadro: created }, { status: 201 })
  } catch (err) {
    console.error('[cuadro-categorias POST]', err)
    return NextResponse.json({ error: 'Failed', detail: String(err) }, { status: 500 })
  }
})

/** PATCH: asignar categoría a un worker. */
export const PATCH = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const { workerId, categoriaId } = body as { workerId: string; categoriaId: string | null }
    if (!workerId) return NextResponse.json({ error: 'workerId requerido' }, { status: 400 })
    await prisma.worker.updateMany({
      where: { id: workerId, orgId: ctx.orgId },
      data: { cuadroCategoriaId: categoriaId },
    })
    return NextResponse.json({ updated: true })
  } catch (err) {
    console.error('[cuadro-categorias PATCH]', err)
    return NextResponse.json({ error: 'Failed', detail: String(err) }, { status: 500 })
  }
})
