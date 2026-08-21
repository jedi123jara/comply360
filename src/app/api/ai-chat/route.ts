import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import { generateChatResponse, detectProvider, getModelName } from '@/lib/ai/chat-engine'
import type { ChatMessage, OrgContext } from '@/lib/ai/chat-engine'
import { checkAiBudget } from '@/lib/ai/usage'

// =============================================
// POST /api/ai-chat — Send message to AI assistant
// =============================================
export const POST = withPlanGate('asistente_ia', async (req, ctx) => {
  try {
    const body = await req.json()
    const { messages } = body as {
      messages: ChatMessage[]
    }
    const orgId = ctx.orgId

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    // FIX auditoría (IA-05): el system prompt lo inyecta el motor (chat-engine).
    // Descartamos cualquier mensaje con role 'system' (u otro) enviado por el
    // cliente para evitar prompt-injection que sobreescriba las instrucciones.
    const safeMessages = messages.filter(
      (m): m is ChatMessage =>
        !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
    )
    if (safeMessages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    // Build org context
    const [org, totalWorkers, openAlerts] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { razonSocial: true, sector: true, sizeRange: true, regimenPrincipal: true, plan: true },
      }),
      prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
      prisma.workerAlert.count({ where: { orgId, resolvedAt: null } }),
    ])

    // Quota IA mensual: bloquear si excedió el budget USD del plan.
    // Por encima del feature gate (plan tiene asistente_ia), añadimos cuota
    // soft cap. El usuario ve una respuesta clara con upgrade CTA en lugar
    // de un error genérico al pasarse del consumo.
    const budgetCheck = await checkAiBudget({ orgId, plan: org?.plan ?? 'FREE' })
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Cuota IA mensual agotada',
          code: 'AI_QUOTA_EXCEEDED',
          spentUsd: budgetCheck.spentUsd,
          budgetUsd: budgetCheck.budgetUsd,
          message: `Has usado tu cuota de IA del mes (USD ${budgetCheck.spentUsd.toFixed(2)} de ${budgetCheck.budgetUsd}). Mejora tu plan para más consultas IA.`,
          upgradeUrl: '/dashboard/planes',
        },
        { status: 429 }
      )
    }

    // Get latest compliance score
    let complianceScore: number | undefined
    const latestScore = await prisma.complianceScore.findFirst({
      where: { orgId },
      orderBy: { calculatedAt: 'desc' },
      select: { scoreGlobal: true },
    })
    if (latestScore) complianceScore = latestScore.scoreGlobal

    const orgContext: OrgContext = {
      razonSocial: org?.razonSocial || undefined,
      sector: org?.sector || undefined,
      sizeRange: org?.sizeRange || undefined,
      regimenPrincipal: org?.regimenPrincipal || undefined,
      totalWorkers,
      complianceScore,
      openAlerts,
    }

    const { content, citations, ragChunksUsed, simulated } = await generateChatResponse(
      safeMessages,
      orgContext,
      { orgId, userId: ctx.userId, feature: 'chat' },
    )

    return NextResponse.json({
      message: {
        role: 'assistant',
        content,
      },
      citations,
      ragChunksUsed,
      simulated: simulated ?? false,
      context: {
        provider: simulated ? 'demo' : detectProvider(),
        model: simulated ? 'modo-offline' : getModelName(),
        orgContext: {
          totalWorkers,
          complianceScore,
          openAlerts,
        },
      },
    })
  } catch (error) {
    // Logueamos el error completo (stack trace) en server logs Vercel
    console.error('AI chat error:', error)
    if (error instanceof Error && error.stack) {
      console.error('AI chat stack:', error.stack)
    }

    // FIX auditoría (IA-06): en producción NO se filtra al cliente el detalle
    // del provider ni los nombres de env vars (DEEPSEEK_API_KEY, etc.). El stack
    // completo ya quedó en los logs del server. En dev sí devolvemos el detalle
    // para diagnosticar.
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : 'UnknownError'

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'No se pudo generar la respuesta. Intenta de nuevo en unos momentos.' },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to generate response',
        detail: errorMessage.slice(0, 500),
        errorType: errorName,
        provider: detectProvider(),
      },
      { status: 500 },
    )
  }
})
