'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Building2, Calendar, LifeBuoy, Loader2, Mail } from 'lucide-react'
import { fmtN } from '@/components/admin/primitives'

type Ticket = {
  id: string
  code: string
  subject: string
  description: string
  category: string
  priority: string
  createdAt: string
  reporter: { email: string; name: string | null } | null
  org: { id: string; name: string; plan: string } | null
}

const PRIORITY_BADGE: Record<string, string> = {
  critica: 'a-badge-crimson',
  alta: 'a-badge-amber',
  media: 'a-badge-cyan',
  baja: 'a-badge-neutral',
}

const CATEGORY_LABELS: Record<string, string> = {
  billing: 'Billing',
  tecnico: 'Técnico',
  legal: 'Legal',
  onboarding: 'Onboarding',
  feature_request: 'Feature',
  bug: 'Bug',
  otro: 'Otro',
}

export default function SoportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    totalOpen: number
    byPriority: Record<string, number>
  } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/admin/support', { cache: 'no-store' })
        const d = await r.json()
        if (r.ok) {
          setTickets(d.tickets ?? [])
          setStats(d.stats ?? null)
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <>
      <div className="a-page-head">
        <div>
          <div className="crumbs">Plataforma · Soporte</div>
          <h1>
            Tickets <em>abiertos</em>
          </h1>
          <div className="sub">
            Solicitudes de ayuda de empresas de toda la plataforma, ordenadas por más reciente.
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="a-grid-4" style={{ marginBottom: 18 }}>
          <div className="a-kpi">
            <div className="a-kpi-label">Total abiertos</div>
            <div className="a-kpi-value">{fmtN(stats.totalOpen)}</div>
            <div className="a-kpi-foot">Cola activa</div>
          </div>
          <div className="a-kpi">
            <div className="a-kpi-label">Prioridad crítica</div>
            <div
              className="a-kpi-value"
              style={{ color: (stats.byPriority.critica ?? 0) > 0 ? 'var(--crimson-600)' : 'var(--text-primary)' }}
            >
              {fmtN(stats.byPriority.critica ?? 0)}
            </div>
            <div className="a-kpi-foot">SLA 2h</div>
          </div>
          <div className="a-kpi">
            <div className="a-kpi-label">Prioridad alta</div>
            <div className="a-kpi-value">{fmtN(stats.byPriority.alta ?? 0)}</div>
            <div className="a-kpi-foot">SLA 24h</div>
          </div>
          <div className="a-kpi">
            <div className="a-kpi-label">Prioridad media</div>
            <div className="a-kpi-value">{fmtN(stats.byPriority.media ?? 0)}</div>
            <div className="a-kpi-foot">SLA 72h</div>
          </div>
        </div>
      )}

      {loading && (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader2 size={14} className="animate-spin" /> Cargando tickets…
        </div>
      )}

      {!loading && tickets.length === 0 && (
        <div className="a-card" style={{ padding: 48, textAlign: 'center' }}>
          <LifeBuoy
            size={40}
            style={{ color: 'var(--neutral-300)', margin: '0 auto 12px', display: 'block' }}
          />
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>
            Sin tickets abiertos
          </p>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 13,
              marginTop: 6,
              maxWidth: 440,
              margin: '6px auto 0',
            }}
          >
            Cuando un usuario envíe un ticket desde su dashboard, aparecerá acá. Los tickets
            con prioridad alta o crítica también te llegan por email.
          </p>
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <div className="a-card" style={{ padding: 0 }}>
          {tickets.map((t, i) => {
            const isOpen = expanded === t.id
            return (
              <div
                key={t.id}
                style={{
                  borderBottom: i < tickets.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : t.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 18px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-50)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span className={`a-badge ${PRIORITY_BADGE[t.priority] ?? 'a-badge-neutral'}`}>
                      {t.priority}
                    </span>
                    <span className="a-badge a-badge-neutral">
                      {CATEGORY_LABELS[t.category] ?? t.category}
                    </span>
                    <span className="term-chip">{t.code}</span>
                    <div
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Calendar size={11} />
                      {new Date(t.createdAt).toLocaleString('es-PE', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginTop: 8,
                    }}
                  >
                    {t.subject}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      marginTop: 6,
                      fontSize: 11.5,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {t.reporter && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Mail size={11} /> {t.reporter.email}
                      </span>
                    )}
                    {t.org && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Building2 size={11} /> {t.org.name} ·{' '}
                        <span style={{ fontWeight: 600 }}>{t.org.plan}</span>
                      </span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '18px 22px 22px',
                      background: 'var(--neutral-50)',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text-primary)',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.55,
                      }}
                    >
                      {t.description}
                    </div>
                    {t.reporter?.email && (
                      <a
                        href={`mailto:${t.reporter.email}?subject=Re:%20${encodeURIComponent(t.subject)}%20(${t.code})`}
                        className="a-btn a-btn-primary a-btn-sm"
                        style={{ marginTop: 14, display: 'inline-flex' }}
                      >
                        <Mail size={12} /> Responder por email
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div
        style={{
          marginTop: 18,
          borderRadius: 12,
          background: 'var(--cyan-50)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          padding: '12px 16px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          fontSize: 12,
          color: 'var(--cyan-600)',
        }}
      >
        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          Los tickets se crean desde{' '}
          <code
            style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              background: 'rgba(255, 255, 255, 0.6)',
              padding: '1px 5px',
              borderRadius: 3,
            }}
          >
            /dashboard/configuracion/soporte
          </code>{' '}
          dentro de cada empresa. Esta vista lista todos en tiempo real.
        </div>
      </div>
    </>
  )
}
