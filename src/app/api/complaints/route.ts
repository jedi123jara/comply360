import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email/client'
import { complaintNotification } from '@/lib/email/templates'
import type { ComplaintType, ComplaintStatus } from '@/generated/prisma/client'
import { emit } from '@/lib/events'
import { triageComplaint } from '@/lib/ai/complaint-triage'

// ---------------------------------------------------------------------------
// Rate limiter: 5 req/min per IP for public complaint submissions
// ---------------------------------------------------------------------------
const complaintLimiter = rateLimit({ interval: 60_000, limit: 5 })

// ---------------------------------------------------------------------------
// Zod schema for complaint input validation
// ---------------------------------------------------------------------------
const VALID_COMPLAINT_TYPES = [
  'HOSTIGAMIENTO_SEXUAL',
  'DISCRIMINACION',
  'ACOSO_LABORAL',
  'OTRO',
] as const

// FIX #0.3: orgId NO puede venir del body. Antes el endpoint aceptaba
// `orgId` arbitrario y caía a `'org-demo'` como fallback → cualquier
// atacante podía spamear denuncias contra cualquier empresa o llenar
// la org "org-demo" para colapsar stats anuales.
//
// Ahora el orgId se deriva del query param `?org=<slug>` que la página
// pública /denuncias/[orgSlug] envía explícitamente, y se valida que
// la organización exista. La protección definitiva contra orgIds
// adivinables se cierra en Ola 1.C cuando orgId pase a ser `cuid()`.
const complaintSchema = z.object({
  type: z.enum(VALID_COMPLAINT_TYPES, {
    error: `El tipo de denuncia debe ser uno de: ${VALID_COMPLAINT_TYPES.join(', ')}`,
  }),
  description: z
    .string({ error: 'La descripción es obligatoria' })
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(5000, 'La descripción no puede exceder 5000 caracteres'),
  isAnonymous: z.boolean().default(true),
  reporterName: z.string().max(200).optional().nullable(),
  reporterEmail: z.string().email('El correo electrónico no es válido').optional().nullable(),
  reporterPhone: z.string().max(30).optional().nullable(),
  accusedName: z.string().max(200).optional().nullable(),
  accusedPosition: z.string().max(200).optional().nullable(),
  evidenceUrls: z.array(z.string().url()).max(10).default([]),
})

// ---------------------------------------------------------------------------
// Anti-spam helpers
// ---------------------------------------------------------------------------
const SPAM_PATTERNS = [
  /https?:\/\/\S+/gi,       // multiple URLs
  /\b(viagra|cialis|casino|lottery|crypto|bitcoin|earn money|click here)\b/gi,
  /(.)\1{9,}/,              // 10+ repeated characters
]

function looksLikeSpam(text: string): boolean {
  const urlMatches = text.match(/https?:\/\/\S+/gi)
  if (urlMatches && urlMatches.length >= 3) return true
  for (const pattern of SPAM_PATTERNS.slice(1)) {
    if (pattern.test(text)) return true
  }
  return false
}

// =============================================
// GET /api/complaints — List complaints (admin, auth required)
// =============================================
export const GET = withAuth(async (req, ctx) => {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = ctx.orgId
    const status = searchParams.get('status') as ComplaintStatus | null

    const where: Record<string, unknown> = { orgId }
    if (status) where.status = status

    const [complaints, stats] = await Promise.all([
      prisma.complaint.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: 50,
        include: {
          timeline: { orderBy: { createdAt: 'asc' } },
        },
      }),
      prisma.complaint.groupBy({
        by: ['status'],
        where: { orgId },
        _count: true,
      }),
    ])

    const statusMap = stats.reduce((acc, s) => { acc[s.status] = s._count; return acc }, {} as Record<string, number>)

    return NextResponse.json({
      complaints,
      stats: {
        total: complaints.length,
        received: statusMap['RECEIVED'] || 0,
        underReview: statusMap['UNDER_REVIEW'] || 0,
        investigating: statusMap['INVESTIGATING'] || 0,
        resolved: statusMap['RESOLVED'] || 0,
        dismissed: statusMap['DISMISSED'] || 0,
      },
    })
  } catch (error) {
    console.error('Complaints GET error:', error)
    return NextResponse.json({ error: 'Failed to load complaints' }, { status: 500 })
  }
})

