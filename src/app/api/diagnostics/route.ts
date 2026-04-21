import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { withPlanGate } from '@/lib/plan-gate'
import { ALL_QUESTIONS, EXPRESS_QUESTIONS, getFilteredQuestions } from '@/lib/compliance/questions'
import { scoreDiagnostic } from '@/lib/compliance/diagnostic-scorer'
import type { QuestionAnswer } from '@/lib/compliance/diagnostic-scorer'
import type { DiagnosticType } from '@/generated/prisma/client'
import { actionPlanToTaskInputs, spawnTasksFromActionPlan } from '@/lib/compliance/task-spawner'

// =============================================
// GET /api/diagnostics — List diagnostics + get questions
// =============================================
export const GET = withAuth(async (req, ctx) => {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const orgId = ctx.orgId

    // Return questions for a new diagnostic
    if (action === 'questions') {
      const rawType = searchParams.get('type') || 'FULL'
      if (rawType !== 'FULL' && rawType !== 'EXPRESS') {
        return NextResponse.json(
          { error: "type must be 'FULL' or 'EXPRESS'" },
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
    return NextResponse.json({ error: 'Failed to load diagnostics' }, { status: 500 })
  }
})

// =============================================
// POST /api/diagnostics — Submit diagnostic answers
// =============================================
export const POST = withPlanGate('diagnostico', async (req, ctx) => {
  try {
    const body = await req.json()
    const { type = 'FULL', answers } = body as {
      type?: DiagnosticType
      answers: QuestionAnswer[]
    }
    const orgId = ctx.orgId

    const VALID_TYPES: DiagnosticType[] = ['FULL', 'EXPRESS', 'SIMULATION']
    if (!VALID_TYPES.includes(type as DiagnosticType)) {
      return NextResponse.json(
        { error: "type must be 'FULL', 'EXPRESS' or 'SIMULATION'" },
        { status: 400 }
      )
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: 'No answers provided' }, { status: 400 })
    }

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
        })),
      )
      tasksCreated = await spawnTasksFromActionPlan(orgId, diagnostic.id, taskInputs)
    } catch (e) {
      console.error('[Diagnostics] task spawn failed:', e)
    }

    return NextResponse.json({
      diagnosticId: diagnostic.id,
      tasksCreated,
      ...result,
    })
  } catch (error) {
    console.error('Diagnostics POST error:', error)
    return NextResponse.json({ error: 'Failed to save diagnostic' }, { status: 500 })
  }
})
