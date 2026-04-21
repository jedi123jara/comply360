/**
 * GET /api/sunafil-ready
 *
 * Calcula el estado SUNAFIL-Ready de la organización cruzando los 28
 * documentos del catálogo contra los datos reales (WorkerDocument, OrgDocument,
 * SstRecord, Worker count para aplicabilidad condicional).
 *
 * Devuelve:
 *  - Stats globales: score, aplicables, completos, faltantes, vencidos, N/A
 *  - Multa potencial total (UIT + PEN) calculada con escala D.S. 019-2006-TR
 *  - Breakdown por categoría
 *  - Listado por documento con estado y accionables
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  SUNAFIL_READY_DOCS,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  isDocApplicable,
  SUNAFIL_READY_META,
  type SunafilDocSpec,
  type SunafilCategory,
} from '@/data/legal/sunafil-ready-catalog'
import { calcularMultaSunafilSoles } from '@/lib/legal-engine/peru-labor'

export const runtime = 'nodejs'

type DocStatus = 'COMPLETO' | 'PARCIAL' | 'FALTANTE' | 'VENCIDO' | 'NO_APLICA'

interface DocStatusEntry {
  id: string
  number: number
  title: string
  description: string
  category: SunafilCategory
  categoryLabel: string
  gravity: SunafilDocSpec['gravity']
  multaUIT: number
  multaSoles: number
  baseLegal: string
  scope: SunafilDocSpec['scope']
  status: DocStatus
  coverage: { present: number; total: number } // para worker/hybrid (ej. 7/10 trabajadores)
  lastExpiresAt?: string | null
  generatorSlug?: string
  actionHint: string
  conditionReason?: string // si NO_APLICA
}

/* ── Mapeo: WorkerDocument.documentType → SunafilDocSpec worker-scope ──── */

/**
 * Retorna coverage para docs worker-scope:
 * present = trabajadores activos con el documento en estado UPLOADED|VERIFIED
 * total = trabajadores activos totales
 */
function computeWorkerCoverage(
  workerCountsByType: Map<string, { uploaded: number; expired: number }>,
  totalWorkers: number,
  workerDocType: string,
): { present: number; total: number; expired: number } {
  const match = workerCountsByType.get(workerDocType)
  return {
    present: match?.uploaded ?? 0,
    expired: match?.expired ?? 0,
    total: totalWorkers,
  }
}

/* ── Status derivation ──────────────────────────────────────────────── */

function deriveStatus(args: {
  doc: SunafilDocSpec
  applicable: boolean
  workerCoverage?: { present: number; total: number; expired: number }
  orgDocFound?: boolean
  orgDocExpired?: boolean
}): { status: DocStatus; coverage: { present: number; total: number } } {
  const { doc, applicable, workerCoverage, orgDocFound, orgDocExpired } = args

  if (!applicable) {
    return { status: 'NO_APLICA', coverage: { present: 0, total: 0 } }
  }

  if (doc.scope === 'worker') {
    const c = workerCoverage ?? { present: 0, total: 0, expired: 0 }
    if (c.total === 0) return { status: 'NO_APLICA', coverage: { present: 0, total: 0 } }
    if (c.expired > 0) return { status: 'VENCIDO', coverage: { present: c.present, total: c.total } }
    if (c.present === c.total) return { status: 'COMPLETO', coverage: { present: c.present, total: c.total } }
    if (c.present === 0) return { status: 'FALTANTE', coverage: { present: 0, total: c.total } }
    return { status: 'PARCIAL', coverage: { present: c.present, total: c.total } }
  }

  if (doc.scope === 'org' || doc.scope === 'exhibited') {
    if (!orgDocFound) return { status: 'FALTANTE', coverage: { present: 0, total: 1 } }
    if (orgDocExpired) return { status: 'VENCIDO', coverage: { present: 0, total: 1 } }
    return { status: 'COMPLETO', coverage: { present: 1, total: 1 } }
  }

  // hybrid: requiere TANTO org-level doc como worker coverage (capacitaciones)
  if (doc.scope === 'hybrid') {
    const c = workerCoverage ?? { present: 0, total: 0, expired: 0 }
    const orgOK = orgDocFound && !orgDocExpired
    if (c.total === 0 || !orgOK) return { status: 'FALTANTE', coverage: { present: 0, total: c.total } }
    if (c.expired > 0) return { status: 'VENCIDO', coverage: { present: c.present, total: c.total } }
    if (c.present === c.total) return { status: 'COMPLETO', coverage: { present: c.present, total: c.total } }
    return { status: 'PARCIAL', coverage: { present: c.present, total: c.total } }
  }

  return { status: 'FALTANTE', coverage: { present: 0, total: 1 } }
}

