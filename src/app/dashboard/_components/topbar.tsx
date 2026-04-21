'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu,
  Bell,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  LogOut,
  User,
  Settings,
  Users,
  Sparkles,
  Command,
  Search,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { NAV_ITEMS, resolveActiveHub } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useUser, useClerk } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { useCopilot } from '@/providers/copilot-provider'
import { complianceScoreColor } from '@/lib/brand'

interface TopbarProps {
  onMenuToggle: () => void
  onCommandK: () => void
}

interface Crumb {
  label: string
  href: string
}

interface OrgAlert {
  id: string
  type: string
  title: string
  message: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  resolvedAt: string | null
  createdAt: string
}

const SEGMENT_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  editar: 'Editar',
  configuracion: 'Configuración',
  trabajadores: 'Trabajadores',
  contratos: 'Contratos',
  alertas: 'Alertas',
  calendario: 'Calendario',
  simulacro: 'Simulacro',
  diagnostico: 'Diagnóstico',
  reportes: 'Reportes',
  documentos: 'Documentos',
  expedientes: 'Expedientes',
}

function isId(segment: string): boolean {
  return segment.length > 12 && /^[a-z0-9]+$/.test(segment)
}

function useBreadcrumb(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Panel', href: '/dashboard' }]
  const hub = resolveActiveHub(pathname)
  if (hub.key !== 'cockpit') {
    crumbs.push({ label: hub.label, href: hub.rootHref })
  }
  // Add nav-item match if pathname is deeper than the hub's rootHref
  const match = NAV_ITEMS.find(
    (item) => pathname.startsWith(item.href) && item.href !== '/dashboard' && item.href !== hub.rootHref
  )
  if (match) {
    crumbs.push({ label: match.label, href: match.href })
  }
  // Detail / action segment
  const segments = pathname.replace('/dashboard', '').split('/').filter(Boolean)
  if (segments.length > 1) {
    const last = segments[segments.length - 1]
    const label =
      SEGMENT_LABELS[last] ??
      (isId(last) ? 'Detalle' : last.charAt(0).toUpperCase() + last.slice(1))
    if (label !== crumbs[crumbs.length - 1].label) {
      crumbs.push({ label, href: pathname })
    }
  }
  return crumbs
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-crimson-700',
  HIGH: 'text-amber-700',
  MEDIUM: 'text-amber-700',
  LOW: 'text-cyan-400',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

/* ── Hooks ──────────────────────────────────────────────────────────── */

interface ComplianceScoreState {
  score: number | null
  delta: number | null
}

function useComplianceScore(): ComplianceScoreState {
  const [state, setState] = useState<ComplianceScoreState>({ score: null, delta: null })
  useEffect(() => {
    fetch('/api/compliance/score')
      .then((r) => r.json())
      .then((d) => {
        // Accept several response shapes
        const score =
          typeof d?.scoreGlobal === 'number'
            ? d.scoreGlobal
            : typeof d?.data?.scoreGlobal === 'number'
              ? d.data.scoreGlobal
              : typeof d?.score === 'number'
                ? d.score
                : null
        const delta =
          typeof d?.delta === 'number'
            ? d.delta
            : typeof d?.data?.delta === 'number'
              ? d.data.delta
              : null
        setState({ score, delta })
      })
      .catch(() => {
        /* ignore — score pill is non-critical */
      })
  }, [])
  return state
}

function useTrialBanner() {
  const [days, setDays] = useState<number | null>(null)
  const [isTrialing, setIsTrialing] = useState(false)
  useEffect(() => {
    fetch('/api/org/profile')
      .then((r) => r.json())
      .then((d) => {
        const org = d?.data ?? d
        if (org?.planExpiresAt) {
          const expires = new Date(org.planExpiresAt)
          const days = Math.max(
            0,
            Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          )
          setDays(days)
          setIsTrialing(true)
        }
      })
      .catch(() => {
        /* ignore */
      })
  }, [])
  return { days, isTrialing }
}

function useOrgAlerts() {
  const [alerts, setAlerts] = useState<OrgAlert[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/alerts')
        if (!res.ok) return
        const json = await res.json()
        const raw = json.data ?? []
        const items: OrgAlert[] = raw
          .filter((a: Record<string, unknown>) => a.orgStatus !== 'DISMISSED')
          .slice(0, 8)
          .map((a: Record<string, unknown>) => ({
            id: a.id as string,
            type: (a.normCategory as string) ?? 'NORMATIVA',
            title: a.title as string,
            message: (a.summary as string) ?? '',
            severity: ((a.impactLevel as string) ?? 'MEDIUM') as OrgAlert['severity'],
            resolvedAt: (a.isRead as boolean) ? 'read' : null,
            createdAt: (a.publishedAt as string) ?? new Date().toISOString(),
          }))
        setAlerts(items)
        setUnread(json.stats?.unread ?? items.filter((a) => !a.resolvedAt).length)
      } catch {
        /* silent */
      }
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return { alerts, unread }
}

/* ── Topbar ─────────────────────────────────────────────────────────── */

export default function Topbar({ onMenuToggle, onCommandK }: TopbarProps) {
  const pathname = usePathname() ?? '/dashboard'
  const router = useRouter()
  const crumbs = useBreadcrumb(pathname)
  const { user } = useUser()
  const { signOut } = useClerk()
  const copilot = useCopilot()

  const { score, delta } = useComplianceScore()
  const { days: trialDays, isTrialing } = useTrialBanner()
  const { alerts, unread } = useOrgAlerts()

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.firstName
        ? user.firstName[0].toUpperCase()
        : 'C3'

  const scoreColor = score != null ? complianceScoreColor(score) : undefined

  return (
    <>
      {/* ── TRIAL BANNER ────────────────────────────────────── */}
      {isTrialing && trialDays !== null ? (
        <div
          className={cn(
            'sticky top-0 z-50 flex items-center justify-center gap-3 px-4 py-1.5 text-xs font-medium',
            trialDays <= 3
              ? 'bg-crimson-600 text-white'
              : trialDays <= 7
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white'
          )}
        >
          <span>
            {trialDays > 0
              ? `Día ${14 - trialDays} de 14 de tu prueba PRO gratuita`
              : 'Tu prueba gratuita ha terminado'}
          </span>
          <Link
            href="/dashboard/planes"
            className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold hover:bg-white/30 transition"
          >
            {trialDays > 0 ? 'Elegir plan' : 'Activar plan'}
          </Link>
        </div>
      ) : null}

      {/* ── HEADER ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-[var(--topbar-height)] shrink-0 items-center gap-3 border-b border-[color:var(--border-default)] bg-white/95 backdrop-blur-xl px-4 sm:px-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {/* Mobile menu toggle */}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onMenuToggle}
          className="lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="hidden sm:block min-w-0">
          <ol className="flex items-center gap-1.5 text-sm">
            {crumbs.map((crumb, idx) => {
              const isLast = idx === crumbs.length - 1
              return (
                <li key={crumb.href + idx} className="flex items-center gap-1.5 min-w-0">
                  {idx > 0 ? <ChevronRight className="h-3 w-3 text-[color:var(--text-tertiary)] shrink-0" /> : null}
                  {isLast ? (
                    <span className="truncate font-medium text-[color:var(--text-primary)]">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="truncate text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)] transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {/* SUNAFIL sync pill (prototipo god-mode) */}
          <div
            className="c360-tb-sync hidden lg:flex"
            title="Última verificación SUNAFIL: en tiempo real"
          >
            <span className="dot" />
            <span>SUNAFIL sincronizado</span>
          </div>
          <div className="c360-tb-divider hidden lg:block" />

          {/* Cmd+K compact button (desktop) */}
          <button
            type="button"
            onClick={onCommandK}
            className="hidden md:flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-2.5 py-1.5 text-xs text-[color:var(--text-tertiary)] hover:border-emerald-500/60 hover:text-[color:var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <Search className="h-3 w-3" />
            <span>Buscar</span>
            <kbd className="inline-flex items-center gap-0.5 rounded border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)] px-1 py-0.5 font-mono text-[10px]">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          {/* Compliance score pill */}
          {score != null ? (
            <Link
              href="/dashboard/diagnostico"
              title={
                delta != null
                  ? `Score ${score} · ${delta >= 0 ? '+' : ''}${delta} vs mes anterior`
                  : `Score de compliance ${score}/100`
              }
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-[color:var(--border-default)] bg-white px-2.5 py-1 text-xs font-semibold hover:border-emerald-500/60 hover:bg-[color:var(--neutral-50)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: scoreColor }} />
              <span style={{ color: scoreColor }}>{score}</span>
              {delta != null && delta !== 0 ? (
                delta > 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-crimson-700" />
                )
              ) : null}
            </Link>
          ) : null}

          {/* AI Copilot trigger */}
          <Button
            size="icon-sm"
            variant={copilot.isOpen ? 'emerald-soft' : 'ghost'}
            onClick={copilot.toggle}
            aria-label={copilot.isOpen ? 'Cerrar Copilot (Ctrl+I)' : 'Abrir Copilot (Ctrl+I)'}
            title={copilot.isOpen ? 'Cerrar Copilot (Ctrl+I)' : 'Abrir Copilot (Ctrl+I)'}
            className="relative"
          >
            <Sparkles className="h-4 w-4" />
          </Button>

          {/* Notifications bell */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`${unread} alertas sin resolver`}
                title="Alertas"
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-crimson-600 px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border-subtle)]">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-emerald-600" />
                  Alertas
                  {unread > 0 ? (
                    <Badge variant="critical" size="xs">
                      {unread}
                    </Badge>
                  ) : null}
                </h3>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[color:var(--border-subtle)]">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                    <p className="text-sm text-[color:var(--text-tertiary)]">
                      Sin alertas pendientes
                    </p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="px-4 py-3 hover:bg-[color:var(--neutral-50)] transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          className={cn(
                            'h-4 w-4 mt-0.5 shrink-0',
                            SEVERITY_COLOR[alert.severity] ?? 'text-[color:var(--text-tertiary)]'
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[color:var(--text-primary)] truncate">
                            {alert.title}
                          </p>
                          <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5 line-clamp-2 leading-relaxed">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={alert.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low'} size="xs">
                              {alert.severity}
                            </Badge>
                            <span className="flex items-center gap-0.5 text-[10px] text-[color:var(--text-tertiary)]">
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(alert.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)] px-4 py-2">
                <Link
                  href="/dashboard/alertas"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Ver todas las alertas →
                </Link>
              </div>
            </PopoverContent>
          </Popover>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-[color:var(--neutral-100)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                aria-label="Menú de usuario"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-[color:var(--text-primary)] leading-tight max-w-[120px] truncate">
                    {user?.firstName ?? 'Usuario'}
                  </p>
                  <p className="text-[10px] text-[color:var(--text-tertiary)] leading-tight max-w-[120px] truncate">
                    {user?.primaryEmailAddress?.emailAddress ?? ''}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-xs font-bold truncate">
                  {user?.fullName ?? 'Usuario'}
                </p>
                <p className="text-[10px] text-[color:var(--text-tertiary)] truncate font-normal normal-case tracking-normal mt-0.5">
                  {user?.primaryEmailAddress?.emailAddress ?? ''}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/dashboard/configuracion/empresa')}>
                <User className="h-3.5 w-3.5" />
                Mi perfil / Empresa
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/dashboard/configuracion')}>
                <Settings className="h-3.5 w-3.5" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/dashboard/configuracion/equipo')}>
                <Users className="h-3.5 w-3.5" />
                Mi equipo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onSelect={() => signOut({ redirectUrl: '/sign-in' })}
              >
                <LogOut className="h-3.5 w-3.5" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  )
}
