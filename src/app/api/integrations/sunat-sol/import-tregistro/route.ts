import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { parseTRegistroFile, crossReferenceWorkers } from '@/lib/integrations/t-registro-parser'
import { rateLimit } from '@/lib/rate-limit'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const importLimiter = rateLimit({ interval: 60_000, limit: 3 })

// =============================================
// POST /api/integrations/sunat-sol/import-tregistro
// Body: multipart/form-data with file field 'tregistro'
// OR: JSON body with { content: "file content as text" }
// =============================================
export const POST = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const rl = await importLimiter.check(req, `import-tr:${ctx.orgId}`)
  if (!rl.success) return rl.response!

  const orgId = ctx.orgId

  let fileContent: string

  // Handle both multipart and JSON
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('tregistro') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Archivo T-REGISTRO requerido (campo: tregistro)' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Archivo muy grande (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 413 })
    }
    fileContent = await file.text()
  } else {
    const body = await req.json()
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Se requiere campo "content" con el contenido del archivo' }, { status: 400 })
    }
    fileContent = body.content
    if (fileContent.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Contenido muy grande (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 413 })
    }
  }

  if (!fileContent.trim()) {
    return NextResponse.json({ error: 'Archivo vacio' }, { status: 400 })
  }

  // Parse T-REGISTRO file
  const tRegistroRecords = parseTRegistroFile(fileContent)
  if (tRegistroRecords.length === 0) {
    return NextResponse.json({
      error: 'No se encontraron registros validos en el archivo. Verifique que sea un archivo T-REGISTRO de SUNAT con formato pipe-delimited (|).',
    }, { status: 400 })
  }

  // Load system workers
  const workers = await prisma.worker.findMany({
    where: { orgId },
    select: {
      id: true,
      dni: true,
      firstName: true,
      lastName: true,
      fechaIngreso: true,
      regimenLaboral: true,
      tipoAporte: true,
      afpNombre: true,
      status: true,
    },
  })

  // Cross reference
  const report = crossReferenceWorkers(tRegistroRecords, workers)

  // Save sync result
  await prisma.integrationCredential.updateMany({
    where: { orgId, provider: 'sunat_sol' },
    data: {
      lastSyncAt: new Date(),
      lastSyncResult: {
        success: true,
        timestamp: new Date().toISOString(),
        discrepancies: report.summary.notRegisteredInSunat + report.summary.possibleGhosts + report.summary.withInconsistencies,
        summary: report.summary,
      },
    },
  })

  // SECURITY: Mask DNI (show only last 3 digits) in API response
  const maskDni = (dni: string) => `*****${dni.slice(-3)}`

  return NextResponse.json({
    parsed: tRegistroRecords.length,
    report: {
      totalInSystem: report.totalInSystem,
      totalInTRegistro: report.totalInTRegistro,
      summary: report.summary,
      notInSunat: report.notInSunat.map(r => ({
        dni: maskDni(r.dni),
        name: r.name,
        reason: r.reason,
      })),
      notInSystem: report.notInSystem.map(r => ({
        dni: maskDni(r.dni),
        nombre: `${r.nombres} ${r.apellidoPaterno}`.trim(),
        regimen: r.regimenLaboral,
      })),
      inconsistencies: report.inconsistencies.map(r => ({
        dni: maskDni(r.dni),
        name: r.name,
        field: r.field,
        systemValue: r.systemValue,
        sunatValue: r.sunatValue,
      })),
      matchedCount: report.matches.filter(m => m.status === 'ok').length,
    },
  })
})
