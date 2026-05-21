import { NextResponse, type NextRequest } from 'next/server'
import { withWorkerAuth, type WorkerAuthContext } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  PULSE_KUDOS,
  kudoCopy,
  getWorkerPreviewPulse,
  type PulseReactionType,
} from '@/lib/mi-portal/pulse'
import { getLimaParts } from '@/lib/time/lima'

export const dynamic = 'force-dynamic'

type WorkerBasics = {
  id: string
  firstName: string
  lastName: string
  position: string | null
  department: string | null
}

type PulseTone = 'emerald' | 'blue' | 'amber' | 'violet'

const REACTION_TYPES = ['APPLAUSE', 'THANKS', 'CELEBRATE'] as const satisfies PulseReactionType[]

const PRIVATE_FEED_SIGNALS = [
  'sueldo',
  'salario',
  'pago neto',
  'denuncia',
  'hostigamiento',
  'salud',
  'medic',
  'enfermedad',
  'licencia medica',
  'licencia médica',
  'tardanza',
  'ausencia',
  'rechazad',
  'documento faltante',
  'faltante',
  'dni',
]

function startOfCurrentMonth() {
  const now = getLimaParts(new Date())
  return new Date(Date.UTC(now.year, now.month - 1, 1))
}

function startOfCurrentDay() {
  const now = getLimaParts(new Date())
  return new Date(Date.UTC(now.year, now.month - 1, now.day))
}

function startOfTomorrow() {
  const now = getLimaParts(new Date())
  return new Date(Date.UTC(now.year, now.month - 1, now.day + 1))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function formatDateLabel() {
  return new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function percent(part: number, total: number, fallback = 0) {
  if (total <= 0) return fallback
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)))
}

function workerName(worker: Pick<WorkerBasics, 'firstName' | 'lastName'> | null | undefined) {
  if (!worker) return null
  return `${worker.firstName} ${worker.lastName}`.trim()
}

function containsPrivateSignal(text: string) {
  const normalized = text.toLowerCase()
  return PRIVATE_FEED_SIGNALS.some((signal) => normalized.includes(signal))
}

function isSafePulseEvent(event: { title: string; description: string }) {
  return !containsPrivateSignal(`${event.title} ${event.description}`)
}

function reactionBuckets(reactions: Array<{ type: string; workerId: string }>, workerId: string) {
  const counts: Record<PulseReactionType, number> = {
    APPLAUSE: 0,
    THANKS: 0,
    CELEBRATE: 0,
  }
  const mine: PulseReactionType[] = []

  reactions.forEach((reaction) => {
    if (!REACTION_TYPES.includes(reaction.type as PulseReactionType)) return
    const type = reaction.type as PulseReactionType
    counts[type] += 1
    if (reaction.workerId === workerId) mine.push(type)
  })

  return { counts, mine }
}

function computeStreak(attendance: Array<{ status: string; workDate: Date }>) {
  let streak = 0
  for (const record of attendance) {
    if (record.status === 'ABSENT' || record.status === 'ON_LEAVE') break
    streak += 1
  }
  return streak
}

function percentileLabel(legajoPercent: number) {
  if (legajoPercent >= 96) return 'Top 20% en legajo completo'
  if (legajoPercent >= 82) return 'Top 35% en avance de legajo'
  if (legajoPercent >= 60) return 'Nivel sólido, cerca del siguiente salto'
  return 'En camino al siguiente nivel'
}

function levelName(score: number) {
  if (score >= 90) return 'Nivel Pro Activo'
  if (score >= 75) return 'Nivel Constante'
  if (score >= 55) return 'Nivel En Progreso'
  return 'Nivel Inicial'
}

