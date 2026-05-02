// =============================================
// CONTRACT VERSIONING — SERVICE LAYER
//
// Crea, lista y verifica versiones de un contrato. Toda escritura pasa
// por aquí para garantizar la integridad del hash-chain.
// =============================================

import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import {
  GENESIS_HASH,
  computeContentSha256,
  computeVersionHash,
  verifyChain,
  type VersionForVerification,
  type VersionMetadata,
} from './hash-chain'
import { diffContracts, type ContractSnapshot } from './diff'

export interface CreateVersionInput {
  contractId: string
  orgId: string
  changedBy: string
  changeReason: string
  contentHtml?: string | null
  contentJson?: unknown
  formData?: Record<string, unknown> | null
}

/**
 * Calcula el contenido canonical que se hashea para `contentSha256`.
 * Si hay HTML, lo usamos tal cual. Si no, canonicalizamos un objeto que
 * combina contentJson + formData para que el hash refleje todo el estado.
 */
function buildHashableContent(input: {
  contentHtml: string | null
  contentJson: unknown
  formData: Record<string, unknown> | null
}): string | Record<string, unknown> {
  if (input.contentHtml && input.contentHtml.length > 0) return input.contentHtml
  return {
    contentJson: input.contentJson ?? null,
    formData: input.formData ?? null,
  } as Record<string, unknown>
}

/**
 * Crea una nueva versión apendizada al hash-chain del contrato.
 * Idempotencia: si el `contentSha256` resultante coincide con el de la
 * versión anterior y la metadata material (changeReason+changedBy) es
 * la misma, NO crea una versión duplicada y devuelve la existente.
 */
export async function createContractVersion(input: CreateVersionInput) {
  const prev = await prisma.contractVersion.findFirst({
    where: { contractId: input.contractId },
    orderBy: { versionNumber: 'desc' },
  })

  const versionNumber = (prev?.versionNumber ?? 0) + 1
  const prevHash = prev?.versionHash ?? GENESIS_HASH

  const contentHtml = input.contentHtml ?? null
  const contentJson = input.contentJson ?? null
  const formData = input.formData ?? null

  const hashableContent = buildHashableContent({ contentHtml, contentJson, formData })
  const contentSha256 = computeContentSha256(hashableContent)

  // Idempotencia: si nada cambió, devolvemos la previa
  if (prev && prev.contentSha256 === contentSha256 && prev.changeReason === input.changeReason) {
    return { version: prev, created: false }
  }

  const createdAt = new Date()
  const createdAtIso = createdAt.toISOString()
  const metadata: VersionMetadata = {
    orgId: input.orgId,
    contractId: input.contractId,
    versionNumber,
    createdAtIso,
    changedBy: input.changedBy,
    changeReason: input.changeReason,
  }
  const versionHash = computeVersionHash({ contentSha256, prevHash, metadata })

  // Diff
  const prevSnapshot: ContractSnapshot | null = prev
    ? {
        contentHtml: prev.contentHtml,
        contentJson: prev.contentJson,
        formData: prev.formData as Record<string, unknown> | null,
      }
    : null
  const diff = diffContracts(prevSnapshot, { contentHtml, contentJson, formData })

  const version = await prisma.contractVersion.create({
    data: {
      orgId: input.orgId,
      contractId: input.contractId,
      versionNumber,
      contentHtml,
      contentJson: contentJson === null ? Prisma.JsonNull : (contentJson as Prisma.InputJsonValue),
      formData: formData === null ? Prisma.JsonNull : (formData as Prisma.InputJsonValue),
      contentSha256,
      prevHash,
      versionHash,
      diffJson: diff.json as unknown as Prisma.InputJsonValue,
      diffSummary: diff.summary,
      changeReason: input.changeReason,
      changedBy: input.changedBy,
      createdAt,
    },
  })

  return { version, created: true }
}

/**
 * Lista versiones de un contrato ordenadas por versionNumber asc.
 * Filtra por orgId implícito (las versiones tienen orgId denormalizado).
 */
export async function listContractVersions(contractId: string, orgId: string) {
  return prisma.contractVersion.findMany({
    where: { contractId, orgId },
    orderBy: { versionNumber: 'asc' },
  })
}

/**
 * Verifica la cadena de versiones de un contrato.
 * Útil para auditoría: si la BD fue alterada manualmente, la cadena se rompe.
 */
export async function verifyContractChain(contractId: string, orgId: string) {
  const versions = await listContractVersions(contractId, orgId)

  // Reconstruir la metadata original a partir de los campos persistidos.
  // OJO: createdAtIso debe usar la misma representación con la que se computó
  // el hash al crearse la versión. Postgres devuelve ms; computeVersionHash
  // recibe ISO con ms también.
  const verificationItems: VersionForVerification[] = versions.map((v) => ({
    versionNumber: v.versionNumber,
    contentSha256: v.contentSha256,
    prevHash: v.prevHash,
    versionHash: v.versionHash,
    metadata: {
      orgId: v.orgId,
      contractId: v.contractId,
      versionNumber: v.versionNumber,
      createdAtIso: v.createdAt.toISOString(),
      changedBy: v.changedBy,
      changeReason: v.changeReason,
    },
  }))

  return {
    versions: versions.length,
    result: verifyChain(verificationItems),
  }
}

/** Helper para invocar fire-and-forget desde rutas POST/PATCH sin bloquear. */
export function createContractVersionFireAndForget(input: CreateVersionInput): void {
  createContractVersion(input).catch((err) => {
    console.error(`[versioning] failed to create version for ${input.contractId}:`, err)
  })
}
