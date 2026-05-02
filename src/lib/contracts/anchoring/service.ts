// =============================================
// ANCHORING SERVICE — orquesta el ciclo diario
// Generador de Contratos / Chunk 8
//
// Para una fecha + tenant:
//   1. Lista todas las ContractVersion creadas ese día
//   2. Construye Merkle tree con sus versionHash
//   3. Persiste MerkleAnchor + actualiza cada Version con su proof
//   4. (Opcional) Solicita timestamp RFC 3161 y/o OpenTimestamps
//
// El service es idempotente: si ya existe un anchor para (orgId, date), no
// se reescribe el tree pero sí se reintentan los timestamps externos si
// quedaron pendientes.
// =============================================

import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { logAudit } from '@/lib/audit'
import {
  buildAllProofs,
  buildMerkleTree,
} from './merkle'
import {
  requestTimestamp,
  RFC3161Error,
} from './rfc3161'
import { submitToCalendar } from './opentimestamps'

export interface AnchorResult {
  orgId: string
  anchorDate: string
  anchorId: string | null
  leafCount: number
  merkleRoot: string | null
  rfc3161: { ok: boolean; error?: string; tsa?: string }
  ots: { ok: boolean; error?: string; calendar?: string }
  status: 'PENDING' | 'RFC3161_OK' | 'OTS_OK' | 'FULL_OK' | 'NO_VERSIONS' | 'FAILED'
}

interface AnchorOptions {
  orgId: string
  /** Fecha en YYYY-MM-DD (UTC). Si null, usa el día anterior UTC. */
  date?: string
  /** Forzar reintento de timestamps externos aunque ya estén OK. */
  retry?: boolean
}

const RFC3161_TSA_URL = process.env.RFC3161_TSA_URL // ej: https://freetsa.org/tsr
const RFC3161_TSA_AUTH = process.env.RFC3161_TSA_AUTH // header Authorization opcional
const OTS_CALENDAR_URL = process.env.OTS_CALENDAR_URL

function previousUtcDate(): string {
  const now = new Date()
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1))
  return yesterday.toISOString().slice(0, 10)
}

