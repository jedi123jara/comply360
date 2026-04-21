'use client'

import Link from 'next/link'
import {
  Calculator,
  Landmark,
  Gift,
  Scale,
  Clock,
  Palmtree,
  AlertTriangle,
  Percent,
  ArrowRight,
  Sparkles,
  DollarSign,
} from 'lucide-react'

const CALCULADORAS = [
  {
    id: 'liquidacion',
    name: 'Liquidación Total',
    description: 'Calcula todos los beneficios sociales: CTS, vacaciones, gratificaciones, indemnización y más.',
    icon: Calculator,
    color: 'from-blue-600 to-blue-800',
    badge: 'Más usado',
    badgeColor: 'bg-amber-500/15 text-amber-400',
    href: '/dashboard/calculadoras/liquidacion',
    available: true,
  },
  {
    id: 'cts',
    name: 'CTS',
    description: 'Compensación por Tiempo de Servicios. Incluye cálculo de intereses.',
    icon: Landmark,
    color: 'from-emerald-600 to-emerald-800',
    href: '/dashboard/calculadoras/cts',
    available: true,
  },
  {
    id: 'gratificacion',
    name: 'Gratificaciones',
    description: 'Julio y diciembre, truncas incluidas. Con bonificación extraordinaria del 9%.',
    icon: Gift,
    color: 'from-purple-600 to-purple-800',
    href: '/dashboard/calculadoras/gratificacion',
    available: true,
  },
  {
    id: 'indemnizacion',
    name: 'Indemnización',
    description: 'Por despido arbitrario. Indefinido y plazo fijo con topes legales.',
    icon: Scale,
    color: 'from-red-600 to-red-800',
    href: '/dashboard/calculadoras/indemnizacion',
    available: true,
  },
  {
    id: 'horas-extras',
    name: 'Horas Extras',
    description: 'Sobretasas del 25%, 35% y 100%. Cálculo por período acumulado.',
    icon: Clock,
    color: 'from-orange-600 to-orange-800',
    href: '/dashboard/calculadoras/horas-extras',
    available: true,
  },
  {
    id: 'vacaciones',
    name: 'Vacaciones',
    description: 'Truncas, no gozadas e indemnización vacacional. Triple pago incluido.',
    icon: Palmtree,
    color: 'from-cyan-600 to-cyan-800',
    href: '/dashboard/calculadoras/vacaciones',
    available: true,
  },
  {
    id: 'multa-sunafil',
    name: 'Multas SUNAFIL',
    description: 'Estima el riesgo de multa según tipo de infracción y número de trabajadores.',
    icon: AlertTriangle,
    color: 'from-yellow-600 to-yellow-800',
    badge: 'Empresas',
    badgeColor: 'bg-blue-500/15 text-emerald-600',
    href: '/dashboard/calculadoras/multa-sunafil',
    available: true,
  },
  {
    id: 'intereses',
    name: 'Intereses Legales',
    description: 'Calcula intereses laborales con tasa del BCRP actualizada.',
    icon: Percent,
    color: 'from-slate-600 to-slate-800',
    href: '/dashboard/calculadoras/intereses-legales',
    available: true,
  },
  {
    id: 'costo-empleador',
    name: 'Costo Total Empleador',
    description: 'Calcula el costo REAL de un trabajador: sueldo + EsSalud + CTS + gratificaciones + vacaciones + SCTR.',
    icon: DollarSign,
    color: 'from-gold/80 to-amber-800',
    badge: 'Nuevo',
    badgeColor: 'bg-amber-500/15 text-amber-400',
    href: '/dashboard/calculadoras/costo-empleador',
    available: true,
  },
]

export default function CalculadorasPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Calculadoras Legales</h1>
        <p className="text-gray-400 mt-1">
          Herramientas de cálculo basadas en la normativa laboral peruana vigente.
          Todas las fórmulas se actualizan automáticamente con cambios normativos.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {CALCULADORAS.map(calc => {
          const Icon = calc.icon
          const isAvailable = calc.available

          return (
            <div key={calc.id} className="relative group">
              {isAvailable ? (
                <Link
                  href={calc.href}
                  className="block bg-surface/75 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 h-full"
                >
                  <CalcCardContent calc={calc} Icon={Icon} />
                  <div className="flex items-center gap-1.5 mt-4 text-sm font-semibold text-primary">
                    <span>Calcular ahora</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ) : (
                <div className="block bg-surface/75 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 opacity-60 h-full">
                  <CalcCardContent calc={calc} Icon={Icon} />
                  <div className="flex items-center gap-1.5 mt-4 text-sm font-medium text-slate-500">
                    <Sparkles className="w-4 h-4" />
                    <span>Próximamente</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CalcCardContent({
  calc,
  Icon,
}: {
  calc: (typeof CALCULADORAS)[number]
  Icon: (typeof CALCULADORAS)[number]['icon']
}) {
  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${calc.color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {calc.badge && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${calc.badgeColor}`}>
            {calc.badge}
          </span>
        )}
      </div>
      <h3 className="text-base font-bold text-white mb-1">{calc.name}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{calc.description}</p>
    </>
  )
}
