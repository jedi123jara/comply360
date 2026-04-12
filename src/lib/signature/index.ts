import { createHash, randomBytes } from 'crypto'

// =============================================
// TYPES
// =============================================

export interface Signer {
  email: string
  name: string
  role: string // e.g., 'EMPLEADOR', 'TRABAJADOR', 'TESTIGO'
  order: number
}

export interface SignatureRequest {
  id: string
  contractId: string
  orgId: string
  status: SignatureRequestStatus
  signers: SignerRecord[]
  createdAt: string
  updatedAt: string
  expiresAt: string
  metadata: Record<string, unknown>
}

export interface SignerRecord {
  email: string
  name: string
  role: string
  order: number
  status: SignerStatus
  signedAt: string | null
  ipAddress: string | null
  signatureHash: string | null
  signatureData: string | null // base64 image
}

export type SignatureRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'
export type SignerStatus = 'PENDING' | 'SIGNED' | 'DECLINED'

export interface SignatureTokenPayload {
  requestId: string
  signerEmail: string
  orgId: string
  contractId: string
  exp: number
  iat: number
  jti: string
}

export interface CompleteSignatureInput {
  signatureData: string // base64 canvas image
  ipAddress: string
  userAgent: string
  acceptedTerms: boolean
}

// =============================================
// IN-MEMORY STORE (production would use DB)
// =============================================

const signatureRequests = new Map<string, SignatureRequest>()
const signatureTokens = new Map<string, SignatureTokenPayload>()

// =============================================
// HELPERS
// =============================================

function generateId(): string {
  return `sig_${randomBytes(16).toString('hex')}`
}

function hashData(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

function encodeBase64Url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function decodeBase64Url(str: string): string {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4)
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
}

function getJwtSecret(): string {
  return process.env.SIGNATURE_JWT_SECRET || process.env.CLERK_SECRET_KEY || 'comply360-signature-secret-dev'
}

