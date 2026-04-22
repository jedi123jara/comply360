'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, CreditCard, LifeBuoy, ShieldCheck,
  Settings, BarChart3, LogOut, Menu, X, Sparkles, UserCog
} from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Vista general', icon: LayoutDashboard },
  { href: '/admin/empresas', label: 'Empresas', icon: Building2 },
  { href: '/admin/admins', label: 'Administradores', icon: UserCog },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/admin/soporte', label: 'Soporte', icon: LifeBuoy },
  { href: '/admin/auditoria', label: 'Auditoría', icon: ShieldCheck },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-100">
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 text-white border-r border-slate-800
        transform transition-transform duration-200 lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              COMPLY 360
            </div>
            <div className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
              Panel Plataforma
            </div>
          </div>
          <button
            className="lg:hidden p-1 text-slate-400"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800">
          <Link
            href="/sign-out"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesion</span>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <button
            className="lg:hidden p-2 text-slate-600"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 lg:flex-none">
            <h1 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Panel de Administración Global
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Acceso restringido a dueños de la plataforma
            </p>
          </div>
        </header>
        <main className="p-4 lg:p-8 max-w-7xl">{children}</main>
      </div>
    </div>
  )
}
