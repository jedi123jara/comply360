/**
 * POST /api/signatures/pki/sign
 *
 * Firma PKI autenticada de un contrato. Requiere sesión.
 * Para firma pública basada en token ver /api/signatures/sign (flujo existente).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getProvider, hashBuffer, type SignerInfo } from '@/lib/signatures/pki-provider'

export const runtime = 'nodejs'

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: {
    contractId?: string
    fullName?: string
    dni?: string
    email?: string
    role?: 'EMPLOYER' | 'WORKER' | 'WITNESS'
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.contractId || !body.fullName || !body.role) {
    return NextResponse.json(
      { error: 'contractId, fullName y role son requeridos' },
      { status: 400 }
    )
  }

  const contract = await prisma.contract.findFirst({
    where: { id: body.contractId, orgId: ctx.orgId },
    select: { id: true, title: true, contentHtml: true, status: true },
  })
  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  const content = contract.contentHtml || contract.title
  const documentHash = hashBuffer(Buffer.from(content, 'utf-8'))

  const provider = getProvider()
  const signer: SignerInfo = {
    userId: ctx.userId,
    dni: body.dni,
    fullName: body.fullName,
    email: body.email || ctx.email,
    role: body.role,
  }

  const result = await provider.sign({
    documentId: contract.id,
    documentHash,
    documentName: contract.title,
    signer,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  })

  if (body.role === 'EMPLOYER' || body.role === 'WORKER') {
    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        signedAt: new Date(result.signedAt),
        status: 'SIGNED',
      },
    })
  }

  return NextResponse.json({
    signature: result,
    provider: { slug: provider.slug, name: provider.name, hasLegalValidity: provider.hasLegalValidity },
    disclaimer: provider.hasLegalValidity
      ? null
      : '⚠️ Firma emitida con proveedor de desarrollo. Sin validez legal plena según Ley 27269. Conecta un proveedor PKI real para contratos notariales/SUNAFIL.',
  })
})
