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
import { withPlanGate } from '@/lib/plan-gate'
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
import {
  resolveSunafilDocStatus,
  type WorkerCoverageBucket,
  type SunafilEvidenceSnapshot,
} from '@/lib/compliance/sunafil-evidence'

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

/* ── Main handler ────────────────────────────────────────────────────── */

export const GET = withPlanGate('diagnostico', async (_req: NextRequest, ctx: AuthContext) => {
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

    // 2. Evidencias: documentos + módulos SST modernos.
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const [
      workerDocsAgg,
      orgDocs,
      sstRecords,
      sedes,
      ipercBases,
      comites,
      emos,
      workerEpps,
      capacitaciones,
      accidentes,
    ] = await Promise.all([
      prisma.workerDocument.findMany({
        where: {
          worker: { orgId, status: { not: 'TERMINATED' } },
          status: { in: ['UPLOADED', 'VERIFIED'] },
        },
        select: {
          workerId: true,
          documentType: true,
          expiresAt: true,
        },
      }),
      prisma.orgDocument.findMany({
        where: { orgId },
        orderBy: { updatedAt: 'desc' },
        select: {
          type: true,
          title: true,
          description: true,
          validUntil: true,
          updatedAt: true,
          fileUrl: true,
        },
      }),
      prisma.sstRecord.findMany({
        where: { orgId },
        select: { type: true, status: true, title: true, createdAt: true, completedAt: true, dueDate: true },
      }),
      prisma.sede.findMany({
        where: { orgId },
        select: { id: true, activa: true },
      }),
      prisma.iPERCBase.findMany({
        where: { orgId },
        select: { sedeId: true, estado: true, fechaAprobacion: true },
      }),
      prisma.comiteSST.findMany({
        where: { orgId },
        select: { estado: true, mandatoFin: true },
      }),
      prisma.eMO.findMany({
        where: { orgId },
        select: { workerId: true, proximoExamenAntes: true },
      }),
      prisma.workerEPP.findMany({
        where: { orgId },
        select: { workerId: true, fechaVencimiento: true },
      }),
      prisma.workerCapacitacionSST.findMany({
        where: { orgId, fechaCapacitacion: { gte: yearStart } },
        select: { workerId: true, tipo: true, fechaCapacitacion: true },
      }),
      prisma.accidente.findMany({
        where: { orgId },
        select: { id: true, fechaHora: true },
      }),
    ])

    const workerDocsByType = new Map<string, WorkerCoverageBucket>()
    for (const d of workerDocsAgg) {
      const bucket = workerDocsByType.get(d.documentType) ?? { present: new Set(), expired: new Set() }
      bucket.present.add(d.workerId)
      if (d.expiresAt && d.expiresAt < now) {
        bucket.expired.add(d.workerId)
      }
      workerDocsByType.set(d.documentType, bucket)
    }

    const orgDocByType = new Map<string, { validUntil: Date | null; hasFile: boolean }>()
    for (const d of orgDocs) {
      if (!orgDocByType.has(d.type)) {
        orgDocByType.set(d.type, {
          validUntil: d.validUntil,
          hasFile: Boolean(d.fileUrl),
        })
      }
    }
    const orgDocSearchText = orgDocs.map((d) =>
      `${d.type} ${d.title} ${d.description ?? ''}`.toLowerCase(),
    )
    const evidenceSnapshot: SunafilEvidenceSnapshot = {
      now,
      totalWorkers,
      workerDocsByType,
      orgDocByType,
      orgDocSearchText,
      sstRecords,
      sedes,
      ipercBases,
      comites,
      emos,
      workerEpps,
      capacitaciones,
      accidentes,
    }

    // 3. Para el tipo empresa (size-based): usar el número del cuadro de multas
    const tipoEmpresa =
      totalWorkers <= 10 ? 'MICRO' : totalWorkers <= 100 ? 'PEQUENA' : 'NO_MYPE'

    // 4. Construir el status por cada doc del catálogo
    const entries: DocStatusEntry[] = SUNAFIL_READY_DOCS.map((doc) => {
      const applicable = isDocApplicable(doc, applicabilityCtx)
      const resolved = applicable
        ? resolveSunafilDocStatus(doc, evidenceSnapshot)
        : { status: 'NO_APLICA' as DocStatus, coverage: { present: 0, total: 0 }, lastExpiresAt: null }
      const { status, coverage } = resolved

      // Multa en soles usando escala granular del motor legal
      const multaSoles =
        status === 'FALTANTE' || status === 'VENCIDO' || status === 'PARCIAL'
          ? calcularMultaSunafilSoles(
              tipoEmpresa,
              doc.gravity,
              status === 'PARCIAL'
                ? Math.max(1, coverage.total - coverage.present)
                : Math.max(1, coverage.total || 1),
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
        lastExpiresAt: resolved.lastExpiresAt?.toISOString() ?? null,
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

