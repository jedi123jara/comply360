'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  EyeOff,
  FileWarning,
  Fingerprint,
  KeyRound,
  Lock,
  MessageSquareWarning,
  Search,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  UserX,
} from 'lucide-react'

type ComplaintLinkState = 'loading' | 'ready' | 'unavailable'

const trustCards: Array<{
  icon: LucideIcon
  title: string
  text: string
  tone: 'emerald' | 'blue' | 'amber'
}> = [
  {
    icon: EyeOff,
    title: 'Anonimato real',
    text: 'Puedes reportar sin registrar tu nombre ni datos personales.',
    tone: 'emerald',
  },
  {
    icon: Lock,
    title: 'Acceso restringido',
    text: 'Solo el equipo autorizado por régimen revisa el caso y sus evidencias.',
    tone: 'blue',
  },
  {
    icon: ShieldCheck,
    title: 'Protección legal',
    text: 'La ley prohíbe represalias contra quien presenta una denuncia.',
    tone: 'amber',
  },
]

const reportTypes: Array<{
  icon: LucideIcon
  title: string
  text: string
}> = [
  {
    icon: MessageSquareWarning,
    title: 'Hostigamiento sexual',
    text: 'Conductas no deseadas de naturaleza sexual.',
  },
  {
    icon: UserX,
    title: 'Discriminación',
    text: 'Por género, raza, edad, orientación, discapacidad u otra condición.',
  },
  {
    icon: AlertTriangle,
    title: 'Seguridad y salud',
    text: 'Accidentes, incidentes peligrosos, enfermedades ocupacionales o condiciones inseguras.',
  },
  {
    icon: FileWarning,
    title: 'Compliance penal / MPD',
    text: 'Fraude, corrupción, lavado de activos, delitos tributarios o faltas éticas graves.',
  },
]

const protectionSteps: Array<{
  icon: LucideIcon
  title: string
  text: string
}> = [
  {
    icon: KeyRound,
    title: 'Formulario externo',
    text: 'La denuncia se abre fuera de tu sesión del portal trabajador.',
  },
  {
    icon: Fingerprint,
    title: 'Código de seguimiento',
    text: 'Al enviar, recibes un código para consultar el estado sin iniciar sesión.',
  },
  {
    icon: Search,
    title: 'Estado consultable',
    text: 'El seguimiento se hace con el código, no desde tu perfil personal.',
  },
]

const processSteps = [
  {
    title: '1. Presentas el reporte',
    text: 'Puedes hacerlo de forma anónima o identificándote si eso ayuda a la investigación.',
  },
  {
    title: '2. Guardas tu código',
    text: 'Ese código es la forma segura de saber si fue recibida, revisada, investigada o resuelta.',
  },
  {
    title: '3. Se evalúan medidas de protección',
    text: 'La empresa debe cuidar la confidencialidad y evitar represalias durante el proceso.',
  },
  {
    title: '4. Consultas avances',
    text: 'Entra al formulario externo y usa “Consulta el estado de tu denuncia”.',
  },
]

