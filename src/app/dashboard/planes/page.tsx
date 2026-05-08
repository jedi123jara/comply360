'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard,
  Check,
  Star,
  Building2,
  Rocket,
  MessageCircle,
  Loader2,
  Crown,
  Shield,
  X,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/comply360/editorial-title'
import { CulqiCheckoutModal } from '@/components/billing/culqi-checkout-modal'
import { PLANS as PLANS_CANONICAL, LAUNCH_DISCOUNT_PERCENT, getOriginalPrice } from '@/lib/constants'

// =============================================
// Types
// =============================================

interface PlanDefinition {
  key: string
  name: string
  price: number
  currency: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
  highlighted?: boolean
  badge?: string
}

// =============================================
// Config
// =============================================

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '51999999999'

const IGV_RATE = 0.18

// =============================================
// Plan definitions
// =============================================

// Los precios + features vienen de `@/lib/constants.ts` PLANS (fuente canónica).
// Acá solo mergemos UI metadata (icon, highlighted, badge, description corta).
//
// Pricing oficial 2026-04-30 (ver docs/PRICING.md):
//   FREE → S/0 / 5 workers
//   STARTER → S/249 / 20 workers
//   PRO ⭐ → S/699 / 75 workers (sweet spot — "Más popular")
//   EMPRESA → S/1,899 / 250 workers
//   ENTERPRISE → custom desde S/4,990 / ilimitado
const PLAN_UI_META: Record<
  'FREE' | 'STARTER' | 'PRO' | 'EMPRESA' | 'ENTERPRISE',
  { icon: React.ComponentType<{ className?: string }>; description: string; highlighted?: boolean; badge?: string }
> = {
  FREE: {
    icon: Shield,
    description: 'Para freelancers o micro-PYMES con hasta 5 trabajadores. Sin tarjeta.',
  },
  STARTER: {
    icon: Star,
    description: 'Gestor de planilla + T-REGISTRO + PLAME para PYMES (hasta 20 trabajadores).',
  },
  PRO: {
    icon: Rocket,
    highlighted: true,
    badge: 'Más popular',
    description: 'IA + Diagnóstico SUNAFIL + AI Review para empresas 30-75 workers.',
  },
  EMPRESA: {
    icon: Building2,
    badge: 'Portal worker + SLA 4h',
    description: 'Compliance integral + Portal del trabajador + SLA 4h 24/7 (hasta 250).',
  },
  ENTERPRISE: {
    icon: Crown,
    badge: 'Contáctanos',
    description: 'Empresas 300+ workers · API + integración SUNAT + CSM dedicado.',
  },
}

// Orden visual oficial: FREE → STARTER → PRO ⭐ → EMPRESA → ENTERPRISE
const PLAN_ORDER = ['FREE', 'STARTER', 'PRO', 'EMPRESA', 'ENTERPRISE'] as const

const PLANS: PlanDefinition[] = PLAN_ORDER.map((key) => {
  const canonical = PLANS_CANONICAL[key]
  const ui = PLAN_UI_META[key]
  return {
    key,
    name: canonical.name,
    price: canonical.price,
    currency: 'S/',
    description: ui.description,
    icon: ui.icon,
    features: [...canonical.features],
    highlighted: ui.highlighted,
    badge: ui.badge,
  }
})

// =============================================
// Feature comparison matrix
// =============================================

interface FeatureRow {
  name: string
  free: string | boolean
  starter: string | boolean
  pro: string | boolean
  empresa: string | boolean
}

