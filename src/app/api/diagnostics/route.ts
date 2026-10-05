import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import { ALL_QUESTIONS, EXPRESS_QUESTIONS, getFilteredQuestions } from '@/lib/compliance/questions'
import { scoreDiagnostic } from '@/lib/compliance/diagnostic-scorer'
import { parseDiagnosticSubmission } from '@/lib/compliance/diagnostic-submission'
import type { DiagnosticType } from '@/generated/prisma/client'
import { actionPlanToTaskInputs, spawnTasksFromActionPlan } from '@/lib/compliance/task-spawner'
import { emit } from '@/lib/events'

// =============================================
// GET /api/diagnostics — List diagnostics + get questions
// =============================================
export const GET = withPlanGate('diagnostico', async (req, ctx) => {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const orgId = ctx.orgId

    // Return questions for a new diagnostic
    if (action === 'questions') {
      const rawType = searchParams.get('type') || 'FULL'
      if (rawType !== 'FULL' && rawType !== 'EXPRESS') {
        return NextResponse.json(
          { error: "El tipo de diagnóstico debe ser 'FULL' o 'EXPRESS'." },
          { status: 400 }
        )
      }
      const type = rawType as 'FULL' | 'EXPRESS'
      const baseQuestions = type === 'EXPRESS' ? EXPRESS_QUESTIONS : ALL_QUESTIONS

      // Get org context for conditional questions
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { sizeRange: true, regimenPrincipal: true },
      })
      const totalWorkers = await prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } })

      const filtered = getFilteredQuestions(baseQuestions, {
        sizeRange: org?.sizeRange || undefined,
        regimenPrincipal: org?.regimenPrincipal || undefined,
        totalWorkers,
      })

      return NextResponse.json({
        type,
        totalQuestions: filtered.length,
        questions: filtered,
        context: { totalWorkers, sizeRange: org?.sizeRange, regimenPrincipal: org?.regimenPrincipal },
      })
    }

    // List past diagnostics
    const diagnostics = await prisma.complianceDiagnostic.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        scoreGlobal: true,
        totalMultaRiesgo: true,
        completedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      diagnostics: diagnostics.map(d => ({
        ...d,
        totalMultaRiesgo: Number(d.totalMultaRiesgo),
      })),
    })
  } catch (error) {
    console.error('Diagnostics GET error:', error)
    return NextResponse.json({ error: 'No se pudieron cargar los diagnósticos.' }, { status: 500 })
  }
})

// =============================================
// POST /api/diagnostics — Submit diagnostic answers
// =============================================
export const POST = withPlanGate('diagnostico', async (req, ctx) => {
  try {
    const body = await req.json().catch(() => null)
    // Valida tipo y respuestas: SI / PARCIAL / NO / NO_SE / NO_APLICA (o null).
    // Los envíos antiguos con solo SI / PARCIAL / NO siguen siendo válidos.
    const parsed = parseDiagnosticSubmission(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const { type, answers } = parsed.data
    const orgId = ctx.orgId

    // Get org context
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { sizeRange: true, regimenPrincipal: true },
    })
    const totalWorkers = await prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } })

    // Get applicable questions (SIMULATION uses FULL question set)
    const baseQuestions = type === 'EXPRESS' ? EXPRESS_QUESTIONS : ALL_QUESTIONS
    const filtered = getFilteredQuestions(baseQuestions, {
      sizeRange: org?.sizeRange || undefined,
      regimenPrincipal: org?.regimenPrincipal || undefined,
      totalWorkers,
    })

    // Score
    const result = scoreDiagnostic(filtered, answers, totalWorkers)

    // Save to DB
    const diagnostic = await prisma.complianceDiagnostic.create({
      data: {
        orgId,
        type: type as DiagnosticType,
        scoreGlobal: result.scoreGlobal,
        scoreByArea: result.scoreByArea as object,
        totalMultaRiesgo: result.totalMultaRiesgo,
        questionsJson: answers as object[],
        gapAnalysis: result.gapAnalysis as object[],
        actionPlan: result.actionPlan as object[],
        completedAt: new Date(),
      },
    })

    // Also save as a ComplianceScore snapshot
    const areaMap = new Map(result.areaScores.map(a => [a.area, a.score]))
    await prisma.complianceScore.create({
      data: {
        orgId,
        scoreGlobal: result.scoreGlobal,
        scoreContratos: areaMap.get('contratos_registro') ?? null,
        scoreSst: areaMap.get('sst') ?? null,
        scoreDocumentos: areaMap.get('documentos_obligatorios') ?? null,
        scoreVencimientos: areaMap.get('remuneraciones_beneficios') ?? null,
        scorePlanilla: areaMap.get('jornada_descansos') ?? null,
      },
    })

    // Spawn accionable tasks from the action plan (idempotente por sourceId).
    // Un fallo aquí no debe romper el endpoint — el diagnóstico ya está guardado.
    let tasksCreated = 0
    try {
      const taskInputs = actionPlanToTaskInputs(
        result.actionPlan,
        result.gapAnalysis.map(g => ({
          questionId: g.questionId,
          gravedad: g.gravedad,
          text: g.text,
          answer: g.answer,
        })),
      )
      tasksCreated = await spawnTasksFromActionPlan(orgId, diagnostic.id, taskInputs)
    } catch (e) {
      console.error('[Diagnostics] task spawn failed:', e)
    }

    // Event bus: workflows se enganchan a diagnostic.completed
    emit('diagnostic.completed', {
      orgId,
      userId: ctx.userId,
      diagnosticId: diagnostic.id,
      type: diagnostic.type,
      scoreGlobal: diagnostic.scoreGlobal,
    })

    return NextResponse.json({
      diagnosticId: diagnostic.id,
      tasksCreated,
      ...result,
    })
  } catch (error) {
    console.error('Diagnostics POST error:', error)
    return NextResponse.json({ error: 'No se pudo guardar el diagnóstico.' }, { status: 500 })
  }
})
