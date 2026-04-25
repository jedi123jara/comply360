/**
 * Emisor del sello "COMPLY360 Compliance-Ready".
 *
 * Las orgs cualifican si:
 *   1. score actual ≥ 80
 *   2. score promedio de los últimos 90 días ≥ 80 (sostenido)
 *
 * El sello dura 12 meses, pero se RE-EMITE cada mes que la org sigue
 * cualificando. Eso permite que el badge en su web siempre esté "fresh"
 * y que perder el sello sea visible (`validUntil` queda en el pasado).
 *
 * El cron mensual llama `runSealIssuance()` que recorre todas las orgs y
 * emite/renueva. Devuelve estadísticas para audit.
 */

import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

export type SealTier = 'BRONZE' | 'SILVER' | 'GOLD'

export function tierForScore(score: number): SealTier {
  if (score >= 95) return 'GOLD'
  if (score >= 90) return 'SILVER'
  return 'BRONZE'
}

const VALIDITY_MONTHS = 12

/**
 * Genera un slug público a partir del nombre. Forma: `{slug-base}-{6char}`.
 * El sufijo random evita guessing y permite múltiples sellos históricos por
 * la misma org sin colisión.
 */
function buildSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'org'
  const suffix = randomBytes(3).toString('hex')
  return `${base}-${suffix}`
}

export interface IssueSealResult {
  status: 'issued' | 'renewed' | 'skipped:score_too_low' | 'skipped:no_history' | 'error'
  sealId?: string
  slug?: string
  tier?: SealTier
  scoreAtIssue?: number
  scoreAvg90d?: number
  reason?: string
}

/**
 * Evalúa una org y emite/renueva su sello si cualifica.
 * Idempotente: si ya hay un sello vigente del mes en curso, no duplica.
 */
export async function issueSealForOrg(orgId: string): Promise<IssueSealResult> {
  // 1. Score actual
  const latestScore = await prisma.complianceScore.findFirst({
    where: { orgId },
    orderBy: { calculatedAt: 'desc' },
    select: { scoreGlobal: true, calculatedAt: true },
  })
  if (!latestScore) {
    return { status: 'skipped:no_history', reason: 'org sin scoreGlobal calculado' }
  }
  if (latestScore.scoreGlobal < 80) {
    return {
      status: 'skipped:score_too_low',
      reason: `score actual ${latestScore.scoreGlobal} < 80`,
      scoreAtIssue: latestScore.scoreGlobal,
    }
  }

  // 2. Score promedio últimos 90 días
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const history = await prisma.complianceScore.findMany({
    where: { orgId, calculatedAt: { gte: since } },
    select: { scoreGlobal: true },
  })
  if (history.length === 0) {
    return { status: 'skipped:no_history', reason: 'sin historial de 90 días' }
  }
  const avg90 = Math.round(
    history.reduce((acc, s) => acc + s.scoreGlobal, 0) / history.length,
  )
  if (avg90 < 80) {
    return {
      status: 'skipped:score_too_low',
      reason: `promedio 90d ${avg90} < 80`,
      scoreAtIssue: latestScore.scoreGlobal,
      scoreAvg90d: avg90,
    }
  }

  // 3. Idempotencia mensual: si ya hay un sello no revocado emitido este mes,
  //    devolvemos el existente (renewed=false-ish, ya no hace falta hacer nada).
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const existingThisMonth = await prisma.orgComplianceSeal.findFirst({
    where: { orgId, issuedAt: { gte: monthStart }, revokedAt: null },
    orderBy: { issuedAt: 'desc' },
  })
  if (existingThisMonth) {
    return {
      status: 'renewed',
      sealId: existingThisMonth.id,
      slug: existingThisMonth.slug,
      tier: existingThisMonth.tier as SealTier,
      scoreAtIssue: existingThisMonth.scoreAtIssue,
      scoreAvg90d: existingThisMonth.scoreAvg90d,
    }
  }

  // 4. Emitir
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { razonSocial: true, name: true },
  })
  const tier = tierForScore(latestScore.scoreGlobal)
  const slug = buildSlug(org?.razonSocial ?? org?.name ?? 'org')
  const validUntil = new Date()
  validUntil.setMonth(validUntil.getMonth() + VALIDITY_MONTHS)

  const seal = await prisma.orgComplianceSeal.create({
    data: {
      orgId,
      slug,
      scoreAtIssue: latestScore.scoreGlobal,
      scoreAvg90d: avg90,
      tier,
      validUntil,
    },
  })

  return {
    status: 'issued',
    sealId: seal.id,
    slug,
    tier,
    scoreAtIssue: latestScore.scoreGlobal,
    scoreAvg90d: avg90,
  }
}

/**
 * Corre la emisión sobre todas las orgs. Devuelve resumen para el cron log.
 */
export async function runSealIssuance(): Promise<{
  evaluated: number
  issued: number
  renewed: number
  skipped: number
  errors: number
}> {
  const orgs = await prisma.organization.findMany({ select: { id: true } })
  let issued = 0
  let renewed = 0
  let skipped = 0
  let errors = 0

  for (const org of orgs) {
    try {
      const r = await issueSealForOrg(org.id)
      if (r.status === 'issued') issued += 1
      else if (r.status === 'renewed') renewed += 1
      else skipped += 1
    } catch (err) {
      errors += 1
      console.error(`[seal-issuer] org=${org.id}`, err)
    }
  }

  return { evaluated: orgs.length, issued, renewed, skipped, errors }
}
