import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { ipercBaseCreateSchema } from '@/lib/sst/schemas'

// =============================================
// GET /api/sst/iperc-bases — List IPERC matrices for the org
// Query params:
//   sedeId   — filtrar por sede
//   estado   — BORRADOR | REVISION | VIGENTE | VENCIDO | ARCHIVADO
// =============================================
export const GET = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const sedeId = searchParams.get('sedeId')
  const estado = searchParams.get('estado')

  const where: Record<string, unknown> = { orgId: ctx.orgId }
  if (sedeId) where.sedeId = sedeId
  if (estado) where.estado = estado

  const bases = await prisma.iPERCBase.findMany({
    where,
    orderBy: [{ sedeId: 'asc' }, { version: 'desc' }],
    include: {
      sede: { select: { id: true, nombre: true, tipoInstalacion: true } },
      _count: { select: { filas: true } },
    },
  })

  return NextResponse.json({ bases, total: bases.length })
})

// =============================================
// POST /api/sst/iperc-bases — Create a new IPERC version for a sede
// El hash inicial se calcula vacío y se actualiza cada vez que se agregan filas.
// La versión se autoincrementa por sede.
// =============================================
export const POST = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = ipercBaseCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { sedeId } = parsed.data

  // Verificar que la sede pertenece a la org
  const sede = await prisma.sede.findFirst({
    where: { id: sedeId, orgId: ctx.orgId },
    select: { id: true, nombre: true },
  })
  if (!sede) {
    return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
  }

  // Calcular siguiente version
  const last = await prisma.iPERCBase.findFirst({
    where: { orgId: ctx.orgId, sedeId },
    orderBy: { version: 'desc' },
    select: { version: true },
  })
  const nextVersion = (last?.version ?? 0) + 1

  // Hash inicial determinista — se recalcula al cerrar/aprobar
  const initialPayload = JSON.stringify({
    orgId: ctx.orgId,
    sedeId,
    version: nextVersion,
    filas: [],
    createdAt: new Date().toISOString(),
  })
  const hashSha256 = createHash('sha256').update(initialPayload).digest('hex')

  const base = await prisma.iPERCBase.create({
    data: {
      orgId: ctx.orgId,
      sedeId,
      version: nextVersion,
      hashSha256,
      estado: 'BORRADOR',
    },
    include: {
      sede: { select: { id: true, nombre: true } },
    },
  })

  return NextResponse.json({ base }, { status: 201 })
})
