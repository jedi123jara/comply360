/**
 * Catálogo único de calculadoras laborales: lo usan la página
 * /dashboard/calculadoras y el cajón lateral (calculator-drawer).
 *
 * `paraQueSirve` es UNA línea en lenguaje simple, pensada para alguien sin
 * formación legal. `enCajon` indica si el formulario se puede usar dentro del
 * cajón; las que no, llevan a su módulo (`href`).
 */

import type { ComponentType } from 'react'
import {
  Activity,
  Banknote,
  Briefcase,
  CalendarRange,
  Clock,
  FileSpreadsheet,
  Gift,
  Percent,
  Receipt,
  ShieldAlert,
  TrendingUp,
  Gavel,
} from 'lucide-react'

export type CalculatorKey =
  | 'liquidacion'
  | 'cts'
  | 'gratificacion'
  | 'indemnizacion'
  | 'horas_extras'
  | 'vacaciones'
  | 'multa_sunafil'
  | 'intereses_legales'
  | 'aportes_previsionales'
  | 'renta_quinta'
  | 'utilidades'
  | 'boleta'
  | 'costo_empleador'

export type GrupoCalculadora = 'beneficios' | 'cese' | 'planilla' | 'riesgos'

export interface CalculadoraInfo {
  key: CalculatorKey
  label: string
  /** Para qué sirve, en una línea y sin jerga. */
  paraQueSirve: string
  /** Cuándo usarla (ayuda a elegir). */
  cuando: string
  icon: ComponentType<{ className?: string }>
  grupo: GrupoCalculadora
  /** Página completa (con historial). */
  href: string
  /** true si el formulario funciona dentro del cajón lateral. */
  enCajon: boolean
  /** Texto del botón cuando la calculadora vive en otro módulo. */
  irA?: string
  /** Norma principal, solo como referencia. */
  norma?: string
}

export const GRUPOS: Record<GrupoCalculadora, { titulo: string; descripcion: string }> = {
  beneficios: {
    titulo: 'Beneficios que pagas durante el año',
    descripcion: 'Depósitos y pagos periódicos que la ley exige a todo empleador.',
  },
  cese: {
    titulo: 'Cuando un trabajador se va',
    descripcion: 'Lo que debes pagar al terminar la relación laboral.',
  },
  planilla: {
    titulo: 'Planilla y costos',
    descripcion: 'Descuentos, aportes y cuánto te cuesta realmente un trabajador.',
  },
  riesgos: {
    titulo: 'Riesgos y deudas',
    descripcion: 'Multas posibles e intereses por pagos atrasados.',
  },
}

