'use client'

import Link from 'next/link'
import { X, Check, Sparkles, Lock, ArrowRight } from 'lucide-react'
import { PLANS, type PlanKey } from '@/lib/constants'
import { FEATURE_MIN_PLAN, type PlanFeature } from '@/lib/plan-features'
import { track } from '@/lib/analytics'

/**
 * UpgradeModal — panel editorial de upgrade con comparativa de planes.
 *
 * Se dispara cuando el backend responde 403 `PLAN_UPGRADE_REQUIRED`.
 * Muestra:
 *  - Hero emerald gradient con "Esta función es parte del plan X"
 *  - Plan actual (gris) vs plan requerido (destacado emerald)
 *  - Features diff con checkmarks
 *  - CTA primario "Actualizar ahora" → /dashboard/planes?highlight=EMPRESA
 *  - CTA secundario "Ver planes"
 *
 * Controlado externamente vía props (gestionado por UpgradeGateProvider).
 */

export interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  currentPlan: PlanKey | 'FREE'
  requiredPlan: PlanKey | 'EMPRESA' | 'PRO'
  /** Nombre de la feature intentada (opcional, ayuda al copy). */
  featureName?: string
  /** Feature key — para derivar el plan si no se pasa explícito. */
  feature?: PlanFeature
}

const PLAN_COLORS: Record<string, { bg: string; ring: string; text: string }> = {
  FREE: { bg: '#f1f5f9', ring: '#cbd5e1', text: '#475569' },
  STARTER: { bg: '#eff6ff', ring: '#bfdbfe', text: '#1e40af' },
  EMPRESA: { bg: '#dbeafe', ring: '#2563eb', text: '#1e3a8a' },
  PRO: { bg: '#172554', ring: '#2563eb', text: '#eff6ff' },
}

/**
 * Multas SUNAFIL evitables por feature (S/ estimados).
 *
 * Base: D.S. 019-2006-TR + UIT 2026 (S/5,500) + rangos típicos para empresas
 * de 10-100 trabajadores. Los números son defensibles pero deliberadamente
 * redondeados al escenario "empresa mediana" — el admin verá "hasta S/".
 */
const FEATURE_SAVINGS: Partial<Record<PlanFeature, { max: number; label: string }>> = {
  diagnostico: { max: 48000, label: 'Multas por infracciones laborales detectables (diagnóstico 135 preguntas)' },
  simulacro_basico: { max: 77000, label: 'Multa grave por no tener documentación lista ante inspección (14 UIT)' },
  simulacro_completo: { max: 289000, label: 'Multa muy grave acumulada (52.53 UIT — tope)' },
  ia_contratos: { max: 28000, label: 'Multa por contratos con cláusulas inválidas (5 UIT por trabajador)' },
  review_ia: { max: 44000, label: 'Multa por cláusulas abusivas detectadas en revisión IA' },
  denuncias: { max: 165000, label: 'Multa hostigamiento sin canal de denuncias (30 UIT según Ley 27942)' },
  sst_completo: { max: 208000, label: 'Multa muy grave SST (Ley 29783 — hasta 38 UIT)' },
  reportes_pdf: { max: 16500, label: 'Multa por no mantener registros (3 UIT)' },
  asistente_ia: { max: 55000, label: 'Multas derivadas de consultas mal respondidas (10 UIT promedio)' },
  api_access: { max: 33000, label: 'Costo de integración manual con ERPs (6 UIT anuales)' },
}

