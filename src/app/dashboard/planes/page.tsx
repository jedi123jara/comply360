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
import { Modal } from '@/components/ui/modal'

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

interface OrgPlanData {
  plan: string
  planExpiresAt: string | null
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

const PLANS: PlanDefinition[] = [
  {
    key: 'STARTER',
    name: 'Starter',
    price: 99,
    currency: 'S/',
    description: 'Ideal para emprendedores y pequenas empresas',
    icon: Star,
    features: [
      'Hasta 10 contratos/mes',
      'Calculadoras laborales basicas',
      'Alertas normativas',
      '1 usuario',
      'Soporte por email',
      'Generador de documentos basico',
    ],
  },
  {
    key: 'EMPRESA',
    name: 'Empresa',
    price: 249,
    currency: 'S/',
    description: 'Para empresas en crecimiento con equipos de RRHH',
    icon: Building2,
    highlighted: true,
    badge: 'Mas popular',
    features: [
      'Hasta 50 contratos/mes',
      'Calculadoras laborales avanzadas',
      'Alertas con impacto personalizado',
      'Hasta 5 usuarios',
      'Exportar a PDF y DOCX',
      'Diagnostico de cumplimiento',
      'Expedientes digitales',
      'Calendario laboral',
      'Soporte prioritario',
    ],
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: 499,
    currency: 'S/',
    description: 'Para corporaciones y estudios de abogados',
    icon: Rocket,
    badge: 'Mas completo',
    features: [
      'Contratos ilimitados',
      'IA: revision de riesgos contractuales',
      'Alertas con analisis de impacto',
      'Usuarios ilimitados',
      'API access',
      'Simulacro SUNAFIL completo',
      'Canal de denuncias integrado',
      'Capacitaciones e-learning',
      'Asistente IA avanzado',
      'Integraciones avanzadas',
      'Soporte dedicado 24/7',
    ],
  },
]

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
    setSelectedPlan(plan)
    setShowModal(true)
  }

  function getButtonText(planKey: string) {
    if (planKey === currentPlan) return 'Plan actual'
    const planOrder = ['FREE', 'STARTER', 'EMPRESA', 'PRO']
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
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold text-white">Planes y Precios</h1>
        <p className="mt-1 text-sm text-gray-500">
          Elige el plan que mejor se adapte a las necesidades de tu organizacion.
          Todos los planes incluyen actualizaciones automaticas de normativa laboral peruana.
        </p>
      </div>

      {/* ---- Current plan banner ---- */}
      <Card className="border-primary/20 bg-primary/5">
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">Tu plan actual</p>
            <p className="text-lg font-bold text-white">
              Plan {PLANS.find((p) => p.key === currentPlan)?.name || currentPlan}
            </p>
          </div>
          <Badge variant="success">Activo</Badge>
        </div>
      </Card>

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
                          : 'bg-white/[0.04]'
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
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm font-medium text-gray-500">{plan.currency}</span>
                    <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-sm text-gray-500">/mes</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
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
        <h2 className="mb-4 text-lg font-bold text-white">Comparacion detallada</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Funcionalidad
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-white">
                    Starter
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gold">
                    Empresa
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-white">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON.map((row, idx) => (
                  <tr
                    key={row.name}
                    className={idx % 2 === 0 ? 'bg-white/[0.02]/50' : ''}
                  >
                    <td className="px-6 py-3 text-sm text-gray-300">{row.name}</td>
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
        <h2 className="mb-4 text-lg font-bold text-white">Preguntas frecuentes</h2>
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
            <h3 className="text-lg font-bold text-white">Necesitas un plan personalizado?</h3>
            <p className="mt-1 text-sm text-gray-500">
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

      {/* ---- Payment Modal ---- */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedPlan ? `Mejorar a Plan ${selectedPlan.name}` : 'Seleccionar plan'}
        size="md"
      >
        {selectedPlan && (
          <div className="space-y-6">
            {/* Plan summary */}
            <div className="rounded-xl bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Plan seleccionado</p>
                  <p className="text-lg font-bold text-white">{selectedPlan.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-white">
                    {selectedPlan.currency} {selectedPlan.price}
                  </p>
                  <p className="text-xs text-gray-500">
                    /mes + IGV ({selectedPlan.currency} {(selectedPlan.price * IGV_RATE).toFixed(2)})
                  </p>
                </div>
              </div>
            </div>

            {/* Coming soon notice */}
            <div className="rounded-xl border-2 border-dashed border-gold/30 bg-gold/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
                <CreditCard className="h-6 w-6 text-gold" />
              </div>
              <h3 className="text-base font-bold text-white">
                Proximamente disponible
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                La integracion de pagos en linea esta en fase final de pruebas.
                Para activar tu plan ahora, contactanos directamente por WhatsApp
                y te ayudaremos en menos de 5 minutos.
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  variant="gold"
                  onClick={() =>
                    window.open(
                      `https://wa.me/${WHATSAPP_NUMBER}?text=Hola%2C%20quiero%20activar%20el%20Plan%20${selectedPlan.name}%20de%20COMPLY360`,
                      '_blank'
                    )
                  }
                  icon={<MessageCircle className="h-4 w-4" />}
                >
                  Activar via WhatsApp
                </Button>
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
              </div>
            </div>

            {/* What's included */}
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-300">
                Incluye:
              </p>
              <ul className="space-y-1.5">
                {selectedPlan.features.slice(0, 5).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    {feature}
                  </li>
                ))}
                {selectedPlan.features.length > 5 && (
                  <li className="text-xs text-gray-400">
                    + {selectedPlan.features.length - 5} funcionalidades mas
                  </li>
                )}
              </ul>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700">
                Los pagos son procesados de forma segura por Culqi, certificado PCI-DSS
                nivel 1. No almacenamos datos de tarjetas en nuestros servidores.
              </p>
            </div>
          </div>
        )}
      </Modal>
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
      <X className="mx-auto h-4 w-4 text-gray-300" />
    )
  }
  return (
    <span className={`text-sm font-medium ${highlight ? 'text-gold' : 'text-gray-300'}`}>
      {value}
    </span>
  )
}

function FaqCard({ question, answer }: { question: string; answer: string }) {
  return (
    <Card>
      <div className="p-4">
        <h4 className="text-sm font-bold text-white">{question}</h4>
        <p className="mt-1 text-sm text-gray-500">{answer}</p>
      </div>
    </Card>
  )
}
