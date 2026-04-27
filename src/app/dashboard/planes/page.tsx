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
import { PLANS as PLANS_CANONICAL } from '@/lib/constants'

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
const PLAN_UI_META: Record<
  'STARTER' | 'EMPRESA' | 'PRO' | 'ENTERPRISE',
  { icon: React.ComponentType<{ className?: string }>; description: string; highlighted?: boolean; badge?: string }
> = {
  STARTER: {
    icon: Star,
    description: 'Gestor de planilla + calculadoras para MYPEs (hasta 20 trabajadores).',
  },
  EMPRESA: {
    icon: Building2,
    highlighted: true,
    badge: 'Más popular',
    description: 'Compliance SUNAFIL completo para pequeñas empresas (hasta 100).',
  },
  PRO: {
    icon: Rocket,
    badge: 'IA + Portal Worker',
    description: 'IA + portal biométrico para medianas empresas (hasta 300).',
  },
  ENTERPRISE: {
    icon: Crown,
    badge: 'Contáctanos',
    description: 'Trabajadores ilimitados + SLA + multi-cuenta contadores + API.',
  },
}

const PLANS: PlanDefinition[] = (
  ['STARTER', 'EMPRESA', 'PRO', 'ENTERPRISE'] as const
).map((key) => {
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
  starter: string | boolean
  empresa: string | boolean
  pro: string | boolean
}

const FEATURE_COMPARISON: FeatureRow[] = [
  { name: 'Contratos/mes', starter: '10', empresa: '50', pro: 'Ilimitados' },
  { name: 'Usuarios', starter: '1', empresa: '5', pro: 'Ilimitados' },
  { name: 'Calculadoras laborales', starter: true, empresa: true, pro: true },
  { name: 'Alertas normativas', starter: true, empresa: true, pro: true },
  { name: 'Generador de documentos', starter: true, empresa: true, pro: true },
  { name: 'Exportar PDF/DOCX', starter: false, empresa: true, pro: true },
  { name: 'Diagnostico de cumplimiento', starter: false, empresa: true, pro: true },
  { name: 'Expedientes digitales', starter: false, empresa: true, pro: true },
  { name: 'Calendario laboral', starter: false, empresa: true, pro: true },
  { name: 'IA: Revision de riesgos', starter: false, empresa: false, pro: true },
  { name: 'Simulacro SUNAFIL', starter: false, empresa: false, pro: true },
  { name: 'Canal de denuncias', starter: false, empresa: false, pro: true },
  { name: 'Capacitaciones e-learning', starter: false, empresa: false, pro: true },
  { name: 'Asistente IA avanzado', starter: false, empresa: false, pro: true },
  { name: 'API access', starter: false, empresa: false, pro: true },
  { name: 'Integraciones avanzadas', starter: false, empresa: false, pro: true },
  { name: 'Soporte', starter: 'Email', empresa: 'Prioritario', pro: 'Dedicado 24/7' },
]

// =============================================
// Main Component
// =============================================

export default function PlanesPage() {
  const [currentPlan, setCurrentPlan] = useState<string>('STARTER')
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<PlanDefinition | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Fetch current org plan
  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) {
          const data = await res.json()
          if (data.org?.plan) {
            setCurrentPlan(data.org.plan)
          }
        }
      } catch {
        // Default to STARTER if fetch fails
      } finally {
        setLoading(false)
      }
    }
    fetchPlan()
  }, [])

  function handleSelectPlan(plan: PlanDefinition) {
    if (plan.key === currentPlan) return
    // ENTERPRISE es contact-sales: abrir WhatsApp directamente, no el modal Culqi
    if (plan.key === 'ENTERPRISE') {
      const msg = encodeURIComponent(
        'Hola, quiero info del plan Enterprise de COMPLY360 (SLA + multi-cuenta + API).'
      )
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank')
      return
    }
    setSelectedPlan(plan)
    setShowModal(true)
  }

  function getButtonText(planKey: string) {
    if (planKey === currentPlan) return 'Plan actual'
    if (planKey === 'ENTERPRISE') return 'Contactar ventas'
    const planOrder = ['FREE', 'STARTER', 'EMPRESA', 'PRO', 'ENTERPRISE']
    const currentIdx = planOrder.indexOf(currentPlan)
    const targetIdx = planOrder.indexOf(planKey)
    if (targetIdx > currentIdx) return 'Mejorar plan'
    return 'Cambiar plan'
  }

  function getButtonVariant(planKey: string): 'primary' | 'secondary' | 'gold' {
    if (planKey === currentPlan) return 'secondary'
    return planKey === 'EMPRESA' ? 'gold' : 'primary'
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
          background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
          border: '0.5px solid var(--emerald-200, #a7f3d0)',
        }}
      >
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0"
          style={{
            background: 'linear-gradient(165deg, #059669 0%, #047857 55%, #065f46 100%)',
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
                  <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-white shadow-md">
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

                {/* Price */}
                <div className="mb-6 text-center">
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
        <h2 className="mb-4 text-lg font-bold text-slate-900">Comparacion detallada</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                    Funcionalidad
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-900">
                    Starter
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gold">
                    Empresa
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-900">
                    Pro
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
                      <FeatureCell value={row.starter} />
                    </td>
                    <td className="px-4 py-3 text-center bg-gold/5">
                      <FeatureCell value={row.empresa} highlight />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <FeatureCell value={row.pro} />
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