const FEATURE_COPY: Partial<Record<PlanFeature, { title: string; pitch: string }>> = {
  diagnostico: {
    title: 'Diagnóstico SUNAFIL completo',
    pitch: '135 preguntas cubriendo 8 áreas. Calculamos multa potencial y generamos plan de acción priorizado.',
  },
  simulacro_basico: {
    title: 'Simulacro SUNAFIL',
    pitch: 'Viví una inspección antes de que llegue de verdad. Genera Acta de Requerimiento formato R.M. 199-2016-TR.',
  },
  simulacro_completo: {
    title: 'Simulacro SUNAFIL completo',
    pitch: 'Inspector virtual conversacional + checklist por sector + 90% descuento calculado si subsanás a tiempo.',
  },
  reportes_pdf: {
    title: 'Reportes ejecutivos en PDF',
    pitch: 'Exporta reportes de compliance, nómina, SST y auditoría con tu logo corporativo.',
  },
  ia_contratos: {
    title: 'Generación de contratos con IA',
    pitch: 'Contratos redactados automáticamente conforme normativa peruana (19 cláusulas obligatorias).',
  },
  asistente_ia: {
    title: 'Asistente IA laboral peruano',
    pitch: 'RAG sobre +75 normas peruanas + 500 resoluciones TFL. Cita base legal exacta en cada respuesta.',
  },
  review_ia: {
    title: 'Revisión IA de contratos',
    pitch: 'Subí un PDF, obtené análisis clausula-por-clausula con score de riesgo 0-100 y recomendaciones.',
  },
  denuncias: {
    title: 'Canal de denuncias',
    pitch: 'URL pública para denuncias anónimas (Ley 27942). Triaje con IA y gestión del Comité.',
  },
  sst_completo: {
    title: 'SST integral',
    pitch: 'Política, IPERC digital, capacitaciones, comité, accidentes, EMO, EPP y mapa de riesgos.',
  },
  api_access: {
    title: 'API access + integraciones',
    pitch: 'Webhook API para integración con tu ERP. Exportación PLAME directa.',
  },
}

