import { NextRequest, NextResponse } from 'next/server'
import { withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  applyJurisprudence,
  JurisprudenceNotFoundError,
} from '@/lib/contracts/jurisprudence/service'

// =============================================
// POST /api/admin/jurisprudence-updates/[id]/apply
// Ejecuta las afectaciones declaradas. Idempotente: re-llamar produce
// status ALREADY_EXISTS / NOT_FOUND sin duplicar.
//
// Importante: bloqueado si reviewStatus = APPLIED o REJECTED.
// =============================================
export const POST = withRoleParams<{ id: string }>('SUPER_ADMIN', async (_req: NextRequest, ctx: AuthContext, params) => {
  try {
    const { update, applyResult } = await applyJurisprudence(params.id, ctx.userId)
    return NextResponse.json({ data: { update, applyResult } })
  } catch (err) {
    if (err instanceof JurisprudenceNotFoundError) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    console.error('[POST /api/admin/jurisprudence-updates/:id/apply]', err)
    return NextResponse.json({ error: 'Error aplicando jurisprudence update' }, { status: 500 })
  }
})
