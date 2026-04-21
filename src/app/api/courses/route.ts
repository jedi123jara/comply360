import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { CourseCategory, RegimenLaboral } from '@/generated/prisma/client'
import { COURSE_CATALOG } from '@/lib/elearning/course-catalog'
import { withAuth } from '@/lib/api-auth'

// GET /api/courses — List courses with enrollment status for org
export const GET = withAuth(async (req, ctx) => {
  const searchParams = req.nextUrl.searchParams
  const orgId = ctx.orgId
  const category = searchParams.get('category') as CourseCategory | null

  try {
    const where: Record<string, unknown> = { isActive: true }
    if (category) where.category = category

    const [courses, enrollments] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        include: {
          lessons: { select: { id: true, title: true, durationMin: true, sortOrder: true, contentType: true }, orderBy: { sortOrder: 'asc' } },
          _count: { select: { examQuestions: true, enrollments: true } },
        },
      }),
      prisma.enrollment.findMany({
        where: { orgId },
        select: { courseId: true, workerId: true, workerName: true, status: true, progress: true, examScore: true, completedAt: true, certificateId: true },
      }),
    ])

    // Group enrollments by course
    const enrollmentsByCourse: Record<string, typeof enrollments> = {}
    enrollments.forEach(e => {
      if (!enrollmentsByCourse[e.courseId]) enrollmentsByCourse[e.courseId] = []
      enrollmentsByCourse[e.courseId].push(e)
    })

    // Stats per org
    const totalWorkers = await prisma.worker.count({ where: { orgId, status: 'ACTIVE' } })

    const coursesWithStats = courses.map(course => {
      const courseEnrollments = enrollmentsByCourse[course.id] || []
      const passed = courseEnrollments.filter(e => e.status === 'PASSED').length
      const inProgress = courseEnrollments.filter(e => e.status === 'IN_PROGRESS' || e.status === 'EXAM_PENDING').length

      return {
        ...course,
        stats: {
          totalEnrolled: courseEnrollments.length,
          passed,
          inProgress,
          notStarted: courseEnrollments.filter(e => e.status === 'NOT_STARTED').length,
          completionRate: totalWorkers > 0 ? Math.round((passed / totalWorkers) * 100) : 0,
        },
      }
    })

    return NextResponse.json({ courses: coursesWithStats, totalWorkers })
  } catch (error) {
    console.error('Courses API error:', error)
    return NextResponse.json({ error: 'Error al obtener cursos' }, { status: 500 })
  }
})

// POST /api/courses — Seed courses from catalog or enroll workers
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'seed') {
      // Seed courses from catalog
      let created = 0
      for (const courseSeed of COURSE_CATALOG) {
        const existing = await prisma.course.findUnique({ where: { slug: courseSeed.slug } })
        if (existing) continue

        await prisma.course.create({
          data: {
            slug: courseSeed.slug,
            title: courseSeed.title,
            description: courseSeed.description,
            category: courseSeed.category as CourseCategory,
            durationMin: courseSeed.durationMin,
            isObligatory: courseSeed.isObligatory,
            targetRegimen: courseSeed.targetRegimen as RegimenLaboral[],
            passingScore: courseSeed.passingScore,
            sortOrder: courseSeed.sortOrder,
            lessons: {
              create: courseSeed.lessons.map(l => ({
                title: l.title,
                description: l.description,
                contentType: l.contentType as 'VIDEO' | 'READING' | 'INTERACTIVE' | 'DOCUMENT',
                contentHtml: l.contentHtml,
                durationMin: l.durationMin,
                sortOrder: l.sortOrder,
              })),
            },
            examQuestions: {
              create: courseSeed.examQuestions.map(q => ({
                question: q.question,
                options: q.options,
                correctIndex: q.correctIndex,
                explanation: q.explanation,
                sortOrder: q.sortOrder,
              })),
            },
          },
        })
        created++
      }
      return NextResponse.json({ message: `${created} cursos creados`, total: COURSE_CATALOG.length })
    }

    if (action === 'enroll') {
      const orgId = ctx.orgId
      const { courseId, workerIds } = body as { courseId: string; workerIds: string[] }
      if (!courseId || !workerIds?.length) {
        return NextResponse.json({ error: 'courseId y workerIds son requeridos' }, { status: 400 })
      }

      // Get workers info
      const workers = await prisma.worker.findMany({
        where: { id: { in: workerIds }, orgId },
        select: { id: true, firstName: true, lastName: true },
      })

      const enrollments = await Promise.all(
        workers.map(w =>
          prisma.enrollment.upsert({
            where: { courseId_workerId_orgId: { courseId, workerId: w.id, orgId } },
            create: {
              courseId,
              workerId: w.id,
              orgId,
              workerName: `${w.firstName} ${w.lastName}`,
              status: 'NOT_STARTED',
            },
            update: {},
          })
        )
      )

      return NextResponse.json({ enrolled: enrollments.length })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (error) {
    console.error('Courses POST error:', error)
    return NextResponse.json({ error: 'Error en operacion' }, { status: 500 })
  }
})
