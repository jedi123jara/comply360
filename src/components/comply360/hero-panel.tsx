'use client'

import { ShieldCheck, Users, Activity, TrendingUp, ArrowUp } from 'lucide-react'
import { AnimatedShield, RingPremium, useCountUp } from './animated-shield'

/**
 * HeroPanel — signature del dashboard.
 *
 * Panel editorial con:
 *  - Ring grande (220px) gradient emerald con score 0-100 en Instrument Serif 88px
 *  - Shield animado flotante en top-right
 *  - Headline serif con <em> emerald
 *  - Stat strip de 3 columnas con serif numbers + deltas
 *
 * Background: doble gradiente emerald→slate→amber con grid sutil + halo pulsante.
 * Fuente de inspiración: dashboard.jsx del prototipo (handoff Claude Design).
 */

export interface HeroPanelProps {
  /** Score 0-100 para el ring central. null = todavía sin diagnóstico. */
  score: number | null
  /** Nombre del usuario para saludo personalizado. Si no llega, mostramos "equipo". */
  userFirstName?: string
  /** Razón social de la empresa. Si no llega, decimos "tu empresa". */
  orgName?: string
  /** Multa potencial evitada en soles. */
  multaEvitadaSoles: number
  /** Alertas críticas activas (para el copy). */
  alertasCriticas?: number
  /** Trabajadores protegidos (para el strip). */
  trabajadoresProtegidos: number
  /** Días sin multa (para el strip). */
  diasSinMulta: number
  /** Callback click "Revisar alertas críticas". */
  onReviewAlerts?: () => void
  /** Callback click "Ver diagnóstico completo". */
  onOpenDiagnostic?: () => void
  /** Callback click "Preguntar al asistente". */
  onAskAssistant?: () => void
}

function formatSoles(n: number): string {
  return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function HeroPanel({
  score,
  userFirstName,
  orgName,
  multaEvitadaSoles,
  alertasCriticas = 0,
  trabajadoresProtegidos,
  diasSinMulta,
  onReviewAlerts,
  onOpenDiagnostic,
  onAskAssistant,
}: HeroPanelProps) {
  const multaCount = useCountUp(multaEvitadaSoles, 1600)
  const trabsCount = useCountUp(trabajadoresProtegidos, 1200)
  const diasCount = useCountUp(diasSinMulta, 1400)

  const safeName = userFirstName?.trim() || 'equipo'
  const safeOrg = orgName?.trim() || 'tu empresa'
  const isPending = score === null
  const protected_ = !isPending && (score as number) >= 75
  const headline = isPending
    ? 'Aún no tenemos tu <em>score de compliance</em>. Corramos el diagnóstico.'
    : protected_
      ? 'Tu empresa está <em>protegida</em> ante una fiscalización SUNAFIL.'
      : 'Tu empresa necesita <em>atención inmediata</em> antes de una inspección.'

  const subCopy = isPending
    ? `Toma 3 minutos correr el diagnóstico express y vemos qué tan lista está ${safeOrg} ante una inspección SUNAFIL.`
    : alertasCriticas > 0
      ? `Has evitado <b>${formatSoles(multaEvitadaSoles)}</b> en multas potenciales este mes. Quedan <b>${alertasCriticas} alerta${alertasCriticas === 1 ? '' : 's'} crítica${alertasCriticas === 1 ? '' : 's'}</b> que exigen tu atención.`
      : `Has evitado <b>${formatSoles(multaEvitadaSoles)}</b> en multas potenciales este mes. Sin alertas críticas pendientes.`

  return (
    <div className="c360-hero-panel">
      <div className="c360-hero-grid">
        {/* Left: score ring + animated shield */}
        <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
          <div className="c360-hero-score-big">
            <div className="c360-hero-score-ring">
              <RingPremium value={isPending ? 0 : (score as number)} size={220} stroke={10} />
            </div>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                {isPending ? (
                  <span className="n" style={{ opacity: 0.45 }}>—</span>
                ) : (
                  <>
                    <span className="n">{score}</span>
                    <span className="over">/100</span>
                  </>
                )}
              </div>
              <span className="c360-hero-score-label">
                {isPending ? 'Pendiente diagnóstico' : 'Índice de cumplimiento'}
              </span>
            </div>
          </div>
          <div style={{ position: 'absolute', top: -6, right: -6 }}>
            <AnimatedShield size={52} />
          </div>
        </div>

        {/* Middle: narrative + stat strip */}
        <div style={{ minWidth: 0 }}>
          <h2
            className="c360-hero-headline"
            dangerouslySetInnerHTML={{ __html: `Buenos días, <em>${safeName}</em>.` }}
          />
          <h3
            className="c360-hero-headline"
            style={{ fontSize: 22, marginTop: 8 }}
            dangerouslySetInnerHTML={{ __html: headline }}
          />
          <p
            className="c360-hero-sub"
            dangerouslySetInnerHTML={{
              __html: isPending
                ? subCopy
                : `<span>Así protege COMPLY360 a ${safeOrg} esta semana. </span>${subCopy}`,
            }}
          />
          <div className="c360-hero-stat-strip">
            <div>
              <div className="c360-hero-stat-label">
                <ShieldCheck size={11} /> Multa evitada
              </div>
              <div className="c360-hero-stat-value">
                {formatSoles(Math.round(multaCount))}
              </div>
              <div className="c360-hero-stat-delta">
                <ArrowUp size={10} /> Acumulado este mes
              </div>
            </div>
            <div>
              <div className="c360-hero-stat-label">
                <Users size={11} /> Trabajadores blindados
              </div>
              <div className="c360-hero-stat-value">{Math.round(trabsCount)}</div>
              <div className="c360-hero-stat-delta">
                <ArrowUp size={10} /> Todos los activos cubiertos
              </div>
            </div>
            <div>
              <div className="c360-hero-stat-label">
                <Activity size={11} /> Días sin multa
              </div>
              <div className="c360-hero-stat-value">{Math.round(diasCount)}</div>
              <div className="c360-hero-stat-delta">
                <TrendingUp size={10} /> Racha activa
              </div>
            </div>
          </div>
        </div>

        {/* Right: quick actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minWidth: 200,
            alignSelf: 'center',
          }}
        >
          {alertasCriticas > 0 ? (
            <button
              type="button"
              onClick={onReviewAlerts}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors"
              style={{ justifyContent: 'flex-start', boxShadow: '0 1px 2px rgba(4,120,87,0.15), inset 0 1px 0 rgba(255,255,255,0.15)' }}
            >
              <ShieldCheck size={13} /> Revisar {alertasCriticas} alerta{alertasCriticas === 1 ? '' : 's'} crítica{alertasCriticas === 1 ? '' : 's'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpenDiagnostic}
            className="inline-flex items-center gap-2 rounded-lg bg-white hover:bg-[color:var(--neutral-50)] text-[color:var(--text-primary)] px-3.5 py-2 text-xs font-semibold transition-colors border border-[color:var(--border-default)]"
            style={{ justifyContent: 'flex-start' }}
          >
            <ShieldCheck size={13} /> Ver diagnóstico completo
          </button>
          {onAskAssistant ? (
            <button
              type="button"
              onClick={onAskAssistant}
              className="inline-flex items-center gap-2 rounded-lg bg-white hover:bg-[color:var(--neutral-50)] text-[color:var(--text-primary)] px-3.5 py-2 text-xs font-semibold transition-colors border border-[color:var(--border-default)]"
              style={{ justifyContent: 'flex-start' }}
            >
              <Activity size={13} /> Preguntar al asistente
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
