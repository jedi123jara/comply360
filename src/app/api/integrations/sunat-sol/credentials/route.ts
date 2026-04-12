import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { encryptJson, decryptJson } from '@/lib/crypto/encrypt'
import { validarRUC } from '@/lib/integrations/sunat'
import { rateLimit } from '@/lib/rate-limit'

interface SolCredentials {
  ruc: string
  solUser: string
  solPassword: string
}

// Strict rate limiter for credential operations: 3 per minute
const credentialLimiter = rateLimit({ interval: 60_000, limit: 3 })

// =============================================
// POST /api/integrations/sunat-sol/credentials — Save SOL credentials (encrypted)
// =============================================
export const POST = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  // Rate limit
  const rl = await credentialLimiter.check(req, `cred:${ctx.orgId}`)
  if (!rl.success) return rl.response!

  const orgId = ctx.orgId

  const body = await req.json()
  const { ruc, solUser, solPassword } = body as Partial<SolCredentials>

  // Strict input validation
  const trimmedRuc = ruc?.trim() ?? ''
  const trimmedUser = solUser?.trim() ?? ''
  const trimmedPass = solPassword?.trim() ?? ''

  if (!trimmedRuc || !trimmedUser || !trimmedPass) {
    return NextResponse.json({ error: 'Se requiere ruc, solUser y solPassword' }, { status: 400 })
  }

  if (!validarRUC(trimmedRuc)) {
    return NextResponse.json({ error: 'RUC invalido' }, { status: 400 })
  }

  if (!/^[a-zA-Z0-9._@-]+$/.test(trimmedUser)) {
    return NextResponse.json({ error: 'Usuario SOL contiene caracteres invalidos' }, { status: 400 })
  }

  if (trimmedUser.length < 3 || trimmedUser.length > 20) {
    return NextResponse.json({ error: 'Usuario SOL debe tener entre 3 y 20 caracteres' }, { status: 400 })
  }

  if (trimmedPass.length < 4 || trimmedPass.length > 50) {
    return NextResponse.json({ error: 'Clave SOL debe tener entre 4 y 50 caracteres' }, { status: 400 })
  }

  // Encrypt credentials
  const encrypted = encryptJson({ ruc: trimmedRuc, solUser: trimmedUser, solPassword: trimmedPass })

  // Upsert credential
  const credential = await prisma.integrationCredential.upsert({
    where: { orgId_provider: { orgId, provider: 'sunat_sol' } },
    update: {
      encryptedConfig: encrypted,
      label: `SUNAT SOL — RUC ${trimmedRuc}`,
      isActive: true,
      lastTestedAt: null,
    },
    create: {
      orgId,
      provider: 'sunat_sol',
      encryptedConfig: encrypted,
      label: `SUNAT SOL — RUC ${trimmedRuc}`,
      isActive: true,
    },
  })

  // Audit log — NEVER log the password
  await prisma.auditLog.create({
    data: {
      orgId,
      userId: ctx.userId ?? null,
      action: 'SUNAT_CREDENTIAL_SAVED',
      entityType: 'IntegrationCredential',
      entityId: credential.id,
      metadataJson: { provider: 'sunat_sol', ruc: trimmedRuc },
    },
  }).catch(() => { /* non-blocking */ })

  return NextResponse.json({
    id: credential.id,
    provider: credential.provider,
    label: credential.label,
    isActive: credential.isActive,
    message: 'Credenciales guardadas de forma encriptada',
  })
})

// =============================================
// DELETE /api/integrations/sunat-sol/credentials — Remove SOL credentials
// =============================================
export const DELETE = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const rl = await credentialLimiter.check(req, `cred:${ctx.orgId}`)
  if (!rl.success) return rl.response!

  const orgId = ctx.orgId

  const deleted = await prisma.integrationCredential.deleteMany({
    where: { orgId, provider: 'sunat_sol' },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      orgId,
      userId: ctx.userId ?? null,
      action: 'SUNAT_CREDENTIAL_DELETED',
      entityType: 'IntegrationCredential',
      metadataJson: { provider: 'sunat_sol', count: deleted.count },
    },
  }).catch(() => { /* non-blocking */ })

  return NextResponse.json({ message: 'Credenciales eliminadas' })
})

// =============================================
// GET /api/integrations/sunat-sol/credentials — Check if credentials exist
// Returns ONLY: configured status, label, active state. NEVER returns secrets.
// =============================================
export const GET = withRole('ADMIN', async (_req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId

  const credential = await prisma.integrationCredential.findUnique({
    where: { orgId_provider: { orgId, provider: 'sunat_sol' } },
    select: {
      id: true,
      label: true,
      isActive: true,
      lastTestedAt: true,
      createdAt: true,
    },
  })

  if (!credential) {
    return NextResponse.json({ configured: false })
  }

  // Extract RUC from label (safe — never decrypt just to show RUC)
  const rucMatch = credential.label?.match(/RUC (\d{11})/)
  const ruc = rucMatch?.[1] ?? null

  return NextResponse.json({
    configured: true,
    ruc,
    label: credential.label,
    isActive: credential.isActive,
    lastTestedAt: credential.lastTestedAt?.toISOString() ?? null,
    createdAt: credential.createdAt.toISOString(),
    // SECURITY: Never return encryptedConfig, lastSyncResult, or any decrypted data
  })
})
