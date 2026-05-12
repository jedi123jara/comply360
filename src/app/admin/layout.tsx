/**
 * Server Component layout — fija el comportamiento dinámico de todo /admin/*.
 * Esto evita que Next.js intente prerender páginas que dependen de sesión Clerk.
 * El shell visual (sidebar + topbar + palette) vive en admin-layout-client.tsx.
 */
import './admin.css'
import { AdminLayoutClient } from './admin-layout-client'
import { getAuthContext } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext()
  if (ctx?.role !== 'SUPER_ADMIN') {
    redirect(ctx?.role === 'WORKER' ? '/mi-portal' : '/dashboard')
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
