import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const takeParam = Number(req.nextUrl.searchParams.get('take') ?? 8)
    const take = Number.isFinite(takeParam) ? Math.min(50, Math.max(1, Math.trunc(takeParam))) : 8

    const exports = await prisma.sunafilExpedienteExport.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        format: true,
        filename: true,
        score: true,
        totalRisks: true,
        tasksCount: true,
        evidenceCount: true,
        pdfHashSha256: true,
        zipHashSha256: true,
        manifest: true,
        createdBy: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      exports: exports.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        sha256: item.zipHashSha256 ?? item.pdfHashSha256 ?? null,
        manifestSummary: summarizeManifest(item.manifest),
      })),
    })
  } catch (error) {
    console.error('[sunafil expediente history]', error)
    return NextResponse.json({ error: 'No se pudo cargar el historial de expedientes.' }, { status: 500 })
  }
})

function summarizeManifest(manifest: unknown) {
  if (!manifest || typeof manifest !== 'object') return null
  const value = manifest as {
    generatedAt?: unknown
    organization?: unknown
    expediente?: unknown
    riskTotals?: unknown
  }

  return {
    generatedAt: typeof value.generatedAt === 'string' ? value.generatedAt : null,
    organization: value.organization ?? null,
    expediente: value.expediente ?? null,
    riskTotals: value.riskTotals ?? null,
  }
}
