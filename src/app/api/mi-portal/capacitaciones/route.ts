import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withWorkerAuth(async (_req, ctx) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { workerId: ctx.workerId, orgId: ctx.orgId },
    include: {
      course: {
        select: { id: true, title: true, category: true, durationMin: true },
      },
      certificate: { select: { code: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    enrollments: enrollments.map((e) => ({
      id: e.id,
      courseId: e.course.id,
      courseTitle: e.course.title,
      courseCategory: e.course.category,
      durationMin: e.course.durationMin,
      status: e.status,
      progress: e.progress,
      examScore: e.examScore,
      startedAt: e.startedAt?.toISOString() || null,
      completedAt: e.completedAt?.toISOString() || null,
      certificateCode: e.certificate?.code || null,
    })),
  })
})
