'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  FileText,
  FileSearch,
  FileStack,
  Files,
  FolderOpen,
  Sparkles,
  Settings,
  Bot,
  Calculator,
  Workflow,
  GraduationCap,
  BarChart3,
  CreditCard,
  Plug,
  Store,
  Award,
  Trophy,
  Code2,
  Newspaper,
  HardHat,
  Briefcase,
  Building2,
  Equal,
  Scale,
  UserCircle,
  Bell,
  Radar,
  Siren,
  Inbox,
  Receipt,
  Banknote,
  FileSpreadsheet,
  ScrollText,
  CalendarRange,
  Clock,
  Laptop2,
  ClipboardList,
  CheckSquare,
  ListChecks,
  Network,
  Stethoscope,
  LifeBuoy,
  Wallet,
  ChevronDown,
  Lock,
  Shield,
  X,
  Command,
  Search,
} from 'lucide-react'
import { NAV_HUBS, type NavHub, type NavItem, resolveNavLocation } from '@/lib/constants'
import {
  getPlanLockCopy,
  getRouteFeature,
  getRouteMinPlan,
  isRouteLocked,
} from '@/lib/plan-features'
import type { PlanKey } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { BrandBlockA } from '@/components/comply360/brand-block'
import { QueQuieresHacerMenu } from '@/components/dashboard/que-quieres-hacer'
import { useUpgradeGate } from '@/providers/upgrade-gate-provider'
import { usePlatformModKey } from '@/hooks/use-platform-mod-key'
import { MOBILE_MENU_ID } from './topbar'

/* ── Iconos ──────────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  FileText,
  FileSearch,
  FileStack,
  Files,
  FolderOpen,
  Sparkles,
  Settings,
  Bot,
  Calculator,
  Workflow,
  GraduationCap,
  BarChart3,
  CreditCard,
  Plug,
  Store,
  Award,
  Trophy,
  Code2,
  Newspaper,
  HardHat,
  Briefcase,
  Building2,
  Equal,
  Scale,
  UserCircle,
  Bell,
  Radar,
  Siren,
  Inbox,
  Receipt,
  Banknote,
  FileSpreadsheet,
  ScrollText,
  CalendarRange,
  Clock,
  Laptop2,
  ClipboardList,
  CheckSquare,
  ListChecks,
  Network,
  Shield,
  Stethoscope,
  LifeBuoy,
  Wallet,
}

/**
 * Icon renderer — resolves the string name to a Lucide component at the leaf
 * level so we don't create a component reference inside the parent's render
 * function (which trips `react-hooks/static-components`).
 */
function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICON_MAP[name] ?? FileText
  return <Cmp className={className} aria-hidden="true" />
}

/** Contenido de la ayuda emergente de un ítem (ancho acotado para textos largos). */
function HintContent({ hint, note }: { hint?: string; note?: string }) {
  return (
    <span className="block max-w-[260px] leading-snug">
      {hint ? <span className="block">{hint}</span> : null}
      {note ? <span className={cn('block text-white/75', hint && 'mt-1')}>{note}</span> : null}
    </span>
  )
}

/* ── Badges (contadores en sidebar) ──────────────────────────────────── */

interface BadgeData {
  perHub: Record<string, number>
  perItem: Record<string, number>
}

function useBadgeCounts(): BadgeData {
  const [data, setData] = useState<BadgeData>({ perHub: {}, perItem: {} })
  useEffect(() => {
    fetch('/api/alerts/counts')
      .then((r) => r.json())
      .then((d) => {
        const perItem: Record<string, number> = {}
        const perHub: Record<string, number> = {}
        const pending = typeof d.pendingAlerts === 'number' ? d.pendingAlerts : 0
        const expiring = typeof d.expiringContracts === 'number' ? d.expiringContracts : 0
        if (pending > 0) {
          // Las alertas ya no tienen ítem propio en el menú: se cuentan en
          // "Pendientes", que las agrupa junto con las tareas.
          perItem['/dashboard/plan-accion'] = pending
          perHub['cockpit'] = (perHub['cockpit'] ?? 0) + pending
        }
        if (expiring > 0) {
          perItem['/dashboard/contratos'] = expiring
          perHub['contratos-docs'] = (perHub['contratos-docs'] ?? 0) + expiring
        }
        setData({ perHub, perItem })
      })
      .catch(() => {
        // Silent — badges are non-critical
      })
  }, [])
  return data
}