const FEATURE_COMPARISON: FeatureRow[] = [
  { name: 'Trabajadores incluidos', free: '5', starter: '20', pro: '75', empresa: '250' },
  { name: 'Contratos/mes', free: '1', starter: '5', pro: 'Ilimitados', empresa: 'Ilimitados' },
  { name: 'Boletas (individuales y masivas)', free: 'Ilimitadas', starter: 'Ilimitadas', pro: 'Ilimitadas', empresa: 'Ilimitadas' },
  { name: '13 calculadoras laborales', free: true, starter: true, pro: true, empresa: true },
  { name: 'Calendario obligaciones (CTS, grati, AFP)', free: true, starter: true, pro: true, empresa: true },
  { name: 'Export PLAME + T-REGISTRO', free: false, starter: true, pro: true, empresa: true },
  { name: 'Plantillas propias (zero-liability)', free: false, starter: '1', pro: '5', empresa: 'Ilimitadas' },
  { name: 'Legajo digital con IA Vision', free: false, starter: 'Manual', pro: 'IA ✨', empresa: 'IA ✨' },
  { name: 'IA Copilot consultas/mes', free: false, starter: '50', pro: '500', empresa: '2,000' },
  { name: 'AI Review de contratos', free: false, starter: false, pro: true, empresa: true },
  { name: 'Diagnóstico SUNAFIL', free: 'Express 1/mes', starter: 'Express ∞', pro: 'Full + Simulacro', empresa: 'Full + Simulacro' },
  { name: '15 generadores SST', free: false, starter: false, pro: true, empresa: true },
  { name: 'Canal de denuncias público', free: false, starter: false, pro: true, empresa: true },
  { name: 'Portal del trabajador (PWA + firma biométrica)', free: false, starter: false, pro: false, empresa: true },
  { name: 'E-Learning + certificados QR', free: false, starter: false, pro: false, empresa: true },
  { name: 'Multi-empresa', free: false, starter: false, pro: false, empresa: true },
  { name: 'Asistente IA soporte 24/7', free: true, starter: true, pro: true, empresa: true },
  { name: 'Chat humano (lun-sáb 8am-8pm)', free: false, starter: true, pro: true, empresa: true },
  { name: 'WhatsApp Business <2h hábiles', free: false, starter: false, pro: true, empresa: true },
  { name: 'SLA 4h 24/7 (incluye domingos)', free: false, starter: false, pro: false, empresa: true },
]

// =============================================
// Main Component
// =============================================

