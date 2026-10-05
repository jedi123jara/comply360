'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Calculator, CalendarClock, ExternalLink, Sparkles } from 'lucide-react'
import { useCalculatorDrawer } from '@/components/ui/calculator-drawer'
import {
  CALCULADORAS,
  GRUPOS,
  ORDEN_GRUPOS,
  type CalculadoraInfo,
} from '@/components/calculadoras/shared/catalogo'
import {
  etiquetaCorteCTS,
  etiquetaGratificacion,
  proximaGratificacion,
  proximoCorteCTS,
} from '@/components/calculadoras/shared/fechas'

/**
 * /dashboard/calculadoras
 *
 * Lista de calculadoras agrupadas por momento de uso. Al elegir una se abre
 * el cajón lateral con el formulario (no se abre solo al cargar la página).
 * Cada tarjeta también enlaza a la página completa, con historial.
 */
export default function CalculadorasIndexPage() {
  const calculator = useCalculatorDrawer()
  // Próximas fechas de pago, calculadas una vez con la fecha de hoy (Lima).
  const [proximos] = useState(() => ({
    cts: etiquetaCorteCTS(proximoCorteCTS()),
    grati: etiquetaGratificacion(proximaGratificacion()),
  }))

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3">
          <Calculator className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Calculadoras laborales</h1>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Calcula beneficios, liquidaciones y multas con las reglas de la ley peruana. Cada resultado te
            explica de dónde sale el monto y qué dice la ley, en simple.
          </p>
        </div>
      </div>

      {/* Lo que viene */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => calculator.open('cts')}
          className="group flex items-center gap-3 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-[color:var(--bg-surface-hover)]"
        >
          <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
            <CalendarClock className="h-5 w-5 text-amber-600" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Próximo depósito de CTS
            </span>
            <span className="block text-sm font-bold text-[color:var(--text-primary)]">Hasta el {proximos.cts}</span>
          </span>
          <span className="text-xs font-semibold text-primary group-hover:underline">Calcular</span>
        </button>
        <button
          type="button"
          onClick={() => calculator.open('gratificacion')}
          className="group flex items-center gap-3 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-[color:var(--bg-surface-hover)]"
        >
          <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
            <CalendarClock className="h-5 w-5 text-amber-600" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Próxima gratificación
            </span>
            <span className="block text-sm font-bold text-[color:var(--text-primary)]">{proximos.grati}</span>
          </span>
          <span className="text-xs font-semibold text-primary group-hover:underline">Calcular</span>
        </button>
      </div>

      {/* Calculadoras por grupo */}
      {ORDEN_GRUPOS.map(grupo => {
        const items = CALCULADORAS.filter(c => c.grupo === grupo)
        return (
          <section key={grupo} aria-labelledby={`grupo-${grupo}`} className="space-y-3">
            <div>
              <h2 id={`grupo-${grupo}`} className="text-base font-bold text-[color:var(--text-primary)]">
                {GRUPOS[grupo].titulo}
              </h2>
              <p className="text-sm text-[color:var(--text-tertiary)]">{GRUPOS[grupo].descripcion}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(c => (
                <TarjetaCalculadora key={c.key} calc={c} onAbrir={() => calculator.open(c.key)} />
              ))}
            </div>
          </section>
        )
      })}

      <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-inset)] p-4 text-center">
        <Sparkles className="inline h-4 w-4 text-primary mr-1.5" aria-hidden />
        <span className="text-sm text-[color:var(--text-secondary)]">
          ¿Vas a contratar a alguien? Usa el asistente <strong>Contratar trabajador</strong> del Panel: incluye el
          costo total para la empresa y el régimen recomendado.
        </span>
      </div>
    </div>
  )
}

function TarjetaCalculadora({ calc, onAbrir }: { calc: CalculadoraInfo; onAbrir: () => void }) {
  const Icon = calc.icon
  return (
    <article className="flex flex-col rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[color:var(--text-primary)]">{calc.label}</h3>
          <p className="mt-0.5 text-sm leading-snug text-[color:var(--text-secondary)]">{calc.paraQueSirve}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-[color:var(--text-tertiary)]">
        <span className="font-semibold">Cuándo:</span> {calc.cuando}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
        {calc.enCajon ? (
          <>
            <button
              type="button"
              onClick={onAbrir}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Calcular
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <Link
              href={calc.href}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-surface-hover)] hover:text-[color:var(--text-primary)] transition-colors"
            >
              Página completa
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </>
        ) : (
          <Link
            href={calc.href}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] px-3.5 py-2 text-sm font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--bg-surface-hover)] transition-colors"
          >
            {calc.irA ?? 'Abrir'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  )
}
