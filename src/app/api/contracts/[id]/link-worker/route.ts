import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { recalculateLegajoScore } from '@/lib/compliance/legajo-config'

// ==============================================
// POST /api/contracts/[id]/link-worker
// Links a contract to a worker:
//  1. Creates WorkerContract record
//  2. Upserts a WorkerDocument of type contrato_trabajo (INGRESO/VERIFIED)
//  3. Recalculates legajoScore for the worker
// ==============================================

export const POST = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, params) => {
    const { id: contractId } = params
    const orgId = ctx.orgId

    const body = await req.json().catch(() => ({}))
    const { workerId } = body as { workerId?: string }

    if (!workerId) {
      return NextResponse.json({ error: 'workerId es requerido' }, { status: 400 })
    }

    // Verify contract belongs to org
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true, orgId: true, title: true, status: true },
    })
    if (!contract || contract.orgId !== orgId) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    // Verify worker belongs to org
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: { id: true, orgId: true, firstName: true, lastName: true },
    })
    if (!worker || worker.orgId !== orgId) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    // Upsert WorkerContract link (idempotent)
    const existing = await prisma.workerContract.findFirst({
      where: { workerId, contractId },
      select: { id: true },
    })
    if (!existing) {
      await prisma.workerContract.create({ data: { workerId, contractId } })
    }

    // Upsert WorkerDocument type=contrato_trabajo so legajo counts it
    // We use the contract's title and mark it VERIFIED since it's a digital record
    const existingDoc = await prisma.workerDocument.findFirst({
      where: { workerId, documentType: 'contrato_trabajo' },
      select: { id: true },
    })
    if (!existingDoc) {
      await prisma.workerDocument.create({
        data: {
          workerId,
          category: 'INGRESO',
          documentType: 'contrato_trabajo',
          title: contract.title,
          isRequired: true,
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedBy: ctx.userId,
        },
      })
    } else {
      // Update existing doc to VERIFIED (in case it was MISSING/PENDING)
      await prisma.workerDocument.update({
        where: { id: existingDoc.id },
        data: { status: 'VERIFIED', verifiedAt: new Date(), verifiedBy: ctx.userId },
      })
    }

    // Recalculate legajo score
    await recalculateLegajoScore(workerId)

    const updatedWorker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: { legajoScore: true },
    })

    return NextResponse.json({
      ok: true,
      workerId,
      contractId,
      legajoScore: updatedWorker?.legajoScore ?? 0,
    })
  }
)


// GET — list workers already linked to this contract
export const GET = withAuthParams<{ id: string }>(
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const { id: contractId } = params
    const orgId = ctx.orgId

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { orgId: true },
    })
    if (!contract || contract.orgId !== orgId) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    const links = await prisma.workerContract.findMany({
      where: { contractId },
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true, position: true, legajoScore: true },
        },
      },
    })

    return NextResponse.json({ data: links.map(l => ({ ...l.worker, linkedAt: l.assignedAt })) })
  }
)
