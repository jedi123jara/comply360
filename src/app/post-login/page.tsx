/**
 * /post-login — Ruta intermedia post-signin.
 *
 * Lee el role del usuario autenticado y redirige a la sección que le
 * corresponde:
 *   - SUPER_ADMIN  → /admin            (Founder Console)
 *   - WORKER       → /mi-portal        (Portal del trabajador)
 *   - cuenta dual  → /elegir-acceso    (Empresa o trabajador)
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
import { resolveWorkerForAuth } from '@/lib/worker-auth'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ intent?: string | string[] }>

export default async function PostLoginPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const ctx = await getAuthContext()

  if (!ctx) {
    redirect('/sign-in')
  }

  const params = searchParams ? await searchParams : {}
  const rawIntent = params.intent
  const intent = Array.isArray(rawIntent) ? rawIntent[0] : rawIntent
  const worker = await resolveWorkerForAuth(ctx)

  if (intent === 'worker') {
    if (worker || ctx.role === 'WORKER') {
      redirect('/mi-portal')
    }
    redirect('/mi-portal/registrarse')
  }

  switch (ctx.role) {
    case 'SUPER_ADMIN':
      redirect('/admin')
    case 'WORKER':
      redirect('/mi-portal')
    default:
      if (worker) {
        redirect('/elegir-acceso')
      }
      redirect('/dashboard')
  }
}
