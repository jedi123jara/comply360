import { NextRequest, NextResponse } from 'next/server'
import { withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { approveJurisprudence, JurisprudenceNotFoundError } from '@/lib/contracts/jurisprudence/service'

// =============================================
// POST /api/admin/jurisprudence-updates/[id]/approve
// Aprueba el update (PENDING → APPROVED). No aplica todavía — eso es /apply.
// =============================================
export const POST = withRoleParams<{ id: string }>('SUPER_ADMIN', async (_req: NextRequest, ctx: AuthContext, params) => {
  try {
    const updated = await approveJurisprudence(params.id, ctx.userId)
    return NextResponse.json({ data: updated })
  } catch (err) {
    if (err instanceof JurisprudenceNotFoundError) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error aprobando' }, { status: 500 })
  }
})
