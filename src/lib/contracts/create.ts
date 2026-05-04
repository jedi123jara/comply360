import { Prisma, type ContractStatus, type ContractType } from '@/generated/prisma/client'
import { logAudit } from '@/lib/audit'
import { syncComplianceScore } from '@/lib/compliance/sync-score'
import { recalculateLegajoScore } from '@/lib/compliance/legajo-config'
import { prisma } from '@/lib/prisma'
import {
  renderContract,
  withContractProvenanceFormData,
  withContractRenderMetadata,
  type ContractProvenance,
  type ContractRenderSourceKind,
} from './rendering'
import {
  runContractQualityGate,
  withContractQualityMetadata,
} from './quality-gate'
import {
  buildPremiumContractDocument,
  withPremiumContractDocument,
} from './premium-library'

export interface CreateContractWithSideEffectsInput {
  orgId: string
  userId: string
  templateId?: string | null
  type: ContractType
  title: string
  status?: ContractStatus
  formData?: Record<string, unknown> | null
  contentHtml?: string | null
  contentJson?: unknown
  renderedText?: string | null
  workerId?: string | null
  sourceKind?: ContractRenderSourceKind
  provenance?: ContractProvenance
  expiresAt?: Date | string | null
  changeReason?: string
}

const LABOR_TYPES = new Set<ContractType>([
  'LABORAL_INDEFINIDO',
  'LABORAL_PLAZO_FIJO',
  'LABORAL_TIEMPO_PARCIAL',
  'CONVENIO_PRACTICAS',
])

const AI_LABOR_TYPES = new Set<ContractType>([
  'LABORAL_INDEFINIDO',
  'LABORAL_PLAZO_FIJO',
  'LABORAL_TIEMPO_PARCIAL',
])

export async function createContractWithSideEffects(input: CreateContractWithSideEffectsInput) {
  const userId = await resolveExistingUserId(input.orgId, input.userId)
  const sourceKind = input.sourceKind ?? inferSourceKind(input)
  const inputFormData = input.formData ?? null
  const premiumDocument = shouldBuildPremiumDocument(sourceKind, input)
    ? buildPremiumContractDocument({
        contractType: input.type,
        title: input.title,
        formData: inputFormData,
      })
    : null
  const sourceContentJson = withPremiumContractDocument(input.contentJson, premiumDocument)
  const rendered = renderContract({
    title: input.title,
    contractType: input.type,
    sourceKind,
    provenance: input.provenance,
    templateId: input.templateId,
    formData: inputFormData,
    contentHtml: input.contentHtml,
    contentJson: sourceContentJson,
    renderedText: input.renderedText,
  })

  const formData = withContractProvenanceFormData(inputFormData, rendered.renderMetadata)
  const renderedContentJson = withContractRenderMetadata(sourceContentJson, rendered.renderMetadata)
  const initialQuality = runContractQualityGate({
    type: input.type,
    status: input.status ?? 'DRAFT',
    title: input.title,
    contentHtml: rendered.renderedHtml,
    contentJson: renderedContentJson,
    formData,
    provenance: rendered.renderMetadata.provenance,
    renderVersion: rendered.renderMetadata.renderVersion,
    isFallback: rendered.renderMetadata.isFallback,
  })
  const contentJson = withContractQualityMetadata(renderedContentJson, initialQuality)
  const dbTemplateId = input.templateId
    ? await resolveContractTemplateId(input.templateId)
    : null

  const baseData = {
    orgId: input.orgId,
    createdById: userId,
    templateId: dbTemplateId,
    type: input.type,
    status: input.status ?? 'DRAFT',
    title: input.title,
    formData: formData as Prisma.InputJsonValue,
    contentHtml: rendered.renderedHtml,
    contentJson: contentJson as Prisma.InputJsonValue,
    ...(input.expiresAt ? { expiresAt: new Date(input.expiresAt) } : {}),
  }
  let contract
  try {
    contract = await prisma.contract.create({
      data: {
        ...baseData,
        provenance: rendered.renderMetadata.provenance,
        generationMode: rendered.renderMetadata.generationMode,
        renderVersion: rendered.renderMetadata.renderVersion,
        isFallback: rendered.renderMetadata.isFallback,
      },
    })
  } catch (err) {
    if (!isMissingRenderMetadataColumnError(err)) throw err
    console.warn('[createContractWithSideEffects] Contract render metadata columns missing; retrying legacy-compatible create.')
    contract = await prisma.contract.create({ data: baseData })
  }

  await autoLinkWorkerFromFormData({
    orgId: input.orgId,
    userId,
    contractId: contract.id,
    title: input.title,
    type: input.type,
    formData,
  })
  if (input.workerId) {
    await linkExistingWorkerToContract({
      workerId: input.workerId,
      userId,
      contractId: contract.id,
      title: input.title,
    })
  }

  syncComplianceScore(input.orgId).catch(() => {})

  import('@/lib/contracts/validation/engine').then(({ runValidationPipelineFireAndForget }) => {
    runValidationPipelineFireAndForget(contract.id, input.orgId, {
      triggeredBy: userId,
      trigger: 'create',
    })
  }).catch((err) => console.warn('[validation] auto-trigger failed:', err))

  import('@/lib/contracts/versioning/service').then(({ createContractVersionFireAndForget }) => {
    createContractVersionFireAndForget({
      contractId: contract.id,
      orgId: input.orgId,
      changedBy: userId,
      changeReason: input.changeReason ?? 'Creacion inicial del contrato',
      contentHtml: rendered.renderedHtml,
      contentJson,
      formData,
    })
  }).catch((err) => console.warn('[versioning] genesis version failed:', err))

  if (AI_LABOR_TYPES.has(input.type) && rendered.renderedHtml) {
    import('@/lib/ai/contract-review').then(async ({ reviewContract }) => {
      try {
        const review = await reviewContract({
          contractHtml: rendered.renderedHtml,
          contractType: input.type,
        })
        await prisma.contract.update({
          where: { id: contract.id },
          data: {
            aiRiskScore: review.overallScore,
            aiRisksJson: review as unknown as Prisma.InputJsonValue,
            aiReviewedAt: new Date(),
          },
        })
      } catch (err) {
        console.warn('[AI Review] Auto-trigger failed:', err)
      }
    }).catch(() => {})
  }

  await logAudit({
    orgId: input.orgId,
    userId,
    action: 'contract.created',
    entityType: 'Contract',
    entityId: contract.id,
    metadata: {
      type: input.type,
      provenance: rendered.renderMetadata.provenance,
      renderVersion: rendered.renderMetadata.renderVersion,
      isFallback: rendered.renderMetadata.isFallback,
    },
  })

  return {
    contract,
    rendered,
    userId,
  }
}

