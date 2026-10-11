'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Bot, Calculator, Lock, Search } from 'lucide-react'
import { useCopilot } from '@/providers/copilot-provider'
import { useCalculatorDrawer } from '@/components/ui/calculator-drawer'
import { useUpgradeGate } from '@/providers/upgrade-gate-provider'
import { usePlatformModKey } from '@/hooks/use-platform-mod-key'
import { PreviewNotice, scenarioChipClass } from '../_preview/preview-notice'
import { parsePreviewScenario, type PreviewPlan } from '../_preview/mock-api'

/**
 * /dev/shell — shell REAL del dashboard (sidebar, topbar, paleta de comandos,
 * copiloto, cajón de calculadoras y modal de mejora de plan) montado por
 * `../_preview/dashboard-preview.tsx` con datos de ejemplo.
 *
 * Esta página solo pone contenido de relleno en el área principal para
 * poder probar las piezas interactivas del shell.
 */

const PLAN_SCENARIOS: ReadonlyArray<{ plan: PreviewPlan; label: string; hint: string }> = [
  { plan: 'PRO', label: 'Plan PRO', hint: 'Todo desbloqueado' },
  { plan: 'EMPRESA', label: 'Plan Empresa', hint: 'Algunos módulos premium bloqueados' },
  { plan: 'STARTER', label: 'Plan Starter', hint: 'Más módulos bloqueados' },
  { plan: 'FREE', label: 'Plan gratuito', hint: 'Muestra los candados del menú' },
]

function scenarioHref(plan: PreviewPlan, trial: boolean): string {
  const params = new URLSearchParams()
  if (plan !== 'PRO') params.set('plan', plan)
  if (trial) params.set('trial', '1')
  const query = params.toString()
  return query ? `/dev/shell?${query}` : '/dev/shell'
}

/** Dispara el mismo atajo que escucha el componente real (Ctrl/⌘ + tecla). */
function pressShortcut(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true }))
}

export default function DevShellPage() {
  const searchParams = useSearchParams()
  const scenario = parsePreviewScenario(searchParams?.toString() ?? '')
  const copilot = useCopilot()
  const calculator = useCalculatorDrawer()
  const { openUpgrade } = useUpgradeGate()
  const modKey = usePlatformModKey()

  return (
    <div className="space-y-5">
      <PreviewNotice
        title="Shell del dashboard"
        actions={
          <>
            {PLAN_SCENARIOS.map((item) => (
              // <a> y no <Link>: recarga completa para que sidebar y topbar
              // vuelvan a pedir el plan simulado.
              <a
                key={item.plan}
                href={scenarioHref(item.plan, scenario.trial)}
                title={item.hint}
                aria-current={item.plan === scenario.plan ? 'page' : undefined}
                className={scenarioChipClass(item.plan === scenario.plan)}
              >
                {item.label}
              </a>
            ))}
            <a
              href={scenarioHref(scenario.plan, !scenario.trial)}
              aria-current={scenario.trial ? 'page' : undefined}
              className={scenarioChipClass(scenario.trial)}
            >
              {scenario.trial ? 'Prueba gratuita: activa' : 'Prueba gratuita: inactiva'}
            </a>
          </>
        }
      >
        Estás viendo el menú lateral, la barra superior, la paleta de comandos y el asistente reales del
        dashboard, con el tema claro. El plan, los contadores, las alertas y el puntaje son de ejemplo: no
        hay sesión ni base de datos.
      </PreviewNotice>

      <section className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 shadow-[var(--elevation-1)] sm:p-6">
        <h2 className="text-base font-bold text-[color:var(--text-primary)]">Prueba las piezas interactivas</h2>
        <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
          Cada botón abre el componente real del shell.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            icon={<Search className="h-4 w-4" />}
            label="Paleta de comandos"
            hint={`${modKey} + K · escribe «ana» o «contrato»`}
            onClick={() => pressShortcut('k')}
          />
          <ActionTile
            icon={<Bot className="h-4 w-4" />}
            label={copilot.isOpen ? 'Cerrar asistente' : 'Abrir asistente'}
            hint={`${modKey} + I · responde con un texto de ejemplo`}
            onClick={copilot.toggle}
          />
          <ActionTile
            icon={<Calculator className="h-4 w-4" />}
            label="Cajón de calculadoras"
            hint="El mismo acceso rápido de la barra superior"
            onClick={() => calculator.open()}
          />
          <ActionTile
            icon={<Lock className="h-4 w-4" />}
            label="Aviso de mejora de plan"
            hint="Lo que ve quien entra a un módulo bloqueado"
            onClick={() =>
              openUpgrade({
                requiredPlan: 'EMPRESA',
                currentPlan: scenario.plan,
                featureName: 'Simulacro SUNAFIL',
              })
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 shadow-[var(--elevation-1)] sm:p-6">
        <h2 className="text-base font-bold text-[color:var(--text-primary)]">Qué revisar</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[color:var(--text-secondary)]">
          <CheckItem>
            Menú lateral: hubs con íconos, contadores de ejemplo (7 alertas pendientes y 4 contratos por vencer)
            y candados según el plan elegido arriba.
          </CheckItem>
          <CheckItem>
            Barra superior: migas de pan, puntaje 78 (+4), campana con 2 alertas sin leer y avatar. Sin sesión,
            el avatar muestra las iniciales «C3».
          </CheckItem>
          <CheckItem>
            Con «Prueba gratuita: activa» aparece el banner de prueba con 5 días restantes.
          </CheckItem>
          <CheckItem>
            En pantallas pequeñas el menú lateral se vuelve un panel deslizable; ábrelo con el botón de menú.
          </CheckItem>
          <CheckItem>
            Los enlaces del menú llevan a las rutas reales de <code className="font-mono text-xs">/dashboard</code>,
            que sí necesitan sesión y base de datos. Para el panel principal usa{' '}
            <a href="/dev/cockpit" className="font-semibold text-blue-700 underline-offset-2 hover:underline">
              /dev/cockpit
            </a>
            .
          </CheckItem>
        </ul>
      </section>

      <section aria-hidden="true" className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-32 rounded-2xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-inset)]"
          />
        ))}
      </section>
    </div>
  )
}

function ActionTile({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: ReactNode
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[var(--elevation-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[color:var(--text-primary)]">{label}</span>
        <span className="mt-0.5 block text-xs text-[color:var(--text-tertiary)]">{hint}</span>
      </span>
    </button>
  )
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
      <span>{children}</span>
    </li>
  )
}
