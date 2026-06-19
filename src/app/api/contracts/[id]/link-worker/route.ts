import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { recalculateLegajoScore } from '@/lib/compliance/legajo-config'

// ==============================================
// POST /api/contracts/[id]/link-worker
// Links a contract to a worker:
//  1. Creates WorkerContract record
//  2. Upserts a WorkerDocument of type contrato_trabajo (INGRESO/VERIFIED)
//  3. Recalculates legajoScore for the worker
// ==============================================

export const POST = withPlanGateParams<{ id: string }>('contratos', 
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

    // Vincula WorkerContract de forma idempotente. WorkerContract SI tiene
    // @@unique([workerId, contractId]), asi que un upsert nativo evita el P2002
    // ante doble request (mismo patron que src/lib/contracts/create.ts).
    await prisma.workerContract.upsert({
      where: { workerId_contractId: { workerId, contractId } },
      create: { workerId, contractId },
      update: {},
    })

    // WorkerDocument 'contrato_trabajo' para que el legajo lo cuente. Este modelo
    // NO tiene @@unique sobre (workerId, documentType), asi que no hay upsert
    // nativo ni garantia de la BD contra duplicados. Camino idempotente: primero
    // un updateMany (marca VERIFIED el/los doc existentes en una sola sentencia)
    // y solo si no existia ninguno lo creamos. Bajo READ COMMITTED esto elimina el
    // duplicado salvo en la ventana de dos primeras-altas exactamente simultaneas
    // (doble submit); en ese caso recalculateLegajoScore NO infla el score igual
    // (deduplica por documentType con un Set). NOTA: no se usa $transaction con
    // isolationLevel porque el Proxy de prisma (src/lib/prisma.ts) descarta el 2do
    // arg bajo scope RLS. El enforcement definitivo requiere un @@unique parcial
    // sobre (workerId, documentType='contrato_trabajo') + migracion + backfill.
    const verifiedDoc = await prisma.workerDocument.updateMany({
      where: { workerId, documentType: 'contrato_trabajo' },
      data: { status: 'VERIFIED', verifiedAt: new Date(), verifiedBy: ctx.userId },
    })
    if (verifiedDoc.count === 0) {
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
export const GET = withPlanGateParams<{ id: string }>('contratos', 
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