function isMissingRenderMetadataColumnError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes('provenance')
    || message.includes('generation_mode')
    || message.includes('render_version')
    || message.includes('is_fallback')
}

async function resolveContractTemplateId(templateId: string): Promise<string | null> {
  const template = await prisma.contractTemplate.findUnique({
    where: { id: templateId },
    select: { id: true },
  })
  return template?.id ?? null
}

async function linkExistingWorkerToContract(input: {
  workerId: string
  userId: string
  contractId: string
  title: string
}): Promise<void> {
  try {
    await prisma.workerContract.upsert({
      where: { workerId_contractId: { workerId: input.workerId, contractId: input.contractId } },
      create: { workerId: input.workerId, contractId: input.contractId },
      update: {},
    })

    const existingDoc = await prisma.workerDocument.findFirst({
      where: { workerId: input.workerId, documentType: 'contrato_trabajo' },
      select: { id: true },
    })
    if (!existingDoc) {
      await prisma.workerDocument.create({
        data: {
          workerId: input.workerId,
          category: 'INGRESO',
          documentType: 'contrato_trabajo',
          title: input.title,
          isRequired: true,
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedBy: input.userId,
        },
      })
    }

    await recalculateLegajoScore(input.workerId)
  } catch (err) {
    console.warn('[createContractWithSideEffects] Explicit worker link failed (non-fatal):', err)
  }
}

function inferSourceKind(input: CreateContractWithSideEffectsInput): ContractRenderSourceKind {
  if (input.provenance === 'BULK_GENERATED') return 'bulk-row-based'
  if (input.provenance === 'ORG_TEMPLATE') return 'org-template-based'
  if (input.provenance === 'AI_GENERATED' || input.provenance === 'AI_FALLBACK') return 'ai-draft-based'
  if (input.contentJson && hasGeneratedContractShape(input.contentJson)) return 'ai-draft-based'
  if (input.templateId) return 'template-based'
  if (input.contentHtml) return 'html-based'
  return 'template-based'
}

