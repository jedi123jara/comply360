import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { decryptJson } from '@/lib/crypto/encrypt'
import { scrapeSupanat } from '@/lib/integrations/sunat-sol-scraper'
import { rateLimit } from '@/lib/rate-limit'

interface SolCredentials {
  ruc: string
  solUser: string
  solPassword: string
}

// Very strict: 1 sync per 2 minutes (Browserless costs units)
const syncLimiter = rateLimit({ interval: 120_000, limit: 1 })

// =============================================
// POST /api/integrations/sunat-sol/sync — Navigate SUNAT SOL and extract data
// =============================================
export const POST = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const rl = await syncLimiter.check(req, `sunat-sync:${ctx.orgId}`)
  if (!rl.success) return rl.response!

  const orgId = ctx.orgId

  // Load encrypted credentials
  const credential = await prisma.integrationCredential.findUnique({
    where: { orgId_provider: { orgId, provider: 'sunat_sol' } },
    select: { id: true, encryptedConfig: true },
  })

  if (!credential) {
    return NextResponse.json(
      { error: 'Configure sus credenciales SUNAT SOL primero en la seccion de Integraciones.' },
      { status: 404 },
    )
  }

  // Decrypt
  let creds: SolCredentials
  try {
    creds = decryptJson<SolCredentials>(credential.encryptedConfig)
  } catch {
    return NextResponse.json(
      { error: 'Error al desencriptar credenciales. Guarde las credenciales nuevamente.' },
      { status: 500 },
    )
  }

  // Run scraper
  const result = await scrapeSupanat(creds.ruc, creds.solUser, creds.solPassword)

  if (!result.ok || !result.data) {
    // Update sync result
    await prisma.integrationCredential.update({
      where: { id: credential.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncResult: { success: false, error: result.error, timestamp: new Date().toISOString() },
      },
    })

    return NextResponse.json({
      success: false,
      error: result.error,
      duration: result.duration,
    }, { status: 400 })
  }

  const data = result.data

  // ── Auto-update organization profile ──────────────────────────────
  const orgUpdate: Record<string, unknown> = {}
  if (data.razonSocial) orgUpdate.razonSocial = data.razonSocial
  if (data.nombreComercial) orgUpdate.nombreComercial = data.nombreComercial
  if (data.direccion) orgUpdate.address = data.direccion
  if (data.actividadEconomica) orgUpdate.actividadEconomica = data.actividadEconomica

  if (Object.keys(orgUpdate).length > 0) {
    await prisma.organization.update({
      where: { id: orgId },
      data: orgUpdate,
    }).catch(() => { /* some fields may not exist in schema */ })
  }

  // ── Cross-reference workers ───────────────────────────────────────
  const workerSync = { matched: 0, newFromSunat: 0, notInSunat: 0 }

  if (data.workers.length > 0) {
    const existingWorkers = await prisma.worker.findMany({
      where: { orgId },
      select: { id: true, dni: true, firstName: true, lastName: true, status: true },
    })

    const existingByDni = new Map(existingWorkers.map(w => [w.dni, w]))
    const sunatDnis = new Set(data.workers.map(w => w.dni))

    workerSync.matched = data.workers.filter(w => existingByDni.has(w.dni)).length
    workerSync.newFromSunat = data.workers.filter(w => !existingByDni.has(w.dni)).length
    workerSync.notInSunat = existingWorkers.filter(w => w.status !== 'TERMINATED' && !sunatDnis.has(w.dni)).length
  }

  // Update sync result
  await prisma.integrationCredential.update({
    where: { id: credential.id },
    data: {
      lastSyncAt: new Date(),
      lastTestedAt: new Date(),
      lastSyncResult: {
        success: true,
        timestamp: new Date().toISOString(),
        companyData: {
          razonSocial: data.razonSocial,
          estado: data.estado,
          condicion: data.condicion,
          representanteLegal: data.representanteLegal,
          tipoContribuyente: data.tipoContribuyente,
        },
        workersFound: data.workers.length,
        workerSync,
      },
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      orgId,
      userId: ctx.userId ?? null,
      action: 'SUNAT_SOL_SYNC',
      entityType: 'Organization',
      entityId: orgId,
      metadataJson: {
        workersFound: data.workers.length,
        workerSync,
        duration: result.duration,
      },
    },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    duration: result.duration,
    company: {
      ruc: data.ruc,
      razonSocial: data.razonSocial,
      nombreComercial: data.nombreComercial,
      estado: data.estado,
      condicion: data.condicion,
      direccion: data.direccion,
      actividadEconomica: data.actividadEconomica,
      representanteLegal: data.representanteLegal,
      tipoContribuyente: data.tipoContribuyente,
    },
    workers: {
      total: data.workers.length,
      list: data.workers.map(w => ({
        dni: `*****${w.dni.slice(-3)}`, // Masked for security
        nombre: `${w.nombres} ${w.apellidos}`.trim(),
        situacion: w.situacion,
      })),
    },
    sync: workerSync,
  })
})
