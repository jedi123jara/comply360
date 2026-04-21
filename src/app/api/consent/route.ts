/**
 * Consent management (Ley 29733 Perú — Protección de Datos Personales)
 *
 * GET  /api/consent?scope=org|worker   → { accepted: boolean, at: string | null, version: string | null }
 * POST /api/consent                    → registra el consent del usuario autenticado
 *
 * Flujo:
 *  - Al sign-up de una empresa (admin) → scope='org' con aceptación explícita de T&C + DPA + política privacidad
 *  - Al primer login del trabajador en /mi-portal → scope='worker' con autorización expresa bajo
 *    Ley 29733 Art. 14 para tratar datos sensibles (DNI, CUSPP, firma biométrica)
 *
 * Persistencia:
 *  - Se guarda en `AuditLog` con action `consent.accepted`. Sin migración de DB.
 *  - Versión del consent se versiona (`v1`, `v2`, ...) para invalidar cuando
 *    cambiemos políticas significativamente.
 *  - IP + userAgent en metadata para auditoría legal ante ANPD/MINJUS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { CONSENT_VERSION } from '@/lib/legal/consent-versions'

export const runtime = 'nodejs'

type ConsentScope = 'org' | 'worker'

function isValidScope(s: string | null): s is ConsentScope {
  return s === 'org' || s === 'worker'
}

// ═══════════════════════════════════════════════════════════════════════════
// GET — chequea si el usuario ya aceptó el consent vigente
// ═══════════════════════════════════════════════════════════════════════════
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope')

  if (!isValidScope(scope)) {
    return NextResponse.json(
      { error: 'scope inválido. Usá org | worker' },
      { status: 400 },
    )
  }

  const requiredVersion = CONSENT_VERSION[scope]
  const action = `consent.accepted.${scope}`

  const latest = await prisma.auditLog.findFirst({
    where: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action,
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, metadataJson: true },
  })

  const metadata = (latest?.metadataJson ?? null) as { version?: string } | null
  const acceptedVersion = metadata?.version ?? null
  const upToDate = acceptedVersion === requiredVersion

  return NextResponse.json({
    accepted: upToDate,
    at: latest?.createdAt.toISOString() ?? null,
    acceptedVersion,
    requiredVersion,
    scope,
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// POST — registra aceptación del consent
// Body: { scope: 'org' | 'worker', acceptedDocs: string[] }
// ═══════════════════════════════════════════════════════════════════════════
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: { scope?: string; acceptedDocs?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (!isValidScope(body.scope ?? null)) {
    return NextResponse.json(
      { error: 'scope inválido. Usá org | worker' },
      { status: 400 },
    )
  }

  const scope = body.scope as ConsentScope
  const version = CONSENT_VERSION[scope]
  const action = `consent.accepted.${scope}`

  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null
  const userAgent = req.headers.get('user-agent') ?? null

  const log = await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action,
      entityType: 'User',
      entityId: ctx.userId,
      ipAddress,
      metadataJson: {
        scope,
        version,
        acceptedDocs: body.acceptedDocs ?? [],
        userAgent,
        // Datos inmutables para auditoría ANPD
        email: ctx.email ?? null,
      },
    },
    select: { id: true, createdAt: true },
  })

  return NextResponse.json(
    {
      success: true,
      consentId: log.id,
      at: log.createdAt.toISOString(),
      scope,
      version,
    },
    { status: 201 },
  )
})
