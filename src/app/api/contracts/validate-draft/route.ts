/**
 * POST /api/contracts/validate-draft
 *
 * Endpoint stateless para validar un borrador de contrato MIENTRAS el
 * usuario lo llena (QW5). NO persiste nada — solo evalua reglas activas
 * contra el snapshot in-memory.
 *
 * Diferencias con runValidationPipeline:
 *  - No requiere contractId (es draft, no existe en BD)
 *  - No escribe ContractValidation
 *  - No genera AuditLog (lo dispara el motor real al guardar)
 *
 * Optimizacion: cachea la lista de reglas activas en memoria por 60s
 * para evitar hit a BD en cada keystroke debounced.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { evaluateRule } from '@/lib/contracts/validation/rule-evaluator'
import {
  buildValidationContextFromDraft,
  type DraftValidationInput,
} from '@/lib/contracts/validation/context-builder'
import type {
  RuleAppliesTo,
  RuleSpec,
  ValidationContext,
} from '@/lib/contracts/validation/types'
import type { ContractType, RegimenLaboral } from '@/generated/prisma/client'

export const runtime = 'nodejs'

// =============================================
// Schema del request
// =============================================

const draftBodySchema = z.object({
  contract: z.object({
    type: z.string(), // ContractType enum
    title: z.string().optional(),
    formData: z.record(z.string(), z.unknown()).nullable().optional(),
    contentHtml: z.string().nullable().optional(),
    expiresAt: z.string().nullable().optional(),
  }),
  /** IDs de workers existentes en el directorio de la org */
  workerIds: z.array(z.string()).optional(),
  /**
   * Datos de un worker que aun no esta en el directorio (caso "nuevo").
   * Si se provee, NO se busca en BD.
   */
  inlineWorker: z
    .object({
      dni: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      regimenLaboral: z.string(),
      fechaIngreso: z.string(),
      sueldoBruto: z.number(),
      nationality: z.string().nullable().optional(),
    })
    .optional(),
})

// =============================================
// Cache de reglas activas (60s TTL)
// =============================================

interface CachedRules {
  fetchedAt: number
  rules: Array<{
    id: string
    code: string
    version: string
    severity: string
    title: string
    legalBasis: string
    ruleSpec: unknown
    appliesTo: unknown
  }>
}

let rulesCache: CachedRules | null = null
const RULES_TTL_MS = 60_000

async function getActiveRules() {
  if (rulesCache && Date.now() - rulesCache.fetchedAt < RULES_TTL_MS) {
    return rulesCache.rules
  }
  const rules = await prisma.contractValidationRule.findMany({
    where: { active: true },
    select: {
      id: true,
      code: true,
      version: true,
      severity: true,
      title: true,
      legalBasis: true,
      ruleSpec: true,
      appliesTo: true,
    },
  })
  rulesCache = { fetchedAt: Date.now(), rules }
  return rules
}

// =============================================
// applies filter (mismo logic que engine.ts pero standalone)
// =============================================

function ruleApplies(
  appliesTo: RuleAppliesTo | null,
  ctx: ValidationContext,
): boolean {
  if (!appliesTo) return true
  if (appliesTo.contractTypes && appliesTo.contractTypes.length > 0) {
    if (!appliesTo.contractTypes.includes(ctx.contract.type)) return false
  }
  if (appliesTo.regimes && appliesTo.regimes.length > 0) {
    const workerRegimes = new Set(ctx.workers.map(w => w.regimenLaboral))
    const overlap = appliesTo.regimes.some(r => workerRegimes.has(r as RegimenLaboral))
    if (!overlap) return false
  }
  return true
}

