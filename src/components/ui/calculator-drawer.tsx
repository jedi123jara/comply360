'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Calculator,
  Banknote,
  CalendarRange,
  Gift,
  TrendingUp,
  ShieldAlert,
  Percent,
  Clock,
  Activity,
  Receipt,
  Briefcase,
  FileSpreadsheet,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from '@/components/ui/sheet'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CALCULATOR_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'

/**
 * CalculatorDrawer — UX lateral para las 13 calculadoras laborales.
 *
 * Reemplaza la necesidad de navegar a `/dashboard/calculadoras/*` páginas
 * separadas. Expuesto como provider para que el command palette, botones en
 * worker profile, y shortcuts globales lo puedan invocar.
 *
 * Uso:
 *   <CalculatorDrawerProvider>
 *     <App />
 *   </CalculatorDrawerProvider>
 *
 *   const { open } = useCalculatorDrawer()
 *   <Button onClick={() => open('cts')}>Calcular CTS</Button>
 */

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

interface CalculatorDrawerContextValue {
  isOpen: boolean
  activeKey: CalculatorKey | null
  open: (key?: CalculatorKey) => void
  close: () => void
}

const Ctx = createContext<CalculatorDrawerContextValue | null>(null)

/**
 * Catálogo visual: icono + color por calculadora. Se extiende sobre
 * `CALCULATOR_TYPES` de `constants.ts` para incluir las calculadoras
 * adicionales que existen en el legal engine pero no estaban en el menú.
 */
const CATALOG: Array<{
  key: CalculatorKey
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  accent: 'emerald' | 'amber' | 'crimson' | 'cyan' | 'gold'
  legalBase?: string
  tier?: 'básico' | 'avanzado'
}> = [
  {
    key: 'liquidacion',
    label: 'Liquidación',
    description: 'CTS + gratificación trunca + vacaciones no gozadas',
    icon: Briefcase,
    accent: 'emerald',
    legalBase: 'D.Leg. 728',
  },
  {
    key: 'cts',
    label: 'CTS',
    description: 'Compensación por Tiempo de Servicios semestral',
    icon: Banknote,
    accent: 'emerald',
    legalBase: 'D.S. 001-97-TR',
  },
  {
    key: 'gratificacion',
    label: 'Gratificación',
    description: 'Julio y diciembre + bonificación extraordinaria',
    icon: Gift,
    accent: 'emerald',
    legalBase: 'Ley 27735',
  },
  {
    key: 'indemnizacion',
    label: 'Indemnización',
    description: 'Por despido arbitrario según tipo de contrato',
    icon: ShieldAlert,
    accent: 'crimson',
    legalBase: 'D.Leg. 728',
  },
  {
    key: 'horas_extras',
    label: 'Horas extras',
    description: 'Sobretiempo con tasas 25% y 35%',
    icon: Clock,
    accent: 'amber',
    legalBase: 'D.S. 007-2002-TR',
  },
  {
    key: 'vacaciones',
    label: 'Vacaciones',
    description: 'Truncas, indemnización vacacional y récord',
    icon: CalendarRange,
    accent: 'emerald',
    legalBase: 'D.Leg. 713',
  },
  {
    key: 'multa_sunafil',
    label: 'Multa SUNAFIL',
    description: 'Estimación por infracciones según gravedad',
    icon: ShieldAlert,
    accent: 'crimson',
    legalBase: 'D.S. 019-2006-TR',
  },
  {
    key: 'intereses_legales',
    label: 'Intereses legales',
    description: 'Factores BCR para deudas laborales',
    icon: Percent,
    accent: 'amber',
    legalBase: 'BCR Perú',
  },
  {
    key: 'aportes_previsionales',
    label: 'Aportes AFP / ONP',
    description: 'Comisiones + prima de seguros',
    icon: Activity,
    accent: 'cyan',
    tier: 'avanzado',
  },
  {
    key: 'renta_quinta',
    label: 'Renta quinta',
    description: 'Retención mensual del impuesto a la renta',
    icon: Percent,
    accent: 'cyan',
    legalBase: 'SUNAT',
    tier: 'avanzado',
  },
  {
    key: 'utilidades',
    label: 'Utilidades',
    description: 'Participación del trabajador en utilidades',
    icon: TrendingUp,
    accent: 'gold',
    legalBase: 'D.Leg. 892',
    tier: 'avanzado',
  },
  {
    key: 'boleta',
    label: 'Boleta de pago',
    description: 'Generador mensual con todos los conceptos',
    icon: Receipt,
    accent: 'emerald',
  },
  {
    key: 'costo_empleador',
    label: 'Costo empleador',
    description: 'Costo real total por trabajador (año)',
    icon: FileSpreadsheet,
    accent: 'gold',
    tier: 'avanzado',
  },
]

