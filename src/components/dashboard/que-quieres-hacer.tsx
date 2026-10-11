'use client'

import Link from 'next/link'
import {
  ChevronDown,
  ClipboardCheck,
  Compass,
  RefreshCcw,
  ShieldAlert,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'

/**
 * Asistentes guiados ("¿Qué quieres hacer?").
 *
 * Fuente única de los 5 asistentes de /dashboard/decisiones/*. La usan:
 *   - El botón "¿Qué quieres hacer?" del menú lateral (este archivo).
 *   - El primer grupo del buscador (command palette).
 *   - Las tarjetas de `decisiones-laborales.tsx`.
 *
 * Los títulos están escritos como los diría el usuario (gerente, RRHH o
 * contador), no como nombres de módulo. Si agregas un asistente nuevo, crea
 * primero su página en src/app/dashboard/decisiones/<key>/page.tsx.
 */

export type AsistenteAccent = 'emerald' | 'teal' | 'amber' | 'purple' | 'crimson'

export interface AsistenteGuiado {
  key: 'contratar' | 'renovar' | 'cesar' | 'auditar' | 'sunafil'
  /** Nombre en lenguaje del usuario. */
  title: string
  /** Qué hace el asistente por ti, en una frase. */
  description: string
  icon: LucideIcon
  href: string
  accent: AsistenteAccent
  /** Palabras con las que la gente suele buscar esta tarea (el buscador ignora tildes). */
  keywords: readonly string[]
}

export const ASISTENTES_GUIADOS: readonly AsistenteGuiado[] = [
  {
    key: 'contratar',
    title: 'Contratar a alguien',
    description:
      'Calcula cuánto te costará, te sugiere el régimen y el contrato, y lo agrega a tus trabajadores.',
    icon: UserPlus,
    href: '/dashboard/decisiones/contratar',
    accent: 'emerald',
    keywords: ['nuevo trabajador', 'alta', 'ingreso', 'contratación', 'costo empleador', 'régimen'],
  },
  {
    key: 'renovar',
    title: 'Renovar un contrato',
    description:
      'Elige un contrato por vencer y te dice si conviene renovarlo, volverlo indefinido o no renovarlo.',
    icon: RefreshCcw,
    href: '/dashboard/decisiones/renovar',
    accent: 'teal',
    keywords: ['vencimiento', 'vence', 'plazo fijo', 'indefinido', 'prórroga', 'renovación'],
  },
  {
    key: 'cesar',
    title: 'Cesar a un trabajador',
    description:
      'Estima la liquidación, te advierte del riesgo legal según el motivo y te dice qué pasos seguir.',
    icon: UserMinus,
    href: '/dashboard/decisiones/cesar',
    accent: 'amber',
    keywords: ['despedir', 'despido', 'renuncia', 'liquidación', 'cese', 'baja', 'desvincular'],
  },
  {
    key: 'auditar',
    title: 'Revisar mi planilla',
    description:
      'Revisa las boletas de un mes y detecta errores en aportes, descuentos o sueldo mínimo.',
    icon: ClipboardCheck,
    href: '/dashboard/decisiones/auditar',
    accent: 'purple',
    keywords: ['boletas', 'nómina', 'auditar', 'auditoría', 'aportes', 'descuentos', 'sueldo mínimo'],
  },
  {
    key: 'sunafil',
    title: 'Prepararme para SUNAFIL',
    description:
      'Te muestra qué tan listo estás para una inspección y qué corregir primero para evitar multas.',
    icon: ShieldAlert,
    href: '/dashboard/decisiones/sunafil',
    accent: 'crimson',
    keywords: ['inspección', 'inspector', 'multa', 'fiscalización', 'visita'],
  },
]

/** Colores del ícono de cada asistente (pensados para fondo claro). */
export const ASISTENTE_ACCENT_CLASSES: Record<AsistenteAccent, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  teal: 'bg-teal-50 text-teal-700 border border-teal-200',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  crimson: 'bg-red-50 text-red-700 border border-red-200',
}

/* ── Botón + menú del sidebar ─────────────────────────────────────────── */

interface QueQuieresHacerMenuProps {
  /** Se llama al elegir un asistente (en móvil cierra el menú lateral). */
  onNavigate?: () => void
  className?: string
}

export function QueQuieresHacerMenu({ onNavigate, className }: QueQuieresHacerMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white',
            'bg-emerald-600 shadow-[0_8px_20px_rgba(21,94,239,0.35)] ring-1 ring-inset ring-white/15',
            'transition-[background-color,transform] duration-150 hover:bg-emerald-500 hover:-translate-y-px',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
            'data-[state=open]:bg-emerald-500',
            className
          )}
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15"
          >
            <Compass className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-tight">¿Qué quieres hacer?</span>
            <span className="mt-0.5 block text-[11px] leading-tight text-white/75">
              Te guiamos paso a paso
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-white/80 transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className="w-[min(22rem,calc(100vw-1.5rem))] p-1.5"
        // El shell cierra el menú lateral móvil con Escape (listener en window).
        // Cortamos la propagación para que Escape solo cierre este menú.
        onEscapeKeyDown={(event) => event.stopPropagation()}
      >
        <DropdownMenuLabel>Elige una tarea y te guiamos</DropdownMenuLabel>
        {ASISTENTES_GUIADOS.map((asistente) => (
          <AsistenteMenuItem key={asistente.key} asistente={asistente} onNavigate={onNavigate} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AsistenteMenuItem({
  asistente,
  onNavigate,
}: {
  asistente: AsistenteGuiado
  onNavigate?: () => void
}) {
  const Icon = asistente.icon
  return (
    <DropdownMenuItem asChild className="cursor-pointer items-start gap-3 px-2.5 py-2">
      <Link href={asistente.href} onClick={onNavigate}>
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            ASISTENTE_ACCENT_CLASSES[asistente.accent]
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[color:var(--text-primary)]">
            {asistente.title}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-[color:var(--text-tertiary)]">
            {asistente.description}
          </span>
        </span>
      </Link>
    </DropdownMenuItem>
  )
}
