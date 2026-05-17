'use client'

import { useEffect, useState } from 'react'
import { SignUp, useClerk, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface MeResponse {
  role?: string
}

interface MeState {
  userId: string
  role: string | null
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
        if (!cancelled) setMe({ userId: signedInUserId, role: me?.role ?? null })
      })
      .catch(() => {
        if (!cancelled) setMe({ userId: signedInUserId, role: null })
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
    const isWorker = role === 'WORKER'
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
                {isWorker ? 'Ya tienes una cuenta de trabajador abierta' : 'Estás usando una cuenta empresarial'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {isWorker
                  ? 'Puedes entrar directamente a tu portal.'
                  : 'Para aceptar una invitación de trabajador, primero cierra esta sesión y vuelve a abrir el enlace con el correo del trabajador.'}
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
                onClick={() => signOut({ redirectUrl: '/mi-portal/registrarse' })}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Cerrar sesión y crear cuenta de trabajador
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
    <div className="rounded-2xl bg-white p-2 shadow-2xl shadow-emerald-100 ring-1 ring-emerald-100 sm:p-4">
      <SignUp
        forceRedirectUrl="/mi-portal/bienvenida"
        fallbackRedirectUrl="/mi-portal/bienvenida"
        signInUrl="/sign-in"
        unsafeMetadata={{ signupAs: 'WORKER' }}
        appearance={{
          variables: {
            colorPrimary: '#2563eb',
            colorText: '#0f172a',
            colorTextSecondary: '#64748b',
            colorBackground: '#ffffff',
            colorInputBackground: '#ffffff',
            colorInputText: '#0f172a',
            borderRadius: '12px',
            fontFamily: 'var(--font-jakarta), var(--font-geist-sans), sans-serif',
          },
          elements: {
            rootBox: 'mx-auto w-full',
            card: 'shadow-none border-none',
            headerTitle: 'text-emerald-700 text-xl',
            headerSubtitle: 'text-slate-600 text-sm',
            formButtonPrimary:
              'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md',
            footerAction: 'text-emerald-700',
            identityPreviewEditButton: 'text-emerald-700',
            formFieldInput:
              'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20',
            socialButtonsBlockButton: 'border-slate-200 hover:bg-slate-50',
          },
        }}
      />
    </div>
  )
}