export function UpgradeModal({
  open,
  onClose,
  currentPlan,
  requiredPlan,
  featureName,
  feature,
}: UpgradeModalProps) {
  if (!open) return null

  const reqKey = requiredPlan as PlanKey
  const requiredPlanData = PLANS[reqKey]
  const currentPlanData = currentPlan === 'FREE' ? null : PLANS[currentPlan as PlanKey]

  const featureCopy = feature ? FEATURE_COPY[feature] : null
  const featureSavings = feature ? FEATURE_SAVINGS[feature] : null
  const title = featureName ?? featureCopy?.title ?? `Función del plan ${requiredPlanData?.name}`
  const pitch =
    featureCopy?.pitch ??
    `Esta función requiere el plan ${requiredPlanData?.name} o superior.`

  // ROI dinámico: costo anual del plan vs multa máxima evitable
  const yearlyPlanCost = (requiredPlanData?.price ?? 0) * 12
  const roiMultiplier =
    featureSavings && yearlyPlanCost > 0
      ? Math.floor(featureSavings.max / yearlyPlanCost)
      : null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0"
        style={{
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl motion-fade-in-up"
        style={{
          background: 'white',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow:
            '0 30px 60px -12px rgba(4, 120, 87, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.06)',
        }}
      >
        {/* Hero editorial */}
        <div
          className="relative px-8 pt-10 pb-8 text-white overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 45%, #2563eb 100%)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              maskImage:
                'radial-gradient(ellipse at top right, #000 0%, transparent 70%)',
              WebkitMaskImage:
                'radial-gradient(ellipse at top right, #000 0%, transparent 70%)',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative flex items-center gap-3 mb-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"
              style={{ backdropFilter: 'blur(10px)' }}
            >
              <Lock className="h-5 w-5" />
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Upgrade requerido
            </div>
          </div>

          <h2
            id="upgrade-modal-title"
            className="relative"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              fontSize: 30,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: 10,
            }}
          >
            {title}
          </h2>
          <p className="relative text-emerald-50 text-sm leading-relaxed max-w-xl">
            {pitch}
          </p>
        </div>

        {/* Plan comparison */}
        <div className="px-8 py-7">
          {/* Hero económico: multa evitable + ROI */}
          {featureSavings ? (
            <div
              className="mb-6 rounded-2xl p-5 overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.04))',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
            >
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-[240px]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">
                    Multa que evitás
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 36,
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      color: '#78350f',
                    }}
                  >
                    Hasta{' '}
                    <span style={{ color: '#c2410c' }}>
                      S/ {featureSavings.max.toLocaleString('es-PE')}
                    </span>
                  </p>
                  <p className="text-xs text-amber-900/80 mt-1.5 leading-relaxed max-w-md">
                    {featureSavings.label}
                  </p>
                </div>
                {roiMultiplier && roiMultiplier >= 5 ? (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      ROI
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 44,
                        lineHeight: 1,
                        color: '#1e3a8a',
                        fontWeight: 400,
                      }}
                    >
                      {roiMultiplier}×
                    </p>
                    <p className="text-[10px] text-emerald-700 mt-0.5">
                      vs S/ {yearlyPlanCost.toLocaleString('es-PE')}/año
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Current plan */}
            {currentPlanData ? (
              <PlanCard
                title="Tu plan actual"
                plan={currentPlan as PlanKey}
                data={currentPlanData}
                dim
              />
            ) : (
              <div
                className="rounded-xl p-5 flex flex-col justify-center text-center"
                style={{
                  background: 'var(--neutral-50)',
                  border: '0.5px solid var(--border-default)',
                }}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-tertiary)] mb-2">
                  Tu plan actual
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 22,
                    color: 'var(--text-primary)',
                    lineHeight: 1,
                  }}
                >
                  Free
                </p>
                <p className="text-xs text-[color:var(--text-tertiary)] mt-1">
                  Solo calculadoras
                </p>
              </div>
            )}

            {/* Required plan */}
            <PlanCard
              title="Plan recomendado"
              plan={reqKey}
              data={requiredPlanData}
              highlight
            />
          </div>

          {/* What you unlock */}
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)] mb-3">
              Lo que desbloqueas
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {requiredPlanData.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-[color:var(--text-secondary)]"
                >
                  <Check
                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                    style={{ color: 'var(--emerald-600)' }}
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={`/dashboard/planes?highlight=${reqKey}`}
              onClick={() => {
                track('plan_upgrade_cta_clicked', {
                  required_plan: reqKey,
                  current_plan: currentPlan,
                  feature: feature ?? null,
                })
                onClose()
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 text-sm font-semibold transition-colors"
              style={{
                boxShadow:
                  '0 10px 24px -6px rgba(4,120,87,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
            >
              <Sparkles className="h-4 w-4" />
              Actualizar a {requiredPlanData.name}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/planes"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white text-[color:var(--text-primary)] px-4 py-3 text-sm font-semibold hover:border-emerald-500/60 transition-colors"
            >
              Ver todos los planes
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] font-medium ml-auto"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── PlanCard ─────────────────────────────────────────────────────────── */

function PlanCard({
  title,
  plan,
  data,
  dim = false,
  highlight = false,
}: {
  title: string
  plan: PlanKey | 'FREE'
  data: (typeof PLANS)[PlanKey]
  dim?: boolean
  highlight?: boolean
}) {
  const colors = PLAN_COLORS[plan] ?? PLAN_COLORS.FREE
  return (
    <div
      className="relative rounded-xl p-5"
      style={{
        background: highlight ? colors.bg : 'var(--neutral-50)',
        border: highlight ? `1.5px solid ${colors.ring}` : '0.5px solid var(--border-default)',
        opacity: dim ? 0.75 : 1,
      }}
    >
      {highlight && (
        <span
          className="absolute -top-2 left-5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ background: 'var(--emerald-600)' }}
        >
          <Sparkles className="inline h-2.5 w-2.5 -mt-0.5 mr-1" />
          Recomendado
        </span>
      )}
      <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-tertiary)] mb-2">
        {title}
      </p>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: highlight ? colors.text : 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {data.name}
        </span>
        <span
          className="text-sm text-[color:var(--text-tertiary)] font-mono"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          S/ {data.price}/mes
        </span>
      </div>
      <p className="text-xs text-[color:var(--text-secondary)]">
        {data.maxWorkers === 999999
          ? 'Trabajadores ilimitados'
          : `Hasta ${data.maxWorkers} trabajadores`}{' '}
        · {data.maxUsers === 999999 ? 'Usuarios ilimitados' : `${data.maxUsers} usuario${data.maxUsers === 1 ? '' : 's'}`}
      </p>
    </div>
  )
}

/**
 * Helper: deriva el plan requerido a partir de una feature key.
 */
export function featureRequiredPlan(feature: PlanFeature): string {
  return FEATURE_MIN_PLAN[feature] ?? 'EMPRESA'
}
