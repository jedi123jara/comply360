'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  ArrowRight,
  Award,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Flame,
  Heart,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  ThumbsUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'

type PulseTone = 'emerald' | 'blue' | 'amber' | 'violet'
type PulseTab = 'today' | 'challenges' | 'feed'
type ReactionType = 'APPLAUSE' | 'THANKS' | 'CELEBRATE'
type KudoType = 'BUEN_COMPANERO' | 'PUNTUALIDAD' | 'APOYO_EQUIPO' | 'CAPACITACION_COMPLETADA'

type PulseMetric = {
  label: string
  value: string
  detail: string
  tone: PulseTone
}

type PulseChallenge = {
  id: string
  title: string
  description: string
  progress: number
  target: number
  unit: string
  scopeLabel: string
  status: string
  tone: PulseTone
  endsAt: string | null
}

type PulseEvent = {
  id: string
  type: string
  title: string
  description: string
  workerName: string | null
  actorName: string | null
  icon: string | null
  tone: PulseTone
  createdAt: string
  reactions: Record<ReactionType, number>
  myReactions: ReactionType[]
  isReactable?: boolean
}

type PulseData = {
  today: {
    greeting: string
    dateLabel: string
    statusLabel: string
    streakDays: number
    pendingCount: number
    primaryAction: { label: string; href: string }
    benefitLabel?: string
  }
  personal: {
    levelName: string
    score: number
    percentileLabel: string
    metrics: PulseMetric[]
  }
  team: {
    scopeLabel: string
    summary: string
    progress: number
  }
  challenges: PulseChallenge[]
  feed: PulseEvent[]
  kudoOptions: Array<{ value: KudoType; label: string }>
  kudoTargets: Array<{ id: string; name: string; role: string }>
}

const TAB_ITEMS: Array<{ id: PulseTab; label: string; icon: LucideIcon }> = [
  { id: 'today', label: 'Hoy', icon: Sparkles },
  { id: 'challenges', label: 'Retos', icon: Target },
  { id: 'feed', label: 'Logros', icon: Trophy },
]

const REACTION_LABELS: Record<ReactionType, { label: string; icon: LucideIcon }> = {
  APPLAUSE: { label: 'Aplauso', icon: ThumbsUp },
  THANKS: { label: 'Gracias', icon: Heart },
  CELEBRATE: { label: 'Felicitar', icon: Star },
}

const ICONS: Record<string, LucideIcon> = {
  award: Award,
  check: CheckCircle2,
  clock: Clock3,
  heart: Heart,
  shield: ShieldCheck,
  trophy: Trophy,
  users: Users,
}

function previewHref(href: string, isPreview: boolean) {
  return isPreview ? `${href}?__workerPreview=1` : href
}

