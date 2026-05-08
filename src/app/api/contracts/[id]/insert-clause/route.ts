import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { Prisma } from '@/generated/prisma/client'
import { renderClause, clauseTextToHtml } from '@/lib/contracts/clauses/render'
import type { ClauseVariable, SelectedClause } from '@/lib/contracts/clauses/types'

const InsertSchema = z.object({
  clauseCode: z.string().min(2),
  /** Map de variable.key → valor (string|number). */
  values: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  /**
   * Si true, inserta el texto al final del `contentHtml` actual del contrato.
   * Si false, sólo persiste la selección sin tocar contentHtml.
   */
  appendToContent: z.boolean().default(true),
})

// =============================================
// POST /api/contracts/[id]/insert-clause
// Renderiza una cláusula del catálogo con los values del usuario y la
// inserta en el contrato. Crea/actualiza `formData._selectedClauses` y,
// si appendToContent=true, agrega el texto al contentHtml.
// El PATCH automático del contrato dispara las cadenas de validación y
// versionado (chunks 1 y 3).
// =============================================
export const POST = withPlanGateParams<{ id: string }>('contratos', async (req: NextRequest, ctx: AuthContext, params) => {
  const body = await req.json().catch(() => null)
  const parsed = InsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Body inválido', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Cargar contrato + cláusula en paralelo
  const [contract, clause] = await Promise.all([
    prisma.contract.findFirst({
      where: { id: params.id, orgId: ctx.orgId },
    }),
    prisma.contractClause.findUnique({
      where: { code: parsed.data.clauseCode },
    }),
  ])

  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }
  if (!clause || !clause.active) {
    return NextResponse.json({ error: 'Cláusula no encontrada o inactiva' }, { status: 404 })
  }

  const variables = clause.variables as unknown as ClauseVariable[]
  const render = renderClause({
    bodyTemplate: clause.bodyTemplate,
    variables,
    values: parsed.data.values,
  })

  if (render.missing.length > 0) {
    return NextResponse.json(
      {
        error: 'Faltan variables requeridas para renderizar la cláusula.',
        missing: render.missing,
      },
      { status: 400 },
    )
  }

  // Computar selección actualizada
  const formData = (contract.formData ?? {}) as Record<string, unknown>
  const existing = (formData._selectedClauses as SelectedClause[] | undefined) ?? []

  // Si la cláusula ya está, reemplazamos sus values manteniendo la posición
  const filtered = existing.filter((s) => s.code !== clause.code)
  const position = existing.length
  const snapshot: SelectedClause = {
    code: clause.code,
    version: clause.version,
    values: parsed.data.values,
    position,
    renderedText: render.text,
    insertedAt: new Date().toISOString(),
    insertedBy: ctx.userId,
  }
  const updatedSelection: SelectedClause[] = [...filtered, snapshot]

  const updatedFormData = {
    ...formData,
    _selectedClauses: updatedSelection,
  }

  // Computar nuevo contentHtml si se pidió append
  let nextContentHtml: string | undefined
  if (parsed.data.appendToContent) {
    const existingHtml = contract.contentHtml ?? ''
    const clauseHtml = `\n<section data-clause="${clause.code}" data-version="${clause.version}">\n<h3>${clause.title}</h3>\n${clauseTextToHtml(render.text)}\n</section>\n`
    nextContentHtml = existingHtml + clauseHtml
  }

  const updated = await prisma.contract.update({
    where: { id: params.id, orgId: ctx.orgId },
    data: {
      formData: updatedFormData as unknown as Prisma.InputJsonValue,
      ...(nextContentHtml !== undefined ? { contentHtml: nextContentHtml } : {}),
    },
  })

  // Audit
  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'contract.clause.inserted',
    entityType: 'Contract',
    entityId: params.id,
    metadata: {
      clauseCode: clause.code,
      clauseVersion: clause.version,
      appendedToContent: parsed.data.appendToContent,
    },
  })

  // Disparar re-validación + versionado fire-and-forget
  import('@/lib/contracts/validation/engine').then(({ runValidationPipelineFireAndForget }) => {
    runValidationPipelineFireAndForget(params.id, ctx.orgId, {
      triggeredBy: ctx.userId,
      trigger: 'update',
    })
  }).catch(() => {})

  import('@/lib/contracts/versioning/service').then(({ createContractVersionFireAndForget }) => {
    createContractVersionFireAndForget({
      contractId: params.id,
      orgId: ctx.orgId,
      changedBy: ctx.userId,
      changeReason: `Inserción de cláusula ${clause.code} (${clause.title})`,
      contentHtml: updated.contentHtml,
      contentJson: updated.contentJson,
      formData: updated.formData as Record<string, unknown> | null,
    })
  }).catch(() => {})

  return NextResponse.json({
    data: {
      clauseCode: clause.code,
      renderedText: render.text,
      contentHtml: updated.contentHtml,
      selectedClauses: updatedSelection,
    },
  })
})

// =============================================
// DELETE /api/contracts/[id]/insert-clause?code=XXX
// Quita la cláusula del array `_selectedClauses` (NO modifica contentHtml
// para evitar destruir contenido editado a mano por el usuario).
// =============================================
export const DELETE = withPlanGateParams<{ id: string }>('contratos', async (req: NextRequest, ctx: AuthContext, params) => {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  if (!code) {
    return NextResponse.json({ error: 'Falta query param ?code=' }, { status: 400 })
  }

  const contract = await prisma.contract.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
  })
  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  const formData = (contract.formData ?? {}) as Record<string, unknown>
  const existing = (formData._selectedClauses as SelectedClause[] | undefined) ?? []
  const filtered = existing.filter((s) => s.code !== code)

  if (filtered.length === existing.length) {
    return NextResponse.json({ error: 'La cláusula no estaba seleccionada' }, { status: 404 })
  }

  const updatedFormData = { ...formData, _selectedClauses: filtered }

  await prisma.contract.update({
    where: { id: params.id, orgId: ctx.orgId },
    data: { formData: updatedFormData as unknown as Prisma.InputJsonValue },
  })

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'contract.clause.removed',
    entityType: 'Contract',
    entityId: params.id,
    metadata: { clauseCode: code },
  })

  return NextResponse.json({ data: { selectedClauses: filtered } })
})