/* ── Orgplan hook ────────────────────────────────────────────────────── */

type PlanBadgeVariant = 'gold' | 'emerald' | 'neutral' | 'emerald-soft'

/**
 * Variante del badge del plan según el tier de suscripción.
 * Gold = PRO, Emerald = Empresa, Neutral = Starter/Free.
 */
function planBadgeVariant(plan: string): 'gold' | 'emerald' | 'neutral' {
  if (plan === 'PRO') return 'gold'
  if (plan === 'EMPRESA') return 'emerald'
  return 'neutral'
}
// Export so the topbar o compliance score pill puedan reusar la misma lógica
export { planBadgeVariant }
export type { PlanBadgeVariant }

function useOrgPlan(): string {
  // Default 'FREE' (no 'STARTER') — si el fetch falla, FREE es más honesto
  // que asumir un plan pago. El plan real viene del fetch a /api/org/profile.
  const [plan, setPlan] = useState<string>('FREE')

  useEffect(() => {
    let mounted = true

    async function fetchPlan() {
      try {
        // cache: 'no-store' fuerza al browser a NO usar response cacheada.
        // Crítico: cuando el founder cambia el plan via /diagnostico, el
        // sidebar debe reflejar el nuevo plan SIN requerir hard refresh.
        const r = await fetch('/api/org/profile', { cache: 'no-store' })
        if (!r.ok) return
        const d = await r.json()
        // BUG FIX 2026-04-30: el endpoint retorna { org: { plan } }, NO
        // { data: { plan } } ni { plan } directo. El sidebar nunca leía
        // el plan correctamente y siempre caía al default 'STARTER'.
        // Mantenemos los fallbacks por compatibilidad si el shape cambia.
        const p = d?.org?.plan ?? d?.data?.plan ?? d?.plan
        if (mounted && typeof p === 'string') setPlan(p)
      } catch {
        /* ignore */
      }
    }

    void fetchPlan()

    // Re-fetch cuando la ventana gana focus (típico flujo: founder cambia
    // plan en otra pestaña → vuelve a esta → debe ver el plan actualizado).
    const onFocus = () => void fetchPlan()
    window.addEventListener('focus', onFocus)

    return () => {
      mounted = false
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return plan
}

/* ── Drawer móvil: foco atrapado ─────────────────────────────────────── */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Elementos enfocables y visibles (excluye los grupos plegados, que son `inert`). */
function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.closest('[inert]') && el.getClientRects().length > 0
  )
}

/* ── Sidebar ─────────────────────────────────────────────────────────── */

interface SidebarProps {
  open: boolean
  onClose: () => void
  onCommandK: () => void
}

export default function Sidebar({ open, onClose, onCommandK }: SidebarProps) {
  const pathname = usePathname() ?? '/dashboard'
  const badges = useBadgeCounts()
  const plan = useOrgPlan()
  const currentPlan = plan as PlanKey | 'FREE'
  // Una sola fuente de verdad: grupo abierto + ÚNICO ítem iluminado
  // (la coincidencia más específica gana; antes "SST (resumen)" y
  // "Configuración" se iluminaban también en todas sus subrutas).
  const location = resolveNavLocation(pathname)
  const activeHub = location.hub
  const modKey = usePlatformModKey()
  const shortcutLabel = modKey === '⌘' ? '⌘K' : 'Ctrl+K'

  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Which hubs the user has manually toggled shut. Active hub auto-expands
  // unless the user explicitly collapsed it — tracked by this set.
  const [collapsedByUser, setCollapsedByUser] = useState<Set<string>>(() => new Set())

  // Drawer móvil: al abrir, el foco entra al menú; al cerrar, vuelve al
  // elemento que lo abrió (normalmente el botón ☰ del topbar).
  useEffect(() => {
    if (!open) return
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus())
    return () => {
      cancelAnimationFrame(frame)
      if (previouslyFocused && previouslyFocused !== document.body && previouslyFocused.isConnected) {
        previouslyFocused.focus()
      }
    }
  }, [open])

  /** Trampa de foco: Tab y Shift+Tab dan la vuelta dentro del menú abierto. */
  function handleDrawerKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab' || e.defaultPrevented) return
    const root = drawerRef.current
    // Los menús internos (p. ej. "¿Qué quieres hacer?") se abren en un portal
    // fuera del drawer: ahí manejan su propio teclado.
    if (!root || !(e.target instanceof Node) || !root.contains(e.target)) return
    const items = focusableIn(root)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const current = document.activeElement
    if (e.shiftKey && (current === first || !root.contains(current))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && current === last) {
      e.preventDefault()
      first.focus()
    }
  }

  function isExpanded(key: string) {
    // Active hub auto-expands; others stay collapsed. User override wins.
    const isActive = activeHub.key === key
    const manuallyCollapsed = collapsedByUser.has(key)
    const manuallyExpanded = !isActive && collapsedByUser.has(`__open:${key}`)
    if (isActive) return !manuallyCollapsed
    return manuallyExpanded
  }

  function isLocked(href: string): boolean {
    return isRouteLocked(plan, href)
  }

  function isHrefActive(href: string) {
    return href === location.activeHref
  }

  function toggleHub(key: string) {
    const isActive = activeHub.key === key
    setCollapsedByUser((prev) => {
      const next = new Set(prev)
      if (isActive) {
        // Toggle the "collapsed" marker for the active hub
        if (next.has(key)) next.delete(key)
        else next.add(key)
      } else {
        // Toggle the "manually opened" marker for non-active hubs
        const openKey = `__open:${key}`
        if (next.has(openKey)) next.delete(openKey)
        else next.add(openKey)
      }
      return next
    })
  }

  // Se renderiza dos veces (aside de escritorio + drawer móvil): `idPrefix`
  // evita ids duplicados en aria-controls / aria-describedby.
  const renderContent = (idPrefix: string) => (
    <div className="c360-dashboard-sidebar relative flex h-full flex-col border-r border-[color:var(--border-default)] bg-[color:var(--bg-elevated)]/95 backdrop-blur-xl">
      {/* ── LOGO — Variant A "Sello notarial" (del prototipo de diseño) ── */}
      <Link
        href="/dashboard"
        onClick={onClose}
        className="relative block hover:bg-[color:var(--bg-surface-hover)] transition-colors"
        aria-label="COMPLY360 · Ir al inicio del panel"
      >
        <BrandBlockA />
      </Link>

      {/* ── CMD-K TRIGGER ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={onCommandK}
        className="mx-3 mt-3 flex min-h-10 items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] px-3 py-2 text-xs text-[color:var(--text-tertiary)] hover:border-emerald-500/60 hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 lg:min-h-0"
        aria-label={`Buscar (${shortcutLabel})`}
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd
          aria-hidden="true"
          className="inline-flex items-center gap-0.5 rounded border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px]"
        >
          {modKey === '⌘' ? <Command className="h-2.5 w-2.5" /> : <span>{modKey}</span>}
          <span>{modKey === '⌘' ? 'K' : '+K'}</span>
        </kbd>
      </button>

      {/* ── ¿QUÉ QUIERES HACER? — asistentes guiados, siempre visible ── */}
      <div className="mx-3 mt-2.5">
        <QueQuieresHacerMenu onNavigate={onClose} />
      </div>

      {/* ── GRUPOS ────────────────────────────────────────────── */}
      <nav aria-label="Navegación principal" className="relative mt-3 flex-1 overflow-y-auto px-2 pb-4">
        <ul className="space-y-0.5">
          {NAV_HUBS.map((hub) => (
            <HubRow
              key={hub.key}
              hub={hub}
              idPrefix={idPrefix}
              isActive={activeHub.key === hub.key}
              isExpanded={isExpanded(hub.key)}
              onToggle={() => toggleHub(hub.key)}
              onNavigate={onClose}
              isHrefActive={isHrefActive}
              isLocked={isLocked}
              badges={badges}
              currentPlan={currentPlan}
            />
          ))}
        </ul>
      </nav>

      {/* ── FOOTER: ORG BADGE ─────────────────────────────────── */}
      <div className="relative border-t border-[color:var(--border-default)] p-3 bg-[color:var(--bg-inset)]">
        <Link
          href="/dashboard/planes"
          onClick={onClose}
          aria-label={`Plan actual: ${plan}. Haz clic para ver y mejorar tu plan.`}
          title="Ver planes y mejorar"
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] shadow-[var(--elevation-1)] hover:border-emerald-300 hover:shadow-[var(--elevation-2)] transition-all cursor-pointer"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white shadow-[0_2px_6px_rgba(16,185,129,0.3)]">
            C3
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[color:var(--text-primary)]">
              COMPLY360
            </p>
            <Badge variant={planBadgeVariant(plan)} size="xs" className="mt-0.5">
              {plan}
            </Badge>
          </div>
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop — fixed aside */}
      <aside
        data-dashboard-sidebar
        className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-[var(--sidebar-width)] lg:flex-col"
        aria-label="Barra lateral"
      >
        {renderContent('sb')}
      </aside>

      {/* Mobile — drawer modal (Escape lo cierra desde dashboard-shell) */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            id={MOBILE_MENU_ID}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            onKeyDown={handleDrawerKeyDown}
            className="relative flex h-full w-[var(--sidebar-width)] max-w-[85vw] flex-col motion-fade-in-up"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {renderContent('sb-movil')}
          </div>
        </div>
      ) : null}
    </>
  )
}

