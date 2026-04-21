/**
 * GET /api/gamificacion
 *
 * Calculates real-time badges and achievements based on actual compliance data.
 * Returns: score, level, badges earned, progress toward next level.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

interface Badge {
  id: string
  title: string
  description: string
  icon: string
  earned: boolean
  progress: number // 0-100
  earnedAt?: string
}

interface GamificacionData {
  score: number
  level: number
  levelName: string
  badges: Badge[]
  stats: {
    diagnosticosCompletados: number
    simulacrosRealizados: number
    documentosCompletos: number
    alertasResueltas: number
    cursosCompletados: number
    diasSinIncidentes: number
  }
}

const LEVELS = [
  { min: 0, name: 'Novato' },
  { min: 20, name: 'Aprendiz' },
  { min: 40, name: 'Cumplidor' },
  { min: 60, name: 'Competente' },
  { min: 75, name: 'Experto' },
  { min: 90, name: 'Maestro Compliance' },
  { min: 100, name: 'Compliance Champion' },
]

export const GET = withAuth(async (_req, ctx: AuthContext) => {
  try {
    const orgId = ctx.orgId

    // Parallel queries for stats
    const [
      totalWorkers,
      diagnosticCount,
      simulacroCount,
      alertsResolved,
      docsUploaded,
      totalRequiredDocs,
      latestScore,
      enrollmentsCompleted,
    ] = await Promise.all([
      prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
      prisma.complianceDiagnostic.count({ where: { orgId, type: { in: ['FULL', 'EXPRESS'] } } }),
      prisma.complianceDiagnostic.count({ where: { orgId, type: 'SIMULATION' } }),
      prisma.workerAlert.count({ where: { orgId, resolvedAt: { not: null } } }),
      prisma.workerDocument.count({ where: { worker: { orgId }, status: { in: ['UPLOADED', 'VERIFIED'] } } }),
      prisma.workerDocument.count({ where: { worker: { orgId }, isRequired: true } }),
      prisma.complianceScore.findFirst({ where: { orgId }, orderBy: { calculatedAt: 'desc' } }),
      prisma.enrollment.count({ where: { status: 'PASSED' } }).catch(() => 0),
    ])

    const complianceScore = latestScore?.scoreGlobal ?? 0
    const docsPercent = totalRequiredDocs > 0 ? Math.round((docsUploaded / totalRequiredDocs) * 100) : 0

    // Calculate days since last accident (SST KPI)
    const lastAccident = await prisma.sstRecord.findFirst({
      where: { orgId, type: 'ACCIDENTE' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }).catch(() => null)
    const diasSinIncidentes = lastAccident
      ? Math.floor((Date.now() - lastAccident.createdAt.getTime()) / 86400000)
      : totalWorkers > 0 ? 365 : 0

    // Build badges
    const badges: Badge[] = [
      {
        id: 'primer_diagnostico',
        title: 'Primer Paso',
        description: 'Completa tu primer diagnostico de compliance',
        icon: 'ShieldCheck',
        earned: diagnosticCount >= 1,
        progress: Math.min(diagnosticCount, 1) * 100,
      },
      {
        id: 'diagnostico_experto',
        title: 'Diagnosticador Experto',
        description: 'Completa 5 diagnosticos de compliance',
        icon: 'Award',
        earned: diagnosticCount >= 5,
        progress: Math.min(Math.round((diagnosticCount / 5) * 100), 100),
      },
      {
        id: 'inspector_virtual',
        title: 'Preparado para SUNAFIL',
        description: 'Realiza al menos 1 simulacro de inspeccion',
        icon: 'ShieldAlert',
        earned: simulacroCount >= 1,
        progress: Math.min(simulacroCount, 1) * 100,
      },
      {
        id: 'score_60',
        title: 'En Camino',
        description: 'Alcanza un score de compliance de 60+',
        icon: 'TrendingUp',
        earned: complianceScore >= 60,
        progress: Math.min(Math.round((complianceScore / 60) * 100), 100),
      },
      {
        id: 'score_80',
        title: 'Compliance Ejemplar',
        description: 'Alcanza un score de compliance de 80+',
        icon: 'Trophy',
        earned: complianceScore >= 80,
        progress: Math.min(Math.round((complianceScore / 80) * 100), 100),
      },
      {
        id: 'legajos_completos',
        title: 'Legajos al Dia',
        description: 'Todos los documentos requeridos estan subidos',
        icon: 'FolderCheck',
        earned: docsPercent >= 100,
        progress: docsPercent,
      },
      {
        id: 'alertas_cero',
        title: 'Cero Pendientes',
        description: 'Resuelve todas tus alertas de compliance',
        icon: 'Bell',
        earned: alertsResolved > 0 && diagnosticCount > 0,
        progress: alertsResolved > 0 ? 100 : 0,
      },
      {
        id: 'capacitacion_cumplida',
        title: 'Equipo Capacitado',
        description: 'Al menos 1 trabajador completa un curso',
        icon: 'GraduationCap',
        earned: enrollmentsCompleted >= 1,
        progress: Math.min(enrollmentsCompleted, 1) * 100,
      },
      {
        id: 'sin_accidentes_90',
        title: '90 Dias sin Accidentes',
        description: '90 dias consecutivos sin accidentes laborales',
        icon: 'Heart',
        earned: diasSinIncidentes >= 90,
        progress: Math.min(Math.round((diasSinIncidentes / 90) * 100), 100),
      },
      {
        id: 'score_100',
        title: 'Compliance Perfecto',
        description: 'Alcanza un score de compliance de 100',
        icon: 'Crown',
        earned: complianceScore >= 100,
        progress: complianceScore,
      },
    ]

    // Calculate level
    const earnedCount = badges.filter(b => b.earned).length
    const overallScore = Math.round((earnedCount / badges.length) * 100)
    const level = LEVELS.filter(l => overallScore >= l.min).length
    const levelName = LEVELS[Math.min(level - 1, LEVELS.length - 1)]?.name ?? 'Novato'

    const data: GamificacionData = {
      score: overallScore,
      level,
      levelName,
      badges,
      stats: {
        diagnosticosCompletados: diagnosticCount,
        simulacrosRealizados: simulacroCount,
        documentosCompletos: docsPercent,
        alertasResueltas: alertsResolved,
        cursosCompletados: enrollmentsCompleted,
        diasSinIncidentes,
      },
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Gamificacion] Error:', error)
    return NextResponse.json({ error: 'Error al calcular gamificacion' }, { status: 500 })
  }
})