function buildPrimaryAction(args: {
  payslips: number
  training: number
  docs: number
  requests: number
}) {
  if (args.payslips > 0) {
    return { label: 'Firmar boletas pendientes', href: '/mi-portal/boletas' }
  }
  if (args.training > 0) {
    return { label: 'Completar capacitaciones', href: '/mi-portal/capacitaciones' }
  }
  if (args.docs > 0) {
    return { label: 'Actualizar legajo personal', href: '/mi-portal/documentos' }
  }
  if (args.requests > 0) {
    return { label: 'Revisar solicitudes en trámite', href: '/mi-portal/solicitudes' }
  }
  return { label: 'Ver retos de mi equipo', href: '/mi-portal/pulse' }
}

function computedChallenge(args: {
  id: string
  title: string
  description: string
  progress: number
  scopeLabel: string
  tone: PulseTone
  days: number
}) {
  return {
    id: args.id,
    title: args.title,
    description: args.description,
    progress: args.progress,
    target: 100,
    unit: '%',
    scopeLabel: args.scopeLabel,
    status: args.progress >= 100 ? 'COMPLETED' : 'ACTIVE',
    tone: args.tone,
    endsAt: addDays(startOfCurrentDay(), args.days).toISOString(),
  }
}

async function safeGetPulseEvents(orgId: string, workerId: string) {
  try {
    return await prisma.workerPulseEvent.findMany({
      where: {
        orgId,
        OR: [{ visibility: 'ORG' }, { visibility: 'TEAM' }, { workerId }],
      },
      include: {
        worker: { select: { id: true, firstName: true, lastName: true, position: true } },
        actorWorker: { select: { id: true, firstName: true, lastName: true, position: true } },
        reactions: { select: { type: true, workerId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 24,
    })
  } catch (error) {
    console.warn('[worker-pulse] feed unavailable:', error)
    return []
  }
}

async function safeGetChallenges(orgId: string) {
  try {
    return await prisma.workerChallenge.findMany({
      where: { orgId, status: 'ACTIVE' },
      orderBy: [{ endsAt: 'asc' }, { createdAt: 'desc' }],
      take: 8,
    })
  } catch (error) {
    console.warn('[worker-pulse] challenges unavailable:', error)
    return []
  }
}

function mapDbEvents(events: Awaited<ReturnType<typeof safeGetPulseEvents>>, workerId: string) {
  return events
    .filter(isSafePulseEvent)
    .map((event) => {
      const buckets = reactionBuckets(event.reactions, workerId)
      return {
        id: event.id,
        type: event.type,
        title: event.title,
        description: event.description,
        workerName: workerName(event.worker),
        actorName: workerName(event.actorWorker),
        icon: event.icon ?? (event.type === 'KUDO' ? 'heart' : 'award'),
        tone: event.tone ?? (event.type === 'KUDO' ? 'emerald' : 'blue'),
        createdAt: event.createdAt.toISOString(),
        reactions: buckets.counts,
        myReactions: buckets.mine,
        isReactable: true,
      }
    })
}

function buildFallbackFeed(args: {
  worker: WorkerBasics
  legajoPercent: number
  trainingCompleted: number
  signedPayslips: number
  teamTrainingProgress: number
}) {
  const feed = []
  const name = workerName(args.worker)

  if (args.legajoPercent >= 100) {
    feed.push({
      id: `computed-${args.worker.id}-legajo`,
      type: 'SYSTEM_ACHIEVEMENT',
      title: `${name} completó su legajo`,
      description: 'Su información laboral está verificada y lista para auditoría.',
      workerName: name,
      actorName: null,
      icon: 'shield',
      tone: 'emerald',
      createdAt: new Date().toISOString(),
      reactions: { APPLAUSE: 0, THANKS: 0, CELEBRATE: 0 },
      myReactions: [],
      isReactable: false,
    })
  }

  if (args.trainingCompleted > 0) {
    feed.push({
      id: `computed-${args.worker.id}-training`,
      type: 'SYSTEM_ACHIEVEMENT',
      title: `${name} completó capacitaciones`,
      description: 'Sumó constancias positivas al progreso del equipo.',
      workerName: name,
      actorName: null,
      icon: 'award',
      tone: 'blue',
      createdAt: addDays(new Date(), -1).toISOString(),
      reactions: { APPLAUSE: 0, THANKS: 0, CELEBRATE: 0 },
      myReactions: [],
      isReactable: false,
    })
  }

  if (args.signedPayslips > 0) {
    feed.push({
      id: `computed-${args.worker.id}-payslips`,
      type: 'SYSTEM_ACHIEVEMENT',
      title: `${name} mantiene boletas confirmadas`,
      description: 'Va construyendo trazabilidad laboral con recepción registrada.',
      workerName: name,
      actorName: null,
      icon: 'check',
      tone: 'violet',
      createdAt: addDays(new Date(), -2).toISOString(),
      reactions: { APPLAUSE: 0, THANKS: 0, CELEBRATE: 0 },
      myReactions: [],
      isReactable: false,
    })
  }

  feed.push({
    id: 'computed-team-training',
    type: 'TEAM_CHALLENGE',
    title: `El equipo va en ${args.teamTrainingProgress}%`,
    description: 'Reto colectivo de capacitaciones: avance visible sin ranking individual.',
    workerName: null,
    actorName: null,
    icon: 'trophy',
    tone: 'amber',
    createdAt: addDays(new Date(), -3).toISOString(),
    reactions: { APPLAUSE: 0, THANKS: 0, CELEBRATE: 0 },
    myReactions: [],
    isReactable: false,
  })

  return feed.filter(isSafePulseEvent).slice(0, 8)
}

async function handlePulse(_req: NextRequest, ctx: WorkerAuthContext) {
  const { workerId, orgId } = ctx
  const monthStart = startOfCurrentMonth()
  const todayStart = startOfCurrentDay()
  const tomorrow = startOfTomorrow()
  const yearStart = new Date(Date.UTC(getLimaParts(new Date()).year, 0, 1))

  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      department: true,
      organization: { select: { name: true } },
    },
  })

  if (!worker) {
    return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  }

  const activeWorkers = await prisma.worker.findMany({
    where: { orgId, status: { in: ['ACTIVE', 'ON_LEAVE'] }, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, position: true, department: true },
    orderBy: [{ department: 'asc' }, { firstName: 'asc' }],
    take: 120,
  })

  const activeWorkerIds = activeWorkers.map((item) => item.id)
  const kudoTargets = activeWorkers
    .filter((item) => item.id !== workerId)
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      name: workerName(item) ?? 'Compañero',
      role: item.position ?? item.department ?? 'Trabajador',
    }))

  const [
    payslipsPending,
    requestsPending,
    trainingPending,
    docsMissing,
    ownDocsTotal,
    ownDocsReady,
    ownTrainingTotal,
    ownTrainingPassed,
    ownPayslipsYear,
    ownPayslipsSignedYear,
    attendanceThisMonth,
    attendanceStreakSource,
    orgDocsTotal,
    orgDocsReady,
    orgTrainingTotal,
    orgTrainingPassed,
    orgPayslipsMonth,
    orgPayslipsSignedMonth,
    dbChallenges,
    dbEvents,
  ] = await Promise.all([
    prisma.payslip.count({
      where: { workerId, orgId, acceptedAt: null, status: { in: ['EMITIDA', 'ENVIADA'] } },
    }),
    prisma.workerRequest.count({
      where: { workerId, orgId, status: { in: ['PENDIENTE', 'EN_REVISION'] } },
    }),
    prisma.enrollment.count({
      where: { workerId, orgId, status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'EXAM_PENDING'] } },
    }),
    prisma.workerDocument.count({
      where: { workerId, isRequired: true, status: { in: ['PENDING', 'MISSING', 'EXPIRED'] } },
    }),
    prisma.workerDocument.count({ where: { workerId, isRequired: true } }),
    prisma.workerDocument.count({
      where: { workerId, isRequired: true, status: { in: ['UPLOADED', 'VERIFIED'] } },
    }),
    prisma.enrollment.count({ where: { workerId, orgId } }),
    prisma.enrollment.count({ where: { workerId, orgId, status: 'PASSED' } }),
    prisma.payslip.count({
      where: { workerId, orgId, fechaEmision: { gte: yearStart }, status: { not: 'ANULADA' } },
    }),
    prisma.payslip.count({
      where: {
        workerId,
        orgId,
        fechaEmision: { gte: yearStart },
        OR: [{ acceptedAt: { not: null } }, { status: 'ACEPTADA' }],
      },
    }),
    prisma.attendance.findMany({
      where: { workerId, orgId, workDate: { gte: monthStart, lt: tomorrow } },
      orderBy: { workDate: 'desc' },
      select: { workDate: true, clockIn: true, status: true },
    }),
    prisma.attendance.findMany({
      where: { workerId, orgId },
      orderBy: { workDate: 'desc' },
      take: 30,
      select: { workDate: true, status: true },
    }),
    activeWorkerIds.length
      ? prisma.workerDocument.count({ where: { workerId: { in: activeWorkerIds }, isRequired: true } })
      : Promise.resolve(0),
    activeWorkerIds.length
      ? prisma.workerDocument.count({
          where: { workerId: { in: activeWorkerIds }, isRequired: true, status: { in: ['UPLOADED', 'VERIFIED'] } },
        })
      : Promise.resolve(0),
    activeWorkerIds.length
      ? prisma.enrollment.count({ where: { orgId, workerId: { in: activeWorkerIds } } })
      : Promise.resolve(0),
    activeWorkerIds.length
      ? prisma.enrollment.count({ where: { orgId, workerId: { in: activeWorkerIds }, status: 'PASSED' } })
      : Promise.resolve(0),
    prisma.payslip.count({ where: { orgId, fechaEmision: { gte: monthStart }, status: { not: 'ANULADA' } } }),
    prisma.payslip.count({
      where: {
        orgId,
        fechaEmision: { gte: monthStart },
        OR: [{ acceptedAt: { not: null } }, { status: 'ACEPTADA' }],
      },
    }),
    safeGetChallenges(orgId),
    safeGetPulseEvents(orgId, workerId),
  ])

  const legajoPercent = percent(ownDocsReady, ownDocsTotal, ownDocsTotal === 0 ? 100 : 0)
  const trainingPercent = percent(ownTrainingPassed, ownTrainingTotal, ownTrainingTotal === 0 ? 100 : 0)
  const payslipPercent = percent(ownPayslipsSignedYear, ownPayslipsYear, ownPayslipsYear === 0 ? 100 : 0)
  const attendanceMarked = attendanceThisMonth.filter((record) => record.status !== 'ABSENT' && record.status !== 'ON_LEAVE').length
  const attendancePercent = percent(attendanceMarked, Math.max(attendanceThisMonth.length, 1), attendanceThisMonth.length === 0 ? 80 : 0)
  const score = Math.round(legajoPercent * 0.34 + trainingPercent * 0.24 + payslipPercent * 0.24 + attendancePercent * 0.18)

  const orgDocsProgress = percent(orgDocsReady, orgDocsTotal, orgDocsTotal === 0 ? legajoPercent : 0)
  const orgTrainingProgress = percent(orgTrainingPassed, orgTrainingTotal, orgTrainingTotal === 0 ? 0 : 0)
  const orgPayslipsProgress = percent(orgPayslipsSignedMonth, orgPayslipsMonth, orgPayslipsMonth === 0 ? 0 : 0)
  const streakDays = computeStreak(attendanceStreakSource)
  const markedToday = attendanceThisMonth.some((record) => record.workDate >= todayStart)
  const pendingCount = payslipsPending + requestsPending + trainingPending + docsMissing
  const scopeLabel = worker.department ? `Equipo ${worker.department}` : worker.organization.name

  const calculatedChallenges = [
    computedChallenge({
      id: 'computed-docs-complete',
      title: 'Legajos fuertes',
      description: 'Avance colectivo de información laboral verificada.',
      progress: orgDocsProgress,
      scopeLabel: 'Toda la empresa',
      tone: 'emerald',
      days: 14,
    }),
    computedChallenge({
      id: 'computed-training-complete',
      title: `${scopeLabel}: capacitaciones al día`,
      description: 'Reto positivo para cerrar cursos activos sin exponer pendientes individuales.',
      progress: orgTrainingProgress,
      scopeLabel,
      tone: 'blue',
      days: 7,
    }),
    computedChallenge({
      id: 'computed-payslips-signed',
      title: 'Boletas confirmadas del mes',
      description: 'Meta de trazabilidad colectiva para cerrar el mes con recepción registrada.',
      progress: orgPayslipsProgress,
      scopeLabel: 'Toda la empresa',
      tone: 'amber',
      days: 10,
    }),
  ]

  const savedChallenges = dbChallenges.map((challenge, index) => ({
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    progress: Math.min(100, Math.max(0, challenge.progress)),
    target: challenge.target,
    unit: '%',
    scopeLabel: challenge.scopeLabel ?? scopeLabel,
    status: challenge.status,
    tone: (['emerald', 'blue', 'amber', 'violet'][index % 4] ?? 'emerald') as PulseTone,
    endsAt: challenge.endsAt?.toISOString() ?? null,
  }))

  const savedFeed = mapDbEvents(dbEvents, workerId)
  const fallbackFeed = buildFallbackFeed({
    worker,
    legajoPercent,
    trainingCompleted: ownTrainingPassed,
    signedPayslips: ownPayslipsSignedYear,
    teamTrainingProgress: orgTrainingProgress,
  })

  return NextResponse.json({
    today: {
      greeting: `Hola, ${worker.firstName}`,
      dateLabel: formatDateLabel(),
      statusLabel: markedToday ? 'Ya registraste actividad hoy' : 'Tienes tu día listo para revisar',
      streakDays,
      pendingCount,
      primaryAction: buildPrimaryAction({
        payslips: payslipsPending,
        training: trainingPending,
        docs: docsMissing,
        requests: requestsPending,
      }),
      benefitLabel: 'Próximo beneficio visible en tu resumen personal',
    },
    personal: {
      levelName: levelName(score),
      score,
      percentileLabel: percentileLabel(legajoPercent),
      metrics: [
        { label: 'Legajo', value: `${legajoPercent}%`, detail: legajoPercent >= 100 ? 'Información al día' : 'Avance personal', tone: 'emerald' },
        { label: 'Capacitaciones', value: `${trainingPercent}%`, detail: `${ownTrainingPassed}/${ownTrainingTotal || ownTrainingPassed} completadas`, tone: 'blue' },
        { label: 'Boletas', value: `${ownPayslipsSignedYear}/${ownPayslipsYear || ownPayslipsSignedYear}`, detail: 'Firmadas este año', tone: 'violet' },
        { label: 'Racha', value: `${streakDays} días`, detail: 'Actividad registrada', tone: 'amber' },
      ],
    },
    team: {
      scopeLabel,
      summary: `${scopeLabel} va en ${Math.max(orgTrainingProgress, orgDocsProgress)}% de avance positivo.`,
      progress: Math.max(orgTrainingProgress, orgDocsProgress),
    },
    challenges: [...savedChallenges, ...calculatedChallenges].slice(0, 6),
    feed: savedFeed.length > 0 ? savedFeed.slice(0, 12) : fallbackFeed,
    kudoOptions: PULSE_KUDOS.map((value) => ({ value, label: kudoCopy[value].label })),
    kudoTargets,
  })
}

const getAuthenticatedPulse = withWorkerAuth(handlePulse)

export async function GET(req: NextRequest, routeCtx?: unknown) {
  if (process.env.NODE_ENV === 'development' && req.nextUrl.searchParams.get('__workerPreview') === '1') {
    return NextResponse.json(getWorkerPreviewPulse())
  }

  return getAuthenticatedPulse(req, routeCtx)
}
