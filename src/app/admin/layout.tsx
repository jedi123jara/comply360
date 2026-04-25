/**
 * Server Component layout — fija el comportamiento dinámico de todo /admin/*.
 * Esto evita que Next.js intente prerender páginas que dependen de sesión Clerk.
 * El shell visual (sidebar + topbar + palette) vive en admin-layout-client.tsx.
 */
import './admin.css'
import { AdminLayoutClient } from './admin-layout-client'

export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
