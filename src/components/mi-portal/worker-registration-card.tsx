'use client'

import { useEffect, useState } from 'react'
import { SignUp, useClerk, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { workerAuthAppearance } from '@/components/mi-portal/worker-auth-appearance'

interface MeResponse {
  role?: string
  workerId?: string | null
}

interface MeState {
  userId: string
  role: string | null
  workerId: string | null
}

export function WorkerRegistrationCard() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const [me, setMe] = useState<MeState | null>(null)
  const signedInUserId = user?.id ?? null

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !signedInUserId) return

    let cancelled = false
    fetch('/api/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((me: MeResponse | null) => {
        if (!cancelled) setMe({ userId: signedInUserId, role: me?.role ?? null, workerId: me?.workerId ?? null })
      })
      .catch(() => {
        if (!cancelled) setMe({ userId: signedInUserId, role: null, workerId: null })
      })

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, signedInUserId])

  const role = me?.userId === signedInUserId ? me.role : null
  const checkingRole = isSignedIn && (!me || me.userId !== signedInUserId)

  if (!isLoaded || checkingRole) {
    return (
      <div className="min-h-[420px] rounded-2xl bg-[#ffffff] p-6 shadow-2xl shadow-emerald-950/20 ring-1 ring-white/70">
        <div className="h-5 w-40 animate-pulse rounded bg-[#e2e8f0]" />
        <div className="mt-4 h-10 w-full animate-pulse rounded bg-[#e2e8f0]" />
        <div className="mt-3 h-10 w-full animate-pulse rounded bg-[#e2e8f0]" />
        <div className="mt-6 h-11 w-full animate-pulse rounded bg-[#e2e8f0]" />
      </div>
    )
  }

  if (isSignedIn) {
    const isWorker = role === 'WORKER' || Boolean(me?.workerId)
    const dashboardHref = role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'

    return (
      <div className="rounded-2xl bg-[#ffffff] p-5 shadow-2xl shadow-emerald-950/20 ring-1 ring-white/70">
        <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fef3c7] text-[#b45309]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#b45309]">
                Sesión activa
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#0f172a]">
                {isWorker ? 'Ya tienes acceso a tu portal trabajador' : 'Estás usando una cuenta empresarial'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#334155]">
                {isWorker
                  ? 'Puedes entrar directamente. Si también tienes panel empresa, Comply360 mantendrá ambos accesos separados.'
                  : 'Para aceptar una invitación de trabajador, entra con el correo del trabajador invitado. Si esta misma cuenta tiene ficha laboral, se vinculará automáticamente.'}
              </p>
              {user?.primaryEmailAddress?.emailAddress && (
                <p className="mt-2 truncate rounded-lg bg-[#ffffff] px-3 py-2 text-xs font-mono text-[#475569] ring-1 ring-[#fde68a]">
                  {user.primaryEmailAddress.emailAddress}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {isWorker ? (
              <Link
                href="/mi-portal"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Ir a mi portal
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => signOut({ redirectUrl: '/mi-portal/ingresar' })}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Cerrar sesión e ingresar como trabajador
              </button>
            )}
            <Link
              href={isWorker ? '/' : dashboardHref}
              className="inline-flex items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm font-semibold text-[#334155] transition-colors hover:bg-[#f8fafc]"
            >
              {isWorker ? 'Volver al inicio' : 'Volver al panel empresa'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[28px] bg-[#ffffff] p-4 shadow-2xl shadow-emerald-950/30 ring-1 ring-white/70 sm:p-6">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#047857]">
          Crear cuenta trabajador
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#0f172a]">
          Accede a tu portal personal
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#475569]">
          Usa el correo donde recibiste la invitación. Si tu empresa ya te registró,
          el vínculo se completa automáticamente.
        </p>
      </div>
      <SignUp
        routing="hash"
        forceRedirectUrl="/mi-portal/bienvenida"
        fallbackRedirectUrl="/mi-portal/bienvenida"
        signInUrl="/mi-portal/ingresar"
        unsafeMetadata={{ signupAs: 'WORKER' }}
        appearance={workerAuthAppearance}
      />
    </div>
  )
}
