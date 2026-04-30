'use client'

import { useEffect, useState } from 'react'
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
  ChevronDown,
  Lock,
  Shield,
  X,
  Command,
  Search,
} from 'lucide-react'
import { NAV_HUBS, type NavHub, type NavItem, resolveActiveHub } from '@/lib/constants'
import {
  FEATURE_MIN_PLAN,
  ROUTE_FEATURE_MAP,
  isRouteLocked,
  type PlanFeature,
} from '@/lib/plan-features'
import type { PlanKey } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { BrandBlockA } from '@/components/comply360/brand-block'
import { useUpgradeGate } from '@/providers/upgrade-gate-provider'

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
  Shield,
}

/**
 * Icon renderer — resolves the string name to a Lucide component at the leaf
 * level so we don't create a component reference inside the parent's render
 * function (which trips `react-hooks/static-components`).
 */
function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICON_MAP[name] ?? FileText
  return <Cmp className={className} />
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
          perItem['/dashboard/alertas'] = pending
          perHub['riesgo'] = (perHub['riesgo'] ?? 0) + pending
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
  const activeHub = resolveActiveHub(pathname)

  // Which hubs the user has manually toggled shut. Active hub auto-expands
  // unless the user explicitly collapsed it — tracked by this set.
  const [collapsedByUser, setCollapsedByUser] = useState<Set<string>>(() => new Set())

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
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
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

  const content = (
    <div className="relative flex h-full flex-col bg-white border-r border-[color:var(--border-default)] shadow-[1px_0_2px_rgba(15,23,42,0.03)]">
      {/* ── LOGO — Variant A "Sello notarial" (del prototipo de diseño) ── */}
      <Link
        href="/dashboard"
        onClick={onClose}
        className="relative block hover:bg-[color:var(--neutral-50)] transition-colors"
        aria-label="COMPLY360 · Ir al dashboard"
      >
        <BrandBlockA />
      </Link>

      {/* ── CMD-K TRIGGER ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={onCommandK}
        className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] px-3 py-2 text-xs text-[color:var(--text-tertiary)] hover:border-emerald-500/60 hover:text-[color:var(--text-primary)] hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        aria-label="Abrir búsqueda (Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="inline-flex items-center gap-0.5 rounded border border-[color:var(--border-subtle)] bg-white px-1.5 py-0.5 font-mono text-[10px]">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      {/* ── HUBS ──────────────────────────────────────────────── */}
      <nav aria-label="Navegación principal" className="relative mt-3 flex-1 overflow-y-auto px-2 pb-4">
        <ul className="space-y-0.5">
          {NAV_HUBS.map((hub) => (
            <HubRow
              key={hub.key}
              hub={hub}
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
      <div className="relative border-t border-[color:var(--border-default)] p-3 bg-[color:var(--neutral-50)]">
        <Link
          href="/dashboard/planes"
          aria-label={`Plan actual: ${plan}. Click para ver y mejorar tu plan.`}
          title="Ver planes y mejorar"
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 bg-white border border-[color:var(--border-subtle)] shadow-[var(--elevation-1)] hover:border-emerald-300 hover:shadow-[var(--elevation-2)] transition-all cursor-pointer"
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
        className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-[var(--sidebar-width)] lg:flex-col"
        aria-label="Barra lateral"
      >
        {content}
      </aside>

      {/* Mobile — drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside
            className="relative flex h-full w-[var(--sidebar-width)] flex-col motion-fade-in-up"
            aria-label="Barra lateral"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded-md p-1 text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
            {content}
          </aside>
        </div>
      ) : null}
    </>
  )
}

/* ── Hub row ─────────────────────────────────────────────────────────── */

function HubRow({
  hub,
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
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
  onNavigate: () => void
  isHrefActive: (href: string) => boolean
  isLocked: (href: string) => boolean
  badges: BadgeData
  currentPlan: PlanKey | 'FREE'
}) {
  const singleItem = hub.items.length === 1
  const hubBadge = badges.perHub[hub.key] ?? 0
  const rootActive = isHrefActive(hub.rootHref)

  return (
    <li>
      {singleItem ? (
        // Single-item hubs link directly to rootHref — no expand UI
        <Link
          href={hub.rootHref}
          onClick={onNavigate}
          className={cn(
            'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
            rootActive
              ? 'bg-emerald-50 text-emerald-700 shadow-[inset_3px_0_0_theme(colors.emerald.500)]'
              : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)] hover:text-[color:var(--text-primary)]'
          )}
        >
          <Icon
            name={hub.icon}
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              rootActive ? 'text-emerald-600' : 'text-[color:var(--text-tertiary)] group-hover:text-[color:var(--text-secondary)]'
            )}
          />
          <span className="flex-1 truncate">{hub.label}</span>
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
            aria-controls={`hub-${hub.key}`}
            className={cn(
              'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-emerald-50 text-emerald-700 shadow-[inset_3px_0_0_theme(colors.emerald.500)]'
                : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)] hover:text-[color:var(--text-primary)]'
            )}
          >
            <Icon
              name={hub.icon}
              className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                isActive ? 'text-emerald-600' : 'text-[color:var(--text-tertiary)] group-hover:text-[color:var(--text-secondary)]'
              )}
            />
            <span className="flex-1 text-left truncate">{hub.label}</span>
            {hubBadge > 0 && !isExpanded ? (
              <Badge variant="solid-crimson" size="xs">
                {hubBadge > 99 ? '99+' : hubBadge}
              </Badge>
            ) : null}
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-[color:var(--text-tertiary)] transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </button>

          <div
            id={`hub-${hub.key}`}
            className={cn(
              'overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]',
              isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <ul className="ml-3 mt-0.5 space-y-0 border-l border-[color:var(--border-subtle)] pl-2">
              {hub.items.map((item) => (
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

  if (isLocked) {
    const feature = ROUTE_FEATURE_MAP[item.href] as PlanFeature | undefined
    const requiredPlan = feature ? FEATURE_MIN_PLAN[feature] : 'EMPRESA'
    const requiredShort = requiredPlan.charAt(0) + requiredPlan.slice(1).toLowerCase()

    return (
      <li>
        <Tooltip
          content={`Requiere plan ${requiredShort} — click para ver detalles`}
          side="right"
        >
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
            className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] hover:bg-emerald-50/50 transition-colors text-left"
            aria-label={`${item.label} — Requiere plan ${requiredShort}`}
          >
            <Icon name={item.icon} className="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span className="flex-1 truncate">{item.label}</span>
            <span
              className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                color: 'var(--emerald-800)',
                border: '0.5px solid rgba(16,185,129,0.35)',
                lineHeight: 1,
              }}
            >
              <Lock className="h-2.5 w-2.5" strokeWidth={2.4} />
              {requiredPlan === 'PRO' ? 'PRO' : requiredPlan === 'EMPRESA' ? 'EMP' : 'PLUS'}
            </span>
          </button>
        </Tooltip>
      </li>
    )
  }

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
          isActive
            ? 'text-emerald-700 bg-emerald-50'
            : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] hover:text-[color:var(--text-primary)]'
        )}
      >
        <Icon
          name={item.icon}
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-colors',
            isActive ? 'text-emerald-600' : 'text-[color:var(--text-tertiary)]'
          )}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {badge > 0 ? (
          <Badge variant="critical" size="xs">
            {badge > 99 ? '99+' : badge}
          </Badge>
        ) : null}
      </Link>
    </li>
  )
}
