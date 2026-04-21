import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'

// GET /api/courses/[id]/exam — Get exam questions for a course
export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, params) => {
  const { id } = params

  try {
    const questions = await prisma.examQuestion.findMany({
      where: { courseId: id },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, question: true, options: true, sortOrder: true },
    })

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Exam GET error:', error)
    return NextResponse.json({ error: 'Error al obtener examen' }, { status: 500 })
  }
})

// POST /api/courses/[id]/exam — Submit exam answers
export const POST = withAuthParams<{ id: string }>(async (req, ctx, params) => {
  const { id: courseId } = params

  try {
    const orgId = ctx.orgId
    const { workerId, answers } = await req.json() as {
      workerId: string
      answers: Record<string, number> // questionId -> selectedIndex
    }

    if (!workerId || !answers) {
      return NextResponse.json({ error: 'workerId y answers son requeridos' }, { status: 400 })
    }

    // Get course and questions
    const [course, questions] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId }, select: { passingScore: true, title: true, category: true } }),
      prisma.examQuestion.findMany({ where: { courseId }, select: { id: true, correctIndex: true, explanation: true } }),
    ])

    if (!course || questions.length === 0) {
      return NextResponse.json({ error: 'Curso o examen no encontrado' }, { status: 404 })
    }

    // Grade exam
    let correct = 0
    const results = questions.map(q => {
      const selected = answers[q.id]
      const isCorrect = selected === q.correctIndex
      if (isCorrect) correct++
      return { questionId: q.id, selected, correctIndex: q.correctIndex, isCorrect, explanation: q.explanation }
    })

    const score = Math.round((correct / questions.length) * 100)
    const passed = score >= course.passingScore

    // Update enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId, workerId, orgId },
    })

    if (enrollment) {
      const updateData: Record<string, unknown> = {
        examScore: score,
        examAttempts: { increment: 1 },
        status: passed ? 'PASSED' : 'FAILED',
      }

      if (passed) {
        updateData.completedAt = new Date()
        updateData.progress = 100
      }

      await prisma.enrollment.update({ where: { id: enrollment.id }, data: updateData })

      // Generate certificate if passed
      if (passed) {
        const worker = await prisma.worker.findUnique({
          where: { id: workerId },
          select: { firstName: true, lastName: true, dni: true },
        })

        const year = new Date().getFullYear()
        const count = await prisma.certificate.count({ where: { orgId } })
        const code = `CERT-${year}-${String(count + 1).padStart(5, '0')}`

        const certificate = await prisma.certificate.create({
          data: {
            code,
            orgId,
            workerId,
            workerName: worker ? `${worker.firstName} ${worker.lastName}` : 'Desconocido',
            workerDni: worker?.dni,
            courseTitle: course.title,
            courseCategory: course.category,
            score,
            expiresAt: course.category === 'SST' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
            qrData: `https://comply360.pe/verify/${code}`,
          },
        })

        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { certificateId: certificate.id },
        })

        return NextResponse.json({
          score,
          passed,
          correct,
          total: questions.length,
          passingScore: course.passingScore,
          results,
          certificate: { code: certificate.code, qrData: certificate.qrData },
        })
      }
    }

    return NextResponse.json({
      score,
      passed,
      correct,
      total: questions.length,
      passingScore: course.passingScore,
      results,
    })
  } catch (error) {
    console.error('Exam POST error:', error)
    return NextResponse.json({ error: 'Error al evaluar examen' }, { status: 500 })
  }
})
