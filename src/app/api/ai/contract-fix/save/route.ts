/**
 * POST /api/ai/contract-fix/save
 *
 * Persiste un resultado de Contract-Fix como `Contract` con status DRAFT.
 * Cierra el loop: corregir → guardar → enviar a firma biométrica.
 *
 * Body: {
 *   contractType: string         // tipo Prisma ContractType (CONTRATO_INDEFINIDO, etc.)
 *   title: string                // título legible (ej. "Contrato corregido — Juan Pérez")
 *   fixedHtml: string            // HTML del contrato corregido
 *   originalHtml?: string        // opcional, para audit trail
 *   changes: ContractFixChange[] // metadata del fix
 *   workerId?: string            // opcional: vincular al worker
 * }
 *
 * Plan-gate: PRO (feature `review_ia` heredada del fix endpoint).
 * Audit: queda log `ai.contract_fix_saved` con metadata.
 */

import { NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import { prisma } from '@/lib/prisma'
import { createContractWithSideEffects } from '@/lib/contracts/create'

// Mapeo del tipo del form de analizar-contrato (CONTRATO_INDEFINIDO, etc.)
// al enum Prisma `ContractType` (LABORAL_INDEFINIDO, etc.).
// Mantener sincronizado con prisma/schema.prisma:ContractType.
const CONTRACT_TYPE_MAP: Record<string, string> = {
  CONTRATO_INDEFINIDO: 'LABORAL_INDEFINIDO',
  CONTRATO_PLAZO_FIJO: 'LABORAL_PLAZO_FIJO',
  CONTRATO_TIEMPO_PARCIAL: 'LABORAL_TIEMPO_PARCIAL',
  CONTRATO_MYPE: 'LABORAL_INDEFINIDO',
  LOCACION_SERVICIOS: 'LOCACION_SERVICIOS',
  REGLAMENTO_INTERNO: 'REGLAMENTO_INTERNO',
  POLITICA_HOSTIGAMIENTO: 'POLITICA_HOSTIGAMIENTO',
  POLITICA_SST: 'POLITICA_SST',
  // Aliases sin prefijo
  INDEFINIDO: 'LABORAL_INDEFINIDO',
  PLAZO_FIJO: 'LABORAL_PLAZO_FIJO',
  TIEMPO_PARCIAL: 'LABORAL_TIEMPO_PARCIAL',
}

const VALID_PRISMA_TYPES = new Set([
  'LABORAL_INDEFINIDO',
  'LABORAL_PLAZO_FIJO',
  'LABORAL_TIEMPO_PARCIAL',
  'LOCACION_SERVICIOS',
  'CONFIDENCIALIDAD',
  'NO_COMPETENCIA',
  'POLITICA_HOSTIGAMIENTO',
  'POLITICA_SST',
  'REGLAMENTO_INTERNO',
  'ADDENDUM',
  'CONVENIO_PRACTICAS',
  'CUSTOM',
])

type PrismaContractType =
  | 'LABORAL_INDEFINIDO'
  | 'LABORAL_PLAZO_FIJO'
  | 'LABORAL_TIEMPO_PARCIAL'
  | 'LOCACION_SERVICIOS'
  | 'CONFIDENCIALIDAD'
  | 'NO_COMPETENCIA'
  | 'POLITICA_HOSTIGAMIENTO'
  | 'POLITICA_SST'
  | 'REGLAMENTO_INTERNO'
  | 'ADDENDUM'
  | 'CONVENIO_PRACTICAS'
  | 'CUSTOM'

interface ContractFixChange {
  type: 'ADD' | 'MODIFY' | 'REMOVE'
  category: string
  before?: string
  after?: string
  reason: string
  legalBasis?: string
}

export const POST = withPlanGate('review_ia', async (req, ctx) => {
  let body: {
    contractType?: string
    title?: string
    fixedHtml?: string
    originalHtml?: string
    changes?: ContractFixChange[]
    workerId?: string
    aiRiskScore?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.fixedHtml || typeof body.fixedHtml !== 'string') {
    return NextResponse.json(
      { error: 'fixedHtml requerido', code: 'MISSING_HTML' },
      { status: 400 },
    )
  }
  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json(
      { error: 'title requerido', code: 'MISSING_TITLE' },
      { status: 400 },
    )
  }

  // Mapeo del tipo del form al enum Prisma. CONTRATO_INDEFINIDO → LABORAL_INDEFINIDO
  const inputType = body.contractType ?? 'CONTRATO_INDEFINIDO'
  const mappedType = CONTRACT_TYPE_MAP[inputType] ?? inputType
  if (!VALID_PRISMA_TYPES.has(mappedType)) {
    return NextResponse.json(
      {
        error: `Tipo de contrato inválido: ${body.contractType}`,
        code: 'INVALID_TYPE',
        validTypes: Array.from(VALID_PRISMA_TYPES),
      },
      { status: 400 },
    )
  }
  const contractType = mappedType as PrismaContractType

  try {
    // Cast via JSON.parse(JSON.stringify(...)) para que Prisma acepte el shape
    // como InputJsonValue (los arrays anidados de objetos no son asignables
    // directo al tipo NullableJsonNullValueInput).
    const formDataJson = JSON.parse(
      JSON.stringify({
        source: 'ai-contract-fix',
        changesCount: body.changes?.length ?? 0,
        changes: body.changes ?? [],
        originalHtmlSnapshot: body.originalHtml?.slice(0, 5000) ?? null,
      }),
    )
    const aiRisksJson = body.changes ? JSON.parse(JSON.stringify(body.changes)) : null

    const { contract: created } = await createContractWithSideEffects({
      orgId: ctx.orgId,
      userId: ctx.userId,
      type: contractType,
      status: 'DRAFT',
      title: body.title.slice(0, 200),
      contentHtml: body.fixedHtml,
      contentJson: {
        source: 'ai-contract-fix',
        changes: body.changes ?? [],
        originalHtmlSnapshot: body.originalHtml?.slice(0, 5000) ?? null,
      },
      formData: formDataJson,
      workerId: body.workerId ?? null,
      sourceKind: 'ai-draft-based',
      provenance: 'AI_GENERATED',
      changeReason: 'Contrato guardado desde Contract-Fix IA',
    })
    await prisma.contract.update({
      where: { id: created.id },
      data: {
        aiRiskScore: typeof body.aiRiskScore === 'number' ? body.aiRiskScore : null,
        aiRisksJson,
        aiReviewedAt: new Date(),
      },
    })

    void prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'ai.contract_fix_saved',
          entityType: 'Contract',
          entityId: created.id,
          metadataJson: {
            contractType,
            changesCount: body.changes?.length ?? 0,
            workerId: body.workerId ?? null,
          },
        },
      })
      .catch(() => null)

    return NextResponse.json({
      success: true,
      contract: {
        id: created.id,
        title: created.title,
        status: created.status,
        createdAt: created.createdAt,
        url: `/dashboard/contratos/${created.id}`,
      },
    })
  } catch (err) {
    console.error('[contract-fix/save] Error:', err)
    return NextResponse.json(
      {
        error: 'No pudimos guardar el contrato corregido',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    )
  }
})
