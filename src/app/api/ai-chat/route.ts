import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import { generateChatResponse, detectProvider, getModelName } from '@/lib/ai/chat-engine'
import type { ChatMessage, OrgContext } from '@/lib/ai/chat-engine'

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

    // Build org context
    const [org, totalWorkers, openAlerts] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { razonSocial: true, sector: true, sizeRange: true, regimenPrincipal: true },
      }),
      prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
      prisma.workerAlert.count({ where: { orgId, resolvedAt: null } }),
    ])

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
      messages,
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
    console.error('AI chat error:', error)
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
  }
})
