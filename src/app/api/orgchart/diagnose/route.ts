import { NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { runOrgDoctor, findingToTaskPayload } from '@/lib/orgchart/org-doctor'
import { prisma } from '@/lib/prisma'

export const POST = withRole('MEMBER', async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const createTasks: boolean = !!body?.createTasks

  const report = await runOrgDoctor(ctx.orgId)

  let createdTasks = 0
  if (createTasks) {
    const critical = report.findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')
    for (const f of critical) {
      const taskTitle = f.suggestedTaskTitle ?? f.title
      // Idempotencia básica: evitar duplicar tarea con el mismo title pendiente
      const existing = await prisma.complianceTask.findFirst({
        where: {
          orgId: ctx.orgId,
          title: taskTitle,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        select: { id: true },
      }).catch(() => null)
      if (existing) continue

      try {
        const payload = findingToTaskPayload(ctx.orgId, f)
        await prisma.complianceTask.create({
          data: {
            orgId: payload.orgId,
            area: payload.area,
            title: payload.title,
            description: payload.description,
            baseLegal: payload.baseLegal ?? null,
            gravedad: payload.gravedad,
            sourceId: payload.sourceId,
            priority: f.severity === 'CRITICAL' ? 1 : 2,
          },
        })
        createdTasks++
      } catch (err) {
        console.error('[orgchart.diagnose] no pude crear tarea', err)
      }
    }
  }

  return NextResponse.json({ ...report, createdTasks })
})
