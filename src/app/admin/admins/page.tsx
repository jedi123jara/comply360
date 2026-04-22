'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Crown, Mail, X, Loader2, Check, AlertCircle } from 'lucide-react'

type Admin = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  createdAt: string
  orgId: string | null
  title: string
}
type Pending = {
  email: string
  title: string
  invitedAt: string
  logId: string
}

const TITLES = ['Founder', 'Admin', 'Developer', 'Marketing', 'Diseño', 'Ventas', 'Otro'] as const

const TITLE_COLOR: Record<string, string> = {
  Founder: 'bg-amber-100 text-amber-800 ring-amber-200',
  Admin: 'bg-blue-100 text-blue-800 ring-blue-200',
  Developer: 'bg-violet-100 text-violet-800 ring-violet-200',
  Marketing: 'bg-pink-100 text-pink-800 ring-pink-200',
  Diseño: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  Ventas: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  Otro: 'bg-slate-100 text-slate-700 ring-slate-200',
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [pending, setPending] = useState<Pending[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState<(typeof TITLES)[number]>('Admin')
  const [submitting, setSubmitting] = useState(false)
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/admins', { cache: 'no-store' })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error ?? 'Error cargando admins')
      setAdmins(data.admins ?? [])
      setPending(data.pending ?? [])
    } catch (e) {
      setFlash({ type: 'error', msg: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void refresh()
  }, [])

  async function onInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setFlash({ type: 'error', msg: 'Email inválido' })
      return
    }
    setSubmitting(true)
    setFlash(null)
    try {
      const r = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), title }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error ?? 'Error al invitar')
      setFlash({
        type: 'success',
        msg:
          data.message ??
          (data.pending ? `Invitación enviada a ${data.email}` : `Admin ${data.user?.email} promovido`),
      })
      setEmail('')
      setTitle('Admin')
      await refresh()
    } catch (err) {
      setFlash({ type: 'error', msg: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  async function onRevoke(targetEmail: string) {
    if (!confirm(`¿Revocar acceso de admin a ${targetEmail}?`)) return
    setFlash(null)
    try {
      const r = await fetch(`/api/admin/admins?email=${encodeURIComponent(targetEmail)}`, {
        method: 'DELETE',
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error ?? 'Error al revocar')
      setFlash({
        type: 'success',
        msg: data.revoked === 'pending' ? 'Invitación cancelada' : 'Acceso revocado',
      })
      await refresh()
    } catch (err) {
      setFlash({ type: 'error', msg: (err as Error).message })
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Crown className="w-6 h-6 text-amber-500" />
          Administradores de la plataforma
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Invitá colaboradores con acceso al panel global. Todos tienen los mismos permisos; el
          título es solo para saber quién es quién.
        </p>
      </header>

      {flash && (
        <div
          role="alert"
          className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
            flash.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
              : 'bg-red-50 text-red-800 ring-1 ring-red-200'
          }`}
        >
          {flash.type === 'success' ? (
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <span>{flash.msg}</span>
          <button
            className="ml-auto text-slate-400 hover:text-slate-600"
            onClick={() => setFlash(null)}
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Invite form */}
      <div className="rounded-xl bg-white ring-1 ring-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Invitar nuevo administrador
        </h3>
        <form onSubmit={onInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            placeholder="colaborador@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          <select
            value={title}
            onChange={(e) => setTitle(e.target.value as (typeof TITLES)[number])}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            {TITLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            {submitting ? 'Enviando...' : 'Invitar'}
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-3">
          Si el email ya tiene cuenta en Comply360, se promueve al instante. Si no, recibe un email
          con link de registro y al entrar se activa automáticamente.
        </p>
      </div>

      {/* Admins list */}
      <div className="rounded-xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Administradores activos{' '}
            <span className="text-slate-400 font-normal">({admins.length})</span>
          </h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando...
          </div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Todavía no hay administradores. Invitá al primero arriba.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {admins.map((a) => {
              const name =
                [a.firstName, a.lastName].filter(Boolean).join(' ').trim() || a.email.split('@')[0]
              return (
                <li key={a.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">{name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${TITLE_COLOR[a.title] ?? TITLE_COLOR.Otro}`}
                      >
                        {a.title}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">{a.email}</div>
                  </div>
                  <button
                    onClick={() => onRevoke(a.email)}
                    className="text-xs text-slate-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Revocar
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="rounded-xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Invitaciones pendientes{' '}
              <span className="text-slate-400 font-normal">({pending.length})</span>
            </h3>
            <span className="text-xs text-slate-400">
              Se activan automáticamente al registrarse
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {pending.map((p) => (
              <li key={p.logId} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-700 truncate">{p.email}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${TITLE_COLOR[p.title] ?? TITLE_COLOR.Otro}`}
                    >
                      {p.title}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Invitado el {new Date(p.invitedAt).toLocaleDateString('es-PE')}
                  </div>
                </div>
                <button
                  onClick={() => onRevoke(p.email)}
                  className="text-xs text-slate-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
