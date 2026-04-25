'use client'

/**
 * AdminShell — layout primitivo del Command Center.
 * Sidebar en light mode con acentos esmeralda, topbar con ticker financiero,
 * command palette Cmd+K, keyboard shortcuts Cmd+1..6 para cambiar de hub.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import {
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  LifeBuoy,
  LogOut,
  Menu,
  Newspaper,
  Search,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { CommandPalette } from './command-palette'

type NavItem = {
  href: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  name: string
  count?: string
  danger?: boolean
  shortcut?: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { href: '/admin', icon: Home, name: 'Overview', shortcut: '1' },
      { href: '/admin/empresas', icon: Building2, name: 'Empresas', shortcut: '2' },
      { href: '/admin/admins', icon: UserCog, name: 'Admins & Roles' },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { href: '/admin/billing', icon: CreditCard, name: 'Billing & Planes', shortcut: '3' },
      { href: '/admin/analytics', icon: TrendingUp, name: 'Analytics', shortcut: '4' },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { href: '/admin/normas', icon: Newspaper, name: 'Novedades normativas', shortcut: '7' },
    ],
  },
  {
    label: 'IA & Costos',
    items: [
      { href: '/admin/ai-usage', icon: Sparkles, name: 'Uso de IA' },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { href: '/admin/soporte', icon: LifeBuoy, name: 'Soporte', shortcut: '5', danger: true },
      { href: '/admin/auditoria', icon: Shield, name: 'Auditoría', shortcut: '6' },
      { href: '/admin/configuracion', icon: Settings, name: 'Sistema' },
    ],
  },
]

type TickerItem = {
  label: string
  value: string
  delta?: string
  positive?: boolean
}

export interface AdminShellProps {
  children: React.ReactNode
  crumbs?: string[]
  ticker?: TickerItem[]
  userName?: string
  userRole?: string
  userInitials?: string
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/admin') return pathname === '/admin' || pathname === '/admin/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function AdminShell({
  children,
  crumbs,
  ticker,
  userName = 'Founder',
  userRole = 'SUPER ADMIN',
  userInitials,
}: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const clerk = useClerk()

  const initials = userInitials ?? (userName.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'C')

  // Keyboard shortcuts: Cmd+K (palette), Cmd+1..7 (nav)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdkOpen((v) => !v)
        return
      }
      if (meta && /^[1-7]$/.test(e.key)) {
        e.preventDefault()
        const flat = NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.shortcut)
        const target = flat.find((i) => i.shortcut === e.key)
        if (target) router.push(target.href)
      }
      if (e.key === 'Escape') {
        setCmdkOpen(false)
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  const effectiveTicker: TickerItem[] = ticker ?? [
    { label: 'MRR', value: 'S/ 142,480', delta: '+4.2%', positive: true },
    { label: 'ARR', value: 'S/ 1.71M', delta: '+58%', positive: true },
    { label: 'Churn', value: '1.8%', delta: '-0.4pp', positive: true },
    { label: 'NRR', value: '118%', delta: '+3pp', positive: true },
  ]

  return (
    <div className="admin-body">
      <div className="admin-shell">
        {/* Sidebar overlay (mobile) */}
        <div
          className={`admin-sb-overlay ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />

        {/* Sidebar */}
        <aside className={`admin-sb ${mobileOpen ? 'open' : ''}`}>
          <div className="admin-sb-brand">
            <div className="admin-sb-brand-shield">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="admin-sb-brand-name">
                COMPLY<span className="num">360</span>
              </div>
              <div className="admin-sb-brand-meta">Command Center</div>
            </div>
            <button
              type="button"
              className="admin-menu-btn"
              style={{ marginLeft: 'auto' }}
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
            >
              <X size={16} />
            </button>
          </div>

          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="admin-sb-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      'admin-sb-item',
                      active ? 'active' : '',
                      item.danger ? 'danger' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <Icon size={16} />
                    <span>{item.name}</span>
                    {item.count && <span className="admin-sb-count">{item.count}</span>}
                  </Link>
                )
              })}
            </div>
          ))}

          <div className="admin-sb-status">
            <div className="title">
              <span className="dot" /> Plataforma
            </div>
            <div className="row">
              API p99 <span className="value">184ms</span>
            </div>
            <div className="row">
              DB sync <span className="value">OK</span>
            </div>
            <div className="row">
              Workers <span className="value">3/3 OK</span>
            </div>
          </div>

          <div className="admin-sb-user">
            <div className="avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="name"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {userName}
              </div>
              <div className="role">{userRole}</div>
            </div>
            <button
              type="button"
              onClick={() => clerk.signOut({ redirectUrl: '/sign-in' })}
              className="admin-sb-item"
              style={{ padding: 6, width: 'auto' }}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="admin-main">
          <div className="admin-topbar">
            <button
              type="button"
              className="admin-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={16} />
            </button>

            <div className="crumbs">
              <Home size={13} />
              <span>Admin</span>
              {(crumbs ?? []).map((c, i, arr) => (
                <span
                  key={i}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ChevronRight size={12} />
                  <span className={i === arr.length - 1 ? 'crumb-last' : ''}>{c}</span>
                </span>
              ))}
            </div>

            <div className="spacer" />

            <div className="ticker">
              {effectiveTicker.map((t, i) => (
                <div className="tick" key={i}>
                  <span className="label">{t.label}</span>
                  <span>{t.value}</span>
                  {t.delta && (
                    <span className={t.positive ? 'pos' : 'neg'}>{t.delta}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="live-tag">
              <span className="dot" /> LIVE
            </div>

            <button
              type="button"
              className="a-btn a-btn-secondary a-btn-sm"
              onClick={() => setCmdkOpen(true)}
              style={{ gap: 8 }}
            >
              <Search size={12} /> Buscar{' '}
              <span className="a-kbd" style={{ marginLeft: 4 }}>
                ⌘K
              </span>
            </button>

            <Link
              href="/admin/soporte"
              className="a-btn a-btn-ghost a-btn-sm"
              aria-label="Notificaciones"
            >
              <Bell size={14} />
            </Link>
          </div>

          <div className="admin-content a-stagger">{children}</div>
        </main>
      </div>

      <CommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        items={[
          { group: 'Navegar', icon: Home, label: 'Overview', href: '/admin', hint: '⌘1' },
          {
            group: 'Navegar',
            icon: Building2,
            label: 'Empresas',
            href: '/admin/empresas',
            hint: '⌘2',
          },
          {
            group: 'Navegar',
            icon: CreditCard,
            label: 'Billing & Planes',
            href: '/admin/billing',
            hint: '⌘3',
          },
          {
            group: 'Navegar',
            icon: TrendingUp,
            label: 'Analytics',
            href: '/admin/analytics',
            hint: '⌘4',
          },
          {
            group: 'Navegar',
            icon: LifeBuoy,
            label: 'Soporte',
            href: '/admin/soporte',
            hint: '⌘5',
          },
          {
            group: 'Navegar',
            icon: Shield,
            label: 'Auditoría',
            href: '/admin/auditoria',
            hint: '⌘6',
          },
          {
            group: 'Navegar',
            icon: Newspaper,
            label: 'Novedades normativas',
            href: '/admin/normas',
            hint: '⌘7',
          },
          {
            group: 'Navegar',
            icon: UserCog,
            label: 'Admins & Roles',
            href: '/admin/admins',
          },
          {
            group: 'Navegar',
            icon: Settings,
            label: 'Sistema',
            href: '/admin/configuracion',
          },
          {
            group: 'Acciones',
            icon: Users,
            label: 'Ver cartera completa',
            href: '/admin/empresas',
          },
          {
            group: 'Acciones',
            icon: FileText,
            label: 'Ver auditoría global',
            href: '/admin/auditoria',
          },
        ]}
      />
    </div>
  )
}
