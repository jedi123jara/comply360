'use client'

import { useState, useEffect, useCallback } from 'react'
import { displayWorkerName } from '@/lib/utils'
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Crown,
  Eye,
  Trash2,
  Loader2,
  ChevronDown,
  Clock,
  X,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Search,
} from 'lucide-react'
import Link from 'next/link'

interface TeamMember {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  avatarUrl: string | null
  createdAt: string
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
  createdAt: string
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; description: string }> = {
  OWNER: { label: 'Propietario', color: 'bg-purple-100 text-purple-700 bg-purple-900/30 text-purple-400', icon: Crown, description: 'Acceso total, gestiona pagos y equipo' },
  ADMIN: { label: 'Administrador', color: 'bg-blue-100 text-blue-700 bg-blue-900/30 text-emerald-600', icon: Shield, description: 'Gestiona trabajadores, contratos y configuracion' },
  MEMBER: { label: 'Miembro', color: 'bg-green-100 text-green-700 bg-green-900/30 text-green-400', icon: Users, description: 'Puede ver y crear registros' },
  VIEWER: { label: 'Lector', color: 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] bg-[color:var(--neutral-100)] text-slate-300', icon: Eye, description: 'Solo lectura' },
}

export default function EquipoPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  // ── Herramientas de datos ────────────────────────────────────────────────
  const [fixLoading, setFixLoading]   = useState(false)
  const [fixStatus,  setFixStatus]    = useState<'idle' | 'preview' | 'done'>('idle')
  const [fixPreview, setFixPreview]   = useState<{
    total: number; affected: number; message: string;
    preview: Array<{ dni: string; currentFirstName: string | null; currentLastName: string | null; firstName: string; lastName: string }>
  } | null>(null)
  const [fixResult,  setFixResult]    = useState<{ fixed: number; message: string } | null>(null)
  const [fixError,   setFixError]     = useState<string | null>(null)

  async function analyzeNames() {
    setFixLoading(true)
    setFixError(null)
    setFixResult(null)
    try {
      const res  = await fetch('/api/admin/fix-worker-names')
      const data = await res.json()
      if (!res.ok) { setFixError(data.error ?? 'Error al analizar'); return }
      setFixPreview(data)
      setFixStatus('preview')
    } catch { setFixError('Error de conexion') }
    finally   { setFixLoading(false) }
  }

  async function applyFix() {
    setFixLoading(true)
    setFixError(null)
    try {
      const res  = await fetch('/api/admin/fix-worker-names', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setFixError(data.error ?? 'Error al corregir'); return }
      setFixResult(data)
      setFixStatus('done')
    } catch { setFixError('Error de conexion') }
    finally   { setFixLoading(false) }
  }

  const loadTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/team')
      const data = await res.json()
      setMembers(data.members ?? [])
      setInvitations(data.invitations ?? [])
    } catch {
      console.error('Failed to load team')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      loadTeam()
    })
    return () => {
      cancelled = true
    }
  }, [loadTeam])

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteMsg({ type: 'error', text: data.error ?? 'Error al enviar invitacion' })
      } else {
        setInviteMsg({ type: 'success', text: `Invitacion enviada a ${inviteEmail}` })
        setInviteEmail('')
        loadTeam()
      }
    } catch {
      setInviteMsg({ type: 'error', text: 'Error de conexion' })
    } finally {
      setInviting(false)
    }
  }

  async function changeRole(userId: string, newRole: string) {
    setUpdatingId(userId)
    setActionError(null)
    try {
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error ?? 'Error al cambiar el rol')
      } else {
        loadTeam()
      }
    } catch {
      setActionError('Error de conexion al cambiar el rol')
    } finally {
      setUpdatingId(null)
    }
  }

  async function removeMember(userId: string) {
    setConfirmRemoveId(null)
    setActionError(null)
    try {
      const res = await fetch(`/api/team?userId=${userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error ?? 'Error al eliminar el miembro')
      } else {
        loadTeam()
      }
    } catch {
      setActionError('Error de conexion al eliminar el miembro')
    }
  }

  async function cancelInvite(invitationId: string) {
    setActionError(null)
    try {
      const res = await fetch(`/api/team/invite?id=${invitationId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error ?? 'Error al cancelar la invitacion')
      } else {
        loadTeam()
      }
    } catch {
      setActionError('Error de conexion al cancelar la invitacion')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/dashboard/configuracion" className="hover:text-slate-200">Configuracion</Link>
            <span>/</span>
            <span>Equipo</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Gestion de Equipo</h1>
          <p className="text-gray-400 mt-1">Administra los miembros e invitaciones de tu organizacion.</p>
        </div>
      </div>

      {/* Roles legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <div key={key} className="bg-white rounded-xl border border-white/[0.08] p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-slate-500" />
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
              </div>
              <p className="text-xs text-gray-400">{cfg.description}</p>
            </div>
          )
        })}
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-2xl border border-white/[0.08] p-6">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          Invitar nuevo miembro
        </h2>
        <form onSubmit={sendInvite} className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="correo@empresa.com"
              className="w-full pl-9 pr-4 py-2.5 border border-white/10 border-[color:var(--border-default)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]"
              required
            />
          </div>
          <div className="relative">
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="appearance-none pl-4 pr-8 py-2.5 border border-white/10 border-[color:var(--border-default)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]"
            >
              <option value="MEMBER">Miembro</option>
              <option value="ADMIN">Administrador</option>
              <option value="VIEWER">Lector</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Invitar
          </button>
        </form>
        {inviteMsg && (
          <div className={`mt-3 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
            inviteMsg.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'
          }`}>
            {inviteMsg.text}
            <button onClick={() => setInviteMsg(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {/* Action error banner */}
      {actionError && (
        <div className="px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 bg-red-900/30 text-red-400 border border-red-800">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Members list */}
      <div className="bg-white rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] border-white/[0.08]">
          <h2 className="font-semibold text-white">
            Miembros actuales <span className="text-slate-500 font-normal text-sm">({members.length})</span>
          </h2>
        </div>
        <div className="divide-y divide-gray-100 divide-slate-700">
          {members.map(member => {
            const cfg = ROLE_CONFIG[member.role]
            const isUpdating = updatingId === member.id
            return (
              <div key={member.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-primary">
                  {member.firstName?.[0] ?? member.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {member.firstName || member.lastName
                      ? displayWorkerName(member.firstName, member.lastName)
                      : member.email}
                  </p>
                  <p className="text-xs text-gray-400">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  ) : (
                    <div className="relative">
                      <select
                        value={member.role}
                        onChange={e => changeRole(member.id, e.target.value)}
                        disabled={member.role === 'OWNER'}
                        className={`appearance-none pl-2 pr-6 py-1 text-xs font-semibold rounded-full border-0 outline-none cursor-pointer ${cfg?.color ?? 'bg-[color:var(--neutral-100)] text-gray-600'} disabled:cursor-default`}
                      >
                        <option value="OWNER">Propietario</option>
                        <option value="ADMIN">Administrador</option>
                        <option value="MEMBER">Miembro</option>
                        <option value="VIEWER">Lector</option>
                      </select>
                      {member.role !== 'OWNER' && (
                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                      )}
                    </div>
                  )}
                  {member.role !== 'OWNER' && (
                    confirmRemoveId === member.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => removeMember(member.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          className="px-2.5 py-1 text-xs font-semibold text-gray-400 border border-white/[0.08] border-gray-600 hover:bg-[color:var(--neutral-50)] hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(member.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                        title="Eliminar del equipo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] border-white/[0.08]">
            <h2 className="font-semibold text-white">
              Invitaciones pendientes <span className="text-slate-500 font-normal text-sm">({invitations.length})</span>
            </h2>
          </div>
          <div className="divide-y divide-gray-100 divide-slate-700">
            {invitations.map(inv => {
              const cfg = ROLE_CONFIG[inv.role]
              const isExpired = new Date(inv.expiresAt) < new Date()
              return (
                <div key={inv.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className={`text-xs ${isExpired ? 'text-red-500' : 'text-gray-400'}`}>
                        {isExpired ? 'Vencida' : `Vence ${new Date(inv.expiresAt).toLocaleDateString('es-PE')}`}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg?.color ?? 'bg-[color:var(--neutral-100)] text-gray-600 bg-[color:var(--neutral-100)] text-slate-300'}`}>
                    {cfg?.label ?? inv.role}
                  </span>
                  <button
                    onClick={() => cancelInvite(inv.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                    title="Cancelar invitacion"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Herramientas de Datos ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-white/[0.08] p-6">
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-400" />
          Herramientas de Datos
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Mantenimiento de la base de datos. Estas acciones son seguras y reversibles manualmente.
        </p>

        {/* Fix nombres duplicados */}
        <div className="rounded-xl border border-white/[0.06] bg-[color:var(--neutral-50)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Corregir nombres duplicados</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Al importar desde PLAME, algunos archivos guardan el nombre completo en ambos campos (Nombres y Apellidos).
                Este proceso lo detecta y lo corrige automaticamente.
              </p>
            </div>
            {fixStatus === 'idle' && (
              <button
                onClick={analyzeNames}
                disabled={fixLoading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {fixLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Analizar base de datos
              </button>
            )}
            {fixStatus === 'preview' && fixPreview && fixPreview.affected > 0 && (
              <button
                onClick={applyFix}
                disabled={fixLoading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {fixLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Corregir {fixPreview.affected} registro{fixPreview.affected !== 1 ? 's' : ''}
              </button>
            )}
            {(fixStatus === 'done' || (fixStatus === 'preview' && fixPreview?.affected === 0)) && (
              <button
                onClick={() => { setFixStatus('idle'); setFixPreview(null); setFixResult(null) }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[color:var(--neutral-100)] text-slate-400 border border-white/[0.08] hover:bg-white/[0.08] transition-colors whitespace-nowrap"
              >
                Volver a analizar
              </button>
            )}
          </div>

          {/* Error */}
          {fixError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {fixError}
            </div>
          )}

          {/* Resultado del análisis */}
          {fixStatus === 'preview' && fixPreview && (
            <div className="mt-4">
              <div className={`flex items-center gap-2 text-xs font-medium mb-3 px-3 py-2 rounded-lg ${
                fixPreview.affected === 0
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}>
                {fixPreview.affected === 0
                  ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
                {fixPreview.message}
              </div>

              {fixPreview.affected > 0 && fixPreview.preview.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                    Vista previa ({fixPreview.preview.length} de {fixPreview.affected})
                  </p>
                  <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">DNI</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Antes</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Despues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fixPreview.preview.map((row) => (
                          <tr key={row.dni} className="border-b border-white/[0.04] last:border-0">
                            <td className="px-3 py-2 font-mono text-slate-400">{row.dni}</td>
                            <td className="px-3 py-2 text-red-400/80">
                              {row.currentLastName}, {row.currentFirstName}
                            </td>
                            <td className="px-3 py-2 text-green-400">
                              {row.lastName}, {row.firstName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resultado de la corrección */}
          {fixStatus === 'done' && fixResult && (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium bg-green-500/10 text-green-400 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              {fixResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
