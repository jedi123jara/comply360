'use client'

import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { AdminShell } from '@/components/admin/admin-shell'

const SEGMENT_LABEL: Record<string, string> = {
  empresas: 'Empresas',
  admins: 'Admins & Roles',
  billing: 'Billing & Planes',
  analytics: 'Analytics',
  soporte: 'Soporte',
  auditoria: 'Auditoría',
  configuracion: 'Sistema',
  normas: 'Novedades normativas',
}

function titleize(segment: string): string {
  return (
    SEGMENT_LABEL[segment] ??
    segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
  )
}

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useUser()

  const crumbs = (() => {
    if (!pathname) return []
    const segments = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean)
    return segments.slice(0, 3).map(titleize)
  })()

  const userName =
    user?.fullName ??
    user?.firstName ??
    user?.primaryEmailAddress?.emailAddress ??
    'Founder'

  const initials = (() => {
    if (user?.firstName || user?.lastName) {
      return (
        `${(user?.firstName ?? '')[0] ?? ''}${(user?.lastName ?? '')[0] ?? ''}`.toUpperCase() ||
        'F'
      )
    }
    const email = user?.primaryEmailAddress?.emailAddress
    return (email?.[0] ?? 'F').toUpperCase()
  })()

  return (
    <AdminShell crumbs={crumbs} userName={userName} userInitials={initials} userRole="FOUNDER">
      {children}
    </AdminShell>
  )
}
