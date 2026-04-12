/**
 * POST /api/certification
 *
 * Evalúa si la organización califica para el Sello COMPLY360
 * "Empresa Compliance-Ready" y emite un certificado digital.
 *
 * Criterios para certificación:
 *   - Score de compliance global >= 90%
 *   - 0 alertas críticas sin resolver
 *   - Al menos 1 diagnóstico completo realizado en los últimos 90 días
 *   - Todos los trabajadores con legajo >= 70% completitud
 *
 * GET /api/certification
 *   Returns current certification status for the org
 *
 * POST /api/certification
 *   Runs full evaluation and issues/renews certificate
 *
 * Response:
 *   { certified: boolean, score: number, criteria: CriterionResult[], certificate?: CertificateData }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { calculateComplianceScore } from '@/lib/compliance/score-calculator'
import type { AuthContext } from '@/lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CriterionResult {
  id: string
  label: string
  description: string
  required: boolean
  met: boolean
  value: string | number | null
  threshold: string | number
}

export interface CertificateData {
  id: string
  orgId: string
  orgName: string
  issuedAt: string
  validUntil: string    // 1 year validity
  scoreGlobal: number
  verificationCode: string
  verificationUrl: string
  seal: 'GOLD' | 'SILVER' | 'BRONZE'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic verification code: orgId + issuedAt date */
function makeVerificationCode(orgId: string, issuedAt: Date): string {
  const base = `${orgId}-${issuedAt.getFullYear()}${String(issuedAt.getMonth() + 1).padStart(2, '0')}`
  // Simple hash: XOR of char codes, hex output
  let h = 0
  for (let i = 0; i < base.length; i++) {
    h = ((h << 5) - h + base.charCodeAt(i)) | 0
  }
  return `CC-${Math.abs(h).toString(16).toUpperCase().padStart(8, '0')}`
}

function getSealLevel(score: number): CertificateData['seal'] {
  if (score >= 95) return 'GOLD'
  if (score >= 90) return 'SILVER'
  return 'BRONZE'
}

// ─── Evaluation Logic ─────────────────────────────────────────────────────────

async function evaluateCertification(orgId: string): Promise<{
  certified: boolean
  score: number
  criteria: CriterionResult[]
  certificate?: CertificateData
}> {
  const [
    complianceScore,
    criticalAlerts,
    recentDiagnostic,
    org,
  ] = await Promise.all([
    calculateComplianceScore(orgId).catch(() => null),
    prisma.workerAlert.count({
      where: { orgId, severity: { in: ['CRITICAL'] }, resolvedAt: null },
    }),
    prisma.complianceDiagnostic.findFirst({
      where: {
        orgId,
        type: 'FULL',
        completedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, scoreGlobal: true, completedAt: true },
    }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    }),
  ])

  const globalScore = complianceScore?.scoreGlobal ?? 0
  const avgLegajo = complianceScore?.scoreLegajos ?? 0
  const totalWorkers = complianceScore?.totalWorkers ?? 0

  const criteria: CriterionResult[] = [
    {
      id: 'score_global',
      label: 'Score de Compliance Global',
      description: 'La puntuación global de compliance debe ser mayor o igual a 90%.',
      required: true,
      met: globalScore >= 90,
      value: globalScore,
      threshold: 90,
    },
    {
      id: 'critical_alerts',
      label: 'Sin Alertas Críticas',
      description: 'La empresa no debe tener alertas críticas sin resolver en ningún trabajador.',
      required: true,
      met: criticalAlerts === 0,
      value: criticalAlerts,
      threshold: 0,
    },
    {
      id: 'recent_diagnostic',
      label: 'Diagnóstico Completo Reciente',
      description: 'Se debe haber realizado al menos un diagnóstico completo (120+ preguntas) en los últimos 90 días.',
      required: true,
      met: recentDiagnostic !== null,
      value: recentDiagnostic ? recentDiagnostic.completedAt?.toLocaleDateString('es-PE') ?? null : null,
      threshold: '90 días',
    },
    {
      id: 'legajo_completitud',
      label: 'Legajos Completos (≥70%)',
      description: 'El promedio de completitud de legajos de todos los trabajadores debe superar el 70%.',
      required: true,
      met: avgLegajo >= 70,
      value: avgLegajo,
      threshold: 70,
    },
    {
      id: 'workers_registrados',
      label: 'Trabajadores Registrados',
      description: 'La empresa debe tener al menos 1 trabajador activo registrado en el sistema.',
      required: true,
      met: totalWorkers >= 1,
      value: totalWorkers,
      threshold: 1,
    },
  ]

  const certified = criteria.filter(c => c.required).every(c => c.met)

  if (!certified) {
    return { certified: false, score: globalScore, criteria }
  }

  // Issue certificate
  const now = new Date()
  const validUntil = new Date(now)
  validUntil.setFullYear(validUntil.getFullYear() + 1)
  const verificationCode = makeVerificationCode(orgId, now)

  const certificate: CertificateData = {
    id: `cert-${orgId.slice(-8)}-${now.getFullYear()}`,
    orgId,
    orgName: org?.name ?? 'Empresa',
    issuedAt: now.toISOString(),
    validUntil: validUntil.toISOString(),
    scoreGlobal: globalScore,
    verificationCode,
    verificationUrl: `https://comply360.pe/verificar/${verificationCode}`,
    seal: getSealLevel(globalScore),
  }

  return { certified: true, score: globalScore, criteria, certificate }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/** GET — returns current certification status (read-only, fast) */
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const result = await evaluateCertification(ctx.orgId)
  return NextResponse.json(result)
})

/** POST — runs full evaluation and (if passed) issues certificate */
export const POST = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const result = await evaluateCertification(ctx.orgId)

  if (result.certified && result.certificate) {
    // Log the certification event in audit log
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'CERTIFICATION_ISSUED',
        entityType: 'Organization',
        entityId: ctx.orgId,
        metadataJson: {
          score: result.score,
          seal: result.certificate.seal,
          validUntil: result.certificate.validUntil,
          verificationCode: result.certificate.verificationCode,
        },
      },
    })
  }

  return NextResponse.json(result)
})
