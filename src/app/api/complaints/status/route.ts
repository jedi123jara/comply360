import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildComplaintProgress } from '@/lib/complaints/progress'
import { rateLimit } from '@/lib/rate-limit'
import { verifyComplaintTrackingToken } from '@/lib/complaints/tracking-token'

const trackingLimiter = rateLimit({ interval: 60_000, limit: 20 })

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Recibida',
  UNDER_REVIEW: 'En evaluación',
  INVESTIGATING: 'En investigación',
  PROTECTION_APPLIED: 'Medidas de protección aplicadas',
  RESOLVED: 'Resuelta',
  DISMISSED: 'Desestimada',
}

export async function GET(request: NextRequest) {
  const rl = await trackingLimiter.check(request)
  if (!rl.success) return rl.response!

  const url = new URL(request.url)
  const orgId = url.searchParams.get('org')?.trim()
  const code = url.searchParams.get('code')?.trim().toUpperCase()
  const token = url.searchParams.get('token')?.trim()

  if (!orgId || !code || !token) {
    return NextResponse.json({ error: 'Codigo de seguimiento invalido' }, { status: 404 })
  }

  const complaint = await prisma.complaint.findFirst({
    where: { orgId, code },
    select: {
      id: true,
      code: true,
      regime: true,
      type: true,
      status: true,
      trackingTokenHash: true,
      receivedAt: true,
      updatedAt: true,
      resolvedAt: true,
      timeline: {
        select: {
          action: true,
          description: true,
          publicDescription: true,
          visibleToReporter: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      documents: {
        where: { visibleToReporter: true },
        select: {
          id: true,
          title: true,
          stage: true,
          kind: true,
          mimeType: true,
          size: true,
          hashSha256: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!complaint || !verifyComplaintTrackingToken(token, complaint.trackingTokenHash)) {
    return NextResponse.json({ error: 'Codigo de seguimiento invalido' }, { status: 404 })
  }

  const documents = complaint.documents.map((document) => ({
    ...document,
    downloadUrl: `/api/complaints/status/documents/${document.id}?org=${encodeURIComponent(orgId)}&code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`,
  }))
  const publicTimeline = complaint.timeline.filter(isPublicTimelineAction)
  const progress = buildComplaintProgress({
    regime: complaint.regime,
    status: complaint.status,
    updatedAt: complaint.updatedAt,
    resolvedAt: complaint.resolvedAt,
    timeline: publicTimeline,
    documents,
  })

  return NextResponse.json({
    code: complaint.code,
    regime: complaint.regime,
    type: complaint.type,
    status: complaint.status,
    statusLabel: STATUS_LABELS[complaint.status] ?? complaint.status,
    receivedAt: complaint.receivedAt.toISOString(),
    updatedAt: complaint.updatedAt.toISOString(),
    resolvedAt: complaint.resolvedAt?.toISOString() ?? null,
    timeline: publicTimeline.map((item) => ({
      action: humanizeTimelineAction(item.action),
      description: safeTimelineDescription(item.publicDescription ?? item.description),
      createdAt: item.createdAt.toISOString(),
    })),
    progress: progress.map((step) => ({
      stage: step.stage,
      label: step.label,
      description: step.description,
      status: step.status,
      completedAt: step.completedAt,
      documents: step.documents.map((document) => ({
        id: document.id,
        title: document.title,
        stage: document.stage,
        kind: document.kind,
        mimeType: document.mimeType ?? null,
        size: document.size ?? null,
        hashSha256: document.hashSha256 ?? null,
        createdAt: new Date(document.createdAt).toISOString(),
        downloadUrl: document.downloadUrl,
      })),
    })),
    documents: documents.map((document) => ({
      id: document.id,
      title: document.title,
      stage: document.stage,
      kind: document.kind,
      mimeType: document.mimeType,
      size: document.size,
      hashSha256: document.hashSha256,
      createdAt: document.createdAt.toISOString(),
      downloadUrl: document.downloadUrl,
    })),
  })
}

function isPublicTimelineAction(item: { visibleToReporter: boolean }): boolean {
  return item.visibleToReporter
}

function humanizeTimelineAction(action: string): string {
  const labels: Record<string, string> = {
    DENUNCIA_RECIBIDA: 'Denuncia recibida',
    HSL_CASE_RECEIVED: 'Caso HSL recibido',
    SST_CASE_RECEIVED: 'Caso SST recibido',
    MPD_CASE_RECEIVED: 'Caso MPD recibido',
    STATUS_UPDATED: 'Estado actualizado',
    PROTECTION_MEASURES: 'Medidas de protección',
    RESOLUTION: 'Resolución registrada',
  }
  return labels[action] ?? action.replaceAll('_', ' ').toLowerCase()
}

function safeTimelineDescription(description: string | null): string | null {
  if (!description) return null
  if (description.length > 160) return `${description.slice(0, 157)}...`
  return description
}
