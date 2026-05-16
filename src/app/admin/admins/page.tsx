'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Check, Loader2, Mail, UserPlus, X } from 'lucide-react'
import { confirm } from '@/components/ui/confirm-dialog'
import { fmtN, Monogram } from '@/components/admin/primitives'

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

const TITLE_BADGE: Record<string, string> = {
  Founder: 'a-badge-gold',
  Admin: 'a-badge-cyan',
  Developer: 'a-badge-emerald',
  Marketing: 'a-badge-amber',
  Diseño: 'a-badge-cyan',
  Ventas: 'a-badge-emerald',
  Otro: 'a-badge-neutral',
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
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      void refresh()
    })
    return () => {
      cancelled = true
    }
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
          (data.pending
            ? `Invitación enviada a ${data.email}`
            : `Admin ${data.user?.email} promovido`),
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
    const ok = await confirm({
      title: '¿Revocar acceso de administrador?',
      description: `${targetEmail} dejará de tener acceso al Founder Console. Su rol volverá a OWNER (admin de su propia organización, no de la plataforma).`,
      confirmLabel: 'Revocar acceso',
      tone: 'danger',
    })
    if (!ok) return
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
    <>
      <div className="a-page-head">
        <div>
          <div className="crumbs">Plataforma · Admins</div>
          <h1>
            Administradores <em>de la plataforma</em>
          </h1>
          <div className="sub">
            Invitá colaboradores con acceso al Founder Console. Todos tienen los mismos permisos;
            el título es solo para saber quién es quién.
          </div>
        </div>
      </div>

      {flash && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 18,
            fontSize: 13,
            background: flash.type === 'success' ? 'var(--emerald-50)' : 'var(--crimson-50)',
            border:
              flash.type === 'success'
                ? '1px solid var(--border-emerald)'
                : '1px solid var(--border-crimson)',
            color: flash.type === 'success' ? 'var(--emerald-700)' : 'var(--crimson-700)',
          }}
        >
          {flash.type === 'success' ? (
            <Check size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          ) : (
            <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          )}
          <span style={{ flex: 1 }}>{flash.msg}</span>
          <button
            type="button"
            onClick={() => setFlash(null)}
            aria-label="Cerrar"
            style={{
              background: 'none',
              border: 'none',
              color: 'currentColor',
              opacity: 0.6,
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Invite form */}
      <div className="a-card" style={{ marginBottom: 18 }}>
        <div className="a-head">
          <div>
            <div className="a-head-title">
              <UserPlus size={14} style={{ color: 'var(--emerald-600)' }} /> Invitar nuevo
              administrador
            </div>
            <div className="a-head-sub">
              Si el email ya tiene cuenta, se promueve al instante. Si no, recibe link de registro.
            </div>
          </div>
        </div>
        <form
          onSubmit={onInvite}
          style={{
            padding: 18,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            type="email"
            required
            placeholder="colaborador@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="a-input"
            style={{ flex: '1 1 260px', maxWidth: 480 }}
          />
          <select
            value={title}
            onChange={(e) => setTitle(e.target.value as (typeof TITLES)[number])}
            className="a-input"
            style={{ width: 160 }}
          >
            {TITLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button type="submit" disabled={submitting} className="a-btn a-btn-primary">
            {submitting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Mail size={13} />
            )}{' '}
            {submitting ? 'Enviando…' : 'Invitar'}
          </button>
        </form>
      </div>

      {/* Active admins */}
      <div className="a-card" style={{ marginBottom: 18 }}>
        <div className="a-head">
          <div>
            <div className="a-head-title">
              Administradores activos{' '}
              <span className="a-tab-count">{fmtN(admins.length)}</span>
            </div>
            <div className="a-head-sub">Con acceso a /admin/*</div>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 13,
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <Loader2 size={14} className="animate-spin" /> Cargando…
          </div>
        ) : admins.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            Todavía no hay administradores. Invitá al primero arriba.
          </div>
        ) : (
          <div>
            {admins.map((a, i) => {
              const name =
                [a.firstName, a.lastName].filter(Boolean).join(' ').trim() || a.email.split('@')[0]
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 18px',
                    borderBottom:
                      i < admins.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <Monogram name={name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                        {name}
                      </span>
                      <span className={`a-badge ${TITLE_BADGE[a.title] ?? 'a-badge-neutral'}`}>
                        {a.title}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {a.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRevoke(a.email)}
                    className="a-btn a-btn-ghost a-btn-sm"
                    style={{ color: 'var(--crimson-600)' }}
                  >
                    Revocar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="a-card">
          <div className="a-head">
            <div>
              <div className="a-head-title">
                Invitaciones pendientes{' '}
                <span className="a-tab-count">{fmtN(pending.length)}</span>
              </div>
              <div className="a-head-sub">Se activan automáticamente al registrarse</div>
            </div>
          </div>
          <div>
            {pending.map((p, i) => (
              <div
                key={p.logId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 18px',
                  borderBottom:
                    i < pending.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--neutral-100)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--text-tertiary)',
                    flexShrink: 0,
                  }}
                >
                  <Mail size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                      {p.email}
                    </span>
                    <span className={`a-badge ${TITLE_BADGE[p.title] ?? 'a-badge-neutral'}`}>
                      {p.title}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Invitado el{' '}
                    {new Date(p.invitedAt).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRevoke(p.email)}
                  className="a-btn a-btn-ghost a-btn-sm"
                  style={{ color: 'var(--crimson-600)' }}
                >
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
