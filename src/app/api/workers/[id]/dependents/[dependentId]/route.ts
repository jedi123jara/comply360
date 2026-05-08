/**
 * /api/workers/[id]/dependents/[dependentId]
 *
 * PATCH  — actualizar campos del dependiente (incluye verifiedAt manual)
 * DELETE — soft delete (marca deletedAt)
 *
 * Ola 1 — Compliance crítico SUNAFIL.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

type RouteParams = {
  id: string
  dependentId: string
} & Record<string, string>

// =============================================
// PATCH /api/workers/[id]/dependents/[dependentId]
// =============================================
export const PATCH = withPlanGateParams<RouteParams>('workers',async (req: NextRequest, ctx: AuthContext, params) => {
  const { id: workerId, dependentId } = params
  const orgId = ctx.orgId

  // Verifica que el dependent existe, pertenece a la org y al worker correcto
  const existing = await prisma.workerDependent.findUnique({
    where: { id: dependentId },
    select: { id: true, workerId: true, orgId: true, deletedAt: true },
  })
  if (
    !existing ||
    existing.orgId !== orgId ||
    existing.workerId !== workerId ||
    existing.deletedAt
  ) {
    return NextResponse.json({ error: 'Dependiente no encontrado' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  const allowedStringFields = ['fullName', 'actaUrl', 'notas']
  for (const f of allowedStringFields) {
    if (f in body) updateData[f] = body[f] || null
  }
  if ('esBeneficiarioEsalud' in body) updateData.esBeneficiarioEsalud = !!body.esBeneficiarioEsalud
  if ('esBeneficiarioAsigFam' in body) updateData.esBeneficiarioAsigFam = !!body.esBeneficiarioAsigFam
  if ('birthDate' in body && body.birthDate) {
    const d = new Date(body.birthDate as string)
    if (isNaN(d.getTime()) || d >= new Date()) {
      return NextResponse.json({ error: 'birthDate inválida' }, { status: 400 })
    }
    updateData.birthDate = d
  }

  // Marcar como verificado manualmente (admin revisó la partida nacimiento, etc.)
  if (body.markVerified === true) {
    updateData.verifiedAt = new Date()
    updateData.verifiedBy = ctx.userId
  }
  if (body.markVerified === false) {
    updateData.verifiedAt = null
    updateData.verifiedBy = null
  }

  const updated = await prisma.workerDependent.update({
    where: { id: dependentId },
    data: updateData,
  })

  return NextResponse.json({ data: updated })
})

// =============================================
// DELETE /api/workers/[id]/dependents/[dependentId]
// (Soft delete — mantiene trazabilidad)
// =============================================
export const DELETE = withPlanGateParams<RouteParams>('workers',async (_req: NextRequest, ctx: AuthContext, params) => {
  const { id: workerId, dependentId } = params
  const orgId = ctx.orgId

  const existing = await prisma.workerDependent.findUnique({
    where: { id: dependentId },
    select: { id: true, workerId: true, orgId: true, deletedAt: true },
  })
  if (
    !existing ||
    existing.orgId !== orgId ||
    existing.workerId !== workerId
  ) {
    return NextResponse.json({ error: 'Dependiente no encontrado' }, { status: 404 })
  }
  if (existing.deletedAt) {
    return NextResponse.json({ success: true, alreadyDeleted: true })
  }

  await prisma.workerDependent.update({
    where: { id: dependentId },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
})