/* ── Hub row ─────────────────────────────────────────────────────────── */

function HubRow({
  hub,
  idPrefix,
  isActive,
  isExpanded,
  onToggle,
  onNavigate,
  isHrefActive,
  isLocked,
  badges,
  currentPlan,
}: {
  hub: NavHub
  idPrefix: string
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
  onNavigate: () => void
  isHrefActive: (href: string) => boolean
  isLocked: (href: string) => boolean
  badges: BadgeData
  currentPlan: PlanKey | 'FREE'
}) {
  // Las páginas `hidden` siguen en el buscador y las migas, no en el menú.
  const visibleItems = hub.items.filter((item) => !item.hidden)
  const singleItem = visibleItems.length === 1
  const hubBadge = badges.perHub[hub.key] ?? 0
  const panelId = `${idPrefix}-grupo-${hub.key}`
  const descriptionId = `${idPrefix}-grupo-${hub.key}-desc`

  if (visibleItems.length === 0) return null

  return (
    <li>
      {singleItem ? (
        // Grupo de una sola página: enlaza directo, sin desplegable.
        <Link
          href={visibleItems[0].href}
          onClick={onNavigate}
          aria-current={isHrefActive(visibleItems[0].href) ? 'page' : undefined}
          aria-describedby={descriptionId}
          className={cn(
            'group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 lg:min-h-0',
            isActive
              ? 'bg-emerald-500/15 text-emerald-300 shadow-[inset_3px_0_0_theme(colors.emerald.400)]'
              : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-surface-hover)] hover:text-[color:var(--text-primary)]'
          )}
        >
          <Icon
            name={hub.icon}
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              isActive ? 'text-emerald-300' : 'text-[color:var(--text-tertiary)] group-hover:text-[color:var(--text-secondary)]'
            )}
          />
          <span className="min-w-0 flex-1 leading-snug">{hub.label}</span>
          {hubBadge > 0 ? (
            <Badge variant="solid-crimson" size="xs">
              {hubBadge > 99 ? '99+' : hubBadge}
            </Badge>
          ) : null}
        </Link>
      ) : (
        <>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={panelId}
            aria-describedby={descriptionId}
            className={cn(
              'group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 lg:min-h-0',
              isActive
                ? 'bg-emerald-500/15 text-emerald-300 shadow-[inset_3px_0_0_theme(colors.emerald.400)]'
                : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-surface-hover)] hover:text-[color:var(--text-primary)]'
            )}
          >
            <Icon
              name={hub.icon}
              className={cn(
                'h-4 w-4 shrink-0 self-start mt-0.5 transition-colors',
                isActive ? 'text-emerald-300' : 'text-[color:var(--text-tertiary)] group-hover:text-[color:var(--text-secondary)]'
              )}
            />
            <span className="min-w-0 flex-1 text-left">
              <span className="block leading-snug">{hub.label}</span>
              {/* Qué contiene el grupo: visible cuando está plegado (cuando está
                  abierto ya se ven sus páginas). Para lectores de pantalla va
                  siempre por aria-describedby. */}
              {!isExpanded ? (
                <span
                  aria-hidden="true"
                  className="mt-0.5 line-clamp-2 block text-[11px] font-normal leading-tight text-[color:var(--text-tertiary)]"
                >
                  {hub.description}
                </span>
              ) : null}
            </span>
            {hubBadge > 0 && !isExpanded ? (
              <Badge variant="solid-crimson" size="xs">
                {hubBadge > 99 ? '99+' : hubBadge}
              </Badge>
            ) : null}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-[color:var(--text-tertiary)] transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </button>

          <div
            id={panelId}
            // Plegado = fuera del orden de tabulación y de los lectores de pantalla.
            inert={!isExpanded}
            className={cn(
              'overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]',
              isExpanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <ul className="ml-3 mt-0.5 space-y-0 border-l border-[color:var(--border-subtle)] pl-2">
              {visibleItems.map((item) => (
                <HubSubItem
                  key={item.href}
                  item={item}
                  isActive={isHrefActive(item.href)}
                  isLocked={isLocked(item.href)}
                  badge={badges.perItem[item.href] ?? 0}
                  onNavigate={onNavigate}
                  currentPlan={currentPlan}
                />
              ))}
            </ul>
          </div>
        </>
      )}
      <span id={descriptionId} className="sr-only">
        {hub.description}
      </span>
    </li>
  )
}

