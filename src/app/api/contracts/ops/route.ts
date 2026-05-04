import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isOrgTemplate, parseTemplate } from '@/lib/templates/org-template-engine'

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const activeStatuses = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED'] as const
  const warnings: string[] = []

  const totalActive = await prisma.contract.count({
    where: { orgId, status: { in: [...activeStatuses] } },
  })
  const byProvenanceGroups = await safeQuery(
    () => prisma.contract.groupBy({
      by: ['provenance'],
      where: { orgId, status: { not: 'ARCHIVED' } },
      _count: { id: true },
    }),
    [],
    warnings,
    'contract_render_metadata_missing',
  )
  const fallbackCount = await safeQuery(
    () => prisma.contract.count({
      where: { orgId, isFallback: true, status: { not: 'ARCHIVED' } },
    }),
    0,
    warnings,
    'contract_render_metadata_missing',
  )
  const unreviewedAiCount = await safeQuery(
    () => prisma.contract.count({
      where: {
        orgId,
        status: { not: 'ARCHIVED' },
        provenance: { in: ['AI_GENERATED', 'AI_FALLBACK'] },
        aiReviewedAt: null,
      },
    }),
    0,
    warnings,
    'contract_render_metadata_missing',
  )

  const [
    blockerRows,
    recentBlockers,
    orgTemplates,
    legacyDocs,
    recentBulkJobs,
    activeWorkers,
    ackDocs,
    qualityContracts,
    recentUnreviewedAi,
  ] = await Promise.all([
    prisma.contractValidation.findMany({
      where: {
        orgId,
        severity: 'BLOCKER',
        passed: false,
        acknowledged: false,
      },
      select: { contractId: true },
    }),
    prisma.contractValidation.findMany({
      where: {
        orgId,
        severity: 'BLOCKER',
        passed: false,
        acknowledged: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        ruleCode: true,
        message: true,
        createdAt: true,
        contract: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        rule: {
          select: {
            title: true,
            legalBasis: true,
          },
        },
      },
    }),
    safeQuery(() => prisma.orgTemplate.findMany({
      where: { orgId, active: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        documentType: true,
        placeholders: true,
        mappings: true,
        usageCount: true,
        version: true,
        updatedAt: true,
      },
    }), [], warnings, 'org_templates_table_missing'),
    prisma.orgDocument.findMany({
      where: { orgId, type: 'OTRO' },
      select: { id: true, title: true, description: true, version: true, updatedAt: true },
    }),
    prisma.bulkContractJob.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        status: true,
        contractType: true,
        sourceFileName: true,
        totalRows: true,
        succeededRows: true,
        failedRows: true,
        createdAt: true,
        finishedAt: true,
      },
    }),
    prisma.worker.count({
      where: { orgId, status: 'ACTIVE' },
    }),
    prisma.orgDocument.findMany({
      where: {
        orgId,
        acknowledgmentRequired: true,
        isPublishedToWorkers: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        type: true,
        version: true,
        updatedAt: true,
        _count: { select: { acknowledgments: true } },
      },
    }),
    optionalQuery(() => prisma.contract.findMany({
      where: { orgId, status: { in: [...activeStatuses] } },
      orderBy: { updatedAt: 'desc' },
      take: 80,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        contentJson: true,
        updatedAt: true,
      },
    }), []),
    optionalQuery(() => prisma.contract.findMany({
      where: {
        orgId,
        status: { not: 'ARCHIVED' },
        provenance: { in: ['AI_GENERATED', 'AI_FALLBACK'] },
        aiReviewedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        provenance: true,
        isFallback: true,
        updatedAt: true,
      },
    }), []),
  ])

  const byProvenance = Object.fromEntries(
    byProvenanceGroups.map((group) => [group.provenance, group._count.id]),
  )

  const blockerContractIds = new Set(blockerRows.map((row) => row.contractId))
  const normalizedTemplates = [
    ...orgTemplates.map((template) => {
      const placeholders = jsonStringArray(template.placeholders)
      const mappings = jsonStringRecord(template.mappings)
      const unmapped = placeholders.filter((key) => !mappings[key])
      return {
        id: template.id,
        title: template.title,
        storage: 'orgTemplate' as const,
        documentType: template.documentType,
        placeholderCount: placeholders.length,
        unmappedCount: unmapped.length,
        unmapped,
        usageCount: template.usageCount,
        version: template.version,
        updatedAt: template.updatedAt.toISOString(),
      }
    }),
    ...legacyDocs
      .filter((doc) => isOrgTemplate(doc))
      .map((doc) => {
        const meta = parseTemplate(doc.description)
        const placeholders = meta?.placeholders ?? []
        const mappings = meta?.mappings ?? {}
        const unmapped = placeholders.filter((key) => !mappings[key])
        return {
          id: doc.id,
          title: doc.title,
          storage: 'legacyOrgDocument' as const,
          documentType: meta?.documentType ?? 'OTRO',
          placeholderCount: placeholders.length,
          unmappedCount: unmapped.length,
          unmapped,
          usageCount: meta?.usageCount ?? 0,
          version: doc.version,
          updatedAt: doc.updatedAt.toISOString(),
        }
      }),
  ]

  const templatesWithGaps = normalizedTemplates
    .filter((template) => template.unmappedCount > 0)
    .slice(0, 8)

  const ackDocuments = ackDocs.map((doc) => {
    const acknowledged = doc._count.acknowledgments
    const pending = Math.max(activeWorkers - acknowledged, 0)
    return {
      id: doc.id,
      title: doc.title,
      type: doc.type,
      version: doc.version,
      acknowledged,
      pending,
      totalWorkers: activeWorkers,
      updatedAt: doc.updatedAt.toISOString(),
    }
  })

  const failedBulkJobs = recentBulkJobs.filter((job) => job.status === 'FAILED' || job.failedRows > 0).length
  const qualityRows = qualityContracts
    .map((contract) => {
      const quality = readPersistedQuality(contract.contentJson)
      return quality
        ? {
            id: contract.id,
            title: contract.title,
            type: contract.type,
            status: contract.status,
            qualityStatus: quality.status,
            qualityScore: quality.score,
            blockers: quality.blockers,
            missingAnnexes: quality.missingAnnexes,
            updatedAt: contract.updatedAt.toISOString(),
          }
        : null
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
  const qualityBlocked = qualityRows.filter((row) => row.qualityStatus === 'BLOCKED' || row.qualityStatus === 'DRAFT_INCOMPLETE').length
  const qualityReady = qualityRows.filter((row) => row.qualityStatus === 'READY_FOR_SIGNATURE').length
  const qualityReviewRequired = qualityRows.filter((row) => row.qualityStatus === 'LEGAL_REVIEW_REQUIRED' || row.qualityStatus === 'READY_FOR_REVIEW').length
  const qualityMissingAnnexes = qualityRows.filter((row) => row.missingAnnexes.length > 0).length

  const uniqueWarnings = [...new Set(warnings)]

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    health: {
      totalActive,
      blockerCount: blockerRows.length,
      blockerContracts: blockerContractIds.size,
      fallbackCount,
      unreviewedAiCount,
      templatesWithGaps: templatesWithGaps.length,
      failedBulkJobs,
      ackPendingDocuments: ackDocuments.filter((doc) => doc.pending > 0).length,
      qualityBlocked,
      qualityReady,
      qualityReviewRequired,
      qualityMissingAnnexes,
    },
    warnings: uniqueWarnings,
    schema: buildSchemaDiagnostic(uniqueWarnings),
    byProvenance,
    recentBlockers: recentBlockers.map((row) => ({
      id: row.id,
      ruleCode: row.ruleCode,
      message: row.message,
      createdAt: row.createdAt.toISOString(),
      contract: row.contract,
      rule: row.rule,
    })),
    templates: {
      total: normalizedTemplates.length,
      activeDedicated: orgTemplates.length,
      legacy: normalizedTemplates.filter((template) => template.storage === 'legacyOrgDocument').length,
      withGaps: templatesWithGaps,
    },
    bulkJobs: recentBulkJobs.map((job) => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
      finishedAt: job.finishedAt?.toISOString() ?? null,
    })),
    acknowledgments: {
      activeWorkers,
      documents: ackDocuments,
    },
    quality: {
      sampled: qualityContracts.length,
      withPersistedQuality: qualityRows.length,
      blocked: qualityRows
        .filter((row) => row.qualityStatus === 'BLOCKED' || row.qualityStatus === 'DRAFT_INCOMPLETE')
        .slice(0, 8),
      ready: qualityRows
        .filter((row) => row.qualityStatus === 'READY_FOR_SIGNATURE')
        .slice(0, 8),
      missingAnnexes: qualityRows
        .filter((row) => row.missingAnnexes.length > 0)
        .slice(0, 8),
      reviewRequired: qualityRows
        .filter((row) => row.qualityStatus === 'LEGAL_REVIEW_REQUIRED' || row.qualityStatus === 'READY_FOR_REVIEW')
        .slice(0, 8),
    },
    aiReviewRequired: recentUnreviewedAi.map((contract) => ({
      ...contract,
      updatedAt: contract.updatedAt.toISOString(),
    })),
  })
})

