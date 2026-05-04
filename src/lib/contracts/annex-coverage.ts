import { prisma } from '@/lib/prisma'
import { readPremiumContractDocument, type PremiumContractAnnex } from './premium-library'

export type ContractAnnexEvidenceSource = 'ORG_DOCUMENT' | 'WORKER_DOCUMENT'

export interface ContractAnnexEvidence {
  annexId: string
  annexTitle: string
  source: ContractAnnexEvidenceSource
  documentId: string
  documentTitle: string
  documentType: string
  status: string
  fileUrl?: string | null
  updatedAt?: string
}

export interface ContractAnnexCoverageResult {
  checkedAt: string
  requiredAnnexes: Array<{
    id: string
    title: string
    required: boolean
  }>
  coveredAnnexes: ContractAnnexEvidence[]
  missingAnnexes: string[]
  workerLinked: boolean
}

interface AnnexDocumentCandidate {
  id: string
  title: string
  type: string
  status: string
  source: ContractAnnexEvidenceSource
  fileUrl?: string | null
  updatedAt?: Date | string | null
}

export async function resolveContractAnnexCoverage(input: {
  contractId: string
  orgId: string
  contentJson: unknown
}): Promise<ContractAnnexCoverageResult | null> {
  const premiumDocument = readPremiumContractDocument(input.contentJson)
  if (!premiumDocument || premiumDocument.annexes.length === 0) return null

  const workerLinks = await prisma.workerContract.findMany({
    where: { contractId: input.contractId },
    select: { workerId: true },
  })
  const workerIds = workerLinks.map((link) => link.workerId)

  const [orgDocuments, workerDocuments] = await Promise.all([
    prisma.orgDocument.findMany({
      where: { orgId: input.orgId },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        fileUrl: true,
        isPublishedToWorkers: true,
        updatedAt: true,
      },
    }),
    workerIds.length > 0
      ? prisma.workerDocument.findMany({
          where: {
            workerId: { in: workerIds },
            status: { in: ['UPLOADED', 'VERIFIED'] },
          },
          select: {
            id: true,
            title: true,
            documentType: true,
            category: true,
            fileUrl: true,
            status: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
  ])

  const candidates: AnnexDocumentCandidate[] = [
    ...orgDocuments
      .filter((doc) => doc.fileUrl || doc.isPublishedToWorkers || isGeneratedOrgDocument(doc.description))
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        status: doc.isPublishedToWorkers
          ? 'PUBLISHED'
          : isGeneratedOrgDocument(doc.description)
            ? 'GENERATED'
            : 'AVAILABLE',
        source: 'ORG_DOCUMENT' as const,
        fileUrl: doc.fileUrl,
        updatedAt: doc.updatedAt,
      })),
    ...workerDocuments
      .filter((doc) => doc.fileUrl)
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        type: `${doc.category}:${doc.documentType}`,
        status: doc.status,
        source: 'WORKER_DOCUMENT' as const,
        fileUrl: doc.fileUrl,
        updatedAt: doc.updatedAt,
      })),
  ]

  return evaluateContractAnnexCoverage({
    requiredAnnexes: premiumDocument.annexes,
    candidates,
    workerLinked: workerIds.length > 0,
  })
}

export function evaluateContractAnnexCoverage(input: {
  requiredAnnexes: PremiumContractAnnex[]
  candidates: AnnexDocumentCandidate[]
  workerLinked?: boolean
}): ContractAnnexCoverageResult {
  const requiredAnnexes = input.requiredAnnexes
    .filter((annex) => annex.required)
    .map((annex) => ({
      id: annex.id,
      title: annex.title,
      required: annex.required,
    }))

  const coveredAnnexes: ContractAnnexEvidence[] = []
  const missingAnnexes: string[] = []

  for (const annex of requiredAnnexes) {
    const match = input.candidates.find((candidate) => matchesAnnex(annex.id, annex.title, candidate))
    if (!match) {
      missingAnnexes.push(annex.title)
      continue
    }
    coveredAnnexes.push({
      annexId: annex.id,
      annexTitle: annex.title,
      source: match.source,
      documentId: match.id,
      documentTitle: match.title,
      documentType: match.type,
      status: match.status,
      fileUrl: match.fileUrl,
      updatedAt: match.updatedAt ? new Date(match.updatedAt).toISOString() : undefined,
    })
  }

  return {
    checkedAt: new Date().toISOString(),
    requiredAnnexes,
    coveredAnnexes,
    missingAnnexes,
    workerLinked: input.workerLinked ?? false,
  }
}

export function withContractAnnexCoverageMetadata(
  contentJson: unknown,
  coverage: ContractAnnexCoverageResult | null,
): Record<string, unknown> {
  return {
    ...(isRecord(contentJson) ? contentJson : {}),
    ...(coverage ? { annexCoverage: coverage } : {}),
  }
}

function matchesAnnex(annexId: string, annexTitle: string, candidate: AnnexDocumentCandidate): boolean {
  const haystack = normalizeText(`${candidate.type} ${candidate.title}`)
  switch (annexId) {
    case 'sst-policy':
      return candidate.type === 'REGLAMENTO_SST'
        || candidate.type === 'PLAN_SST'
        || includesAny(haystack, ['sst', 'seguridad y salud', 'reglamento de seguridad', 'plan anual de seguridad'])
    case 'harassment-policy':
      return candidate.type === 'POLITICA_HOSTIGAMIENTO'
        || includesAny(haystack, ['hostigamiento', 'acoso sexual', 'prevencion del hostigamiento'])
    case 'pdp-consent':
      return includesAny(haystack, ['datos personales', 'proteccion de datos', 'consentimiento informado', 'lpdp'])
    case 'job-description':
      return candidate.type === 'MOF'
        || includesAny(haystack, ['mof', 'descripcion de puesto', 'descripcion del puesto', 'funciones', 'perfil de puesto'])
    case 'objective-cause-support':
      return includesAny(haystack, ['causa objetiva', 'sustento', 'proyecto', 'suplencia', 'incremento temporal', 'necesidad temporal'])
    case 'iperc-epp':
      return includesAny(haystack, ['iperc', 'epp', 'equipo de proteccion', 'entrega de epp'])
    case 'telework-agreement':
      return includesAny(haystack, ['teletrabajo', 'desconexion digital', 'autoevaluacion sst'])
    case 'service-scope-annex':
      return includesAny(haystack, ['alcance de servicios', 'entregables', 'orden de servicio', 'terminos de referencia'])
    case 'training-plan':
      return includesAny(haystack, ['plan formativo', 'practicas', 'modalidad formativa'])
    case 'training-center-letter':
      return includesAny(haystack, ['centro de estudios', 'carta de presentacion', 'validacion del centro', 'convenio formativo'])
    default:
      return fuzzyAnnexTitleMatch(annexTitle, haystack)
  }
}

function fuzzyAnnexTitleMatch(annexTitle: string, haystack: string): boolean {
  const significantWords = normalizeText(annexTitle)
    .split(' ')
    .filter((word) => word.length > 4)
  if (significantWords.length === 0) return false
  return significantWords.filter((word) => haystack.includes(word)).length >= Math.min(2, significantWords.length)
}

function includesAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(normalizeText(needle)))
}

function isGeneratedOrgDocument(description: string | null): boolean {
  if (!description) return false
  try {
    const parsed = JSON.parse(description) as { _schema?: unknown }
    return parsed._schema === 'generated_document_v1'
  } catch {
    return false
  }
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
