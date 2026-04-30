/**
 * POST /api/ai-chat/stream — SSE streaming del copilot del dashboard.
 *
 * Cliente: usa fetch con ReadableStream o EventSource para consumir.
 * Eventos emitidos:
 *   - event: citations  → { citations: string[], ragChunksUsed: number }
 *   - event: delta      → { delta: string }
 *   - event: done       → { usage: {...} }
 *   - event: error      → { error: string }
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import { generateChatStream, type ChatMessage, type OrgContext } from '@/lib/ai/chat-engine'
import { checkAiBudget } from '@/lib/ai/usage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function sseFormat(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export const POST = withPlanGate('asistente_ia', async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const { messages } = body as { messages?: ChatMessage[] }
  const orgId = ctx.orgId

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new NextResponse(sseFormat('error', { error: 'No messages provided' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  const [org, totalWorkers, openAlerts] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { razonSocial: true, sector: true, sizeRange: true, regimenPrincipal: true, plan: true },
    }),
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
    prisma.workerAlert.count({ where: { orgId, resolvedAt: null } }),
  ])

  const budgetCheck = await checkAiBudget({ orgId, plan: org?.plan ?? 'FREE' })
  if (!budgetCheck.allowed) {
    return new NextResponse(
      sseFormat('error', {
        error: 'AI_QUOTA_EXCEEDED',
        spentUsd: budgetCheck.spentUsd,
        budgetUsd: budgetCheck.budgetUsd,
        message: `Has usado tu cuota de IA del mes (USD ${budgetCheck.spentUsd.toFixed(2)} de ${budgetCheck.budgetUsd}).`,
      }),
      { status: 429, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

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

  const encoder = new TextEncoder()
  const abortController = new AbortController()

  const stream = new ReadableStream({
    async start(controller) {
      // Heartbeat cada 15s para evitar que proxies cierren la conexión
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch { /* stream closed */ }
      }, 15000)

      try {
        for await (const evt of generateChatStream(messages, orgContext, {
          orgId,
          userId: ctx.userId,
          feature: 'chat',
          signal: abortController.signal,
        })) {
          const eventName = evt.type
          const payload: Record<string, unknown> = {}
          if (evt.type === 'delta' && evt.delta) payload.delta = evt.delta
          if (evt.type === 'citations') {
            payload.citations = evt.citations
            payload.ragChunksUsed = evt.ragChunksUsed
          }
          if (evt.type === 'done' && evt.usage) payload.usage = evt.usage
          if (evt.type === 'error') payload.error = evt.error
          controller.enqueue(encoder.encode(sseFormat(eventName, payload)))
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            sseFormat('error', { error: e instanceof Error ? e.message : 'desconocido' }),
          ),
        )
      } finally {
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch { /* already closed */ }
      }
    },
    cancel() {
      abortController.abort()
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering si está detrás de proxy
    },
  })
})
