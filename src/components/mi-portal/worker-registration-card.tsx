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
      <div className="min-h-[420px] rounded-2xl bg-white p-6 shadow-2xl shadow-emerald-100 ring-1 ring-emerald-100">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-10 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-10 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-6 h-11 w-full animate-pulse rounded bg-slate-100" />
      </div>
    )
  }

  if (isSignedIn) {
    const isWorker = role === 'WORKER' || Boolean(me?.workerId)
    const dashboardHref = role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'

    return (
      <div className="rounded-2xl bg-white p-5 shadow-2xl shadow-emerald-100 ring-1 ring-emerald-100">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
                Sesión activa
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">
                {isWorker ? 'Ya tienes acceso a tu portal trabajador' : 'Estás usando una cuenta empresarial'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {isWorker
                  ? 'Puedes entrar directamente. Si también tienes panel empresa, Comply360 mantendrá ambos accesos separados.'
                  : 'Para aceptar una invitación de trabajador, entra con el correo del trabajador invitado. Si esta misma cuenta tiene ficha laboral, se vinculará automáticamente.'}
              </p>
              {user?.primaryEmailAddress?.emailAddress && (
                <p className="mt-2 truncate rounded-lg bg-white px-3 py-2 text-xs font-mono text-slate-600 ring-1 ring-amber-200">
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
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {isWorker ? 'Volver al inicio' : 'Volver al panel empresa'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[28px] bg-white p-5 shadow-2xl shadow-emerald-950/30 ring-1 ring-white/70 sm:p-6">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          Crear cuenta trabajador
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Accede a tu portal personal
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Usa el correo donde recibiste la invitación. Si tu empresa ya te registró,
          el vínculo se completa automáticamente.
        </p>
      </div>
      <SignUp
        forceRedirectUrl="/mi-portal/bienvenida"
        fallbackRedirectUrl="/mi-portal/bienvenida"
        signInUrl="/mi-portal/ingresar"
        unsafeMetadata={{ signupAs: 'WORKER' }}
        appearance={workerAuthAppearance}
      />
    </div>
  )
}
