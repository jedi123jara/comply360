/**
 * /api/document-requirements
 *
 * GET — Lista los requirements + status de cumplimiento por org.
 * POST — Crea/actualiza un requirement (custom).
 * PATCH — Bulk seed de defaults para una org sin requirements aún.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import {
  buildDocumentStatusMap,
  DEFAULT_REQUIREMENTS,
  type DocumentRequirementInfo,
  type OrgDocumentInfo,
} from '@/lib/compliance/document-status'
import type { OrgDocType } from '@/generated/prisma/client'

export const runtime = 'nodejs'

/* ── GET: lista requirements + status ─────────────────────────────────── */

export const GET = withPlanGate('diagnostico', async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const [requirementsRaw, docsRaw, org] = await Promise.all([
      prisma.documentRequirement.findMany({
        where: { orgId: ctx.orgId },
      }),
      prisma.orgDocument.findMany({
        where: { orgId: ctx.orgId },
        select: {
          id: true,
          type: true,
          title: true,
          fileUrl: true,
          publishedAt: true,
          validUntil: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.organization.findUnique({
        where: { id: ctx.orgId },
        select: { regimenPrincipal: true, sector: true },
      }),
    ])

    // Filtra por régimen aplicable (si está definido)
    const regimen = org?.regimenPrincipal
    const requirements: DocumentRequirementInfo[] = requirementsRaw
      .filter(
        (r) =>
          r.appliesToRegimen.length === 0 ||
          !regimen ||
          r.appliesToRegimen.includes(regimen)
      )
      .map((r) => ({
        documentType: r.documentType,
        isRequired: r.isRequired,
        renewalFrequencyDays: r.renewalFrequencyDays,
        criticality: r.criticality,
        appliesToRegimen: r.appliesToRegimen,
        appliesToSector: r.appliesToSector,
        helpText: r.helpText,
        baseLegal: r.baseLegal,
      }))

    const docs: OrgDocumentInfo[] = docsRaw

    const statuses = buildDocumentStatusMap(requirements, docs)

    const summary = {
      total: statuses.length,
      vigente: statuses.filter((s) => s.status === 'VIGENTE').length,
      porVencer: statuses.filter((s) => s.status === 'POR_VENCER').length,
      vencido: statuses.filter((s) => s.status === 'VENCIDO').length,
      faltante: statuses.filter((s) => s.status === 'FALTANTE').length,
    }

    return NextResponse.json({ summary, statuses })
  } catch (err) {
    console.error('[document-requirements GET]', err)
    return NextResponse.json({ error: 'Failed to load requirements', detail: String(err) }, { status: 500 })
  }
})

/* ── POST: crea/actualiza un requirement custom ──────────────────────── */

export const POST = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const { documentType, isRequired, renewalFrequencyDays, criticality, helpText, baseLegal } =
      body as {
        documentType: OrgDocType
        isRequired?: boolean
        renewalFrequencyDays?: number | null
        criticality?: string
        helpText?: string
        baseLegal?: string
      }
    if (!documentType) {
      return NextResponse.json({ error: 'documentType requerido' }, { status: 400 })
    }
    const upserted = await prisma.documentRequirement.upsert({
      where: { orgId_documentType: { orgId: ctx.orgId, documentType } },
      create: {
        orgId: ctx.orgId,
        documentType,
        isRequired: isRequired ?? true,
        renewalFrequencyDays: renewalFrequencyDays ?? null,
        criticality: criticality ?? 'MEDIUM',
        helpText: helpText ?? null,
        baseLegal: baseLegal ?? null,
      },
      update: {
        isRequired: isRequired ?? true,
        renewalFrequencyDays: renewalFrequencyDays ?? null,
        criticality: criticality ?? 'MEDIUM',
        helpText: helpText ?? null,
        baseLegal: baseLegal ?? null,
      },
    })
    return NextResponse.json({ requirement: upserted })
  } catch (err) {
    console.error('[document-requirements POST]', err)
    return NextResponse.json({ error: 'Failed', detail: String(err) }, { status: 500 })
  }
})

/* ── PATCH: bulk seed defaults ────────────────────────────────────────── */

export const PATCH = withPlanGate('diagnostico', async (_req: NextRequest, ctx: AuthContext) => {
  try {
    // Solo crea los que no existen aún — no sobreescribe customs del cliente
    const existing = await prisma.documentRequirement.findMany({
      where: { orgId: ctx.orgId },
      select: { documentType: true },
    })
    const existingSet = new Set(existing.map((e) => e.documentType))
    const toCreate = DEFAULT_REQUIREMENTS.filter((d) => !existingSet.has(d.documentType))
    if (toCreate.length === 0) {
      return NextResponse.json({ created: 0, message: 'Ya estaban todos los defaults seedeados' })
    }
    const result = await prisma.documentRequirement.createMany({
      data: toCreate.map((d) => ({
        orgId: ctx.orgId,
        documentType: d.documentType,
        isRequired: d.isRequired,
        renewalFrequencyDays: d.renewalFrequencyDays,
        criticality: d.criticality,
        appliesToRegimen: [],
        helpText: d.helpText,
        baseLegal: d.baseLegal,
      })),
    })
    return NextResponse.json({ created: result.count })
  } catch (err) {
    console.error('[document-requirements PATCH]', err)
    return NextResponse.json({ error: 'Failed', detail: String(err) }, { status: 500 })
  }
})
