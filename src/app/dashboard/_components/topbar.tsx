'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Bell, ChevronRight, AlertTriangle, Clock, X, CheckCircle2, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useUser, useClerk } from '@clerk/nextjs';

interface TopbarProps {
  onMenuToggle: () => void;
}

interface Crumb {
  label: string;
  href: string;
}

interface OrgAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolvedAt: string | null;
  createdAt: string;
}

// Human-readable labels for common sub-segments
const SEGMENT_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  editar: 'Editar',
  configuracion: 'Configuracion',
}

function isId(segment: string): boolean {
  return segment.length > 12 && /^[a-z0-9]+$/.test(segment)
}

function useBreadcrumb(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Dashboard', href: '/dashboard' }]

  const match = NAV_ITEMS.find((item) =>
    pathname === '/dashboard'
      ? item.href === '/dashboard'
      : pathname.startsWith(item.href) && item.href !== '/dashboard',
  )

  if (match && match.href !== '/dashboard') {
    crumbs.push({ label: match.label, href: match.href })
  }

  const segments = pathname.replace('/dashboard', '').split('/').filter(Boolean)
  if (segments.length > 1) {
    const last = segments[segments.length - 1]
    const label = SEGMENT_LABELS[last] ?? (isId(last) ? 'Detalle' : last.charAt(0).toUpperCase() + last.slice(1))
    crumbs.push({ label, href: pathname })
  }

  return crumbs
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-600 text-red-400',
  HIGH: 'text-orange-600 text-orange-400',
  MEDIUM: 'text-amber-600 text-amber-400',
  LOW: 'text-blue-600 text-blue-400',
}
const SEVERITY_BG: Record<string, string> = {
  CRITICAL: 'bg-red-100 bg-red-900/40',
  HIGH: 'bg-orange-100 bg-orange-900/40',
  MEDIUM: 'bg-amber-100 bg-amber-900/40',
  LOW: 'bg-blue-100 bg-blue-900/40',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const crumbs = useBreadcrumb(pathname);
  const { user } = useUser();
  const { signOut } = useClerk();

  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  useEffect(() => { setMounted(true); }, []);
  const [alerts, setAlerts] = useState<OrgAlert[]>([]);
  const [unread, setUnread] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch normative alerts from /api/alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/alerts');
        if (!res.ok) return;
        const json = await res.json();
        // Normalize: API returns { data: [...], stats: { unread } }
        const raw = json.data ?? [];
        const items: OrgAlert[] = raw
          .filter((a: Record<string, unknown>) => a.orgStatus !== 'DISMISSED')
          .slice(0, 8)
          .map((a: Record<string, unknown>) => ({
            id: a.id as string,
            type: a.normCategory as string ?? 'NORMATIVA',
            title: a.title as string,
            message: a.summary as string ?? '',
            severity: (a.impactLevel as string) ?? 'MEDIUM',
            resolvedAt: (a.isRead as boolean) ? 'read' : null,
            createdAt: a.publishedAt as string ?? new Date().toISOString(),
          }));
        setAlerts(items);
        setUnread(json.stats?.unread ?? items.filter((a) => !a.resolvedAt).length);
      } catch {
        // silently fail — notification bell is non-critical
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowDropdown(false);
      }
      // For user menu: check if click is outside trigger AND outside the portal menu
      const triggerContainsTarget = userMenuRef.current?.contains(target);
      const portalMenu = document.getElementById('user-menu-portal');
      const portalContainsTarget = portalMenu?.contains(target);
      if (!triggerContainsTarget && !portalContainsTarget) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);


  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.firstName
      ? user.firstName[0].toUpperCase()
      : 'LP';

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center border-b border-white/[0.08] bg-[#141824] px-4 sm:px-6 transition-colors">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-md p-2 text-gray-500 text-gray-400 hover:bg-white/[0.04] hover:text-gray-300 hover:text-gray-200 lg:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </button>

        <nav aria-label="Breadcrumb" className="hidden sm:block">
          <ol className="flex items-center gap-1 text-sm">
            {crumbs.map((crumb, idx) => {
              const isLast = idx === crumbs.length - 1
              return (
                <li key={crumb.href + idx} className="flex items-center gap-1">
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400 text-gray-500" />}
                  {isLast ? (
                    <span className="font-medium text-white text-gray-100">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className={cn('text-gray-500 hover:text-gray-300 text-gray-400 hover:text-gray-200 transition-colors')}
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative rounded-md p-2 text-gray-500 text-gray-400 hover:bg-white/[0.04] hover:text-gray-300 hover:text-gray-200 transition-colors"
            aria-label={`${unread} alertas sin resolver`}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#141824] rounded-xl shadow-xl border border-white/[0.08] z-50 overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] border-white/[0.08]">
                <h3 className="text-sm font-semibold text-white text-gray-100 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Alertas
                  {unread > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 bg-red-900/40 text-red-700 text-red-300 font-bold">
                      {unread}
                    </span>
                  )}
                </h3>
                <button onClick={() => setShowDropdown(false)} className="text-gray-400 hover:text-gray-600 hover:text-gray-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Alert list */}
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 divide-slate-700">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                    <p className="text-sm text-gray-500 text-gray-400">Sin alertas pendientes</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        'px-4 py-3 hover:bg-white/[0.02] hover:bg-white/[0.04]/50 transition-colors',
                        !alert.resolvedAt && 'border-l-2',
                        !alert.resolvedAt && alert.severity === 'CRITICAL' ? 'border-l-red-500' :
                          !alert.resolvedAt && alert.severity === 'HIGH' ? 'border-l-orange-500' :
                            !alert.resolvedAt && alert.severity === 'MEDIUM' ? 'border-l-amber-500' :
                              !alert.resolvedAt ? 'border-l-blue-500' : 'border-l-transparent',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={cn('w-4 h-4 mt-0.5 shrink-0', SEVERITY_COLOR[alert.severity] ?? 'text-gray-400')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white text-gray-100 truncate">{alert.title}</p>
                          <p className="text-xs text-gray-500 text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{alert.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', SEVERITY_BG[alert.severity], SEVERITY_COLOR[alert.severity])}>
                              {alert.severity}
                            </span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> {timeAgo(alert.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-white/[0.06] border-white/[0.08] bg-white/[0.02] bg-white/[0.04]/50">
                <Link
                  href="/dashboard/alertas"
                  onClick={() => setShowDropdown(false)}
                  className="text-xs font-semibold text-primary text-blue-400 hover:underline"
                >
                  Ver todas las alertas →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User menu trigger */}
        <div ref={userMenuRef}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              if (!showUserMenu && triggerRef.current) {
                const r = triggerRef.current.getBoundingClientRect()
                setMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
              }
              setShowUserMenu(v => !v)
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-white text-gray-100 leading-tight max-w-[120px] truncate">
                {user?.firstName ?? 'Usuario'}
              </p>
              <p className="text-[10px] text-gray-500 text-gray-400 leading-tight max-w-[120px] truncate">
                {user?.primaryEmailAddress?.emailAddress ?? ''}
              </p>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform hidden sm:block', showUserMenu && 'rotate-180')} />
          </button>
        </div>

      </div>

      {/* User dropdown — renderizado en document.body via Portal para evitar stacking contexts */}
      {mounted && showUserMenu && createPortal(
        <div
          id="user-menu-portal"
          style={{
            position: 'fixed',
            top: menuPos.top,
            right: menuPos.right,
            zIndex: 2147483647,
            width: 240,
          }}
          className="rounded-xl shadow-2xl border border-white/[0.08] bg-[#141824] overflow-hidden"
        >
          {/* Cabecera */}
          <div className="px-4 py-3 border-b border-white/[0.06] border-white/[0.08] bg-white/[0.02] bg-white/[0.04]/50">
            <p className="text-xs font-bold text-white text-gray-100 truncate">
              {user?.fullName ?? 'Usuario'}
            </p>
            <p className="text-[11px] text-gray-500 text-gray-400 truncate mt-0.5">
              {user?.primaryEmailAddress?.emailAddress ?? ''}
            </p>
          </div>

          {/* Opciones — botones nativos, 100% del ancho clickeable */}
          <div style={{ display: 'block', width: '100%', padding: '4px 0' }}>
            {[
              { href: '/dashboard/configuracion/empresa', icon: User, label: 'Mi perfil / Empresa' },
              { href: '/dashboard/configuracion', icon: Settings, label: 'Configuración' },
              { href: '/dashboard/configuracion/equipo', icon: User, label: 'Mi equipo' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push(item.href);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 16px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                  className="text-gray-300 hover:bg-white/[0.04] transition-colors"
                >
                  <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cerrar sesión */}
          <div className="border-t border-white/[0.06] border-white/[0.08]" style={{ padding: '4px 0' }}>
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(false);
                signOut({ redirectUrl: '/sign-in' });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
              className="text-red-600 text-red-400 hover:bg-red-50 hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span style={{ flex: 1, textAlign: 'left' }}>Cerrar sesión</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
