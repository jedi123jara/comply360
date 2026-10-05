'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Calculator, ExternalLink, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  CALCULADORAS,
  CALCULADORAS_POR_KEY,
  GRUPOS,
  ORDEN_GRUPOS,
  type CalculadoraInfo,
  type CalculatorKey,
} from '@/components/calculadoras/shared/catalogo'

/**
 * CalculatorDrawer — cajón lateral con las calculadoras laborales.
 *
 * Se abre desde el topbar, la página /dashboard/calculadoras, el command
 * palette o cualquier botón contextual:
 *
 *   <CalculatorDrawerProvider>
 *     <App />
 *   </CalculatorDrawerProvider>
 *
 *   const { open } = useCalculatorDrawer()
 *   <Button onClick={() => open('cts')}>Calcular CTS</Button>
 *
 * Sin `key`, reabre la última calculadora usada (o la lista si no hubo ninguna).
 */

export type { CalculatorKey } from '@/components/calculadoras/shared/catalogo'

interface CalculatorDrawerContextValue {
  isOpen: boolean
  activeKey: CalculatorKey | null
  open: (key?: CalculatorKey) => void
  close: () => void
  /** Cambia la calculadora activa dentro del cajón (null = volver a la lista). */
  select: (key: CalculatorKey | null) => void
}

const Ctx = createContext<CalculatorDrawerContextValue | null>(null)

export function CalculatorDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeKey, setActiveKey] = useState<CalculatorKey | null>(null)

  const open = useCallback((key?: CalculatorKey) => {
    if (key) setActiveKey(key)
    setIsOpen(true)
  }, [])
  const close = useCallback(() => {
    setIsOpen(false)
    // Se conserva `activeKey` para que al reabrir vuelva a la última calculadora.
  }, [])
  const select = useCallback((key: CalculatorKey | null) => setActiveKey(key), [])

  const value = useMemo<CalculatorDrawerContextValue>(
    () => ({ isOpen, activeKey, open, close, select }),
    [isOpen, activeKey, open, close, select]
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      <CalculatorDrawer />
    </Ctx.Provider>
  )
}

export function useCalculatorDrawer(): CalculatorDrawerContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCalculatorDrawer must be used inside <CalculatorDrawerProvider>')
  return ctx
}

/* ── Formularios (carga diferida: solo se descarga el que se abre) ───── */

function CargandoFormulario() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-[color:var(--text-tertiary)]">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      Cargando calculadora…
    </div>
  )
}

// next/dynamic exige las opciones como objeto literal en cada llamada.

const FORMULARIOS: Partial<Record<CalculatorKey, ComponentType>> = {
  cts: dynamic(() => import('@/components/calculadoras/cts-form').then(m => m.CTSCalculadora), { loading: CargandoFormulario }),
  gratificacion: dynamic(() => import('@/components/calculadoras/gratificacion-form').then(m => m.GratificacionCalculadora), { loading: CargandoFormulario }),
  vacaciones: dynamic(() => import('@/components/calculadoras/vacaciones-form').then(m => m.VacacionesCalculadora), { loading: CargandoFormulario }),
  horas_extras: dynamic(() => import('@/components/calculadoras/horas-extras-form').then(m => m.HorasExtrasCalculadora), { loading: CargandoFormulario }),
  utilidades: dynamic(() => import('@/components/calculadoras/utilidades-form').then(m => m.UtilidadesCalculadora), { loading: CargandoFormulario }),
  liquidacion: dynamic(() => import('@/components/calculadoras/liquidacion-form').then(m => m.LiquidacionCalculadora), { loading: CargandoFormulario }),
  indemnizacion: dynamic(() => import('@/components/calculadoras/indemnizacion-form').then(m => m.IndemnizacionCalculadora), { loading: CargandoFormulario }),
  aportes_previsionales: dynamic(() => import('@/components/calculadoras/aportes-form').then(m => m.AportesCalculadora), { loading: CargandoFormulario }),
  costo_empleador: dynamic(() => import('@/components/calculadoras/costo-empleador-form').then(m => m.CostoEmpleadorCalculadora), { loading: CargandoFormulario }),
  multa_sunafil: dynamic(() => import('@/components/calculadoras/multa-sunafil-form').then(m => m.MultaSunafilCalculadora), { loading: CargandoFormulario }),
  intereses_legales: dynamic(() => import('@/components/calculadoras/intereses-legales-form').then(m => m.InteresesLegalesCalculadora), { loading: CargandoFormulario }),
}

