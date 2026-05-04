import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export async function recordAttendanceJustification(input: {
  attendanceId: string
  orgId: string
  workerId: string
  reason: string
  files?: string[]
  requestedBy: string
  requestedAt?: Date
}) {
  try {
    return await prisma.attendanceJustification.create({
      data: {
        attendanceId: input.attendanceId,
        orgId: input.orgId,
        workerId: input.workerId,
        reason: input.reason,
        files: input.files && input.files.length > 0 ? (input.files as Prisma.InputJsonValue) : undefined,
        requestedBy: input.requestedBy,
        requestedAt: input.requestedAt ?? new Date(),
      },
      select: { id: true },
    })
  } catch (err) {
    console.warn('[attendance structured] justification persist failed', err instanceof Error ? err.message : err)
    return null
  }
}

export async function recordAttendanceApproval(input: {
  attendanceId: string
  orgId: string
  approved: boolean
  comment?: string
  justificationId?: string | null
  approvedBy: string
  approvedByName?: string
  approvedAt?: Date
}) {
  try {
    return await prisma.attendanceApproval.create({
      data: {
        attendanceId: input.attendanceId,
        orgId: input.orgId,
        approved: input.approved,
        comment: input.comment ?? null,
        justificationId: input.justificationId ?? null,
        approvedBy: input.approvedBy,
        approvedByName: input.approvedByName ?? null,
        approvedAt: input.approvedAt ?? new Date(),
      },
      select: { id: true },
    })
  } catch (err) {
    console.warn('[attendance structured] approval persist failed', err instanceof Error ? err.message : err)
    return null
  }
}

export async function recordAttendanceEvidence(input: {
  attendanceId: string
  orgId: string
  workerId: string
  type: string
  value?: string | null
  metadata?: Record<string, unknown>
  capturedAt?: Date
}) {
  try {
    return await prisma.attendanceEvidence.create({
      data: {
        attendanceId: input.attendanceId,
        orgId: input.orgId,
        workerId: input.workerId,
        type: input.type,
        value: input.value ?? null,
        metadataJson: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
        capturedAt: input.capturedAt ?? new Date(),
      },
      select: { id: true },
    })
  } catch (err) {
    console.warn('[attendance structured] evidence persist failed', err instanceof Error ? err.message : err)
    return null
  }
}
