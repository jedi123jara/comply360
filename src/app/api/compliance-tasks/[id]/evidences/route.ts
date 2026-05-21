import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import type { Prisma } from '@/generated/prisma/client'

export const runtime = 'nodejs'

const TASK_INCLUDE = {
  evidences: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
  },
}

type ComplianceTaskPayload = Prisma.ComplianceTaskGetPayload<{ include: typeof TASK_INCLUDE }>

function serializeTask(task: ComplianceTaskPayload) {
  return {
    ...task,
    multaEvitable: task.multaEvitable ? Number(task.multaEvitable) : null,
  }
}

export const GET = withPlanGateParams<{ id: string }>('diagnostico', async (_req: NextRequest, ctx: AuthContext, params) => {
  try {
    const task = await prisma.complianceTask.findFirst({
      where: { id: params.id, orgId: ctx.orgId },
      select: { id: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    const evidences = await prisma.complianceTaskEvidence.findMany({
      where: { orgId: ctx.orgId, taskId: params.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ evidences })
  } catch (error) {
    console.error('[task evidences GET]', error)
    return NextResponse.json({ error: 'No se pudieron cargar las evidencias' }, { status: 500 })
  }
})

export const POST = withPlanGateParams<{ id: string }>('diagnostico', async (req: NextRequest, ctx: AuthContext, params) => {
  try {
    const body = await req.json()
    const {
      title,
      fileName,
      fileUrl,
      storagePath,
      bucket,
      mimeType,
      sizeBytes,
      hashSha256,
      notes,
    } = body as {
      title?: string
      fileName?: string
      fileUrl?: string
      storagePath?: string
      bucket?: string
      mimeType?: string
      sizeBytes?: number
      hashSha256?: string
      notes?: string
    }

    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json({ error: 'fileUrl es requerido' }, { status: 400 })
    }

    const task = await prisma.complianceTask.findFirst({
      where: { id: params.id, orgId: ctx.orgId },
      select: {
        id: true,
        sourceId: true,
        status: true,
        evidenceUrl: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    const evidence = await prisma.complianceTaskEvidence.create({
      data: {
        orgId: ctx.orgId,
        taskId: task.id,
        sourceId: task.sourceId,
        title: trimOrNull(title, 180),
        fileName: trimOrNull(fileName, 220),
        fileUrl: fileUrl.trim(),
        storagePath: trimOrNull(storagePath, 500),
        bucket: trimOrNull(bucket, 80),
        mimeType: trimOrNull(mimeType, 120),
        sizeBytes: Number.isFinite(sizeBytes) ? Math.max(0, Math.round(sizeBytes ?? 0)) : null,
        hashSha256: trimOrNull(hashSha256, 80),
        notes: trimOrNull(notes, 4000),
        uploadedBy: ctx.userId,
      },
    })

    const updatedTask = await prisma.complianceTask.update({
      where: { id: task.id },
      data: {
        evidenceUrl: task.evidenceUrl ?? evidence.fileUrl,
        status: task.status === 'PENDING' ? 'IN_PROGRESS' : task.status,
      },
      include: TASK_INCLUDE,
    })

    return NextResponse.json({
      evidence,
      task: serializeTask(updatedTask),
    }, { status: 201 })
  } catch (error) {
    console.error('[task evidences POST]', error)
    return NextResponse.json({ error: 'No se pudo registrar la evidencia' }, { status: 500 })
  }
})

export const DELETE = withPlanGateParams<{ id: string }>('diagnostico', async (req: NextRequest, ctx: AuthContext, params) => {
  try {
    const evidenceId = req.nextUrl.searchParams.get('evidenceId')
    if (!evidenceId) {
      return NextResponse.json({ error: 'evidenceId es requerido' }, { status: 400 })
    }

    const evidence = await prisma.complianceTaskEvidence.findFirst({
      where: { id: evidenceId, taskId: params.id, orgId: ctx.orgId },
    })

    if (!evidence) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 })
    }

    await prisma.complianceTaskEvidence.delete({ where: { id: evidence.id } })

    const latestEvidence = await prisma.complianceTaskEvidence.findFirst({
      where: { taskId: params.id, orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
    })

    const updatedTask = await prisma.complianceTask.update({
      where: { id: params.id },
      data: {
        evidenceUrl: latestEvidence?.fileUrl ?? null,
      },
      include: TASK_INCLUDE,
    })

    return NextResponse.json({
      ok: true,
      task: serializeTask(updatedTask),
    })
  } catch (error) {
    console.error('[task evidences DELETE]', error)
    return NextResponse.json({ error: 'No se pudo eliminar la evidencia' }, { status: 500 })
  }
})

function trimOrNull(value: string | null | undefined, max: number) {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}
