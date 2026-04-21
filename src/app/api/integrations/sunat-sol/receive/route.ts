import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// CORS headers for Chrome Extension
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Token',
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS })
}

// Preflight
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// =============================================
// POST /api/integrations/sunat-sol/receive
// Auth: uses extension token (not Clerk cookies) because Chrome Extension
// can't send cookies from a different origin.
// El token se valida contra `process.env.EXTENSION_TOKEN`. En dev, si la env
// no está seteada, se permite el paso con warning (para no romper dev local).
// =============================================
export async function POST(req: NextRequest) {
  // ── Token check (defensa contra abuso público) ───────────────────────
  const extensionToken = req.headers.get('X-Extension-Token')
  const expectedToken = process.env.EXTENSION_TOKEN

  if (expectedToken) {
    if (!extensionToken || extensionToken !== expectedToken) {
      return json({ error: 'Invalid or missing extension token' }, 401)
    }
  } else if (process.env.NODE_ENV === 'production') {
    // En prod sin EXTENSION_TOKEN configurado → rechazar por seguridad
    console.error('[sunat-sol/receive] EXTENSION_TOKEN no configurado en prod — rechazando')
    return json({ error: 'Endpoint not configured' }, 503)
  } else {
    console.warn('[sunat-sol/receive] EXTENSION_TOKEN no configurado — modo dev permisivo')
  }

  try {
    const body = await req.json()
    const { data, source, extractedAt, orgId: bodyOrgId } = body as {
      source: string
      orgId?: string
      extractedAt: string
      data: {
        companyInfo?: {
          ruc: string; razonSocial: string; estado: string
          condicion: string; direccion: string; actividadEconomica: string
          representanteLegal: string
        }
        workers: {
          dni: string; apellidos: string; nombres: string
          fullName?: string
          fechaIngreso: string | null; situacion: string
          regimenLaboral: string | null
        }[]
      }
    }

    if (!data) return json({ error: 'No data received' }, 400)

    // Find org by RUC from extracted data, or by provided orgId
    let orgId: string | null = null

    if (data.companyInfo?.ruc) {
      const org = await prisma.organization.findFirst({
        where: { ruc: data.companyInfo.ruc },
        select: { id: true },
      })
      orgId = org?.id ?? null
    }

    if (!orgId && bodyOrgId) {
      orgId = bodyOrgId
    }

    // Fallback: find the org that has sunat_sol credentials with this RUC
    if (!orgId && data.companyInfo?.ruc) {
      const cred = await prisma.integrationCredential.findFirst({
        where: {
          provider: 'sunat_sol',
          label: { contains: data.companyInfo.ruc },
        },
        select: { orgId: true },
      })
      orgId = cred?.orgId ?? null
    }

    if (!orgId) {
      // Last resort: use the most recent org that configured sunat_sol
      const cred = await prisma.integrationCredential.findFirst({
        where: { provider: 'sunat_sol' },
        orderBy: { createdAt: 'desc' },
        select: { orgId: true },
      })
      orgId = cred?.orgId ?? null
    }

    if (!orgId) {
      return json({ error: 'No se encontro organizacion vinculada. Configure SUNAT SOL en Integraciones primero.' }, 404)
    }

    // Update org profile
    if (data.companyInfo?.razonSocial) {
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          razonSocial: data.companyInfo.razonSocial,
          ...(data.companyInfo.ruc ? { ruc: data.companyInfo.ruc } : {}),
        },
      }).catch(() => {})
    }

    // Cross-reference workers AND auto-register new ones
    const sync = { matched: 0, newFromSunat: 0, notInSunat: 0, autoRegistered: 0 }
    const registeredWorkers: { dni: string; name: string }[] = []

    if (data.workers.length > 0) {
      const existing = await prisma.worker.findMany({
        where: { orgId },
        select: { dni: true, status: true },
      })
      const existingDnis = new Set(existing.map(w => w.dni))
      const sunatDnis = new Set(data.workers.map(w => w.dni))

      sync.matched = data.workers.filter(w => existingDnis.has(w.dni)).length
      sync.notInSunat = existing.filter(w => w.status !== 'TERMINATED' && !sunatDnis.has(w.dni)).length

      // Auto-register workers found in SUNAT but not in our DB
      // SECURITY: Only accept valid 8-digit DNIs to prevent garbage data
      const newWorkers = data.workers.filter(w => !existingDnis.has(w.dni) && /^\d{8}$/.test(w.dni))
      sync.newFromSunat = newWorkers.length

      for (const w of newWorkers) {
        try {
          // Parse name: "PASTOR MERINO JOSELIN LESBITH" → apellidos + nombres
          const fullName = w.fullName || `${w.nombres} ${w.apellidos}`.trim()
          const parts = fullName.split(/\s+/)
          // SUNAT format: APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2
          const lastName = parts.slice(0, 2).join(' ')
          const firstName = parts.slice(2).join(' ') || parts[0] || ''

          await prisma.worker.create({
            data: {
              orgId,
              dni: w.dni,
              firstName: firstName || w.nombres || fullName,
              lastName: lastName || w.apellidos || '',
              fechaIngreso: w.fechaIngreso ? new Date(w.fechaIngreso.split('/').reverse().join('-')) : new Date(),
              regimenLaboral: (w.regimenLaboral as 'GENERAL' | 'MYPE_MICRO' | 'MYPE_PEQUENA' | 'AGRARIO' | 'CONSTRUCCION_CIVIL') || 'GENERAL',
              sueldoBruto: 0, // Must be updated by user
              status: w.situacion === 'BAJA' || w.situacion === 'CESADO' ? 'TERMINATED' : 'ACTIVE',
              tipoContrato: 'INDEFINIDO',
              tipoAporte: 'AFP',
            },
          })
          sync.autoRegistered++
          registeredWorkers.push({ dni: w.dni, name: `${firstName} ${lastName}`.trim() })
        } catch {
          // Worker might already exist (race condition) or validation error — skip
        }
      }
    }

    // Save sync result
    await prisma.integrationCredential.updateMany({
      where: { orgId, provider: 'sunat_sol' },
      data: {
        lastSyncAt: new Date(),
        lastSyncResult: {
          success: true, source, timestamp: extractedAt,
          workersFound: data.workers.length, workerSync: sync,
          companyData: data.companyInfo ? {
            razonSocial: data.companyInfo.razonSocial,
            estado: data.companyInfo.estado,
          } : null,
        },
      },
    }).catch(() => {})

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId,
        action: 'SUNAT_CHROME_EXTENSION_SYNC',
        entityType: 'Organization',
        entityId: orgId,
        metadataJson: { source, workersFound: data.workers.length, sync },
      },
    }).catch(() => {})

    return json({
      success: true,
      company: data.companyInfo ? {
        razonSocial: data.companyInfo.razonSocial,
        estado: data.companyInfo.estado,
      } : null,
      workersFound: data.workers.length,
      sync,
      registeredWorkers,
    })
  } catch (err) {
    console.error('[sunat-sol/receive] Error:', err)
    return json({ error: 'Error procesando datos' }, 500)
  }
}
