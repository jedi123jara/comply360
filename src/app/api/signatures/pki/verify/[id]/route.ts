/**
 * GET /api/signatures/pki/verify/[id]
 *
 * Verifica una firma PKI por su ID. Endpoint público (no requiere auth) —
 * cualquier persona puede verificar una firma con solo el signatureId.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '@/lib/signatures/pki-provider'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'signatureId requerido' }, { status: 400 })
  }

  const provider = getProvider()
  const verification = await provider.verify(id)
  return NextResponse.json(verification, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
