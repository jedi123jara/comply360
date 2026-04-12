import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiKeyService } from '@/lib/api-keys'

/**
 * Public API v1 — Compliance Score
 * Authentication: Bearer API key
 *
 * GET /api/v1/compliance — Get compliance score and breakdown
 */

function getApiKey(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth) return null
  return auth.startsWith('Bearer ') ? auth.slice(7) : auth
}

export async function GET(req: NextRequest) {
  const key = getApiKey(req)
  if (!key) {
    return NextResponse.json({ error: 'Authorization requerido' }, { status: 401 })
  }

  const validation = apiKeyService.validateApiKey(key)
  if (!validation.valid || !validation.orgId) {
    return NextResponse.json({ error: validation.error }, { status: 401 })
  }

  if (!apiKeyService.hasPermission(validation.permissions!, 'compliance:read')) {
    return NextResponse.json({ error: 'Permiso compliance:read requerido' }, { status: 403 })
  }

  try {
    // Get latest diagnostic result
    const latestDiagnostic = await prisma.complianceDiagnostic.findFirst({
      where: { orgId: validation.orgId },
      orderBy: { createdAt: 'desc' },
    })

    // Get alert counts
    const [totalAlerts, unreadAlerts] = await Promise.all([
      prisma.orgAlert.count({ where: { orgId: validation.orgId } }),
      prisma.orgAlert.count({ where: { orgId: validation.orgId, status: 'UNREAD' } }),
    ])

    // Get worker and contract stats
    const [totalWorkers, signedContracts, expiringContracts] = await Promise.all([
      prisma.worker.count({ where: { orgId: validation.orgId, status: 'ACTIVE' } }),
      prisma.contract.count({ where: { orgId: validation.orgId, status: 'SIGNED' } }),
      prisma.contract.count({
        where: {
          orgId: validation.orgId,
          status: 'SIGNED',
          expiresAt: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
    ])

    const score = latestDiagnostic?.scoreGlobal ?? 0

    return NextResponse.json({
      data: {
        score,
        level: score >= 90 ? 'EXCELENTE' : score >= 70 ? 'BUENO' : score >= 50 ? 'REGULAR' : 'CRITICO',
        lastDiagnosticDate: latestDiagnostic?.createdAt || null,
        breakdown: latestDiagnostic?.scoreByArea || null,
        alerts: {
          total: totalAlerts,
          unread: unreadAlerts,
        },
        workforce: {
          totalWorkers,
          signedContracts,
          expiringContracts,
        },
        recommendations: score < 70 ? [
          'Ejecutar diagnostico completo de cumplimiento',
          'Revisar alertas pendientes',
          'Actualizar documentacion SST',
          'Verificar contratos proximos a vencer',
        ] : [
          'Mantener monitoreo continuo de normativas',
          'Programar capacitaciones periodicas',
        ],
      },
    })
  } catch (error) {
    console.error('[api/v1/compliance] GET error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