function buildSchemaDiagnostic(warnings: string[]) {
  const checks = [
    {
      code: 'contract_render_metadata_missing',
      label: 'Metadata de procedencia contractual',
      status: warnings.includes('contract_render_metadata_missing') ? 'compatibility' : 'ok',
      impact: 'Los contadores de procedencia, fallback IA y contratos IA sin review pueden aparecer incompletos.',
      migration: '20260508010000_add_contract_render_metadata',
      action: 'Aplicar migraciones pendientes en la base y regenerar Prisma Client si corresponde.',
    },
    {
      code: 'org_templates_table_missing',
      label: 'Plantillas dedicadas de empresa',
      status: warnings.includes('org_templates_table_missing') ? 'compatibility' : 'ok',
      impact: 'Las plantillas nuevas se leen desde compatibilidad legacy y no desde la tabla dedicada org_templates.',
      migration: '20260508000000_add_org_templates',
      action: 'Aplicar migración de org_templates y ejecutar el bridge de migración legacy cuando la tabla exista.',
    },
  ]

  const pending = checks.filter((check) => check.status === 'compatibility')
  return {
    status: pending.length > 0 ? 'compatibility' : 'ok',
    pendingCount: pending.length,
    checks,
  }
}

async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
  warnings: string[],
  warningCode: string,
): Promise<T> {
  try {
    return await fn()
  } catch {
    warnings.push(warningCode)
    return fallback
  }
}

async function optionalQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function jsonStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

function readPersistedQuality(value: unknown): null | {
  status: string
  score: number
  blockers: number
  missingAnnexes: string[]
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const quality = (value as Record<string, unknown>).quality
  if (!quality || typeof quality !== 'object' || Array.isArray(quality)) return null
  const record = quality as Record<string, unknown>
  if (typeof record.status !== 'string' || typeof record.score !== 'number') return null
  return {
    status: record.status,
    score: record.score,
    blockers: Array.isArray(record.blockers) ? record.blockers.length : 0,
    missingAnnexes: Array.isArray(record.missingAnnexes)
      ? record.missingAnnexes.filter((item): item is string => typeof item === 'string')
      : [],
  }
}
