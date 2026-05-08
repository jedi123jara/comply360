import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'

// =============================================
// Types
// =============================================

type ExpedienteType = 'DENUNCIA' | 'CESE' | 'COMPLIANCE'
type ExpedientePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface Expediente {
  id: string
  type: ExpedienteType
  title: string
  status: string
  priority: ExpedientePriority
  createdAt: string
  details: Record<string, unknown>
}

// =============================================
// Helpers
// =============================================

function complaintStatusToExpediente(status: string): string {
  const map: Record<string, string> = {
    RECEIVED: 'ACTIVO',
    UNDER_REVIEW: 'EN_PROCESO',
    INVESTIGATING: 'EN_PROCESO',
    PROTECTION_APPLIED: 'EN_PROCESO',
    RESOLVED: 'CERRADO',
    DISMISSED: 'CERRADO',
  }
  return map[status] || 'ACTIVO'
}

function complaintTypePriority(type: string): ExpedientePriority {
  const map: Record<string, ExpedientePriority> = {
    HOSTIGAMIENTO_SEXUAL: 'CRITICAL',
    DISCRIMINACION: 'HIGH',
    ACOSO_LABORAL: 'HIGH',
    OTRO: 'MEDIUM',
  }
  return map[type] || 'MEDIUM'
}

function complaintTypeLabel(type: string): string {
  const map: Record<string, string> = {
    HOSTIGAMIENTO_SEXUAL: 'Hostigamiento Sexual',
    DISCRIMINACION: 'Discriminacion',
    ACOSO_LABORAL: 'Acoso Laboral',
    OTRO: 'Otro',
  }
  return map[type] || type
}

function diagnosticPriority(score: number): ExpedientePriority {
  if (score < 30) return 'CRITICAL'
  if (score < 45) return 'HIGH'
  return 'MEDIUM'
}

// =============================================
// GET /api/expedientes — Aggregated cases
// =============================================
export const GET = withPlanGate('contratos', async (req: NextRequest, ctx) => {
  try {
    const orgId = ctx.orgId

    // Fetch all three data sources in parallel
    const [complaints, terminatedWorkers, lowDiagnostics] = await Promise.all([
      // 1. Complaints -> DENUNCIA cases
      prisma.complaint.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          type: true,
          status: true,
          description: true,
          accusedName: true,
          isAnonymous: true,
          reporterName: true,
          receivedAt: true,
          resolvedAt: true,
          createdAt: true,
        },
      }),

      // 2. Terminated workers -> CESE cases
      prisma.worker.findMany({
        where: { orgId, status: 'TERMINATED' },
        orderBy: { fechaCese: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dni: true,
          position: true,
          department: true,
          motivoCese: true,
          fechaCese: true,
          fechaIngreso: true,
          sueldoBruto: true,
          createdAt: true,
        },
      }),

      // 3. ComplianceDiagnostics with low scores -> COMPLIANCE cases
      prisma.complianceDiagnostic.findMany({
        where: { orgId, scoreGlobal: { lt: 60 } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          scoreGlobal: true,
          totalMultaRiesgo: true,
          scoreByArea: true,
          completedAt: true,
          createdAt: true,
        },
      }),
    ])

    // Transform into unified expediente format
    const expedientes: Expediente[] = []

    // -- Complaints as DENUNCIA expedientes --
    for (const c of complaints) {
      expedientes.push({
        id: `denuncia-${c.id}`,
        type: 'DENUNCIA',
        title: `${c.code} - ${complaintTypeLabel(c.type)}`,
        status: complaintStatusToExpediente(c.status),
        priority: complaintTypePriority(c.type),
        createdAt: c.createdAt.toISOString(),
        details: {
          complaintId: c.id,
          code: c.code,
          complaintType: c.type,
          complaintStatus: c.status,
          description: c.description,
          accusedName: c.accusedName,
          isAnonymous: c.isAnonymous,
          reporterName: c.reporterName,
          receivedAt: c.receivedAt?.toISOString() ?? null,
          resolvedAt: c.resolvedAt?.toISOString() ?? null,
        },
      })
    }

    // -- Terminated workers as CESE expedientes --
    for (const w of terminatedWorkers) {
      const workerName = `${w.firstName} ${w.lastName}`
      const ceseDate = w.fechaCese?.toISOString() ?? null
      const hasMotive = !!w.motivoCese
      expedientes.push({
        id: `cese-${w.id}`,
        type: 'CESE',
        title: `Cese - ${workerName}`,
        status: hasMotive ? 'CERRADO' : 'EN_PROCESO',
        priority: hasMotive ? 'LOW' : 'HIGH',
        createdAt: ceseDate ?? w.createdAt.toISOString(),
        details: {
          workerId: w.id,
          workerName,
          dni: w.dni,
          position: w.position,
          department: w.department,
          motivoCese: w.motivoCese,
          fechaCese: ceseDate,
          fechaIngreso: w.fechaIngreso.toISOString(),
          sueldoBruto: Number(w.sueldoBruto),
        },
      })
    }

    // -- Low-score diagnostics as COMPLIANCE expedientes --
    for (const d of lowDiagnostics) {
      const typeLabel =
        d.type === 'FULL' ? 'Completo' :
        d.type === 'EXPRESS' ? 'Express' : 'Simulacro'
      const score = d.scoreGlobal

      expedientes.push({
        id: `compliance-${d.id}`,
        type: 'COMPLIANCE',
        title: `Diagnostico ${typeLabel} - Score ${score}/100`,
        status: d.completedAt ? 'CERRADO' : 'ACTIVO',
        priority: diagnosticPriority(score),
        createdAt: d.createdAt.toISOString(),
        details: {
          diagnosticId: d.id,
          diagnosticType: d.type,
          scoreGlobal: score,
          totalMultaRiesgo: Number(d.totalMultaRiesgo),
          scoreByArea: d.scoreByArea,
          completedAt: d.completedAt?.toISOString() ?? null,
        },
      })
    }

    // Sort all by createdAt desc
    expedientes.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Compute stats
    const stats = {
      total: expedientes.length,
      activo: expedientes.filter(e => e.status === 'ACTIVO').length,
      enProceso: expedientes.filter(e => e.status === 'EN_PROCESO').length,
      cerrado: expedientes.filter(e => e.status === 'CERRADO').length,
      byType: {
        denuncia: expedientes.filter(e => e.type === 'DENUNCIA').length,
        cese: expedientes.filter(e => e.type === 'CESE').length,
        compliance: expedientes.filter(e => e.type === 'COMPLIANCE').length,
      },
    }

    return NextResponse.json({ expedientes, stats })
  } catch (error) {
    console.error('Expedientes GET error:', error)
    return NextResponse.json(
      { error: 'Error al cargar expedientes' },
      { status: 500 }
    )
  }
})

