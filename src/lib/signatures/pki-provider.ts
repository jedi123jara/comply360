/**
 * 🏆 FIRMA ELECTRÓNICA — Interface + provider por defecto
 *
 * Marco legal Perú:
 *  - Ley 27269 (Ley de Firmas y Certificados Digitales)
 *  - Reglamento D.S. 052-2008-PCM
 *  - INDECOPI: Autoridad Administrativa Competente
 *
 * Arquitectura:
 *  - Interface `PkiProvider` para intercambiar proveedores (Llama.pe, Firmaperu,
 *    DocuSign Perú, etc.) sin tocar el resto del sistema.
 *  - `DevSignatureProvider`: implementación por defecto para desarrollo y
 *    contratos que NO requieren validez legal plena (borradores internos,
 *    acuerdos no notariales). Produce un hash SHA-256 + timestamp + firmante.
 *  - Los proveedores con validez legal se registran en `providers.ts` con
 *    credenciales vía env vars (PKI_PROVIDER=llama|firmaperu|dev).
 *
 * IMPORTANTE: el provider `dev` NO tiene validez legal plena. Para contratos
 * que van a SUNAFIL/Notaría se debe conectar un proveedor real.
 */

import { createHash, randomUUID } from 'crypto'

// =============================================
// TIPOS
// =============================================

export interface SignerInfo {
  userId: string
  dni?: string
  fullName: string
  email?: string
  /** Rol en el contrato: 'EMPLOYER' | 'WORKER' | 'WITNESS' */
  role: 'EMPLOYER' | 'WORKER' | 'WITNESS'
}

export interface SignatureRequest {
  /** Document ID (contract ID) */
  documentId: string
  /** Hash SHA-256 del PDF/DOCX a firmar (hex) */
  documentHash: string
  /** Nombre del archivo */
  documentName: string
  /** Información del firmante */
  signer: SignerInfo
  /** IP desde donde se firma (para audit trail) */
  ipAddress?: string
  /** User agent */
  userAgent?: string
}

export interface SignatureResult {
  /** ID único de la firma */
  signatureId: string
  /** ID del documento firmado */
  documentId: string
  /** Hash del documento */
  documentHash: string
  /** Hash de la firma (combinación hash + signer + timestamp) */
  signatureHash: string
  /** Timestamp ISO de la firma */
  signedAt: string
  /** Timestamp RFC3339 con sello de tiempo (TSA) — opcional */
  timestamp?: string
  /** Certificado usado (para proveedores con PKI real) */
  certificateId?: string
  /** Proveedor que emitió la firma */
  provider: string
  /** Firmante */
  signer: SignerInfo
  /** Metadatos adicionales */
  metadata?: Record<string, unknown>
  /** URL de verificación pública */
  verificationUrl?: string
}

export interface VerificationResult {
  valid: boolean
  signatureId: string
  documentId: string
  signedAt: string
  signer: SignerInfo
  provider: string
  /** Razones si no es válida */
  invalidReasons?: string[]
}

/**
 * Interface común para cualquier proveedor PKI.
 * Implementaciones concretas: DevSignatureProvider, LlamaPeProvider, FirmaperuProvider, ...
 */
export interface PkiProvider {
  /** Slug del proveedor */
  readonly slug: string
  /** Nombre humano */
  readonly name: string
  /** ¿Produce firmas con validez legal plena según Ley 27269? */
  readonly hasLegalValidity: boolean

  /** Firma un documento */
  sign(req: SignatureRequest): Promise<SignatureResult>

  /** Verifica una firma previa */
  verify(signatureId: string): Promise<VerificationResult>
}

// =============================================
// HELPERS
// =============================================

/** Calcula el hash SHA-256 de un buffer */
export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/** Calcula hash de la firma (para verificación) */
export function computeSignatureHash(
  documentHash: string,
  signer: SignerInfo,
  signedAt: string
): string {
  const payload = `${documentHash}|${signer.userId}|${signer.fullName}|${signedAt}`
  return createHash('sha256').update(payload).digest('hex')
}

// =============================================
// DEV PROVIDER (default)
// =============================================

/**
 * Provider de desarrollo. Genera firmas con hash criptográfico pero SIN
 * certificado PKI real. Útil para:
 *  - Desarrollo local
 *  - Contratos internos que no requieren validez legal plena
 *  - Borradores
 *
 * NO tiene validez legal para SUNAFIL/Notaría.
 */
export class DevSignatureProvider implements PkiProvider {
  readonly slug = 'dev'
  readonly name = 'Firma Digital Interna (sin PKI)'
  readonly hasLegalValidity = false

  private storage = new Map<string, SignatureResult>()

  async sign(req: SignatureRequest): Promise<SignatureResult> {
    const signatureId = `sig_${randomUUID()}`
    const signedAt = new Date().toISOString()
    const signatureHash = computeSignatureHash(req.documentHash, req.signer, signedAt)

    const result: SignatureResult = {
      signatureId,
      documentId: req.documentId,
      documentHash: req.documentHash,
      signatureHash,
      signedAt,
      timestamp: signedAt,
      provider: this.slug,
      signer: req.signer,
      metadata: {
        ipAddress: req.ipAddress,
        userAgent: req.userAgent,
        documentName: req.documentName,
        warning: 'Firma sin PKI — no tiene validez legal plena',
      },
      verificationUrl: `/verify-signature/${signatureId}`,
    }

    this.storage.set(signatureId, result)
    return result
  }

  async verify(signatureId: string): Promise<VerificationResult> {
    const sig = this.storage.get(signatureId)
    if (!sig) {
      return {
        valid: false,
        signatureId,
        documentId: '',
        signedAt: '',
        signer: { userId: '', fullName: '', role: 'WORKER' },
        provider: this.slug,
        invalidReasons: ['Firma no encontrada'],
      }
    }
    // Verificar hash
    const expectedHash = computeSignatureHash(sig.documentHash, sig.signer, sig.signedAt)
    const valid = expectedHash === sig.signatureHash
    return {
      valid,
      signatureId,
      documentId: sig.documentId,
      signedAt: sig.signedAt,
      signer: sig.signer,
      provider: this.slug,
      invalidReasons: valid ? undefined : ['Hash de firma no coincide (posible manipulación)'],
    }
  }

  /** Método interno para acceso desde el endpoint de verificación */
  getSignature(signatureId: string): SignatureResult | undefined {
    return this.storage.get(signatureId)
  }
}

// =============================================
// REGISTRY + FACTORY
// =============================================

const providers = new Map<string, PkiProvider>()

// Provider por defecto
const defaultProvider = new DevSignatureProvider()
providers.set(defaultProvider.slug, defaultProvider)

export function registerProvider(provider: PkiProvider): void {
  providers.set(provider.slug, provider)
}

export function getProvider(slug?: string): PkiProvider {
  const key = slug || process.env.PKI_PROVIDER || 'dev'
  const p = providers.get(key)
  if (!p) {
    throw new Error(`Provider PKI "${key}" no registrado`)
  }
  return p
}

export function listProviders(): Array<{ slug: string; name: string; hasLegalValidity: boolean }> {
  return Array.from(providers.values()).map(p => ({
    slug: p.slug,
    name: p.name,
    hasLegalValidity: p.hasLegalValidity,
  }))
}