const ACCENT_STYLES: Record<string, string> = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  crimson: 'bg-crimson-50 border-crimson-200 text-crimson-700',
  cyan: 'bg-cyan-50 border-cyan-100 text-cyan-700',
  gold: 'bg-amber-50 border-amber-200 text-gold-600',
}

export function CalculatorDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeKey, setActiveKey] = useState<CalculatorKey | null>(null)

  const open = useCallback((key?: CalculatorKey) => {
    if (key) setActiveKey(key)
    setIsOpen(true)
  }, [])
  const close = useCallback(() => {
    setIsOpen(false)
    // Keep `activeKey` so reopening lands on the last calc
  }, [])

  const value = useMemo<CalculatorDrawerContextValue>(
    () => ({ isOpen, activeKey, open, close }),
    [isOpen, activeKey, open, close]
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

/* ── Drawer UI ──────────────────────────────────────────────────────── */

function CalculatorDrawer() {
  const { isOpen, activeKey, open, close } = useCalculatorDrawer()
  const [localActive, setLocalActive] = useState<CalculatorKey | null>(null)
  const current = localActive ?? activeKey
  const active = CATALOG.find((c) => c.key === current)

  return (
    <Sheet open={isOpen} onOpenChange={(v) => (v ? open() : close())}>
      <SheetContent side="right" size="lg" className="!p-0 !flex !flex-col">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200">
              <Calculator className="h-3.5 w-3.5 text-emerald-600" />
            </span>
            <SheetTitle className="text-base font-bold tracking-tight">
              Calculadoras laborales
            </SheetTitle>
            <Badge variant="emerald" size="xs">
              13 oficiales
            </Badge>
          </div>
          <SheetDescription className="text-xs text-[color:var(--text-tertiary)] mt-1">
            Motor legal con 344 tests. Cada cálculo guarda histórico y se cita con base legal.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {active ? (
            <CalculatorRunner calc={active} onBack={() => setLocalActive(null)} />
          ) : (
            <CalculatorGrid onPick={(k) => setLocalActive(k)} />
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

function CalculatorGrid({ onPick }: { onPick: (k: CalculatorKey) => void }) {
  // Knoweldge-check: make sure every CALCULATOR_TYPES key appears in CATALOG
  // (cheap dev safety net — no visible effect at runtime)
  const catalogKeys = new Set(CATALOG.map((c) => c.key))
  const missing = CALCULATOR_TYPES.filter((t) => !catalogKeys.has(t.key as CalculatorKey))
  if (missing.length && typeof window !== 'undefined') {
    console.warn('[calc-drawer] missing catalog keys:', missing)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CATALOG.map((c) => {
          const Icon = c.icon
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onPick(c.key)}
              className={cn(
                'group text-left rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]/50',
                'p-3 transition-all duration-150',
                'hover:border-emerald-300 hover:-translate-y-0.5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-lg border',
                    ACCENT_STYLES[c.accent]
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {c.tier === 'avanzado' ? (
                  <Badge variant="gold" size="xs">
                    Avanzado
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm font-semibold leading-tight">{c.label}</p>
              <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)] line-clamp-2">
                {c.description}
              </p>
              {c.legalBase ? (
                <p className="mt-1.5 text-[10px] font-mono text-[color:var(--text-tertiary)]">
                  {c.legalBase}
                </p>
              ) : null}
            </button>
          )
        })}
      </div>

      <Card padding="md" variant="outline">
        <p className="text-xs text-[color:var(--text-secondary)]">
          ¿Quieres la versión completa con pre-fill desde trabajadores, guardado
          automático e histórico? Abrí{' '}
          <Link href="/dashboard/calculadoras" className="text-emerald-600 hover:underline">
            /dashboard/calculadoras
          </Link>
          .
        </p>
      </Card>
    </div>
  )
}

function CalculatorRunner({
  calc,
  onBack,
}: {
  calc: (typeof CATALOG)[number]
  onBack: () => void
}) {
  const Icon = calc.icon
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors"
      >
        ← Volver a todas
      </button>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center rounded-xl border',
            ACCENT_STYLES[calc.accent]
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold tracking-tight">{calc.label}</h3>
          <p className="text-xs text-[color:var(--text-tertiary)]">{calc.description}</p>
        </div>
      </div>

      <Card padding="md" variant="emerald" className="text-sm">
        <p className="text-emerald-700 font-semibold">Formulario integrado en próximo sprint.</p>
        <p className="mt-1 text-[color:var(--text-secondary)]">
          Este drawer muestra el catálogo y la identidad de la calculadora. El formulario
          inline reusa <code className="font-mono text-[11px]">src/components/calculadoras/</code>{' '}
          y se conecta en la próxima iteración con pre-fill desde el worker activo del
          Copilot context.
        </p>
        <div className="mt-3">
          <Link
            href={`/dashboard/calculadoras/${calc.key}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Abrir en página completa →
          </Link>
        </div>
      </Card>
    </div>
  )
}
