// =============================================
// CONTRACT HASH-CHAIN (Generador / Chunk 3)
//
// Funciones puras y deterministas que producen los hashes encadenados de
// las versiones de un contrato. Sin acceso a BD ni efectos secundarios →
// 100% testeable y reproducible.
//
// Modelo:
//   contentSha256 = SHA-256(canonicalContent)
//   prevHash      = versionHash de la versión anterior
//                   (genesis = "0x" + 64 ceros)
//   versionHash   = SHA-256(contentSha256 ‖ "||" ‖ prevHash ‖ "||" ‖ canonicalJSON(metadata))
//
// canonicalJSON: serialización determinista con claves ordenadas
// alfabéticamente — distinto orden de claves = mismo hash.
// =============================================

import { createHash } from 'node:crypto'

/** Genesis hash que precede a la versión 1. 64 hex zeros con prefijo "0x". */
export const GENESIS_HASH = '0x' + '0'.repeat(64)

/**
 * Sha256 hex (sin "0x") de un string UTF-8.
 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

/**
 * Serialización JSON canónica:
 *  - Claves de objeto ordenadas alfabéticamente
 *  - undefined se omite (consistente con JSON estándar)
 *  - Sin espacios en blanco
 */
export function canonicalJSON(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'null' // tratamos undefined como null para no romper la cadena
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('canonicalJSON: número no finito')
    return JSON.stringify(value)
  }
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']'
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort()
    const parts = keys
      .map((k) => {
        const v = (value as Record<string, unknown>)[k]
        if (v === undefined) return null
        return JSON.stringify(k) + ':' + canonicalJSON(v)
      })
      .filter((p): p is string => p !== null)
    return '{' + parts.join(',') + '}'
  }
  // BigInt, Symbol, Function: no soportados → error explícito
  throw new Error(`canonicalJSON: tipo no soportado (${typeof value})`)
}

/**
 * Hash del contenido del contrato. Si recibe un objeto, lo canonicaliza.
 * Para HTML/string usa el string tal cual.
 */
export function computeContentSha256(content: string | Record<string, unknown> | null): string {
  const text = typeof content === 'string'
    ? content
    : content === null
      ? ''
      : canonicalJSON(content)
  return sha256Hex(text)
}

/**
 * Metadata mínima requerida por el versionHash. Cualquier campo extra debe
 * ir acá (canonicalJSON los ordena de forma determinista).
 */
export interface VersionMetadata {
  orgId: string
  contractId: string
  versionNumber: number
  createdAtIso: string // ISO-8601, recortado a precisión de segundos
  changedBy: string
  changeReason: string
}

/**
 * Hash de versión: encadena contenido + prevHash + metadata canonical.
 */
export function computeVersionHash(input: {
  contentSha256: string
  prevHash: string
  metadata: VersionMetadata
}): string {
  const meta = canonicalJSON(input.metadata)
  return sha256Hex(`${input.contentSha256}||${input.prevHash}||${meta}`)
}

// ─── Verificación de cadena ────────────────────────────────────────────────

export interface VersionForVerification {
  versionNumber: number
  contentSha256: string
  prevHash: string
  versionHash: string
  metadata: VersionMetadata
}

export type ChainVerificationResult =
  | { valid: true; checkedVersions: number }
  | {
      valid: false
      breakAt: number // versionNumber donde falla (1-indexed)
      reason:
        | 'GENESIS_PREV_MISMATCH'
        | 'PREV_HASH_MISMATCH'
        | 'VERSION_HASH_MISMATCH'
        | 'NUMBERING_GAP'
      detail: string
    }

/**
 * Verifica que una secuencia ordenada de versiones forma una cadena íntegra.
 * Las versiones DEBEN venir ordenadas ascendentemente por versionNumber.
 */
export function verifyChain(versions: VersionForVerification[]): ChainVerificationResult {
  if (versions.length === 0) return { valid: true, checkedVersions: 0 }

  let expectedPrev = GENESIS_HASH
  for (let i = 0; i < versions.length; i++) {
    const v = versions[i]

    // Continuidad numérica
    if (v.versionNumber !== i + 1) {
      return {
        valid: false,
        breakAt: v.versionNumber,
        reason: 'NUMBERING_GAP',
        detail: `Se esperaba versionNumber=${i + 1}, vino ${v.versionNumber}.`,
      }
    }

    // Genesis check: la primera versión debe traer prevHash = GENESIS
    if (i === 0 && v.prevHash !== GENESIS_HASH) {
      return {
        valid: false,
        breakAt: 1,
        reason: 'GENESIS_PREV_MISMATCH',
        detail: `Versión 1 debe tener prevHash=${GENESIS_HASH} pero trae ${v.prevHash}.`,
      }
    }

    // Encadenado
    if (v.prevHash !== expectedPrev) {
      return {
        valid: false,
        breakAt: v.versionNumber,
        reason: 'PREV_HASH_MISMATCH',
        detail: `prevHash de v${v.versionNumber} (${v.prevHash}) no coincide con versionHash de v${v.versionNumber - 1} (${expectedPrev}).`,
      }
    }

    // Reproducibilidad del hash de la versión
    const expected = computeVersionHash({
      contentSha256: v.contentSha256,
      prevHash: v.prevHash,
      metadata: v.metadata,
    })
    if (expected !== v.versionHash) {
      return {
        valid: false,
        breakAt: v.versionNumber,
        reason: 'VERSION_HASH_MISMATCH',
        detail: `versionHash de v${v.versionNumber} no coincide con el recomputado. Posible alteración del contenido o metadata.`,
      }
    }

    expectedPrev = v.versionHash
  }

  return { valid: true, checkedVersions: versions.length }
}