function HubSubItem({
  item,
  isActive,
  isLocked,
  badge,
  onNavigate,
  currentPlan,
}: {
  item: NavItem
  isActive: boolean
  isLocked: boolean
  badge: number
  onNavigate: () => void
  currentPlan: PlanKey | 'FREE'
}) {
  const { openUpgrade } = useUpgradeGate()
  const hintId = useId()
  const describedBy = item.hint ? hintId : undefined

  // Altura táctil ≥ 40px en móvil (drawer); compacta en escritorio.
  const sizeClasses = item.secondary
    ? 'ml-4 min-h-10 py-2 text-[12px] lg:min-h-0 lg:py-1'
    : 'min-h-10 py-2 text-[13px] lg:min-h-0 lg:py-1.5'
  const iconClasses = item.secondary ? 'h-3 w-3' : 'h-3.5 w-3.5'

  const hintNode = item.hint ? (
    <span id={hintId} className="sr-only">
      {item.hint}
    </span>
  ) : null

  if (isLocked) {
    // Por prefijo: /dashboard/sst/emo hereda el candado de /dashboard/sst.
    const feature = getRouteFeature(item.href)
    const requiredPlan = getRouteMinPlan(item.href) ?? 'PRO'
    const lock = getPlanLockCopy(requiredPlan)

    return (
      <li>
        <Tooltip content={<HintContent hint={item.hint} note={lock.tooltip} />} side="right">
          <button
            type="button"
            onClick={() => {
              if (feature) {
                openUpgrade({
                  requiredPlan: requiredPlan as PlanKey,
                  currentPlan,
                  feature,
                  featureName: item.label,
                })
              }
              onNavigate()
            }}
            className={cn(
              'group flex w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] hover:bg-emerald-500/10 transition-colors',
              sizeClasses
            )}
            aria-label={`${item.label}. ${lock.label}`}
            aria-describedby={describedBy}
          >
            <Icon name={item.icon} className={cn(iconClasses, 'shrink-0 opacity-60')} />
            <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
              style={{
                background: 'linear-gradient(135deg, var(--gold-100), var(--gold-200))',
                color: 'var(--gold-700)',
                border: '0.5px solid rgba(180, 83, 9, 0.35)',
                lineHeight: 1,
              }}
            >
              <Lock className="h-2.5 w-2.5" strokeWidth={2.4} aria-hidden="true" />
              {lock.planName}
            </span>
          </button>
        </Tooltip>
        {hintNode}
      </li>
    )
  }

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      aria-describedby={describedBy}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-2.5 font-medium',
        'transition-[color,background-color,transform] duration-[var(--motion-short)] ease-[var(--ease-standard)]',
        sizeClasses,
        isActive
          ? 'text-emerald-300 bg-emerald-500/12 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-[3px] before:rounded-r-full before:bg-emerald-400 before:content-[\'\']'
          : cn(
              'hover:bg-[color:var(--bg-surface-hover)] hover:text-[color:var(--text-primary)] hover:translate-x-0.5',
              item.secondary ? 'text-[color:var(--text-tertiary)]' : 'text-[color:var(--text-secondary)]'
            )
      )}
    >
      <Icon
        name={item.icon}
        className={cn(
          iconClasses,
          'shrink-0 transition-[color,transform] duration-[var(--motion-short)]',
          isActive
            ? 'text-emerald-300 scale-110'
            : 'text-[color:var(--text-tertiary)] group-hover:scale-105'
        )}
      />
      <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
      {badge > 0 ? (
        <Badge variant="critical" size="xs">
          {badge > 99 ? '99+' : badge}
        </Badge>
      ) : null}
    </Link>
  )

  return (
    <li>
      {item.hint ? (
        <Tooltip content={<HintContent hint={item.hint} />} side="right" delayDuration={500}>
          {link}
        </Tooltip>
      ) : (
        link
      )}
      {hintNode}
    </li>
  )
}
