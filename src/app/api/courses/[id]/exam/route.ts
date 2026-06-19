import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { withAuthParams } from '@/lib/api-auth'
import { emit } from '@/lib/events'

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
        // Idempotencia: si el enrollment ya tiene certificado, devolverlo sin
        // recrear. Cubre el doble submit / retry de red tras aprobar.
        if (enrollment.certificateId) {
          const existing = await prisma.certificate.findUnique({
            where: { id: enrollment.certificateId },
            select: { code: true, qrData: true },
          })
          if (existing) {
            return NextResponse.json({
              score,
              passed,
              correct,
              total: questions.length,
              passingScore: course.passingScore,
              results,
              certificate: { code: existing.code, qrData: existing.qrData },
            })
          }
          // Si el id apunta a un certificado inexistente, caemos a re-emitir.
        }

        const worker = await prisma.worker.findUnique({
          where: { id: workerId },
          select: { firstName: true, lastName: true, dni: true },
        })

        const year = new Date().getFullYear()
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://comply360.pe').replace(/\/$/, '')

        // El código se deriva de count() (no atómico) y `Certificate.code` es
        // @unique GLOBAL, así que aprobaciones concurrentes colisionan: la 2da
        // create viola el unique → 500 y el certificado se pierde. Reintentamos
        // recomputando el secuencial ante P2002 (mismo patrón que complaints).
        let certificate: Awaited<ReturnType<typeof prisma.certificate.create>> | undefined
        for (let attempt = 0; attempt < 6 && !certificate; attempt++) {
          const count = await prisma.certificate.count({ where: { orgId } })
          const code = `CERT-${year}-${String(count + 1 + attempt).padStart(5, '0')}`
          try {
            // Lectura (idempotencia) + escritura del enrollment dentro de una
            // sola transacción: si el enrollment ya fue certificado por una
            // ejecución concurrente, reusamos ese certificado y no creamos otro.
            certificate = await prisma.$transaction(async (tx) => {
              const current = await tx.enrollment.findUnique({
                where: { id: enrollment.id },
                select: { certificateId: true },
              })
              if (current?.certificateId) {
                const already = await tx.certificate.findUnique({
                  where: { id: current.certificateId },
                })
                if (already) return already
              }

              const created = await tx.certificate.create({
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
                  qrData: `${baseUrl}/verify/${code}`,
                },
              })

              await tx.enrollment.update({
                where: { id: enrollment.id },
                data: { certificateId: created.id },
              })

              return created
            })
          } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 5) continue
            throw e
          }
        }

        if (!certificate) {
          return NextResponse.json(
            { error: 'No se pudo emitir el certificado. Intenta nuevamente en unos segundos.' },
            { status: 503 },
          )
        }

        // Event bus: workflows se enganchan a training.completed
        emit('training.completed', {
          orgId,
          userId: ctx.userId,
          enrollmentId: enrollment.id,
          workerId,
          courseId,
          courseCategory: course.category,
          score,
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