export default function PlanesPage() {
  // Default a 'FREE' en vez de 'STARTER' — si el fetch falla, FREE es más
  // honesto que mostrar STARTER (puede ser un usuario sin plan asignado).
  // El plan REAL viene del fetch a /api/dashboard que lee Organization.plan.
  const [currentPlan, setCurrentPlan] = useState<string>('FREE')
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<PlanDefinition | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Fetch current org plan — fuente de verdad: Organization.plan en DB
  useEffect(() => {
    async function fetchPlan() {
      try {
        // Cache: 'no-store' para evitar que el SW o el browser cacheen el plan
        // viejo después de un upgrade. Necesitamos siempre el valor fresh.
        const res = await fetch('/api/dashboard', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.org?.plan) {
            setCurrentPlan(data.org.plan)
          }
        }
      } catch (err) {
        console.warn('[planes] fetch plan failed, defaulting to FREE', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPlan()
  }, [])

  function handleSelectPlan(plan: PlanDefinition) {
    if (plan.key === currentPlan) return
    if (plan.key === 'FREE') return // FREE no se "compra", solo se hace downgrade voluntario
    // ENTERPRISE es contact-sales: abrir WhatsApp directamente, no el modal Culqi
    if (plan.key === 'ENTERPRISE') {
      const msg = encodeURIComponent(
        'Hola, quiero info del plan Enterprise de COMPLY360 (300+ workers + API + integración SUNAT + CSM dedicado).'
      )
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank')
      return
    }
    setSelectedPlan(plan)
    setShowModal(true)
  }

  function getButtonText(planKey: string) {
    if (planKey === currentPlan) return 'Plan actual'
    if (planKey === 'FREE') return 'Plan gratuito'
    if (planKey === 'ENTERPRISE') return 'Contactar ventas'
    // Orden oficial: FREE < STARTER < PRO < EMPRESA < ENTERPRISE
    const planOrder = ['FREE', 'STARTER', 'PRO', 'EMPRESA', 'ENTERPRISE']
    const currentIdx = planOrder.indexOf(currentPlan)
    const targetIdx = planOrder.indexOf(planKey)
    if (targetIdx > currentIdx) return 'Mejorar plan'
    return 'Cambiar plan'
  }

  function getButtonVariant(planKey: string): 'primary' | 'secondary' | 'gold' {
    if (planKey === currentPlan) return 'secondary'
    // Plan PRO ⭐ usa variante gold para destacar como "Más popular"
    return planKey === 'PRO' ? 'gold' : 'primary'
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ---- Header editorial ---- */}
      <PageHeader
        eyebrow="Planes y precios"
        title="Elegí el plan que <em>protege tu planilla</em>."
        subtitle="Todos los planes incluyen actualizaciones automáticas de normativa laboral peruana, calendario fiscal y motor de alertas. Pagos en soles procesados por Culqi."
      />

      {/* ---- Current plan banner ---- */}
      <div
        className="flex items-center gap-4 rounded-2xl px-6 py-4"
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
          border: '0.5px solid var(--emerald-200, #bfdbfe)',
        }}
      >
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0"
          style={{
            background: 'linear-gradient(165deg, #1d4ed8 0%, #1e40af 55%, #1e3a8a 100%)',
            boxShadow: '0 1px 2px rgba(4,120,87,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          <Crown className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Tu plan actual
          </p>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              color: 'var(--text-primary)',
              lineHeight: 1,
              marginTop: 2,
            }}
          >
            Plan {PLANS.find((p) => p.key === currentPlan)?.name || currentPlan}
          </p>
        </div>
        <Badge variant="success">Activo</Badge>
      </div>

      {/* ---- Plan cards ---- */}
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.key === currentPlan
          const Icon = plan.icon

          return (
            <Card
              key={plan.key}
              className={`relative flex flex-col transition-shadow hover:shadow-lg ${
                plan.highlighted
                  ? 'border-2 border-gold ring-2 ring-gold/20'
                  : isCurrentPlan
                    ? 'border-2 border-primary'
                    : ''
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="c360-premium-shimmer rounded-full px-3 py-1 text-xs font-bold text-white shadow-md">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Card content */}
              <div className="flex flex-1 flex-col p-6 pt-8">
                {/* Plan header */}
                <div className="mb-6 text-center">
                  <div
                    className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
                      plan.highlighted
                        ? 'bg-gold/10'
                        : isCurrentPlan
                          ? 'bg-primary/10'
                          : 'bg-[color:var(--neutral-100)]'
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        plan.highlighted
                          ? 'text-gold'
                          : isCurrentPlan
                            ? 'text-primary'
                            : 'text-gray-500'
                      }`}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                </div>

                {/* Price con descuento de lanzamiento */}
                <div className="mb-6 text-center">
                  {/* Precio original tachado (solo si hay descuento + plan no es FREE/Enterprise) */}
                  {LAUNCH_DISCOUNT_PERCENT > 0 && plan.price > 0 && (
                    <div className="flex items-baseline justify-center gap-2 mb-1">
                      <span className="text-sm text-slate-400 line-through font-medium">
                        {plan.currency} {getOriginalPrice(plan.price)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        -{LAUNCH_DISCOUNT_PERCENT}% lanzamiento
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm font-medium text-slate-500">{plan.currency}</span>
                    <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                    <span className="text-sm text-slate-500">/mes</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    + IGV ({plan.currency} {(plan.price * IGV_RATE).toFixed(2)})
                  </p>
                </div>

                {/* Features */}
                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          plan.highlighted ? 'text-gold' : 'text-green-500'
                        }`}
                      />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  variant={getButtonVariant(plan.key)}
                  size="lg"
                  className="w-full"
                  disabled={isCurrentPlan}
                  onClick={() => handleSelectPlan(plan)}
                  icon={
                    isCurrentPlan ? (
                      <Shield className="h-4 w-4" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )
                  }
                >
                  {getButtonText(plan.key)}
                </Button>

                {isCurrentPlan && (
                  <p className="mt-2 text-center text-xs text-gray-400">
                    Este es tu plan activo
                  </p>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* ---- Feature comparison table ---- */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Comparación detallada</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                    Funcionalidad
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">
                    Free
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-900">
                    Starter
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gold">
                    Pro ⭐
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-900">
                    Empresa
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON.map((row, idx) => (
                  <tr
                    key={row.name}
                    className={idx % 2 === 0 ? 'bg-[color:var(--neutral-50)]/50' : ''}
                  >
                    <td className="px-6 py-3 text-sm text-[color:var(--text-secondary)]">{row.name}</td>
                    <td className="px-4 py-3 text-center">
                      <FeatureCell value={row.free} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <FeatureCell value={row.starter} />
                    </td>
                    <td className="px-4 py-3 text-center bg-gold/5">
                      <FeatureCell value={row.pro} highlight />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <FeatureCell value={row.empresa} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ---- FAQ section ---- */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Preguntas frecuentes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FaqCard
            question="Puedo cambiar de plan en cualquier momento?"
            answer="Si, puedes mejorar o cambiar tu plan en cualquier momento. El cambio se aplica de forma inmediata y se prorratea el costo del periodo actual."
          />
          <FaqCard
            question="Que metodos de pago aceptan?"
            answer="Aceptamos tarjetas Visa, Mastercard, American Express y Diners Club a traves de nuestra pasarela de pagos Culqi, certificada por PCI-DSS."
          />
          <FaqCard
            question="Emiten factura electronica?"
            answer="Si, emitimos factura electronica o boleta segun tu preferencia. Necesitamos tu RUC para emitir la factura correspondiente."
          />
          <FaqCard
            question="Hay periodo de prueba?"
            answer="Ofrecemos una demo personalizada gratuita. Contactanos via WhatsApp para coordinar una demostracion de la plataforma completa."
          />
        </div>
      </div>

      {/* ---- Contact CTA ---- */}
      <Card className="border-gold/20 bg-gradient-to-r from-gold/5 to-primary/5">
        <div className="flex flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:text-left">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold/10">
            <MessageCircle className="h-7 w-7 text-gold" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">Necesitas un plan personalizado?</h3>
            <p className="mt-1 text-sm text-slate-600">
              Para empresas con mas de 200 trabajadores o necesidades especificas,
              contactanos para un plan a medida.
            </p>
          </div>
          <Button
            variant="gold"
            size="lg"
            onClick={() =>
              window.open(
                `https://wa.me/${WHATSAPP_NUMBER}?text=Hola%2C%20me%20interesa%20un%20plan%20personalizado%20de%20COMPLY360`,
                '_blank'
              )
            }
            icon={<MessageCircle className="h-4 w-4" />}
          >
            Contactar por WhatsApp
          </Button>
        </div>
      </Card>

      {/* ---- Checkout Modal (Culqi real) ---- */}
      {selectedPlan && (selectedPlan.key === 'STARTER' || selectedPlan.key === 'EMPRESA' || selectedPlan.key === 'PRO') ? (
        <CulqiCheckoutModal
          open={showModal}
          onClose={() => setShowModal(false)}
          plan={{
            key: selectedPlan.key as 'STARTER' | 'EMPRESA' | 'PRO',
            name: selectedPlan.name,
            priceSoles: selectedPlan.price,
            priceInCentimos: selectedPlan.price * 100,
            features: selectedPlan.features,
          }}
          whatsappNumber={WHATSAPP_NUMBER}
        />
      ) : null}
    </div>
  )
}

// =============================================
// Helper Components
// =============================================

function FeatureCell({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className={`mx-auto h-4 w-4 ${highlight ? 'text-gold' : 'text-green-500'}`} />
    ) : (
      <X className="mx-auto h-4 w-4 text-[color:var(--text-secondary)]" />
    )
  }
  return (
    <span className={`text-sm font-medium ${highlight ? 'text-gold' : 'text-[color:var(--text-secondary)]'}`}>
      {value}
    </span>
  )
}

function FaqCard({ question, answer }: { question: string; answer: string }) {
  return (
    <Card>
      <div className="p-4">
        <h4 className="text-sm font-bold text-slate-900">{question}</h4>
        <p className="mt-1 text-sm text-slate-600">{answer}</p>
      </div>
    </Card>
  )
}
