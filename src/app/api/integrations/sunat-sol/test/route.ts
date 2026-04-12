import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { decryptJson } from '@/lib/crypto/encrypt'
import { testSunatSolConnection, type SunatSolCredentials } from '@/lib/integrations/sunat-sol-client'
import { rateLimit } from '@/lib/rate-limit'

// Very strict: 2 test attempts per minute (prevents brute force)
const testLimiter = rateLimit({ interval: 60_000, limit: 2 })

// =============================================
// POST /api/integrations/sunat-sol/test — Test SOL connection
// =============================================
export const POST = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const rl = await testLimiter.check(req, `sunat-test:${ctx.orgId}`)
  if (!rl.success) return rl.response!

  const orgId = ctx.orgId

  // Load encrypted credentials
  const credential = await prisma.integrationCredential.findUnique({
    where: { orgId_provider: { orgId, provider: 'sunat_sol' } },
    select: { id: true, encryptedConfig: true },
  })

  if (!credential) {
    return NextResponse.json(
      { error: 'No hay credenciales SUNAT SOL configuradas.' },
      { status: 404 },
    )
  }

  // Decrypt credentials
  let creds: SunatSolCredentials
  try {
    creds = decryptJson<SunatSolCredentials>(credential.encryptedConfig)
  } catch (err) {
    console.error(`[SECURITY] Failed to decrypt SUNAT credentials for org ${orgId}`)
    return NextResponse.json(
      { error: 'Error de seguridad al desencriptar credenciales. Guarde las credenciales nuevamente.' },
      { status: 500 },
    )
  }

  // Test connection
  const result = await testSunatSolConnection(creds)

  // Update lastTestedAt regardless of result
  await prisma.integrationCredential.update({
    where: { id: credential.id },
    data: { lastTestedAt: new Date() },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      orgId,
      userId: ctx.userId ?? null,
      action: 'SUNAT_CONNECTION_TEST',
      entityType: 'IntegrationCredential',
      entityId: credential.id,
      metadataJson: { success: result.ok, errorCode: result.ok ? null : result.error.code },
    },
  }).catch(() => {})

  if (result.ok) {
    return NextResponse.json({
      success: true,
      message: result.data.message,
      // SECURITY: Never return the RUC or any credential data in test response
    })
  }

  // SECURITY: Sanitize error — never include raw SUNAT response or credentials
  return NextResponse.json({
    success: false,
    error: result.error.code,
    message: result.error.code === 'INVALID_CREDENTIALS'
      ? 'Credenciales SOL invalidas. Verifique su usuario y clave SOL.'
      : result.error.code === 'SUNAT_OFFLINE'
        ? 'Servicio SUNAT no disponible. Intente mas tarde.'
        : result.error.code === 'CLIENT_NOT_CONFIGURED'
          ? 'Falta configurar SUNAT_CLIENT_ID en el servidor.'
          : 'Error al conectar con SUNAT. Intente mas tarde.',
  }, { status: result.error.httpStatus ?? 400 })
})
