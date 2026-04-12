'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, User, FileText, Receipt, BookOpen, GraduationCap,
  ClipboardList, Shield, Bell, LogOut, Menu, X
} from 'lucide-react'

const NAV = [
  { href: '/mi-portal', label: 'Inicio', icon: Home },
  { href: '/mi-portal/perfil', label: 'Mi Perfil', icon: User },
  { href: '/mi-portal/documentos', label: 'Mis Documentos', icon: FileText },
  { href: '/mi-portal/boletas', label: 'Boletas de Pago', icon: Receipt },
  { href: '/mi-portal/reglamento', label: 'RIT y Politicas', icon: BookOpen },
  { href: '/mi-portal/capacitaciones', label: 'Capacitaciones', icon: GraduationCap },
  { href: '/mi-portal/solicitudes', label: 'Mis Solicitudes', icon: ClipboardList },
  { href: '/mi-portal/denuncias', label: 'Canal Denuncias', icon: Shield },
  { href: '/mi-portal/notificaciones', label: 'Notificaciones', icon: Bell },
]

export default function MiPortalLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-[#141824] border-r border-slate-200
        transform transition-transform duration-200 lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200">
          <div>
            <div className="text-lg font-bold text-blue-900">COMPLY 360</div>
            <div className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold">
              Portal Trabajador
            </div>
          </div>
          <button
            className="lg:hidden p-1 text-slate-500"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/mi-portal' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-100'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200">
          <Link
            href="/sign-out"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesion</span>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="h-16 bg-[#141824] border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <button
            className="lg:hidden p-2 text-slate-600"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 lg:flex-none">
            <h1 className="text-base font-semibold text-slate-900">Mi Portal Laboral</h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Gestiona tu informacion, documentos y solicitudes
            </p>
          </div>
        </header>

        <main className="p-4 lg:p-8 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  )
}
