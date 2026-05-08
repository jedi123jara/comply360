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

import { NextResponse } from 'next/server'
import { anchorAllOrgsForDate } from '@/lib/contracts/anchoring/service'
import { withCronIdempotency } from '@/lib/cron/wrap'

export const runtime = 'nodejs'
export const maxDuration = 300

// FIX #5.A: idempotencia diaria.
export const GET = withCronIdempotency('anchor-versions', 1440, async (req) => {
  // Permitimos override de fecha en query: ?date=YYYY-MM-DD (para back-fills)
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? undefined

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
})
