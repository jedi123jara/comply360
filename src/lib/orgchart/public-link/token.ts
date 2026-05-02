import jwt from 'jsonwebtoken'

/**
 * Auditor Link — JWT corto que da acceso público a una vista redactada del
 * organigrama. Se usa para entregar el organigrama oficial a SUNAFIL,
 * auditores externos o due diligence sin que tengan que crearse cuenta.
 *
 * El payload incluye:
 *   - aud: orgId (audience-binding)
 *   - sub: snapshotId
 *   - hash: sha256 del snapshot (si el snapshot se altera, el token deja de validar)
 *   - includeWorkers, includeComplianceRoles: niveles de redacción
 *   - exp: expiración (24/48/72h)
 *
 * NOTA sobre el secreto: usa NEXTAUTH_SECRET o JWT_SECRET. En producción
 * puede rotarse — los tokens viejos se invalidan automáticamente.
 */

export interface AuditorTokenPayload {
  aud: string // orgId
  sub: string // snapshotId
  hash: string
  includeWorkers: boolean
  includeComplianceRoles: boolean
  iat: number
  exp: number
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.CLERK_SECRET_KEY
  if (!secret) {
    throw new Error('No hay JWT_SECRET configurado para Auditor Link')
  }
  return secret
}

export function signAuditorToken(input: {
  orgId: string
  snapshotId: string
  hash: string
  includeWorkers: boolean
  includeComplianceRoles: boolean
  expiresInHours: number
}): string {
  const payload = {
    sub: input.snapshotId,
    hash: input.hash,
    includeWorkers: input.includeWorkers,
    includeComplianceRoles: input.includeComplianceRoles,
  }
  return jwt.sign(payload, getSecret(), {
    audience: input.orgId,
    expiresIn: `${input.expiresInHours}h`,
    issuer: 'comply360-orgchart',
  })
}

export function verifyAuditorToken(token: string): AuditorTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(), { issuer: 'comply360-orgchart' }) as unknown as AuditorTokenPayload
    return decoded
  } catch {
    return null
  }
}
