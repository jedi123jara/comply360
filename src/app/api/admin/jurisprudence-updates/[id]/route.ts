import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  getJurisprudence,
  updateJurisprudenceUpdate,
  JurisprudenceNotFoundError,
} from '@/lib/contracts/jurisprudence/service'

const UpdateSchema = z.object({
  title: z.string().min(5).optional(),
  topic: z.string().min(2).optional(),
  summary: z.string().min(10).optional(),
  fullTextUrl: z.string().url().nullable().optional(),
  affectedRules: z.array(z.object({ ruleCode: z.string(), action: z.enum(['ADD', 'MODIFY', 'DEPRECATE']) }).passthrough()).optional(),
  affectedClauses: z.array(z.object({ code: z.string(), action: z.enum(['ADD', 'MODIFY', 'DEPRECATE']) }).passthrough()).optional(),
  notes: z.string().nullable().optional(),
})

// =============================================
// GET /api/admin/jurisprudence-updates/[id]
// Devuelve un update específico con todas sus afectaciones.
// =============================================
export const GET = withRoleParams<{ id: string }>('SUPER_ADMIN', async (_req, _ctx, params) => {
  const item = await getJurisprudence(params.id)
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json({
    data: {
      ...item,
      publicationDate: item.publicationDate.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
      appliedAt: item.appliedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    },
  })
})

// =============================================
// PATCH /api/admin/jurisprudence-updates/[id]
// Edita el update mientras esté en PENDING/APPROVED. Bloqueado si APPLIED.
// =============================================
export const PATCH = withRoleParams<{ id: string }>('SUPER_ADMIN', async (req: NextRequest, ctx: AuthContext, params) => {
  const body = await req.json().catch(() => null)
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Body inválido', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const updated = await updateJurisprudenceUpdate(
      params.id,
      {
        ...parsed.data,
        affectedRules: parsed.data.affectedRules as never,
        affectedClauses: parsed.data.affectedClauses as never,
      },
      ctx.userId,
    )
    return NextResponse.json({ data: updated })
  } catch (err) {
    if (err instanceof JurisprudenceNotFoundError) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error actualizando' }, { status: 500 })
  }
})
