import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { sendEmail } from '@/lib/email/client'
import { complaintNotification } from '@/lib/email/templates'
import type { ComplaintChannel, ComplaintRegime, ComplaintStage, ComplaintStatus, ComplaintType } from '@/generated/prisma/client'
import { Prisma } from '@/generated/prisma/client'
import { emit } from '@/lib/events'
import { triageComplaint } from '@/lib/ai/complaint-triage'
import {
  assertTypeMatchesRegime,
  COMPLAINT_CHANNEL_VALUES,
  COMPLAINT_REGIME_VALUES,
  COMPLAINT_TYPES,
  COMPLAINT_TYPE_VALUES,
  inferRegimeFromType,
  type ComplaintChannelValue,
  type ComplaintRegimeValue,
  type ComplaintTypeValue,
} from '@/lib/complaints/regime-rules'
import {
  generateComplaintTrackingToken,
  hashComplaintTrackingToken,
} from '@/lib/complaints/tracking-token'

// ---------------------------------------------------------------------------
// Rate limiter: 5 req/min per IP for public complaint submissions
// ---------------------------------------------------------------------------
const complaintLimiter = rateLimit({ interval: 60_000, limit: 5 })

export const maxDuration = 30

// ---------------------------------------------------------------------------
// Zod schema for complaint input validation
// ---------------------------------------------------------------------------
const VALID_COMPLAINT_TYPES = COMPLAINT_TYPE_VALUES as [ComplaintTypeValue, ...ComplaintTypeValue[]]
const VALID_COMPLAINT_REGIMES = COMPLAINT_REGIME_VALUES as [ComplaintRegimeValue, ...ComplaintRegimeValue[]]
const VALID_COMPLAINT_CHANNELS = COMPLAINT_CHANNEL_VALUES as [ComplaintChannelValue, ...ComplaintChannelValue[]]

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
  regime: z.enum(VALID_COMPLAINT_REGIMES).optional(),
  type: z.enum(VALID_COMPLAINT_TYPES, {
    error: `El tipo de denuncia debe ser uno de: ${VALID_COMPLAINT_TYPES.join(', ')}`,
  }),
  channel: z.enum(VALID_COMPLAINT_CHANNELS).default('WEB'),
  description: z
    .string({ error: 'La descripción es obligatoria' })
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(5000, 'La descripción no puede exceder 5000 caracteres'),
  isAnonymous: z.boolean().default(true),
  /** Token de reCAPTCHA v3 desde el cliente (FIX #5.B). Opcional sin
   *  RECAPTCHA_SECRET_KEY (dev), obligatorio en producción. */
  recaptchaToken: z.string().optional(),
  reporterName: z.string().max(200).optional().nullable(),
  reporterEmail: z.string().email('El correo electrónico no es válido').optional().nullable(),
  reporterPhone: z.string().max(30).optional().nullable(),
  accusedName: z.string().max(200).optional().nullable(),
  accusedPosition: z.string().max(200).optional().nullable(),
  occurredAt: z.string().max(40).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  witnesses: z.array(z.object({
    name: z.string().max(200).optional().nullable(),
    contact: z.string().max(200).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  })).max(20).default([]),
  medicalAttentionRequested: z.boolean().optional(),
  protectionMeasuresRequested: z.string().max(1000).optional().nullable(),
  evidenceUrls: z.array(z.string().url()).max(10).default([]),
})

const complaintUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['RECEIVED', 'UNDER_REVIEW', 'INVESTIGATING', 'PROTECTION_APPLIED', 'RESOLVED', 'DISMISSED']).optional(),
  assignedTo: z.string().optional().nullable(),
  resolution: z.string().max(5000).optional().nullable(),
  protectionMeasures: z.unknown().optional(),
  timelineAction: z.string().max(120).optional(),
  timelineDescription: z.string().max(1000).optional().nullable(),
  performedBy: z.string().max(120).optional().nullable(),
  publicTimeline: z.boolean().default(false),
  publicDescription: z.string().max(300).optional().nullable(),
  closeExceptionReason: z.string().max(1000).optional().nullable(),
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

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// =============================================
// GET /api/complaints — List complaints (admin, auth required)
// =============================================
export const GET = withRole('ADMIN', async (req, ctx) => {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = ctx.orgId
    const status = searchParams.get('status') as ComplaintStatus | null
    const regime = searchParams.get('regime') as ComplaintRegime | null

    const where: Record<string, unknown> = { orgId }
    if (status) where.status = status
    if (regime) where.regime = regime

    const [complaints, stats, regimeStats] = await Promise.all([
      prisma.complaint.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: 50,
        include: {
          timeline: { orderBy: { createdAt: 'asc' } },
          documents: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.complaint.groupBy({
        by: ['status'],
        where: { orgId },
        _count: true,
      }),
      prisma.complaint.groupBy({
        by: ['regime'],
        where: { orgId },
        _count: true,
      }),
    ])

    const statusMap = stats.reduce((acc, s) => { acc[s.status] = s._count; return acc }, {} as Record<string, number>)
    const regimeMap = regimeStats.reduce((acc, s) => { acc[s.regime] = s._count; return acc }, {} as Record<string, number>)

    return NextResponse.json({
      complaints,
      stats: {
        total: complaints.length,
        received: statusMap['RECEIVED'] || 0,
        underReview: statusMap['UNDER_REVIEW'] || 0,
        investigating: statusMap['INVESTIGATING'] || 0,
        resolved: statusMap['RESOLVED'] || 0,
        dismissed: statusMap['DISMISSED'] || 0,
        byRegime: regimeMap,
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
      regime, type, channel, description, isAnonymous,
      reporterName, reporterEmail, reporterPhone,
      accusedName, accusedPosition, occurredAt, location, witnesses,
      medicalAttentionRequested, protectionMeasuresRequested, evidenceUrls,
    } = parsed.data

    const resolvedRegime = regime ?? inferRegimeFromType(type)
    if (!assertTypeMatchesRegime(type, resolvedRegime)) {
      return NextResponse.json(
        { error: 'El tipo de denuncia no corresponde al régimen seleccionado.' },
        { status: 400 },
      )
    }
    const typeConfig = COMPLAINT_TYPES[type]
    const occurredAtDate = parseOptionalDate(occurredAt)

    // FIX #5.B: validar reCAPTCHA antes de procesar. Si la clave no está
    // configurada (dev), el helper hace bypass con success=true. En prod
    // exige token válido + score >= threshold.
    if (process.env.RECAPTCHA_SECRET_KEY) {
      const recaptcha = await verifyRecaptcha(parsed.data.recaptchaToken ?? '', {
        expectedAction: 'submit_complaint',
        threshold: 0.4, // un poco más permisivo que default — denunciantes legítimos a veces tienen scores bajos
      })
      if (!recaptcha.success) {
        return NextResponse.json(
          {
            error: 'Validación anti-bot falló. Recarga la página e intenta de nuevo.',
            details: recaptcha.errorCodes,
          },
          { status: 403 }
        )
      }
    }

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
        { error: 'Debes acceder al formulario desde la URL pública de tu empresa (/denuncias/[empresa]).' },
        { status: 400 }
      )
    }
    const orgExists = await prisma.organization.findUnique({
      where: { id: orgIdParam },
      select: { id: true, sizeRange: true, totalWorkersDeclared: true },
    })
    if (!orgExists) {
      return NextResponse.json(
        { error: 'La organización especificada no existe' },
        { status: 400 }
      )
    }
    const orgId = orgIdParam

    // 5. Generate unique code
    const trackingToken = generateComplaintTrackingToken()
    const year = new Date().getFullYear()

    // 6. Create complaint con código secuencial + reintento ante colisión.
    // FIX: el código se deriva de count() (no atómico) y `code` es @unique GLOBAL,
    // así que envíos concurrentes —o de orgs distintas con el mismo secuencial—
    // colisionaban: la 2da create violaba el unique → 500 y la denuncia se perdía.
    // Reintentamos recomputando el secuencial ante P2002 (en vez de fallar con 500).
    let complaint: Awaited<ReturnType<typeof prisma.complaint.create>> | undefined
    for (let attempt = 0; attempt < 6 && !complaint; attempt++) {
      const count = await prisma.complaint.count({ where: { orgId, regime: resolvedRegime as ComplaintRegime } })
      const code = `${resolvedRegime}-${year}-${String(count + 1 + attempt).padStart(3, '0')}`
      try {
        complaint = await prisma.complaint.create({
      data: {
        orgId,
        code,
        regime: resolvedRegime as ComplaintRegime,
        type: type as ComplaintType,
        channel: channel as ComplaintChannel,
        description,
        isAnonymous,
        reporterName: isAnonymous ? null : (reporterName || null),
        reporterEmail: isAnonymous ? null : (reporterEmail || null),
        reporterPhone: isAnonymous ? null : (reporterPhone || null),
        accusedName: accusedName || null,
        accusedPosition: accusedPosition || null,
        occurredAt: occurredAtDate,
        location: location || null,
        witnesses: witnesses.length > 0 ? witnesses : undefined,
        caseMetadata: {
          regime: resolvedRegime,
          regimeBaseLegal: typeConfig.baseLegal,
          externalReport: typeConfig.externalReport ?? null,
          medicalAttentionRequested: Boolean(medicalAttentionRequested),
        protectionMeasuresRequested: protectionMeasuresRequested || null,
          orgSizeRange: orgExists.sizeRange ?? null,
          totalWorkersDeclared: orgExists.totalWorkersDeclared ?? null,
        },
        trackingTokenHash: hashComplaintTrackingToken(trackingToken),
        trackingTokenRotatedAt: new Date(),
        evidenceUrls,
        status: 'RECEIVED',
        timeline: {
          create: {
            action: `${resolvedRegime}_CASE_RECEIVED`,
            description: `Caso ${resolvedRegime} registrado: ${typeConfig.label}`,
            visibleToReporter: true,
            publicDescription: 'Reporte recibido por el canal confidencial.',
            performedBy: 'Sistema',
          },
        },
      },
          include: { timeline: true },
        })
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 5) continue
        throw e
      }
    }
    if (!complaint) {
      return NextResponse.json(
        { error: 'No se pudo registrar la denuncia. Intenta nuevamente en unos segundos.' },
        { status: 503 },
      )
    }

    // 7. Send email notification to org's alertEmail (fire-and-forget)
    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { alertEmail: true },
      })
      if (org?.alertEmail) {
        const html = complaintNotification(complaint.code, type)
        sendEmail({
          to: org.alertEmail,
          subject: `[COMPLY360] Nueva denuncia recibida: ${complaint.code}`,
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
      regime: complaint.regime,
      type: complaint.type,
      anonymous: complaint.isAnonymous,
      receivedAt: complaint.receivedAt.toISOString(),
    })

    // Triaje IA post-response. `after()` evita que Vercel corte el trabajo
    // apenas enviamos el response, pero sin hacer esperar al denunciante.
    after(() => runTriageAsync(complaint.id, orgId, resolvedRegime, type, description, accusedPosition))

    return NextResponse.json({
      complaint,
      code: complaint.code,
      trackingToken,
      trackingUrl: `/denuncias/${encodeURIComponent(orgId)}?seguimiento=${encodeURIComponent(complaint.code)}&token=${encodeURIComponent(trackingToken)}`,
      triageStatus: 'PENDING',
    })
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
export const PUT = withRole('ADMIN', async (req, ctx) => {
  try {
    const body = await req.json()
    const parsed = complaintUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.issues.map((issue) => issue.message) },
        { status: 400 },
      )
    }
    const { id, status, assignedTo, resolution, protectionMeasures, timelineAction, timelineDescription, performedBy, publicTimeline, publicDescription, closeExceptionReason } = parsed.data

    // Confirmar pertenencia a la org antes de modificar
    const owned = await prisma.complaint.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, regime: true, code: true, caseMetadata: true },
    })
    if (!owned) {
      return NextResponse.json({ error: 'Denuncia no encontrada' }, { status: 404 })
    }

    // FIX #3.E: validar que assignedTo (si viene) pertenezca a un User de
    // la misma org. Antes se aceptaba cualquier string → era posible asignar
    // denuncias a usuarios ajenos o a strings arbitrarios.
    if (assignedTo) {
      if (typeof assignedTo !== 'string') {
        return NextResponse.json({ error: 'assignedTo debe ser string' }, { status: 400 })
      }
      const assignee = await prisma.user.findFirst({
        where: { id: assignedTo, orgId: ctx.orgId },
        select: { id: true },
      })
      if (!assignee) {
        return NextResponse.json(
          { error: 'assignedTo no es un usuario válido de esta organización' },
          { status: 400 },
        )
      }
    }

    if (status === 'RESOLVED' || status === 'DISMISSED') {
      const missingStages = await getMissingCloseStages(id, owned.regime, status)
      if (missingStages.length > 0 && !closeExceptionReason) {
        return NextResponse.json(
          {
            error: 'No se puede cerrar el caso sin expediente minimo documentado.',
            missingStages,
            hint: 'Sube los documentos requeridos o registra una excepcion justificada.',
          },
          { status: 409 },
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (assignedTo) updateData.assignedTo = assignedTo
    if (resolution) updateData.resolution = resolution
    if (protectionMeasures) updateData.protectionMeasures = protectionMeasures
    if (status === 'RESOLVED' || status === 'DISMISSED') {
      updateData.resolvedAt = new Date()
      if (closeExceptionReason) {
        updateData.caseMetadata = {
          ...(owned.caseMetadata && typeof owned.caseMetadata === 'object' && !Array.isArray(owned.caseMetadata) ? owned.caseMetadata : {}),
          closeExceptionReason,
          closeExceptionAt: new Date().toISOString(),
        }
      }
    }

    const complaint = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id },
        data: updateData,
      })

      if (timelineAction) {
        await tx.complaintTimeline.create({
          data: {
            complaintId: id,
            action: timelineAction,
            description: timelineDescription || null,
            visibleToReporter: publicTimeline,
            publicDescription: publicTimeline ? (publicDescription || timelineDescription || null) : null,
            performedBy: performedBy || ctx.email || 'Admin',
          },
        })
      }

      if (closeExceptionReason) {
        await tx.complaintTimeline.create({
          data: {
            complaintId: id,
            action: 'CLOSE_EXCEPTION_REGISTERED',
            description: closeExceptionReason,
            performedBy: ctx.email || 'Admin',
          },
        })
      }

      return updated
    })

    return NextResponse.json(complaint)
  } catch (error) {
    console.error('Complaints PUT error:', error)
    return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 })
  }
})

