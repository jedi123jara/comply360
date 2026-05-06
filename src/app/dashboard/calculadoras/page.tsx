'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Calculator, ArrowRight, Sparkles } from 'lucide-react'
import { useCalculatorDrawer } from '@/components/ui/calculator-drawer'

/**
 * /dashboard/calculadoras
 *
 * Página índice reducida tras la reorganización (eliminación del hub IA Laboral).
 * Las calculadoras dejaron de tener una grilla dedicada y se invocan desde:
 *
 *  1. Drawer global accesible vía botón Calculator del topbar (recomendado).
 *  2. Widgets contextuales embebidos en perfil de trabajador, boletas,
 *     liquidaciones, y wizards de Decisiones Laborales (Fase 2+).
 *
 * Esta página solo existe como fallback para bookmarks/links externos.
 * Abre automáticamente el drawer al cargar y ofrece atajos rápidos.
 */
export default function CalculadorasIndexPage() {
  const calculator = useCalculatorDrawer()

  useEffect(() => {
    calculator.open()
    // Solo abrir al montar — no en cada cambio del provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl bg-emerald-50 p-3">
            <Calculator className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Calculadoras laborales</h1>
            <p className="text-sm text-[color:var(--text-tertiary)]">13 calculadoras peruanas con UIT 2026 y RMV vigente.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
            Las calculadoras ahora viven como <strong>panel lateral</strong> accesible desde
            cualquier página. Haz clic en el botón <Calculator className="inline h-3.5 w-3.5 text-emerald-600 mx-0.5" /> del
            topbar para abrirlo, o usa los widgets embebidos en el perfil del trabajador,
            boletas y liquidaciones.
          </p>
          <button
            type="button"
            onClick={() => calculator.open()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <Calculator className="h-4 w-4" />
            Abrir panel de calculadoras
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)] mb-3">
          Acceso directo a calculadoras frecuentes
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-xl border border-[color:var(--border-default)] bg-white p-4 hover:border-emerald-300 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{link.name}</p>
                <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{link.legalBase}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[color:var(--text-tertiary)] group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4 text-center">
        <Sparkles className="inline h-4 w-4 text-emerald-600 mr-1.5" />
        <span className="text-xs text-[color:var(--text-tertiary)]">
          ¿Vas a contratar a alguien? Usa el wizard <strong>Contratar trabajador</strong> del Panel — incluye costo total empleador y régimen recomendado.
        </span>
      </div>
    </div>
  )
}

const QUICK_LINKS = [
  { name: 'Liquidación total', href: '/dashboard/calculadoras/liquidacion', legalBase: 'D.Leg. 728' },
  { name: 'CTS', href: '/dashboard/calculadoras/cts', legalBase: 'D.S. 001-97-TR' },
  { name: 'Gratificaciones', href: '/dashboard/calculadoras/gratificacion', legalBase: 'Ley 27735' },
  { name: 'Vacaciones', href: '/dashboard/calculadoras/vacaciones', legalBase: 'D.Leg. 713' },
  { name: 'Indemnización', href: '/dashboard/calculadoras/indemnizacion', legalBase: 'D.Leg. 728' },
  { name: 'Horas extras', href: '/dashboard/calculadoras/horas-extras', legalBase: 'D.S. 007-2002-TR' },
  { name: 'Multa SUNAFIL', href: '/dashboard/calculadoras/multa-sunafil', legalBase: 'D.S. 019-2006-TR' },
  { name: 'Costo total empleador', href: '/dashboard/calculadoras/costo-empleador', legalBase: 'Multi-norma' },
  { name: 'Aportes (AFP/ONP)', href: '/dashboard/calculadoras/aportes', legalBase: 'D.S. 054-97-EF' },
] as const