// =============================================
// POST /api/complaints — Submit a new complaint (PUBLIC, no auth)
// =============================================
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit — 5 requests per minute per IP
    const rl = await complaintLimiter.check(request)
    if (!rl.success) return rl.response!

    // 2. Parse & validate input with Zod
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud no es JSON válido' },
        { status: 400 }
      )
    }

    const parsed = complaintSchema.safeParse(body)
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message)
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: messages },
        { status: 400 }
      )
    }

    const {
      type, description, isAnonymous,
      reporterName, reporterEmail, reporterPhone,
      accusedName, accusedPosition, evidenceUrls,
    } = parsed.data

    // 3. Anti-spam check
    if (looksLikeSpam(description)) {
      return NextResponse.json(
        { error: 'La denuncia fue rechazada por contener contenido no permitido. Si cree que es un error, contacte al administrador.' },
        { status: 400 }
      )
    }

    // 4. Resolve & validate orgId — desde query, no del body (FIX #0.3)
    const url = new URL(request.url)
    const orgIdParam = url.searchParams.get('org')?.trim()
    if (!orgIdParam) {
      return NextResponse.json(
        { error: 'Debes accesar el formulario desde la URL pública de tu empresa (/denuncias/[empresa]).' },
        { status: 400 }
      )
    }
    const orgExists = await prisma.organization.findUnique({
      where: { id: orgIdParam },
      select: { id: true },
    })
    if (!orgExists) {
      return NextResponse.json(
        { error: 'La organización especificada no existe' },
        { status: 400 }
      )
    }
    const orgId = orgIdParam

    // 5. Generate unique code
    const year = new Date().getFullYear()
    const count = await prisma.complaint.count({ where: { orgId } })
    const code = `DENUNCIA-${year}-${String(count + 1).padStart(3, '0')}`

    // 6. Create complaint
    const complaint = await prisma.complaint.create({
      data: {
        orgId,
        code,
        type: type as ComplaintType,
        description,
        isAnonymous,
        reporterName: isAnonymous ? null : (reporterName || null),
        reporterEmail: isAnonymous ? null : (reporterEmail || null),
        reporterPhone: isAnonymous ? null : (reporterPhone || null),
        accusedName: accusedName || null,
        accusedPosition: accusedPosition || null,
        evidenceUrls,
        status: 'RECEIVED',
        timeline: {
          create: {
            action: 'DENUNCIA_RECIBIDA',
            description: 'Denuncia registrada en el sistema',
            performedBy: 'Sistema',
          },
        },
      },
      include: { timeline: true },
    })

    // 7. Send email notification to org's alertEmail (fire-and-forget)
    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { alertEmail: true },
      })
      if (org?.alertEmail) {
        const html = complaintNotification(code, type)
        sendEmail({
          to: org.alertEmail,
          subject: `[COMPLY360] Nueva denuncia recibida: ${code}`,
          html,
        }).catch((err) => console.error('[email] Complaint notification failed:', err))
      }
    } catch (emailErr) {
      console.error('[email] Error sending complaint notification:', emailErr)
    }

    // Event bus: workflows se enganchan a complaint.received
    emit('complaint.received', {
      orgId,
      complaintId: complaint.id,
      type: complaint.type,
      anonymous: complaint.isAnonymous,
      receivedAt: complaint.receivedAt.toISOString(),
    })

    // Triaje IA fire-and-forget. Toma ~5-15s → no bloqueamos la respuesta.
    // Al terminar emite `complaint.triaged` para que workflows reaccionen
    // a severidad específica.
    void runTriageAsync(complaint.id, orgId, type, description, accusedPosition)

    return NextResponse.json({ complaint, code, triageStatus: 'PENDING' })
  } catch (error) {
    console.error('Complaints POST error:', error)
    return NextResponse.json(
      { error: 'Error interno al registrar la denuncia' },
      { status: 500 }
    )
  }
}

// =============================================
// PUT /api/complaints — Update complaint status / add timeline
//
// FIX #0.2: antes el handler hacía `prisma.complaint.update({ where: { id } })`
// SIN filtrar por orgId → cualquier user logueado con `complaintId` ajeno
// podía modificar/desestimar denuncias de OTRAS orgs. Ahora antes del update
// verificamos pertenencia con `findFirst({ id, orgId: ctx.orgId })` → si es
// de otra org, devolvemos 404 sin tocar nada.
// (Endurecimiento adicional a withRole('ADMIN') queda para Ola 3.)
// =============================================
export const PUT = withAuth(async (req, ctx) => {
  try {
    const body = await req.json()
    const { id, status, assignedTo, resolution, protectionMeasures, timelineAction, timelineDescription, performedBy } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Confirmar pertenencia a la org antes de modificar
    const owned = await prisma.complaint.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!owned) {
      return NextResponse.json({ error: 'Denuncia no encontrada' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (assignedTo) updateData.assignedTo = assignedTo
    if (resolution) updateData.resolution = resolution
    if (protectionMeasures) updateData.protectionMeasures = protectionMeasures
    if (status === 'RESOLVED' || status === 'DISMISSED') updateData.resolvedAt = new Date()

    const complaint = await prisma.complaint.update({
      where: { id },
      data: updateData,
    })

    // Add timeline entry if provided
    if (timelineAction) {
      await prisma.complaintTimeline.create({
        data: {
          complaintId: id,
          action: timelineAction,
          description: timelineDescription || null,
          performedBy: performedBy || 'Admin',
        },
      })
    }

    return NextResponse.json(complaint)
  } catch (error) {
    console.error('Complaints PUT error:', error)
    return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// Triaje IA fire-and-forget
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ejecuta el triaje IA en background tras crear una denuncia.
 *
 *  - Nunca bloquea el response del POST (fire-and-forget con void)
 *  - Persiste el resultado en `Complaint.severityAi/urgencyAi/triageJson`
 *  - Si falla, deja `triagedAt` con fecha + `triageJson.error` para debug;
 *    el admin ve "Triaje no disponible, clasifique manualmente" en la UI
 *  - Al terminar exitoso emite `complaint.triaged` para que workflows
 *    enganchados por severidad reaccionen
 */
async function runTriageAsync(
  complaintId: string,
  orgId: string,
  type: ComplaintType,
  description: string,
  accusedPosition: string | null | undefined,
): Promise<void> {
  try {
    const result = await triageComplaint({ type, description, accusedPosition: accusedPosition ?? null })

    await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        severityAi: result.ok ? result.severity : null,
        urgencyAi: result.ok ? result.urgency : null,
        triageJson: JSON.parse(JSON.stringify(result)),
        triagedAt: new Date(),
      },
    })

    if (result.ok) {
      emit('complaint.triaged', {
        orgId,
        complaintId,
        severity: result.severity,
        urgency: result.urgency,
      })
    }
  } catch (err) {
    console.error('[complaints] triage async failed', {
      complaintId,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}