async function getMissingCloseStages(
  complaintId: string,
  regime: ComplaintRegime,
  status: ComplaintStatus,
): Promise<string[]> {
  const requiredByRegime: Record<ComplaintRegime, ComplaintStage[]> = {
    HSL: status === 'DISMISSED' ? ['DECISION_FINAL'] : ['INFORME_COMITE', 'DECISION_FINAL'],
    SST: status === 'DISMISSED' ? ['DECISION_FINAL'] : ['INFORME_COMITE', 'DECISION_FINAL'],
    MPD: status === 'DISMISSED' ? ['DECISION_FINAL'] : ['INFORME_COMITE', 'DECISION_FINAL'],
  }
  const required = requiredByRegime[regime] ?? ['DECISION_FINAL']
  const documents = await prisma.complaintDocument.findMany({
    where: {
      complaintId,
      stage: { in: required },
    },
    select: { stage: true },
  })
  const present = new Set(documents.map((document) => document.stage))
  return required.filter((stage) => !present.has(stage))
}

// ═══════════════════════════════════════════════════════════════════════════
// Triaje IA fire-and-forget
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ejecuta el triaje IA en background tras crear una denuncia.
 *
 *  - Nunca bloquea el response del POST (programado con `after()`)
 *  - Persiste el resultado en `Complaint.severityAi/urgencyAi/triageJson`
 *  - Si falla, deja `triagedAt` con fecha + `triageJson.error` para debug;
 *    el admin ve "Triaje no disponible, clasifique manualmente" en la UI
 *  - Al terminar exitoso emite `complaint.triaged` para que workflows
 *    enganchados por severidad reaccionen
 */
async function runTriageAsync(
  complaintId: string,
  orgId: string,
  regime: ComplaintRegimeValue,
  type: ComplaintType,
  description: string,
  accusedPosition: string | null | undefined,
): Promise<void> {
  try {
    const result = await triageComplaint({ regime, type, description, accusedPosition: accusedPosition ?? null })

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
    const message = err instanceof Error ? err.message : String(err)
    console.error('[complaints] triage async failed', {
      complaintId,
      err: message,
    })

    try {
      await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          severityAi: null,
          urgencyAi: null,
          triageJson: {
            ok: false,
            reason: 'api_error',
            error: message.slice(0, 500),
          },
          triagedAt: new Date(),
        },
      })
    } catch (persistErr) {
      console.error('[complaints] triage failure persist failed', {
        complaintId,
        err: persistErr instanceof Error ? persistErr.message : String(persistErr),
      })
    }
  }
}