function shortDate(iso: string | null) {
  if (!iso) return 'Sin cierre'
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(1, Math.round(diff / 60000))
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

export default function WorkerPulsePage() {
  const searchParams = useSearchParams()
  const isWorkerPreview =
    process.env.NODE_ENV === 'development' && searchParams.get('__workerPreview') === '1'
  const [tab, setTab] = useState<PulseTab>('today')
  const [data, setData] = useState<PulseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string>('')
  const [sendingKudo, setSendingKudo] = useState<KudoType | null>(null)

  useEffect(() => {
    let mounted = true
    fetch(`/api/mi-portal/pulse${isWorkerPreview ? '?__workerPreview=1' : ''}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar Pulse Laboral')
        return res.json()
      })
      .then((payload: PulseData) => {
        if (!mounted) return
        setData(payload)
        setError(null)
        setSelectedTarget(payload.kudoTargets[0]?.id ?? '')
      })
      .catch((err: Error) => {
        if (mounted) setError(err.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [isWorkerPreview])

  const selectedTargetName = useMemo(() => {
    return data?.kudoTargets.find((target) => target.id === selectedTarget)?.name ?? ''
  }, [data, selectedTarget])

  function updateEvent(eventId: string, updater: (event: PulseEvent) => PulseEvent) {
    setData((current) => {
      if (!current) return current
      return {
        ...current,
        feed: current.feed.map((event) => (event.id === eventId ? updater(event) : event)),
      }
    })
  }

  async function handleReaction(event: PulseEvent, type: ReactionType) {
    if (event.isReactable === false) return

    const activeBefore = event.myReactions.includes(type)
    updateEvent(event.id, (item) => ({
      ...item,
      reactions: {
        ...item.reactions,
        [type]: Math.max(0, item.reactions[type] + (activeBefore ? -1 : 1)),
      },
      myReactions: activeBefore
        ? item.myReactions.filter((reaction) => reaction !== type)
        : [...item.myReactions, type],
    }))

    if (isWorkerPreview) return

    const res = await fetch('/api/mi-portal/pulse/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: event.id, type }),
    })
    if (!res.ok) {
      updateEvent(event.id, (item) => ({
        ...item,
        reactions: {
          ...item.reactions,
          [type]: Math.max(0, item.reactions[type] + (activeBefore ? 1 : -1)),
        },
        myReactions: activeBefore
          ? [...item.myReactions, type]
          : item.myReactions.filter((reaction) => reaction !== type),
      }))
      return
    }

    const payload = await res.json() as Pick<PulseEvent, 'reactions' | 'myReactions'>
    updateEvent(event.id, (item) => ({ ...item, reactions: payload.reactions, myReactions: payload.myReactions }))
  }

  async function handleKudo(kudoType: KudoType) {
    if (!selectedTarget) return
    setError(null)
    setSendingKudo(kudoType)
    try {
      const res = await fetch(`/api/mi-portal/pulse/kudos${isWorkerPreview ? '?__workerPreview=1' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWorkerId: selectedTarget, kudoType }),
      })
      if (!res.ok) throw new Error('No se pudo enviar el kudo')
      const payload = await res.json() as { event: PulseEvent }
      setData((current) => current ? { ...current, feed: [payload.event, ...current.feed].slice(0, 16) } : current)
      setError(null)
      setTab('feed')
    } catch {
      setError('No se pudo enviar el kudo. Inténtalo nuevamente.')
    } finally {
      setSendingKudo(null)
    }
  }

  if (loading) return <PulseLoading />
  if (error && !data) return <PulseError message={error} />
  if (!data) return <PulseError message="Pulse Laboral no está disponible." />

  return (
    <div className="c360-worker-os c360-pulse-page c360-page-enter">
      <section className="c360-pulse-hero" aria-label="Pulse Laboral">
        <div className="c360-pulse-hero-copy">
          <span className="c360-os-eyebrow">
            <Sparkles className="h-4 w-4" />
            Comply360 Pulse
          </span>
          <h1>Tu día laboral en movimiento</h1>
          <p>{data.today.statusLabel}. {data.team.summary}</p>
          <div className="c360-pulse-hero-actions">
            <Link href={previewHref(data.today.primaryAction.href, isWorkerPreview)} className="c360-os-primary-action">
              <span>{data.today.primaryAction.label}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="c360-os-done-pill">
              <Flame className="h-4 w-4" />
              {data.today.streakDays} días de racha
            </span>
          </div>
        </div>

        <aside className="c360-pulse-score-panel">
          <div className="c360-pulse-score-ring" style={{ '--score': `${data.personal.score}%` } as CSSProperties}>
            <span>{data.personal.score}</span>
            <small>Pulse</small>
          </div>
          <div>
            <strong>{data.personal.levelName}</strong>
            <p>{data.personal.percentileLabel}</p>
          </div>
        </aside>
      </section>

      <nav className="c360-pulse-tabs" aria-label="Secciones de Pulse">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={active ? 'is-active' : ''}
              onClick={() => setTab(item.id)}
              aria-pressed={active}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {error ? (
        <div className="c360-pulse-inline-alert" role="status">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {tab === 'today' ? (
        <TodayTab data={data} isWorkerPreview={isWorkerPreview} />
      ) : tab === 'challenges' ? (
        <ChallengesTab challenges={data.challenges} teamProgress={data.team.progress} />
      ) : (
        <FeedTab
          data={data}
          selectedTarget={selectedTarget}
          selectedTargetName={selectedTargetName}
          sendingKudo={sendingKudo}
          onSelectTarget={setSelectedTarget}
          onKudo={handleKudo}
          onReaction={handleReaction}
        />
      )}
    </div>
  )
}

function TodayTab({ data, isWorkerPreview }: { data: PulseData; isWorkerPreview: boolean }) {
  return (
    <div className="c360-pulse-today-grid">
      <section className="c360-os-panel c360-pulse-day-panel">
        <div className="c360-os-section-head">
          <div>
            <span>Mi día</span>
            <h2>{data.today.greeting}</h2>
          </div>
          <small>{data.today.dateLabel}</small>
        </div>
        <div className="c360-pulse-day-stack">
          <PulseDayItem icon={Clock3} label="Pendientes de hoy" value={`${data.today.pendingCount}`} detail={data.today.primaryAction.label} tone="blue" />
          <PulseDayItem icon={Flame} label="Racha personal" value={`${data.today.streakDays} días`} detail="Actividad laboral registrada" tone="amber" />
          <PulseDayItem icon={ShieldCheck} label="Beneficio próximo" value="Visible" detail={data.today.benefitLabel ?? 'Resumen personal'} tone="emerald" />
        </div>
        <Link href={previewHref(data.today.primaryAction.href, isWorkerPreview)} className="c360-pulse-wide-action">
          {data.today.primaryAction.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="c360-os-panel">
        <div className="c360-os-section-head">
          <div>
            <span>Mi progreso</span>
            <h2>{data.personal.levelName}</h2>
          </div>
          <small>{data.personal.score}/100</small>
        </div>
        <div className="c360-pulse-metric-grid">
          {data.personal.metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      </section>

      <section className="c360-os-panel c360-pulse-team-panel">
        <div className="c360-os-section-head">
          <div>
            <span>Mi equipo</span>
            <h2>{data.team.scopeLabel}</h2>
          </div>
          <small>{data.team.progress}%</small>
        </div>
        <div className="c360-pulse-progress-track">
          <span style={{ width: `${Math.min(100, data.team.progress)}%` }} />
        </div>
        <p>{data.team.summary}</p>
        <div className="c360-pulse-team-badges">
          <span><Users className="h-4 w-4" /> Reto colectivo</span>
          <span><BadgeCheck className="h-4 w-4" /> Nivel positivo</span>
        </div>
      </section>
    </div>
  )
}

function ChallengesTab({ challenges, teamProgress }: { challenges: PulseChallenge[]; teamProgress: number }) {
  return (
    <section className="c360-os-panel">
      <div className="c360-os-section-head">
        <div>
          <span>Retos activos</span>
          <h2>Metas colectivas</h2>
        </div>
        <small>{teamProgress}% equipo</small>
      </div>
      <div className="c360-pulse-challenge-grid">
        {challenges.map((challenge) => (
          <article key={challenge.id} className={`c360-pulse-challenge c360-pulse-tone-${challenge.tone}`}>
            <div className="c360-pulse-challenge-top">
              <span><Target className="h-5 w-5" /></span>
              <small>{challenge.scopeLabel}</small>
            </div>
            <h3>{challenge.title}</h3>
            <p>{challenge.description}</p>
            <div className="c360-pulse-challenge-meter">
              <span style={{ width: `${Math.min(100, challenge.progress)}%` }} />
            </div>
            <div className="c360-pulse-challenge-foot">
              <strong>{challenge.progress}{challenge.unit}</strong>
              <small>Cierre {shortDate(challenge.endsAt)}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function FeedTab({
  data,
  selectedTarget,
  selectedTargetName,
  sendingKudo,
  onSelectTarget,
  onKudo,
  onReaction,
}: {
  data: PulseData
  selectedTarget: string
  selectedTargetName: string
  sendingKudo: KudoType | null
  onSelectTarget: (id: string) => void
  onKudo: (type: KudoType) => void
  onReaction: (event: PulseEvent, type: ReactionType) => void
}) {
  return (
    <div className="c360-pulse-feed-layout">
      <section className="c360-os-panel c360-pulse-kudo-panel">
        <div className="c360-os-section-head">
          <div>
            <span>Kudos</span>
            <h2>Reconocer a alguien</h2>
          </div>
          <small>{selectedTargetName || 'Equipo'}</small>
        </div>
        <div className="c360-pulse-targets" role="list" aria-label="Compañeros">
          {data.kudoTargets.length > 0 ? data.kudoTargets.map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => onSelectTarget(target.id)}
              className={target.id === selectedTarget ? 'is-selected' : ''}
            >
              <span>{target.name.slice(0, 1).toUpperCase()}</span>
              <strong>{target.name}</strong>
              <small>{target.role}</small>
            </button>
          )) : (
            <div className="c360-pulse-empty-mini">
              <Users className="h-5 w-5" />
              <span>No hay compañeros disponibles para kudos.</span>
            </div>
          )}
        </div>
        <div className="c360-pulse-kudo-grid">
          {data.kudoOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onKudo(option.value)}
              disabled={!selectedTarget || sendingKudo !== null}
            >
              {sendingKudo === option.value ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="c360-os-panel">
        <div className="c360-os-section-head">
          <div>
            <span>Logros</span>
            <h2>Actividad positiva</h2>
          </div>
          <small>{data.feed.length} hitos</small>
        </div>
        <div className="c360-pulse-feed-list">
          {data.feed.map((event) => (
            <FeedCard key={event.id} event={event} onReaction={onReaction} />
          ))}
        </div>
      </section>
    </div>
  )
}

function PulseDayItem({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  tone: PulseTone
}) {
  return (
    <div className={`c360-pulse-day-item c360-pulse-tone-${tone}`}>
      <span><Icon className="h-5 w-5" /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </div>
  )
}

function MetricCard({ metric }: { metric: PulseMetric }) {
  return (
    <article className={`c360-pulse-metric-card c360-pulse-tone-${metric.tone}`}>
      <span><Zap className="h-5 w-5" /></span>
      <small>{metric.label}</small>
      <strong>{metric.value}</strong>
      <p>{metric.detail}</p>
    </article>
  )
}

function FeedCard({ event, onReaction }: { event: PulseEvent; onReaction: (event: PulseEvent, type: ReactionType) => void }) {
  const Icon = ICONS[event.icon ?? 'award'] ?? Award
  return (
    <article className={`c360-pulse-feed-card c360-pulse-tone-${event.tone}`}>
      <div className="c360-pulse-feed-icon">
        <Icon className="h-5 w-5" />
      </div>
      <div className="c360-pulse-feed-body">
        <div className="c360-pulse-feed-meta">
          <span>{event.workerName ?? 'Equipo'}</span>
          <small>{relativeTime(event.createdAt)}</small>
        </div>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        {event.actorName ? <em>Reconocido por {event.actorName}</em> : null}
        {event.isReactable === false ? null : (
          <div className="c360-pulse-reactions" aria-label="Reacciones">
            {Object.entries(REACTION_LABELS).map(([type, config]) => {
              const reactionType = type as ReactionType
              const ReactionIcon = config.icon
              const active = event.myReactions.includes(reactionType)
              return (
                <button
                  key={type}
                  type="button"
                  className={active ? 'is-active' : ''}
                  onClick={() => onReaction(event, reactionType)}
                >
                  <ReactionIcon className="h-4 w-4" />
                  <span>{config.label}</span>
                  <strong>{event.reactions[reactionType]}</strong>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </article>
  )
}

function PulseLoading() {
  return (
    <div className="c360-worker-os c360-pulse-page animate-pulse">
      <div className="h-72 rounded-[32px] bg-white/80" />
      <div className="mt-5 h-14 rounded-2xl bg-white/80" />
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="h-72 rounded-[28px] bg-white/80" />
        <div className="h-72 rounded-[28px] bg-white/80" />
        <div className="h-72 rounded-[28px] bg-white/80" />
      </div>
    </div>
  )
}

function PulseError({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
        <div>
          <h3 className="font-bold text-red-900">No pudimos cargar Pulse Laboral</h3>
          <p className="mt-1 text-sm text-red-800">{message}</p>
        </div>
      </div>
    </div>
  )
}