/* ── Drawer UI ──────────────────────────────────────────────────────── */

function CalculatorDrawer() {
  const { isOpen, activeKey, open, close, select } = useCalculatorDrawer()
  const active = activeKey ? CALCULADORAS_POR_KEY[activeKey] : null

  return (
    <Sheet open={isOpen} onOpenChange={(v) => (v ? open() : close())}>
      <SheetContent side="right" size={active ? 'xl' : 'lg'} className="!p-0 !flex !flex-col">
        <SheetHeader>
          <div className="flex items-center gap-2 pr-8">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Calculator className="h-3.5 w-3.5 text-primary" aria-hidden />
            </span>
            <SheetTitle className="text-base font-bold tracking-tight text-[color:var(--text-primary)]">
              {active ? active.label : 'Calculadoras laborales'}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-[color:var(--text-tertiary)] mt-1">
            {active
              ? active.paraQueSirve
              : 'Elige qué quieres calcular. Cada resultado te explica de dónde sale el monto y qué dice la ley.'}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {active ? (
            <CalculatorRunner calc={active} onBack={() => select(null)} onClose={close} />
          ) : (
            <CalculatorGrid onPick={(k) => select(k)} onClose={close} />
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

function CalculatorGrid({ onPick, onClose }: { onPick: (k: CalculatorKey) => void; onClose: () => void }) {
  return (
    <div className="space-y-6">
      {ORDEN_GRUPOS.map((grupo) => {
        const items = CALCULADORAS.filter((c) => c.grupo === grupo)
        return (
          <section key={grupo} aria-labelledby={`calc-grupo-${grupo}`}>
            <h3
              id={`calc-grupo-${grupo}`}
              className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]"
            >
              {GRUPOS[grupo].titulo}
            </h3>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {items.map((c) => (
                <CalculatorCard key={c.key} calc={c} onPick={onPick} onClose={onClose} />
              ))}
            </div>
          </section>
        )
      })}

      <Link
        href="/dashboard/calculadoras"
        onClick={onClose}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-[color:var(--border-default)] px-4 py-3 text-sm font-semibold text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-surface-hover)] transition-colors"
      >
        Ver todas en página completa
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  )
}

function CalculatorCard({
  calc,
  onPick,
  onClose,
}: {
  calc: CalculadoraInfo
  onPick: (k: CalculatorKey) => void
  onClose: () => void
}) {
  const Icon = calc.icon
  const className = cn(
    'group flex items-start gap-3 text-left rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)]',
    'p-3 transition-colors hover:border-primary/40 hover:bg-[color:var(--bg-surface-hover)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
  )
  const content = (
    <>
      <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-sm font-semibold text-[color:var(--text-primary)]">
          {calc.label}
          {!calc.enCajon ? <ExternalLink className="h-3 w-3 text-[color:var(--text-tertiary)]" aria-label="Se abre en su módulo" /> : null}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-[color:var(--text-tertiary)]">
          {calc.paraQueSirve}
        </span>
      </span>
    </>
  )

  // Las que no tienen formulario propio llevan a su módulo (ej. Boletas).
  if (!calc.enCajon) {
    return (
      <Link href={calc.href} onClick={onClose} className={className}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={() => onPick(calc.key)} className={className}>
      {content}
    </button>
  )
}

function CalculatorRunner({
  calc,
  onBack,
  onClose,
}: {
  calc: CalculadoraInfo
  onBack: () => void
  onClose: () => void
}) {
  const Formulario = FORMULARIOS[calc.key]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver a todas
        </button>
        <Link
          href={calc.href}
          onClick={onClose}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Abrir en página completa (con historial)
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {Formulario ? (
        <Formulario />
      ) : (
        <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] p-5 text-sm text-[color:var(--text-secondary)]">
          Esta calculadora está dentro de su módulo.{' '}
          <Link href={calc.href} onClick={onClose} className="font-semibold text-primary hover:underline">
            Ir al módulo
          </Link>
        </div>
      )}
    </div>
  )
}
