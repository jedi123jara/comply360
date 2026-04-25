'use client'

import { useEffect, useState } from 'react'
import { Building2, Calendar, Download, Search, ShieldCheck, User } from 'lucide-react'
import { fmtN } from '@/components/admin/primitives'

interface AuditEvent {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  ipAddress: string | null
  createdAt: string
  organization: { name: string } | null
  user: { email: string; firstName: string | null; lastName: string | null } | null
}

export default function AuditoriaPage() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/auditoria?limit=100')
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = events.filter((e) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      e.action.toLowerCase().includes(q) ||
      (e.organization?.name.toLowerCase().includes(q) ?? false) ||
      (e.user?.email.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <>
      <div className="a-page-head">
        <div>
          <div className="crumbs">Plataforma · Auditoría</div>
          <h1>
            Log <em>inmutable</em>
          </h1>
          <div className="sub">
            Registro de todas las acciones críticas en la plataforma — signup, upgrades,
            impersonations, resoluciones de denuncias, borrados.
          </div>
        </div>
        <div className="spacer" />
        <div className="actions">
          <button className="a-btn a-btn-secondary" type="button">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, position: 'relative', minWidth: 260, maxWidth: 480 }}>
          <Search
            size={13}
            style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            placeholder="Buscar por acción, empresa o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="a-input"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {fmtN(filtered.length)} eventos · últimos 100
        </span>
      </div>

      {loading ? (
        <div
          style={{
            height: 360,
            background: 'var(--neutral-100)',
            borderRadius: 12,
            animation: 'pulseEmerald 2s infinite',
          }}
        />
      ) : filtered.length === 0 ? (
        <div className="a-card" style={{ padding: 48, textAlign: 'center' }}>
          <ShieldCheck
            size={40}
            style={{ color: 'var(--neutral-300)', margin: '0 auto 10px', display: 'block' }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Sin eventos de auditoría.</p>
        </div>
      ) : (
        <div className="a-card" style={{ padding: 0 }}>
          {filtered.map((e, i) => (
            <div
              key={e.id}
              style={{
                padding: '14px 18px',
                borderBottom:
                  i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                transition: 'background .15s',
              }}
              onMouseEnter={(ev) => (ev.currentTarget.style.background = 'var(--neutral-50)')}
              onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <code
                  style={{
                    fontFamily: 'var(--font-geist-mono), monospace',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--emerald-700)',
                    background: 'var(--emerald-50)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    display: 'inline-block',
                  }}
                >
                  {e.action}
                </code>
                {e.entityType && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-geist-mono), monospace',
                    }}
                  >
                    {e.entityType}
                    {e.entityId && ` · ${e.entityId.slice(0, 8)}…`}
                  </span>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px 16px',
                    fontSize: 11.5,
                    color: 'var(--text-tertiary)',
                    marginTop: 8,
                  }}
                >
                  {e.organization && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Building2 size={11} /> {e.organization.name}
                    </span>
                  )}
                  {e.user && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <User size={11} /> {e.user.email}
                    </span>
                  )}
                  {e.ipAddress && (
                    <span
                      style={{
                        fontFamily: 'var(--font-geist-mono), monospace',
                      }}
                    >
                      IP: {e.ipAddress}
                    </span>
                  )}
                </div>
              </div>

              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: 'var(--font-geist-mono), monospace',
                  flexShrink: 0,
                }}
              >
                <Calendar size={11} />
                {new Date(e.createdAt).toLocaleString('es-PE', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
