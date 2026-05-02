import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { rejectJurisprudence, JurisprudenceNotFoundError } from '@/lib/contracts/jurisprudence/service'

const RejectSchema = z.object({
  reason: z.string().min(10, 'La razón debe tener al menos 10 caracteres.'),
})

// =============================================
// POST /api/admin/jurisprudence-updates/[id]/reject
// Marca el update como REJECTED — no se podrá aplicar.
// =============================================
export const POST = withRoleParams<{ id: string }>('SUPER_ADMIN', async (req: NextRequest, ctx: AuthContext, params) => {
  const body = await req.json().catch(() => null)
  const parsed = RejectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Razón inválida', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const updated = await rejectJurisprudence(params.id, ctx.userId, parsed.data.reason)
    return NextResponse.json({ data: updated })
  } catch (err) {
    if (err instanceof JurisprudenceNotFoundError) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error rechazando' }, { status: 500 })
  }
})
