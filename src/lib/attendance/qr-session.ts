import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

export type AttendanceQrMode = 'in' | 'out' | 'both'

export function hashAttendanceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function persistAttendanceQrSession(input: {
  orgId: string
  shortCode: string
  token: string
  mode: AttendanceQrMode
  graceMinutes: number
  expiresAt: number
  createdBy?: string
}) {
  const expiresAt = new Date(input.expiresAt)
  try {
    await prisma.attendanceQrSession.create({
      data: {
        orgId: input.orgId,
        shortCode: input.shortCode,
        tokenHash: hashAttendanceToken(input.token),
        mode: input.mode,
        graceMinutes: input.graceMinutes,
        expiresAt,
        createdBy: input.createdBy ?? null,
      },
    })
  } catch (err) {
    // Migration may not be applied in a rolling deploy. QR token flow still
    // works because the JWT is self-contained; only short-code fallback is degraded.
    console.warn('[attendance qr] session persist failed', err instanceof Error ? err.message : err)
  }
}

export async function findActiveQrSessionByShortCode(input: {
  orgId?: string
  shortCode: string
  now?: Date
}): Promise<{
  id: string
  orgId: string
  mode: AttendanceQrMode
  graceMinutes: number
  expiresAt: Date
} | null> {
  const now = input.now ?? new Date()
  try {
    const session = await prisma.attendanceQrSession.findFirst({
      where: {
        ...(input.orgId ? { orgId: input.orgId } : {}),
        shortCode: input.shortCode,
        expiresAt: { gt: now },
        revokedAt: null,
      },
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        orgId: true,
        mode: true,
        graceMinutes: true,
        expiresAt: true,
      },
    })
    if (!session) return null
    const mode = session.mode === 'in' || session.mode === 'out' || session.mode === 'both'
      ? session.mode
      : 'both'
    return {
      id: session.id,
      orgId: session.orgId,
      mode,
      graceMinutes: session.graceMinutes,
      expiresAt: session.expiresAt,
    }
  } catch (err) {
    console.warn('[attendance qr] session lookup failed', err instanceof Error ? err.message : err)
    return null
  }
}