export default function DenunciasPage() {
  const [complaintHref, setComplaintHref] = useState<string | null>(null)
  const [linkState, setLinkState] = useState<ComplaintLinkState>('loading')
  const searchParams = useSearchParams()
  const isWorkerPreview =
    process.env.NODE_ENV === 'development' && searchParams.get('__workerPreview') === '1'
  const resolvedComplaintHref = isWorkerPreview ? '/denuncias/org-demo' : complaintHref
  const resolvedLinkState: ComplaintLinkState = isWorkerPreview ? 'ready' : linkState

  useEffect(() => {
    if (isWorkerPreview) {
      return
    }

    let cancelled = false

    fetch('/api/me', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((me: { orgId?: string | null; workerOrgId?: string | null } | null) => {
        if (cancelled) return
        const orgId = me?.workerOrgId ?? me?.orgId
        if (orgId) {
          setComplaintHref(`/denuncias/${orgId}`)
          setLinkState('ready')
          return
        }
        setLinkState('unavailable')
      })
      .catch(() => {
        if (!cancelled) setLinkState('unavailable')
      })

    return () => {
      cancelled = true
    }
  }, [isWorkerPreview])

  return (
    <div className="c360-worker-report mx-auto w-full max-w-6xl space-y-6 pb-24">
      <section className="c360-report-hero">
        <div className="c360-report-hero-copy">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-white/80">
            <Shield className="h-3.5 w-3.5" />
            Canal protegido
          </div>
          <h1>Canal de Denuncias</h1>
          <p>
            Presenta reportes sensibles en un entorno seguro, confidencial y preparado
            para activar la investigación correspondiente.
          </p>
          <div className="c360-report-hero-actions">
            {resolvedComplaintHref ? (
              <Link
                href={resolvedComplaintHref}
                target="_blank"
                rel="noopener noreferrer"
                className="c360-report-primary"
              >
                Presentar denuncia
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button type="button" disabled className="c360-report-primary">
                {resolvedLinkState === 'loading' ? 'Preparando canal' : 'Canal no disponible'}
              </button>
            )}
            <span className="c360-report-privacy-note">
              Se abre fuera de tu sesión del portal trabajador.
            </span>
          </div>
        </div>

        <div className="c360-report-flow-card" aria-label="Protección del canal">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-emerald-700">Ruta segura</p>
              <h2>Reporte confidencial</h2>
            </div>
            <div className="c360-report-flow-badge">
              <BadgeCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {protectionSteps.map((step, index) => (
              <FlowStep key={step.title} index={index + 1} {...step} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {trustCards.map((card) => (
          <TrustCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="c360-report-panel">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-emerald-700">
                Alcance
              </p>
              <h2>¿Qué puedes denunciar?</h2>
            </div>
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {reportTypes.map((item) => (
              <ReportTypeCard key={item.title} {...item} />
            ))}
          </div>
        </div>

        <aside className="c360-report-law-card">
          <div className="c360-report-law-icon">
            <Scale className="h-6 w-6" />
          </div>
          <p className="text-xs font-black uppercase text-cyan-100">
            Marco legal
          </p>
          <h2>Tu reporte debe ser atendido.</h2>
          <p>
            Conforme a la Ley 27942 y al D.S. 014-2019-MIMP, el empleador debe
            investigar, proteger al denunciante y evitar cualquier represalia.
          </p>
          <div className="c360-report-law-strip">
            <span>Investigación</span>
            <span>Confidencialidad</span>
            <span>Protección</span>
          </div>
        </aside>
      </section>

      <section className="c360-report-panel">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-emerald-700">
              Seguimiento
            </p>
            <h2>¿Dónde ves el estado?</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Para proteger el anonimato, el portal trabajador no lista tus denuncias. El estado se
              consulta con el código que recibes al enviar el formulario.
            </p>
          </div>
          <Search className="h-5 w-5 text-blue-600" />
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {processSteps.map((step) => (
            <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="c360-report-cta">
        <div>
          <p className="text-xs font-black uppercase text-emerald-700">
            Empezar ahora
          </p>
          <h2>Usa el canal cuando necesites dejar constancia.</h2>
          <p>
            El formulario te guiará para describir los hechos y adjuntar evidencia
            si corresponde.
          </p>
        </div>
        {resolvedComplaintHref ? (
          <Link
            href={resolvedComplaintHref}
            target="_blank"
            rel="noopener noreferrer"
            className="c360-report-primary c360-report-primary-wide"
          >
            Presentar denuncia ahora
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="c360-report-primary c360-report-primary-wide"
          >
            {resolvedLinkState === 'loading' ? 'Preparando canal' : 'Canal no disponible'}
          </button>
        )}
      </section>
    </div>
  )
}

function TrustCard({
  icon: Icon,
  title,
  text,
  tone,
}: {
  icon: LucideIcon
  title: string
  text: string
  tone: 'emerald' | 'blue' | 'amber'
}) {
  return (
    <article className={`c360-report-trust-card c360-report-tone-${tone}`}>
      <div className="c360-report-card-icon">
        <Icon className="h-5 w-5" />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  )
}

function FlowStep({
  icon: Icon,
  title,
  text,
  index,
}: {
  icon: LucideIcon
  title: string
  text: string
  index: number
}) {
  return (
    <div className="c360-report-flow-step">
      <span className="c360-report-step-number">{index}</span>
      <div className="c360-report-step-icon">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  )
}

function ReportTypeCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon
  title: string
  text: string
}) {
  return (
    <article className="c360-report-type-card">
      <div className="c360-report-type-icon">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  )
}