// Simple HMAC-based JWT implementation (no external dependency)
function createJwt(payload: Record<string, unknown>): string {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = encodeBase64Url(JSON.stringify(payload))
  const signature = createHash('sha256')
    .update(`${header}.${body}.${getJwtSecret()}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${body}.${signature}`
}

function verifyJwt(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, body, signature] = parts
  const expectedSig = createHash('sha256')
    .update(`${header}.${body}.${getJwtSecret()}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  if (signature !== expectedSig) return null

  try {
    const payload = JSON.parse(decodeBase64Url(body))
    if (payload.exp && Date.now() > payload.exp * 1000) return null
    return payload
  } catch {
    return null
  }
}

// =============================================
// SIGNATURE SERVICE
// =============================================

export class SignatureService {
  /**
   * Creates a new signature request for a contract.
   */
  static createSignatureRequest(
    contractId: string,
    orgId: string,
    signers: Signer[],
    metadata: Record<string, unknown> = {}
  ): SignatureRequest {
    const id = generateId()
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    const signerRecords: SignerRecord[] = signers
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        email: s.email,
        name: s.name,
        role: s.role,
        order: s.order,
        status: 'PENDING' as SignerStatus,
        signedAt: null,
        ipAddress: null,
        signatureHash: null,
        signatureData: null,
      }))

    const request: SignatureRequest = {
      id,
      contractId,
      orgId,
      status: 'PENDING',
      signers: signerRecords,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      metadata,
    }

    signatureRequests.set(id, request)
    return request
  }

  /**
   * Gets the status of a signature request.
   */
  static getSignatureStatus(requestId: string): SignatureRequest | null {
    return signatureRequests.get(requestId) || null
  }

  /**
   * Gets all signature requests for an organization.
   */
  static getSignatureRequestsByOrg(orgId: string): SignatureRequest[] {
    const results: SignatureRequest[] = []
    for (const req of signatureRequests.values()) {
      if (req.orgId === orgId) {
        results.push(req)
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  /**
   * Generates a JWT token for a specific signer to sign a document.
   */
  static generateSignatureToken(requestId: string, signerEmail: string): string | null {
    const request = signatureRequests.get(requestId)
    if (!request) return null

    const signer = request.signers.find((s) => s.email === signerEmail)
    if (!signer) return null
    if (signer.status === 'SIGNED') return null

    const payload: SignatureTokenPayload = {
      requestId,
      signerEmail,
      orgId: request.orgId,
      contractId: request.contractId,
      exp: Math.floor(new Date(request.expiresAt).getTime() / 1000),
      iat: Math.floor(Date.now() / 1000),
      jti: randomBytes(8).toString('hex'),
    }

    const token = createJwt(payload as unknown as Record<string, unknown>)
    signatureTokens.set(payload.jti, payload)
    return token
  }

  /**
   * Verifies a signing token and returns the payload.
   */
  static verifySignature(token: string): SignatureTokenPayload | null {
    const payload = verifyJwt(token) as SignatureTokenPayload | null
    if (!payload) return null

    // Verify the request still exists and is active
    const request = signatureRequests.get(payload.requestId)
    if (!request) return null
    if (request.status === 'CANCELLED' || request.status === 'EXPIRED') return null

    // Verify signer hasn't already signed
    const signer = request.signers.find((s) => s.email === payload.signerEmail)
    if (!signer || signer.status === 'SIGNED') return null

    return payload
  }

  /**
   * Records a completed signature.
   */
  static completeSignature(
    requestId: string,
    signerEmail: string,
    input: CompleteSignatureInput
  ): { success: boolean; error?: string; request?: SignatureRequest } {
    const request = signatureRequests.get(requestId)
    if (!request) {
      return { success: false, error: 'Solicitud de firma no encontrada' }
    }

    if (request.status === 'CANCELLED' || request.status === 'EXPIRED') {
      return { success: false, error: 'La solicitud de firma ya no es valida' }
    }

    if (!input.acceptedTerms) {
      return { success: false, error: 'Debe aceptar los terminos legales' }
    }

    const signerIndex = request.signers.findIndex((s) => s.email === signerEmail)
    if (signerIndex === -1) {
      return { success: false, error: 'Firmante no encontrado' }
    }

    const signer = request.signers[signerIndex]
    if (signer.status === 'SIGNED') {
      return { success: false, error: 'Ya ha firmado este documento' }
    }

    // Hash the signature data for integrity
    const signatureHash = hashData(
      JSON.stringify({
        signatureData: input.signatureData,
        timestamp: new Date().toISOString(),
        ip: input.ipAddress,
        userAgent: input.userAgent,
        signerEmail,
        requestId,
      })
    )

    // Update signer record
    request.signers[signerIndex] = {
      ...signer,
      status: 'SIGNED',
      signedAt: new Date().toISOString(),
      ipAddress: input.ipAddress,
      signatureHash,
      signatureData: input.signatureData,
    }

    // Update request status
    const allSigned = request.signers.every((s) => s.status === 'SIGNED')
    const anySigned = request.signers.some((s) => s.status === 'SIGNED')

    if (allSigned) {
      request.status = 'COMPLETED'
    } else if (anySigned) {
      request.status = 'IN_PROGRESS'
    }

    request.updatedAt = new Date().toISOString()
    signatureRequests.set(requestId, request)

    return { success: true, request }
  }

  /**
   * Cancels a signature request.
   */
  static cancelRequest(requestId: string): boolean {
    const request = signatureRequests.get(requestId)
    if (!request) return false

    request.status = 'CANCELLED'
    request.updatedAt = new Date().toISOString()
    signatureRequests.set(requestId, request)
    return true
  }

  /**
   * Gets details needed for the signing page (public, non-sensitive).
   */
  static getSigningPageData(requestId: string, signerEmail: string): {
    contractId: string
    signerName: string
    signerRole: string
    status: SignerStatus
    expiresAt: string
    totalSigners: number
    signedCount: number
  } | null {
    const request = signatureRequests.get(requestId)
    if (!request) return null

    const signer = request.signers.find((s) => s.email === signerEmail)
    if (!signer) return null

    return {
      contractId: request.contractId,
      signerName: signer.name,
      signerRole: signer.role,
      status: signer.status,
      expiresAt: request.expiresAt,
      totalSigners: request.signers.length,
      signedCount: request.signers.filter((s) => s.status === 'SIGNED').length,
    }
  }
}
