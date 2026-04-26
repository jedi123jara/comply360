/**
 * /post-login — Ruta intermedia post-signin.
 *
 * Lee el role del usuario autenticado y redirige a la sección que le
 * corresponde:
 *   - SUPER_ADMIN  → /admin            (Founder Console)
 *   - WORKER       → /mi-portal        (Portal del trabajador)
 *   - resto        → /dashboard        (Panel empresa)
 *
 * Si por alguna razón no hay sesión (cookies expiradas, redirect roto),
 * vuelve a /sign-in.
 *
 * Server Component: el redirect se decide en el server, no en el cliente.
 * Eso evita el flash visual de "/dashboard" antes de saltar a "/admin".
 */

import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function PostLoginPage() {
  const ctx = await getAuthContext()

  if (!ctx) {
    redirect('/sign-in')
  }

  switch (ctx.role) {
    case 'SUPER_ADMIN':
      redirect('/admin')
    case 'WORKER':
      redirect('/mi-portal')
    default:
      redirect('/dashboard')
  }
}
