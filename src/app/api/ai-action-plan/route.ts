import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import { generateActionPlan, type DiagnosticInput } from '@/lib/ai/action-plan'
import { z } from 'zod'

const PostSchema = z.object({
  diagnosticId: z.string().optional(),
})

// =============================================
// POST /api/ai-action-plan
// Genera plan de acción a partir del diagnóstico más reciente
// (o de uno específico si se pasa diagnosticId)
// =============================================
export const POST = withPlanGate('diagnostico', async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  // 1. Buscar diagnóstico (el específico o el más reciente)
  const diagnostic = parsed.data.diagnosticId
    ? await prisma.complianceDiagnostic.findFirst({
        where: { id: parsed.data.diagnosticId, orgId: ctx.orgId },
      })
    : await prisma.complianceDiagnostic.findFirst({
        where: { orgId: ctx.orgId, completedAt: { not: null } },
        orderBy: { createdAt: 'desc' },
      })

  if (!diagnostic) {
    return NextResponse.json(
      { error: 'No se encontró diagnóstico completo. Realiza primero un diagnóstico de compliance.' },
      { status: 404 }
    )
  }

  // 2. Buscar contexto de la organización
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { name: true, razonSocial: true, regimenPrincipal: true },
  })

  const numTrabajadores = await prisma.worker.count({
    where: { orgId: ctx.orgId, status: { not: 'TERMINATED' } },
  })

  // 3. Construir input para el engine
  const scoreByArea = (diagnostic.scoreByArea ?? {}) as Record<string, number>
  const input: DiagnosticInput = {
    orgName: org?.razonSocial || org?.name || 'Empresa',
    scoreGlobal: diagnostic.scoreGlobal,
    scoreByArea,
    totalMultaRiesgo: Number(diagnostic.totalMultaRiesgo),
    regimenLaboral: org?.regimenPrincipal,
    numTrabajadores,
    topGaps: extractTopGaps(diagnostic.gapAnalysis as unknown),
  }

  // 4. Generar plan con IA (con fallback a simulado)
  const plan = await generateActionPlan(input)

  // 5. Persistir plan de acción en el diagnóstico para no regenerar cada vez
  await prisma.complianceDiagnostic.update({
    where: { id: diagnostic.id },
    data: { actionPlan: JSON.parse(JSON.stringify(plan)) },
  }).catch((err) => {
    console.warn('[AI Action Plan] Failed to persist plan:', err)
  })

  return NextResponse.json({
    diagnosticId: diagnostic.id,
    plan,
  })
})

/* -------- Helpers -------- */
function extractTopGaps(gapAnalysis: unknown): string[] {
  if (!gapAnalysis) return []
  if (Array.isArray(gapAnalysis)) {
    return gapAnalysis
      .slice(0, 6)
      .map((g) => (typeof g === 'string' ? g : (g as { titulo?: string; description?: string })?.titulo || (g as { description?: string })?.description || ''))
      .filter(Boolean)
  }
  if (typeof gapAnalysis === 'object') {
    return Object.values(gapAnalysis as Record<string, unknown>)
      .slice(0, 6)
      .map((v) => String(v))
      .filter(Boolean)
  }
  return []
}