function shouldBuildPremiumDocument(
  sourceKind: ContractRenderSourceKind,
  input: CreateContractWithSideEffectsInput,
): boolean {
  if (sourceKind === 'org-template-based') return false
  if (sourceKind === 'html-based' && input.contentHtml) return false
  return ['template-based', 'bulk-row-based', 'ai-draft-based'].includes(sourceKind)
    || (!input.contentHtml && !input.renderedText)
}

function hasGeneratedContractShape(value: unknown): boolean {
  return typeof value === 'object'
    && value !== null
    && ('clausulas' in value || 'tipoDetectado' in value || 'generadoPor' in value)
}

async function resolveExistingUserId(orgId: string, userId: string): Promise<string> {
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (userExists) return userId

  const fallbackUser = await prisma.user.findFirst({
    where: { orgId },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!fallbackUser) {
    throw new Error('Usuario no encontrado. Vuelve a iniciar sesion.')
  }
  return fallbackUser.id
}

async function autoLinkWorkerFromFormData(input: {
  orgId: string
  userId: string
  contractId: string
  title: string
  type: ContractType
  formData: Record<string, unknown>
}): Promise<void> {
  if (!LABOR_TYPES.has(input.type)) return

  const dniRaw = String(input.formData.trabajador_dni ?? '').trim().replace(/\D/g, '')
  const nombreRaw = String(input.formData.trabajador_nombre ?? '').trim()
  if (dniRaw.length < 8 || nombreRaw.length === 0) return

  try {
    const { firstName, lastName } = parseWorkerName(nombreRaw)
    const regimen = input.type === 'CONVENIO_PRACTICAS' ? 'MODALIDAD_FORMATIVA' : 'GENERAL'
    const tipoContrato =
      input.type === 'LABORAL_PLAZO_FIJO' ? 'PLAZO_FIJO'
        : input.type === 'LABORAL_TIEMPO_PARCIAL' ? 'TIEMPO_PARCIAL'
          : input.type === 'CONVENIO_PRACTICAS' ? 'OBRA_DETERMINADA'
            : 'INDEFINIDO'
    const fechaIngreso = input.formData.fecha_inicio
      ? new Date(String(input.formData.fecha_inicio))
      : new Date()
    const sueldoBruto = input.formData.remuneracion ? Number(input.formData.remuneracion) : 0

    const worker = await prisma.worker.upsert({
      where: { orgId_dni: { orgId: input.orgId, dni: dniRaw } },
      create: {
        orgId: input.orgId,
        dni: dniRaw,
        firstName,
        lastName,
        position: input.formData.cargo ? String(input.formData.cargo) : null,
        regimenLaboral: regimen,
        tipoContrato,
        fechaIngreso,
        sueldoBruto,
        status: 'ACTIVE',
        legajoScore: 0,
      },
      update: {
        ...(input.formData.cargo ? { position: String(input.formData.cargo) } : {}),
        ...(input.formData.remuneracion ? { sueldoBruto } : {}),
      },
      select: { id: true },
    })

    await prisma.workerContract.upsert({
      where: { workerId_contractId: { workerId: worker.id, contractId: input.contractId } },
      create: { workerId: worker.id, contractId: input.contractId },
      update: {},
    })

    const existingDoc = await prisma.workerDocument.findFirst({
      where: { workerId: worker.id, documentType: 'contrato_trabajo' },
      select: { id: true },
    })
    if (!existingDoc) {
      await prisma.workerDocument.create({
        data: {
          workerId: worker.id,
          category: 'INGRESO',
          documentType: 'contrato_trabajo',
          title: input.title,
          isRequired: true,
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedBy: input.userId,
        },
      })
    }

    await recalculateLegajoScore(worker.id)
  } catch (workerErr) {
    console.warn('[createContractWithSideEffects] Auto-worker creation failed (non-fatal):', workerErr)
  }
}

function parseWorkerName(nombreRaw: string): { firstName: string; lastName: string } {
  if (nombreRaw.includes(',')) {
    const [last, first] = nombreRaw.split(',').map((s) => s.trim())
    return { firstName: first ?? '', lastName: last ?? '' }
  }
  const parts = nombreRaw.split(' ')
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ') || parts[0] || '',
  }
}
