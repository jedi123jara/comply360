/**
 * Cron: Anclaje criptográfico diario (Generador de Contratos / Chunk 8).
 *
 * Procesa el día UTC anterior: para cada org con activity, construye el
 * Merkle tree de sus ContractVersion y dispara timestamping externo
 * (RFC 3161 + OpenTimestamps) si los env vars están configurados.
 *
 * Llamado desde vercel.json:
 *   { "path": "/api/cron/anchor-versions", "schedule": "30 2 * * *" }
 *
 * Protección: Authorization: Bearer ${CRON_SECRET}.
 */

import { NextRequest, NextResponse } from 'next/server'
import { anchorAllOrgsForDate } from '@/lib/contracts/anchoring/service'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Permitimos override de fecha en query: ?date=YYYY-MM-DD (para back-fills)
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? undefined

  try {
    const result = await anchorAllOrgsForDate(date)
    return NextResponse.json({
      data: {
        date: result.date,
        totalOrgs: result.totalOrgs,
        full: result.results.filter((r) => r.status === 'FULL_OK').length,
        rfc3161Only: result.results.filter((r) => r.status === 'RFC3161_OK').length,
        otsOnly: result.results.filter((r) => r.status === 'OTS_OK').length,
        pending: result.results.filter((r) => r.status === 'PENDING').length,
        failed: result.results.filter((r) => r.status === 'FAILED').length,
        noVersions: result.results.filter((r) => r.status === 'NO_VERSIONS').length,
        results: result.results.map((r) => ({
          orgId: r.orgId,
          status: r.status,
          leafCount: r.leafCount,
          merkleRoot: r.merkleRoot?.slice(0, 16),
          rfc3161Ok: r.rfc3161.ok,
          otsOk: r.ots.ok,
        })),
      },
    })
  } catch (err) {
    console.error('[cron/anchor-versions]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error en anchoring' },
      { status: 500 },
    )
  }
}
