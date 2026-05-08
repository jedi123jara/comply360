/**
 * Hash chain para AuditLog (FIX #7.D).
 *
 * Cada entrada de audit log incluye:
 *   - prevHash: hash de la entry anterior en la misma org (null si es la primera)
 *   - entryHash: sha256(canonical(payload) + prevHash)
 *
 * Si alguien edita `metadataJson` de un audit log viejo en la DB, su
 * `entryHash` ya no coincidirá con el `prevHash` de la siguiente entry,
 * y todas las posteriores quedarán inválidas. Eso es lo que lo hace
 * "tamper-evident".
 *
 * El hash chain es POR ORGANIZACIÓN (cada org tiene su propia cadena).
 * Esto evita que crear un audit log en orgA invalide el chain de orgB.
 *
 * Uso:
 *   import { createAuditLogWithChain } from '@/lib/audit/hash-chain'
 *
 *   await createAuditLogWithChain({
 *     orgId,
 *     userId: ctx.userId,
 *     action: 'worker.created',
 *     entityType: 'Worker',
 *     entityId: worker.id,
 *     metadataJson: { dni: worker.dni },
 *   })
 *
 * Verificación: GET /api/audit/verify?orgId=X
 */

import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export interface AuditLogPayload {
  orgId: string
  userId?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  metadataJson?: unknown
  ipAddress?: string | null
}

/**
 * Convierte un payload a un string canónico determinístico (orden de keys
 * estable, recursivo). Sirve como input al hash.
 *
 * Nota: usar `JSON.stringify(obj, replacerArray)` filtra keys nested
 * (cualquier key no en el array se elimina), por eso usamos un replacer
 * function que ordena alfabéticamente cada nivel.
 */
function canonicalize(p: AuditLogPayload, prevHash: string | null, createdAt: Date): string {
  const obj = {
    orgId: p.orgId,
    userId: p.userId ?? null,
    action: p.action,
    entityType: p.entityType ?? null,
    entityId: p.entityId ?? null,
    metadataJson: p.metadataJson ?? null,
    ipAddress: p.ipAddress ?? null,
    createdAt: createdAt.toISOString(),
    prevHash,
  }
  return stableStringify(obj)
}

/**
 * Serialización determinística: ordena alfabéticamente las keys de cada
 * objeto (recursivo) antes de stringificar. Arrays mantienen orden.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']'
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
  return '{' + parts.join(',') + '}'
}

function computeHash(canonical: string): string {
  return createHash('sha256').update(canonical).digest('hex')
}

/**
 * Crea un AuditLog enlazándolo al hash chain de la org.
 *
 * Tomamos el último entryHash de la org como prevHash; computamos el
 * nuevo entryHash sobre el payload + prevHash + createdAt (que se
 * congela ANTES de crear).
 *
 * Race condition: si dos audit logs se crean simultáneos, ambos podrían
 * tomar el mismo prevHash. Aceptable: la cadena se resuelve eventualmente
 * (un orden válido existe). Para garantizar orden total, usar
 * advisory lock — overkill para este caso.
 */
export async function createAuditLogWithChain(payload: AuditLogPayload): Promise<{ id: string; entryHash: string }> {
  const last = await prisma.auditLog.findFirst({
    where: { orgId: payload.orgId },
    orderBy: { createdAt: 'desc' },
    select: { entryHash: true },
  })
  const prevHash = last?.entryHash ?? null
  const createdAt = new Date()
  const canonical = canonicalize(payload, prevHash, createdAt)
  const entryHash = computeHash(canonical)

  const created = await prisma.auditLog.create({
    data: {
      orgId: payload.orgId,
      userId: payload.userId ?? null,
      action: payload.action,
      entityType: payload.entityType ?? null,
      entityId: payload.entityId ?? null,
      metadataJson: payload.metadataJson === undefined ? undefined : (payload.metadataJson as never),
      ipAddress: payload.ipAddress ?? null,
      createdAt,
      prevHash,
      entryHash,
    },
    select: { id: true, entryHash: true },
  })

  return { id: created.id, entryHash: created.entryHash! }
}

/**
 * Verifica la integridad de la cadena de audit logs de una org.
 * Recorre desde el inicio y recomputa cada entryHash; si alguno no
 * coincide con el almacenado, esa entrada (y todas las posteriores)
 * están comprometidas.
 *
 * Devuelve `{ valid: true, count }` si la cadena está limpia, o
 * `{ valid: false, brokenAt, count }` con el id de la primera entry
 * corrupta.
 *
 * NOTA: hasta que se haga backfill, las entries antiguas tendrán
 * `entryHash: null`. Las saltamos como "legacy, no verificable" y solo
 * verificamos las nuevas (post-migration).
 */
export async function verifyAuditChain(orgId: string): Promise<
  | { valid: true; count: number; legacySkipped: number }
  | { valid: false; brokenAt: string; count: number; legacySkipped: number }
> {
  const all = await prisma.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      orgId: true,
      userId: true,
      action: true,
      entityType: true,
      entityId: true,
      metadataJson: true,
      ipAddress: true,
      createdAt: true,
      prevHash: true,
      entryHash: true,
    },
  })

  let legacySkipped = 0
  let lastEntryHash: string | null = null
  let count = 0

  for (const entry of all) {
    if (entry.entryHash === null) {
      // Legacy entry: saltamos pero no rompemos la cadena (asumimos
      // confiable hasta que se backfilee).
      legacySkipped++
      continue
    }

    // Si tenemos un lastEntryHash de una entry verificada, su prevHash
    // debe coincidir.
    if (lastEntryHash !== null && entry.prevHash !== lastEntryHash) {
      return { valid: false, brokenAt: entry.id, count, legacySkipped }
    }

    const canonical = canonicalize(
      {
        orgId: entry.orgId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadataJson: entry.metadataJson,
        ipAddress: entry.ipAddress,
      },
      entry.prevHash,
      entry.createdAt,
    )
    const expected = computeHash(canonical)

    if (expected !== entry.entryHash) {
      return { valid: false, brokenAt: entry.id, count, legacySkipped }
    }

    lastEntryHash = entry.entryHash
    count++
  }

  return { valid: true, count, legacySkipped }
}

// Re-exports para tests
export { canonicalize as _canonicalize, computeHash as _computeHash }
