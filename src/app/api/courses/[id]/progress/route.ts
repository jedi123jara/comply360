import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'

// POST /api/courses/[id]/progress — Update lesson progress
export const POST = withAuthParams<{ id: string }>(async (req, ctx, params) => {
  const { id: courseId } = params

  try {
    const orgId = ctx.orgId
    const { workerId, lessonId, completed, timeSpentSec } = await req.json()

    if (!workerId || !lessonId) {
      return NextResponse.json({ error: 'workerId y lessonId requeridos' }, { status: 400 })
    }

    // Find enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId, workerId, orgId },
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Inscripcion no encontrada' }, { status: 404 })
    }

    // Update or create lesson progress
    await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        completed: completed ?? true,
        timeSpentSec: timeSpentSec ?? 0,
        completedAt: completed ? new Date() : null,
      },
      update: {
        completed: completed ?? true,
        timeSpentSec: timeSpentSec ? { increment: timeSpentSec } : undefined,
        completedAt: completed ? new Date() : undefined,
      },
    })

    // Recalculate overall progress
    const totalLessons = await prisma.lesson.count({ where: { courseId } })
    const completedLessons = await prisma.lessonProgress.count({
      where: { enrollmentId: enrollment.id, completed: true },
    })

    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
    const allDone = completedLessons === totalLessons

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progress,
        status: allDone ? 'EXAM_PENDING' : 'IN_PROGRESS',
        startedAt: enrollment.startedAt ?? new Date(),
      },
    })

    return NextResponse.json({ progress, completedLessons, totalLessons, examReady: allDone })
  } catch (error) {
    console.error('Progress POST error:', error)
    return NextResponse.json({ error: 'Error al actualizar progreso' }, { status: 500 })
  }
})