function dayBoundsUtc(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`)
  const end = new Date(`${dateStr}T23:59:59.999Z`)
  return { start, end }
}

/**
 * Ejecuta el anchor de un día concreto para una organización.
 */
export async function anchorOrgVersionsForDate(opts: AnchorOptions): Promise<AnchorResult> {
  const date = opts.date ?? previousUtcDate()
  const { start, end } = dayBoundsUtc(date)
  const result: AnchorResult = {
    orgId: opts.orgId,
    anchorDate: date,
    anchorId: null,
    leafCount: 0,
    merkleRoot: null,
    rfc3161: { ok: false },
    ots: { ok: false },
    status: 'PENDING',
  }

  // Versions del día — orden estable por createdAt + id (determinista)
  const versions = await prisma.contractVersion.findMany({
    where: {
      orgId: opts.orgId,
      createdAt: { gte: start, lte: end },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, versionHash: true, contractId: true, versionNumber: true },
  })

  if (versions.length === 0) {
    result.status = 'NO_VERSIONS'
    return result
  }

  // Build Merkle
  const leaves = versions.map((v) => v.versionHash)
  const tree = buildMerkleTree(leaves)
  const proofs = buildAllProofs(tree)

  result.leafCount = leaves.length
  result.merkleRoot = tree.root

  // Upsert MerkleAnchor
  const leavesPayload = versions.map((v, i) => ({
    versionId: v.id,
    versionHash: v.versionHash,
    contractId: v.contractId,
    versionNumber: v.versionNumber,
    leafIndex: i,
  }))

  const anchor = await prisma.merkleAnchor.upsert({
    where: { orgId_anchorDate: { orgId: opts.orgId, anchorDate: start } },
    create: {
      orgId: opts.orgId,
      anchorDate: start,
      leafCount: versions.length,
      leaves: leavesPayload as unknown as Prisma.InputJsonValue,
      merkleRoot: tree.root,
      status: 'PENDING',
    },
    update: {
      leafCount: versions.length,
      leaves: leavesPayload as unknown as Prisma.InputJsonValue,
      merkleRoot: tree.root,
    },
  })
  result.anchorId = anchor.id

  // Asociar cada version con su anchor + proof
  await prisma.$transaction(
    versions.map((v, i) =>
      prisma.contractVersion.update({
        where: { id: v.id },
        data: {
          merkleAnchorId: anchor.id,
          leafIndex: i,
          merkleProof: proofs[i] as unknown as Prisma.InputJsonValue,
        },
      }),
    ),
  )

  // ── RFC 3161 (best-effort) ─────────────────────────────────────────────
  if (RFC3161_TSA_URL && (opts.retry || !anchor.rfc3161Token)) {
    try {
      const ts = await requestTimestamp({
        tsaUrl: RFC3161_TSA_URL,
        digestHex: tree.root,
        authorization: RFC3161_TSA_AUTH,
        nonce: true,
        requestCert: true,
      })
      if (ts.status === 0 || ts.status === 1) {
        await prisma.merkleAnchor.update({
          where: { id: anchor.id },
          data: {
            rfc3161Token: new Uint8Array(ts.token),
            rfc3161Tsa: RFC3161_TSA_URL,
            rfc3161At: new Date(),
          },
        })
        result.rfc3161 = { ok: true, tsa: RFC3161_TSA_URL }
      } else {
        result.rfc3161 = { ok: false, error: `TSA status ${ts.status}` }
      }
    } catch (err) {
      const message = err instanceof RFC3161Error
        ? err.message
        : err instanceof Error
          ? err.message
          : 'unknown'
      result.rfc3161 = { ok: false, error: message }
    }
  } else if (anchor.rfc3161Token) {
    result.rfc3161 = { ok: true, tsa: anchor.rfc3161Tsa ?? undefined }
  }

  // ── OpenTimestamps (best-effort) ───────────────────────────────────────
  if (opts.retry || !anchor.otsProof) {
    try {
      const ots = await submitToCalendar({
        digestHex: tree.root,
        calendarUrl: OTS_CALENDAR_URL,
      })
      await prisma.merkleAnchor.update({
        where: { id: anchor.id },
        data: {
          otsProof: new Uint8Array(ots.proof),
          otsCalendar: ots.calendarUrl,
          otsAt: new Date(),
        },
      })
      result.ots = { ok: true, calendar: ots.calendarUrl }
    } catch (err) {
      result.ots = { ok: false, error: err instanceof Error ? err.message : 'unknown' }
    }
  } else {
    result.ots = { ok: true, calendar: anchor.otsCalendar ?? undefined }
  }

  // Estado final
  result.status = computeStatus(result)
  await prisma.merkleAnchor.update({
    where: { id: anchor.id },
    data: { status: result.status },
  })

  await logAudit({
    orgId: opts.orgId,
    action: 'contract.anchored',
    entityType: 'MerkleAnchor',
    entityId: anchor.id,
    metadata: {
      date,
      leafCount: result.leafCount,
      merkleRoot: result.merkleRoot.slice(0, 16),
      rfc3161: result.rfc3161.ok,
      ots: result.ots.ok,
    },
  })

  return result
}

function computeStatus(r: AnchorResult): AnchorResult['status'] {
  if (r.rfc3161.ok && r.ots.ok) return 'FULL_OK'
  if (r.rfc3161.ok) return 'RFC3161_OK'
  if (r.ots.ok) return 'OTS_OK'
  return 'PENDING'
}

/**
 * Anclaje masivo: itera sobre todas las orgs con versions del día y
 * ejecuta `anchorOrgVersionsForDate` en cada una. Llamada típica desde
 * el cron diario.
 */
export async function anchorAllOrgsForDate(date?: string): Promise<{
  date: string
  totalOrgs: number
  results: AnchorResult[]
}> {
  const targetDate = date ?? previousUtcDate()
  const { start, end } = dayBoundsUtc(targetDate)

  // Distintas orgs con activity ese día
  const orgs = await prisma.contractVersion.findMany({
    where: { createdAt: { gte: start, lte: end } },
    distinct: ['orgId'],
    select: { orgId: true },
  })

  const results: AnchorResult[] = []
  for (const o of orgs) {
    try {
      const r = await anchorOrgVersionsForDate({ orgId: o.orgId, date: targetDate })
      results.push(r)
    } catch (err) {
      console.error(`[anchoring] failed for org ${o.orgId}:`, err)
      results.push({
        orgId: o.orgId,
        anchorDate: targetDate,
        anchorId: null,
        leafCount: 0,
        merkleRoot: null,
        rfc3161: { ok: false },
        ots: { ok: false },
        status: 'FAILED',
      })
    }
  }

  return { date: targetDate, totalOrgs: orgs.length, results }
}