// =============================================
// Handler
// =============================================

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: z.infer<typeof draftBodySchema>
  try {
    const json = await req.json()
    body = draftBodySchema.parse(json)
  } catch (err) {
    return NextResponse.json(
      { error: 'Payload invalido', details: err instanceof z.ZodError ? err.issues : undefined },
      { status: 400 },
    )
  }

  // ─── Cargar workers vinculados (queries pequenas, scoped por org) ────
  const workersFromDb = body.workerIds && body.workerIds.length > 0
    ? await prisma.worker.findMany({
        where: { orgId: ctx.orgId, id: { in: body.workerIds } },
        select: {
          id: true,
          dni: true,
          firstName: true,
          lastName: true,
          regimenLaboral: true,
          fechaIngreso: true,
          sueldoBruto: true,
          nationality: true,
        },
      })
    : []

  const inlineWorkers: Array<typeof workersFromDb[number]> = body.inlineWorker
    ? [{
        id: 'inline',
        dni: body.inlineWorker.dni,
        firstName: body.inlineWorker.firstName,
        lastName: body.inlineWorker.lastName,
        regimenLaboral: body.inlineWorker.regimenLaboral as RegimenLaboral,
        fechaIngreso: new Date(body.inlineWorker.fechaIngreso),
        sueldoBruto: body.inlineWorker.sueldoBruto as unknown as typeof workersFromDb[number]['sueldoBruto'],
        nationality: body.inlineWorker.nationality ?? null,
      }]
    : []

  const allWorkers = [
    ...workersFromDb.map(w => ({
      ...w,
      sueldoBruto: Number(w.sueldoBruto),
    })),
    ...inlineWorkers.map(w => ({
      ...w,
      sueldoBruto: Number(w.sueldoBruto),
    })),
  ]

  // ─── Historial modal (solo para workers reales del directorio) ───────
  const realIds = workersFromDb.map(w => w.id)
  const historyRaw = realIds.length
    ? await prisma.contract.findMany({
        where: {
          orgId: ctx.orgId,
          status: { not: 'ARCHIVED' },
          type: { in: ['LABORAL_PLAZO_FIJO'] },
          workerContracts: { some: { workerId: { in: realIds } } },
        },
        select: {
          id: true,
          type: true,
          formData: true,
          createdAt: true,
        },
      })
    : []

  const workerModalHistory = historyRaw
    .map(h => {
      const fd = (h.formData ?? null) as Record<string, unknown> | null
      const startRaw = fd?.fecha_inicio ?? fd?.fechaInicio ?? null
      const endRaw = fd?.fecha_fin ?? fd?.fechaFin ?? null
      const start = startRaw ? new Date(String(startRaw)) : h.createdAt
      const end = endRaw ? new Date(String(endRaw)) : null
      const days = end
        ? Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
        : 0
      return {
        contractId: h.id,
        type: h.type,
        startDate: start,
        endDate: end,
        durationDays: days,
      }
    })
    .filter(h => h.durationDays > 0)

  // ─── Cargar org info ──────────────────────────────────────────────────
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { id: true, regimenPrincipal: true, ruc: true },
  })
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // ─── Construir contexto in-memory ─────────────────────────────────────
  const draftInput: DraftValidationInput = {
    contract: {
      type: body.contract.type as ContractType,
      title: body.contract.title,
      formData: body.contract.formData ?? null,
      contentHtml: body.contract.contentHtml ?? null,
      expiresAt: body.contract.expiresAt ?? null,
    },
    organization: {
      id: org.id,
      regimenPrincipal: org.regimenPrincipal,
      ruc: org.ruc,
    },
    workers: allWorkers,
    workerModalHistory,
  }

  const context = buildValidationContextFromDraft(draftInput)

  // ─── Evaluar reglas ───────────────────────────────────────────────────
  const rules = await getActiveRules()
  const results = rules
    .filter(rule => ruleApplies(rule.appliesTo as RuleAppliesTo | null, context))
    .map(rule => {
      let evalResult
      try {
        evalResult = evaluateRule(rule.ruleSpec as RuleSpec, context)
      } catch (err) {
        evalResult = {
          passed: false,
          message: `Error evaluando: ${err instanceof Error ? err.message : 'unknown'}`,
        }
      }
      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        ruleVersion: rule.version,
        severity: rule.severity,
        title: rule.title,
        legalBasis: rule.legalBasis,
        passed: evalResult.passed,
        message: evalResult.message,
      }
    })

  const failed = results.filter(r => !r.passed)
  const blockers = failed.filter(r => r.severity === 'BLOCKER').length
  const warnings = failed.filter(r => r.severity === 'WARNING').length
  const infos = failed.filter(r => r.severity === 'INFO').length

  return NextResponse.json({
    totalRules: results.length,
    blockers,
    warnings,
    infos,
    passed: results.filter(r => r.passed).length,
    results,
  })
})