/* ── Main handler ────────────────────────────────────────────────────── */

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const orgId = ctx.orgId
    const now = new Date()

    // 1. Worker count + organización context (para aplicabilidad condicional)
    const [totalWorkers, org] = await Promise.all([
      prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { sector: true, sizeRange: true },
      }),
    ])

    const applicabilityCtx = {
      totalWorkers,
      hasRiskActivities: isRiskSector(org?.sector),
      hasConstructionCivil: org?.sector?.toLowerCase().includes('construcci') ?? false,
      hasTercerizacion: false, // TODO: detectar desde registros
    }

    // 2. Documentos de trabajadores agregados por tipo (present/expired counts)
    const workerDocsAgg = await prisma.workerDocument.findMany({
      where: {
        worker: { orgId, status: { not: 'TERMINATED' } },
        status: { in: ['UPLOADED', 'VERIFIED'] },
      },
      select: {
        workerId: true,
        documentType: true,
        expiresAt: true,
      },
    })

    // Map<documentType, { uniqueWorkers set, expiredWorkers set }>
    const byType = new Map<string, { uploaded: Set<string>; expired: Set<string> }>()
    for (const d of workerDocsAgg) {
      const bucket = byType.get(d.documentType) ?? { uploaded: new Set(), expired: new Set() }
      bucket.uploaded.add(d.workerId)
      if (d.expiresAt && d.expiresAt < now) {
        bucket.expired.add(d.workerId)
      }
      byType.set(d.documentType, bucket)
    }
    const workerCountsByType = new Map<string, { uploaded: number; expired: number }>()
    for (const [type, bucket] of byType) {
      workerCountsByType.set(type, {
        uploaded: bucket.uploaded.size,
        expired: bucket.expired.size,
      })
    }

    // 3. OrgDocuments más recientes por type
    const orgDocs = await prisma.orgDocument.findMany({
      where: { orgId },
      orderBy: { updatedAt: 'desc' },
      select: { type: true, title: true, validUntil: true, updatedAt: true, fileUrl: true },
    })
    const orgDocByType = new Map<string, { validUntil: Date | null; hasFile: boolean }>()
    for (const d of orgDocs) {
      if (!orgDocByType.has(d.type)) {
        orgDocByType.set(d.type, {
          validUntil: d.validUntil,
          hasFile: Boolean(d.fileUrl),
        })
      }
    }

    // 4. Para el tipo empresa (size-based): usar el número del cuadro de multas
    const tipoEmpresa =
      totalWorkers <= 10 ? 'MICRO' : totalWorkers <= 100 ? 'PEQUENA' : 'NO_MYPE'

    // 5. Construir el status por cada doc del catálogo
    const entries: DocStatusEntry[] = SUNAFIL_READY_DOCS.map((doc) => {
      const applicable = isDocApplicable(doc, applicabilityCtx)
      let workerCoverage: { present: number; total: number; expired: number } | undefined
      let orgDocFound = false
      let orgDocExpired = false
      let lastExpiresAt: Date | null = null

      if (doc.scope === 'worker' || doc.scope === 'hybrid') {
        if (doc.workerDocType) {
          workerCoverage = computeWorkerCoverage(
            workerCountsByType,
            totalWorkers,
            doc.workerDocType,
          )
        }
      }
      if (doc.scope === 'org' || doc.scope === 'hybrid' || doc.scope === 'exhibited') {
        if (doc.orgDocType) {
          const org = orgDocByType.get(doc.orgDocType)
          if (org) {
            orgDocFound = org.hasFile
            lastExpiresAt = org.validUntil
            if (org.validUntil && org.validUntil < now) orgDocExpired = true
          }
        }
      }

      const { status, coverage } = deriveStatus({
        doc,
        applicable,
        workerCoverage,
        orgDocFound,
        orgDocExpired,
      })

      // Multa en soles usando escala granular del motor legal
      const multaSoles =
        status === 'FALTANTE' || status === 'VENCIDO' || status === 'PARCIAL'
          ? calcularMultaSunafilSoles(
              tipoEmpresa,
              doc.gravity,
              status === 'PARCIAL'
                ? Math.max(1, (workerCoverage?.total ?? 1) - (workerCoverage?.present ?? 0))
                : Math.max(1, workerCoverage?.total ?? 1),
              false,
              null,
            )
          : 0

      return {
        id: doc.id,
        number: doc.number,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        categoryLabel: CATEGORY_LABEL[doc.category],
        gravity: doc.gravity,
        multaUIT: doc.multaUIT,
        multaSoles,
        baseLegal: doc.baseLegal,
        scope: doc.scope,
        status,
        coverage,
        lastExpiresAt: lastExpiresAt?.toISOString() ?? null,
        generatorSlug: doc.generatorSlug,
        actionHint: doc.actionHint,
        conditionReason: !applicable ? doc.condition?.description : undefined,
      }
    })

    // 6. Agregados por categoría
    const byCategory = CATEGORY_ORDER.map((cat) => {
      const items = entries.filter((e) => e.category === cat)
      const aplica = items.filter((e) => e.status !== 'NO_APLICA').length
      const completos = items.filter((e) => e.status === 'COMPLETO').length
      const faltantes = items.filter((e) => e.status === 'FALTANTE').length
      const vencidos = items.filter((e) => e.status === 'VENCIDO').length
      const parciales = items.filter((e) => e.status === 'PARCIAL').length
      const multaSoles = items.reduce((s, e) => s + e.multaSoles, 0)
      const score = aplica === 0 ? 100 : Math.round((completos / aplica) * 100)
      return {
        category: cat,
        label: CATEGORY_LABEL[cat],
        total: items.length,
        aplicables: aplica,
        completos,
        parciales,
        faltantes,
        vencidos,
        score,
        multaSoles: Math.round(multaSoles * 100) / 100,
        items,
      }
    })

    // 7. Stats globales
    const aplicables = entries.filter((e) => e.status !== 'NO_APLICA').length
    const completos = entries.filter((e) => e.status === 'COMPLETO').length
    const faltantes = entries.filter((e) => e.status === 'FALTANTE').length
    const vencidos = entries.filter((e) => e.status === 'VENCIDO').length
    const parciales = entries.filter((e) => e.status === 'PARCIAL').length
    const noAplica = entries.filter((e) => e.status === 'NO_APLICA').length
    const scoreGlobal = aplicables === 0 ? 0 : Math.round((completos / aplicables) * 100)
    const multaSolesTotal = entries.reduce((s, e) => s + e.multaSoles, 0)
    // Subsanación voluntaria -90% (Art. 40 Ley 28806)
    const multaConSubsanacion = Math.round(multaSolesTotal * 0.1 * 100) / 100

    return NextResponse.json({
      meta: {
        totalDocs: SUNAFIL_READY_META.totalDocs,
        totalWorkers,
        tipoEmpresa,
        calculatedAt: now.toISOString(),
      },
      stats: {
        scoreGlobal,
        aplicables,
        completos,
        parciales,
        faltantes,
        vencidos,
        noAplica,
        multaPotencialSoles: Math.round(multaSolesTotal * 100) / 100,
        multaConSubsanacionSoles: multaConSubsanacion,
        ahorroSubsanacionSoles: Math.round((multaSolesTotal - multaConSubsanacion) * 100) / 100,
      },
      byCategory,
      entries,
    })
  } catch (error) {
    console.error('[sunafil-ready GET]', error)
    return NextResponse.json({ error: 'Error al calcular SUNAFIL-Ready' }, { status: 500 })
  }
})

/* ── Heuristic: sector de riesgo para SCTR ──────────────────────────── */

function isRiskSector(sector: string | null | undefined): boolean {
  if (!sector) return false
  const s = sector.toLowerCase()
  const risky = [
    'construcc',
    'miner',
    'pesc',
    'industr',
    'manufactur',
    'agro',
    'petroler',
    'electric',
    'quimic',
    'textile',
    'transport',
    'sanitari',
    'hospital',
    'salud',
  ]
  return risky.some((r) => s.includes(r))
}
