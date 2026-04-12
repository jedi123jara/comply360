/**
 * API Key Service — Gestion de claves de API publica para COMPLY360
 *
 * Features:
 * - Generacion de API keys con prefijo "comply_live_"
 * - Hash SHA-256 para almacenamiento seguro
 * - Rate limiting por clave (1000 req/hora por defecto)
 * - Permisos granulares por recurso
 * - Revocacion y listado de claves
 *
 * Nota: En produccion, el store deberia ser una tabla en la DB (Prisma).
 * Esta implementacion usa un store en memoria para MVP con la misma API.
 */

import { createHash, randomBytes } from 'crypto'

// =============================================
// TYPES
// =============================================

export type ApiPermission =
  | 'workers:read'
  | 'workers:write'
  | 'contracts:read'
  | 'contracts:write'
  | 'compliance:read'
  | 'reports:read'
  | 'alerts:read'

export interface ApiKeyRecord {
  id: string
  orgId: string
  name: string
  keyHash: string
  keyPrefix: string
  permissions: ApiPermission[]
  rateLimit: number // requests per hour
  createdAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
  requestCount: number
}

export interface ApiKeyCreateResult {
  id: string
  key: string         // Full key - only shown once at creation
  prefix: string      // "comply_live_xxxx..." first 12 chars for display
  name: string
  permissions: ApiPermission[]
  rateLimit: number
  createdAt: Date
}

export interface ApiKeyValidation {
  valid: boolean
  orgId?: string
  keyId?: string
  permissions?: ApiPermission[]
  error?: string
}

interface RateLimitEntry {
  count: number
  windowStart: number
}

// =============================================
// IN-MEMORY STORE (production: use Prisma/DB)
// =============================================

const keyStore = new Map<string, ApiKeyRecord>()       // keyHash -> record
const orgKeyIndex = new Map<string, Set<string>>()     // orgId -> Set<keyHash>
const rateLimitStore = new Map<string, RateLimitEntry>() // keyHash -> rate limit window

// =============================================
// HELPERS
// =============================================

function generateId(): string {
  return randomBytes(12).toString('hex')
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

function generateRawKey(): string {
  return randomBytes(32).toString('hex').slice(0, 32)
}

// =============================================
// API KEY SERVICE
// =============================================

export class ApiKeyService {
  private static readonly KEY_PREFIX = 'comply_live_'
  private static readonly DEFAULT_RATE_LIMIT = 1000 // requests per hour

  /**
   * Genera una nueva API key para una organizacion.
   * IMPORTANTE: La clave completa solo se muestra una vez en la creacion.
   */
  generateApiKey(
    orgId: string,
    name: string,
    permissions: ApiPermission[],
    rateLimitPerHour?: number,
  ): ApiKeyCreateResult {
    if (!orgId || !name) {
      throw new Error('Se requiere orgId y nombre para generar una API key.')
    }

    if (!permissions || permissions.length === 0) {
      throw new Error('Se requiere al menos un permiso para la API key.')
    }

    const rawKey = generateRawKey()
    const fullKey = `${ApiKeyService.KEY_PREFIX}${rawKey}`
    const keyHash = hashKey(fullKey)
    const id = generateId()
    const rateLimit = rateLimitPerHour ?? ApiKeyService.DEFAULT_RATE_LIMIT

    const record: ApiKeyRecord = {
      id,
      orgId,
      name,
      keyHash,
      keyPrefix: fullKey.slice(0, 16) + '...',
      permissions,
      rateLimit,
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
      requestCount: 0,
    }

    keyStore.set(keyHash, record)

    // Index by org
    if (!orgKeyIndex.has(orgId)) {
      orgKeyIndex.set(orgId, new Set())
    }
    orgKeyIndex.get(orgId)!.add(keyHash)

    return {
      id,
      key: fullKey,
      prefix: record.keyPrefix,
      name,
      permissions,
      rateLimit,
      createdAt: record.createdAt,
    }
  }

  /**
   * Valida una API key y retorna informacion de la organizacion y permisos.
   * Incluye verificacion de rate limiting.
   */
  validateApiKey(key: string): ApiKeyValidation {
    if (!key || !key.startsWith(ApiKeyService.KEY_PREFIX)) {
      return {
        valid: false,
        error: 'Formato de API key invalido. Las claves deben comenzar con "comply_live_".',
      }
    }

    const keyHash = hashKey(key)
    const record = keyStore.get(keyHash)

    if (!record) {
      return {
        valid: false,
        error: 'API key no encontrada o invalida.',
      }
    }

    if (record.revokedAt) {
      return {
        valid: false,
        error: 'Esta API key ha sido revocada.',
      }
    }

    // Check rate limit
    const rateLimitResult = this.checkRateLimit(keyHash, record.rateLimit)
    if (!rateLimitResult.allowed) {
      return {
        valid: false,
        error: `Limite de solicitudes excedido (${record.rateLimit}/hora). Intenta de nuevo en ${rateLimitResult.retryAfterSeconds} segundos.`,
      }
    }

    // Update usage stats
    record.lastUsedAt = new Date()
    record.requestCount += 1

    return {
      valid: true,
      orgId: record.orgId,
      keyId: record.id,
      permissions: record.permissions,
    }
  }

  /**
   * Revoca una API key por su ID.
   */
  revokeApiKey(keyId: string): boolean {
    for (const [, record] of keyStore) {
      if (record.id === keyId) {
        record.revokedAt = new Date()
        return true
      }
    }
    return false
  }

  /**
   * Lista todas las API keys de una organizacion (sin mostrar el hash).
   */
  listApiKeys(orgId: string): Array<Omit<ApiKeyRecord, 'keyHash'>> {
    const hashes = orgKeyIndex.get(orgId)
    if (!hashes) return []

    const keys: Array<Omit<ApiKeyRecord, 'keyHash'>> = []
    for (const hash of hashes) {
      const record = keyStore.get(hash)
      if (record) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { keyHash: _hash, ...rest } = record
        keys.push(rest)
      }
    }

    return keys.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
  }

  /**
   * Verifica si una API key tiene un permiso especifico.
   */
  hasPermission(permissions: ApiPermission[], required: ApiPermission): boolean {
    return permissions.includes(required)
  }

  // =============================================
  // RATE LIMITING
  // =============================================

  private checkRateLimit(
    keyHash: string,
    maxRequests: number,
  ): { allowed: boolean; retryAfterSeconds?: number } {
    const now = Date.now()
    const windowMs = 60 * 60 * 1000 // 1 hour
    let entry = rateLimitStore.get(keyHash)

    if (!entry || now - entry.windowStart > windowMs) {
      // New window
      entry = { count: 0, windowStart: now }
      rateLimitStore.set(keyHash, entry)
    }

    if (entry.count >= maxRequests) {
      const retryAfterMs = windowMs - (now - entry.windowStart)
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      }
    }

    entry.count += 1
    return { allowed: true }
  }
}

// Singleton instance
export const apiKeyService = new ApiKeyService()