export const CALCULADORAS: CalculadoraInfo[] = [
  {
    key: 'cts',
    label: 'CTS',
    paraQueSirve: 'Cuánto depositar de CTS en mayo o noviembre a cada trabajador.',
    cuando: 'Antes del 15 de mayo y del 15 de noviembre.',
    icon: Banknote,
    grupo: 'beneficios',
    href: '/dashboard/calculadoras/cts',
    enCajon: true,
    norma: 'D.S. 001-97-TR',
  },
  {
    key: 'gratificacion',
    label: 'Gratificación',
    paraQueSirve: 'Cuánto pagar de gratificación en julio y diciembre, con su bonificación del 9%.',
    cuando: 'Antes del 15 de julio y del 15 de diciembre.',
    icon: Gift,
    grupo: 'beneficios',
    href: '/dashboard/calculadoras/gratificacion',
    enCajon: true,
    norma: 'Ley 27735',
  },
  {
    key: 'vacaciones',
    label: 'Vacaciones',
    paraQueSirve: 'Cuánto corresponde por vacaciones pendientes, truncas o no tomadas a tiempo.',
    cuando: 'Al liquidar a un trabajador o si acumula vacaciones sin tomar.',
    icon: CalendarRange,
    grupo: 'beneficios',
    href: '/dashboard/calculadoras/vacaciones',
    enCajon: true,
    norma: 'D.Leg. 713',
  },
  {
    key: 'horas_extras',
    label: 'Horas extras',
    paraQueSirve: 'Cuánto pagar por las horas trabajadas encima de la jornada de 48 horas.',
    cuando: 'Cada mes que haya sobretiempo.',
    icon: Clock,
    grupo: 'beneficios',
    href: '/dashboard/calculadoras/horas-extras',
    enCajon: true,
    norma: 'D.S. 007-2002-TR',
  },
  {
    key: 'utilidades',
    label: 'Utilidades',
    paraQueSirve: 'Cómo repartir las utilidades de la empresa entre tus trabajadores.',
    cuando: 'Tras la declaración anual de renta, si tienes más de 20 trabajadores.',
    icon: TrendingUp,
    grupo: 'beneficios',
    href: '/dashboard/calculadoras/utilidades',
    enCajon: true,
    norma: 'D.Leg. 892',
  },
  {
    key: 'liquidacion',
    label: 'Liquidación',
    paraQueSirve: 'Todo lo que debes pagar cuando un trabajador deja la empresa.',
    cuando: 'Dentro de las 48 horas siguientes al cese.',
    icon: Briefcase,
    grupo: 'cese',
    href: '/dashboard/calculadoras/liquidacion',
    enCajon: true,
    norma: 'D.S. 003-97-TR',
  },
  {
    key: 'indemnizacion',
    label: 'Indemnización por despido',
    paraQueSirve: 'Cuánto costaría despedir a alguien sin una causa justa probada.',
    cuando: 'Antes de decidir un despido.',
    icon: ShieldAlert,
    grupo: 'cese',
    href: '/dashboard/calculadoras/indemnizacion',
    enCajon: true,
    norma: 'D.S. 003-97-TR',
  },
  {
    key: 'aportes_previsionales',
    label: 'Aportes AFP / ONP',
    paraQueSirve: 'Cuánto se descuenta al trabajador para su pensión y cuánto aportas tú a EsSalud.',
    cuando: 'Al armar la planilla de cada mes.',
    icon: Activity,
    grupo: 'planilla',
    href: '/dashboard/calculadoras/aportes',
    enCajon: true,
    norma: 'D.S. 054-97-EF',
  },
  {
    key: 'costo_empleador',
    label: 'Costo total del trabajador',
    paraQueSirve: 'Cuánto te cuesta de verdad un trabajador al mes, con todos sus beneficios.',
    cuando: 'Antes de contratar o de subir un sueldo.',
    icon: FileSpreadsheet,
    grupo: 'planilla',
    href: '/dashboard/calculadoras/costo-empleador',
    enCajon: true,
  },
  {
    key: 'boleta',
    label: 'Boleta de pago',
    paraQueSirve: 'Arma la boleta mensual con ingresos, descuentos y aportes.',
    cuando: 'Cada mes, al pagar la planilla.',
    icon: Receipt,
    grupo: 'planilla',
    href: '/dashboard/boletas',
    enCajon: false,
    irA: 'Ir a Boletas de pago',
  },
  {
    key: 'renta_quinta',
    label: 'Renta de quinta categoría',
    paraQueSirve: 'El impuesto a la renta que retienes cada mes; se calcula al generar la boleta.',
    cuando: 'Cada mes, dentro de la boleta de pago.',
    icon: Percent,
    grupo: 'planilla',
    href: '/dashboard/boletas',
    enCajon: false,
    irA: 'Ir a Boletas de pago',
  },
  {
    key: 'multa_sunafil',
    label: 'Multa SUNAFIL',
    paraQueSirve: 'Cuánto podría multarte SUNAFIL por una falta y cuánto ahorras si la corriges.',
    cuando: 'Antes de una inspección o al detectar un incumplimiento.',
    icon: Gavel,
    grupo: 'riesgos',
    href: '/dashboard/calculadoras/multa-sunafil',
    enCajon: true,
    norma: 'D.S. 019-2006-TR',
  },
  {
    key: 'intereses_legales',
    label: 'Intereses por deudas laborales',
    paraQueSirve: 'Cuánto suma una deuda laboral atrasada con sus intereses legales.',
    cuando: 'Si pagas tarde un beneficio o tienes una demanda.',
    icon: Percent,
    grupo: 'riesgos',
    href: '/dashboard/calculadoras/intereses-legales',
    enCajon: true,
    norma: 'Ley 25920',
  },
]

export const CALCULADORAS_POR_KEY: Record<CalculatorKey, CalculadoraInfo> = Object.fromEntries(
  CALCULADORAS.map((c) => [c.key, c]),
) as Record<CalculatorKey, CalculadoraInfo>

export const ORDEN_GRUPOS: GrupoCalculadora[] = ['beneficios', 'cese', 'planilla', 'riesgos']
