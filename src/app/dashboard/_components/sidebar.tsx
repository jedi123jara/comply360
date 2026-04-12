'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  Calculator,
  Bell,
  Settings,
  Scale,
  Shield,
  X,
  FolderOpen,
  BarChart3,
  Users,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Bot,
  HardHat,
  GraduationCap,
  Newspaper,
  Plug,
  CreditCard,
  Building2,
  Equal,
  ChevronDown,
  Trophy,
  Workflow,
  Award,
  UserCircle,
  Clock,
  Briefcase,
  Sparkles,
  Code2,
  Radar,
  Laptop2,
  Inbox,
  Store,
  Palette,
  FileStack,
  Siren,
  FileSearch,
  Banknote,
  Receipt,
  FileSpreadsheet,
  CalendarRange,
  Sun,
  ClipboardList,
  ScrollText,
} from 'lucide-react';
import { NAV_GROUPS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  LayoutDashboard,
  Users,
  FileText,
  Calculator,
  Calendar,
  Bell,
  Settings,
  FolderOpen,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Bot,
  HardHat,
  GraduationCap,
  Newspaper,
  Plug,
  CreditCard,
  Building2,
  Equal,
  Trophy,
  Workflow,
  Award,
  UserCircle,
  Clock,
  Briefcase,
  Sparkles,
  Code2,
  Radar,
  Laptop2,
  Inbox,
  Store,
  Palette,
  FileStack,
  Siren,
  FileSearch,
  Banknote,
  Receipt,
  FileSpreadsheet,
  CalendarRange,
  Sun,
  ClipboardList,
  ScrollText,
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

// Badge counts for sidebar items — fetch once on mount, no polling
function useBadgeCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/alerts/counts')
      .then(r => r.json())
      .then(data => {
        const badges: Record<string, number> = {}
        if (data.pendingAlerts > 0) badges['/dashboard/alertas'] = data.pendingAlerts
        if (data.expiringContracts > 0) badges['/dashboard/contratos'] = data.expiringContracts
        setCounts(badges)
      })
      .catch(() => {})
    // No polling — badges refresh on page navigation
  }, [])
  return counts
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const badgeCounts = useBadgeCounts();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  // Find which group contains the current active route
  function getActiveGroupKey(): string {
    for (const group of NAV_GROUPS) {
      if (group.items.some(item => isActive(item.href))) return group.key;
    }
    return 'principal';
  }

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const key = getActiveGroupKey();
    return NAV_GROUPS.reduce((acc, g) => ({ ...acc, [g.key]: g.key === key }), {});
  });

  // Auto-expand the group that contains the active route when pathname changes
  useEffect(() => {
    const key = getActiveGroupKey();
    setExpanded(prev => ({ ...prev, [key]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(key: string) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6">
        <Shield className="h-6 w-6 text-gold" />
        <span className="text-xl font-bold tracking-wide text-white">
          COMPLY<span className="text-gold">360</span>
        </span>
      </div>

      {/* Nav groups */}
      <nav className="mt-2 flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => {
          const isPrincipal = group.key === 'principal';
          const isExpanded = expanded[group.key] ?? false;
          const hasActiveItem = group.items.some(item => isActive(item.href));

          return (
            <div key={group.key} className="mt-2">
              {/* Group header — "Principal" is just a label, others are toggles */}
              {isPrincipal ? null : (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={isExpanded}
                  aria-controls={`nav-group-${group.key}`}
                  aria-label={`${isExpanded ? 'Colapsar' : 'Expandir'} sección ${group.label}`}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-1.5 rounded-md transition-colors',
                    hasActiveItem && !isExpanded
                      ? 'text-gold'
                      : 'text-gray-500 hover:text-gray-300',
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest">
                    {group.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform duration-200',
                      isExpanded ? 'rotate-180' : '',
                    )}
                  />
                </button>
              )}

              {/* Group items */}
              <div
                id={`nav-group-${group.key}`}
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  isPrincipal || isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0',
                )}
              >
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = ICON_MAP[item.icon];
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          active
                            ? 'border-l-[3px] border-gold bg-sidebar-active text-white'
                            : 'border-l-[3px] border-transparent text-gray-400 hover:bg-sidebar-hover hover:text-white',
                        )}
                      >
                        {Icon && (
                          <Icon
                            className={cn(
                              'h-5 w-5 shrink-0 transition-colors',
                              active ? 'text-gold' : 'text-gray-500 group-hover:text-gray-300',
                            )}
                          />
                        )}
                        {item.label}
                        {badgeCounts[item.href] > 0 && (
                          <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                            {badgeCounts[item.href] > 99 ? '99+' : badgeCounts[item.href]}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            C3
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">COMPLY360</p>
            <span className="inline-block rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
              PRO
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        {sidebarContent}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-64 flex-col animate-slide-in">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-4 z-10 rounded-md p-1 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar menu</span>
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
