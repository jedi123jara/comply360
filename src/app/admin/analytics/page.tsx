'use client'

import { useEffect, useState } from 'react'
import { Activity, BarChart3, Download, TrendingUp, Users } from 'lucide-react'
import { fmtN, Monogram, Sparkline } from '@/components/admin/primitives'

interface AnalyticsData {
  signupsTrend: Array<{ date: string; count: number }>
  topActions: Array<{ action: string; count: number }>
  topOrgs: Array<{ orgName: string; events: number }>
  totalEvents: number
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div
        style={{
          height: 360,
          background: 'var(--neutral-100)',
          borderRadius: 12,
          animation: 'pulseEmerald 2s infinite',
        }}
      />
    )
  }
  if (!data) return null

  const signupsSpark = data.signupsTrend.map((d) => d.count)
  const maxAction = Math.max(...data.topActions.map((a) => a.count), 1)
  const maxOrg = Math.max(...data.topOrgs.map((o) => o.events), 1)

  return (
    <>
      <div className="a-page-head">
        <div>
          <div className="crumbs">Revenue · Analytics</div>
          <h1>
            Analytics de la <em>plataforma</em>
          </h1>
          <div className="sub">
            Métricas de uso, engagement y crecimiento · últimos 30 días.
          </div>
        </div>
        <div className="spacer" />
        <div className="actions">
          <button className="a-btn a-btn-secondary" type="button">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      <div className="a-grid-3" style={{ marginBottom: 18 }}>
        <div className="a-kpi">
          <div className="a-kpi-label">
            <Activity size={11} /> Eventos totales · 30d
          </div>
          {signupsSpark.length > 1 && (
            <div className="spark">
              <Sparkline data={signupsSpark} color="#2563eb" width={80} height={28} dots />
            </div>
          )}
          <div className="a-kpi-value">{fmtN(data.totalEvents)}</div>
          <div className="a-kpi-foot">Todos los audit logs agregados</div>
        </div>
        <div className="a-kpi">
          <div className="a-kpi-label">
            <TrendingUp size={11} /> Acción más frecuente
          </div>
          <div className="a-kpi-value" style={{ fontSize: 18 }}>
            <code
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 15,
              }}
            >
              {data.topActions[0]?.action ?? '—'}
            </code>
          </div>
          <div className="a-kpi-foot">
            {data.topActions[0] ? `${fmtN(data.topActions[0].count)} veces en 30d` : 'Sin data'}
          </div>
        </div>
        <div className="a-kpi">
          <div className="a-kpi-label">
            <Users size={11} /> Empresas con actividad
          </div>
          <div className="a-kpi-value">{fmtN(data.topOrgs.length)}</div>
          <div className="a-kpi-foot">Con al menos 1 evento en 30d</div>
        </div>
      </div>

      <div className="a-grid-2">
        <div className="a-card">
          <div className="a-head">
            <div>
              <div className="a-head-title">
                <BarChart3 size={14} style={{ color: 'var(--emerald-600)' }} /> Top acciones
              </div>
              <div className="a-head-sub">Por frecuencia · 30d</div>
            </div>
          </div>
          {data.topActions.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--text-tertiary)', fontSize: 13 }}>
              Sin datos.
            </div>
          ) : (
            <div className="a-card-pad">
              {data.topActions.slice(0, 10).map((a) => {
                const pct = (a.count / maxAction) * 100
                return (
                  <div key={a.action} className="adopt-row">
                    <div
                      className="name"
                      style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 12 }}
                    >
                      {a.action}
                    </div>
                    <div className="track">
                      <div className="fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="pct">{fmtN(a.count)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="a-card">
          <div className="a-head">
            <div>
              <div className="a-head-title">Empresas más activas</div>
              <div className="a-head-sub">Por volumen de eventos · 30d</div>
            </div>
          </div>
          {data.topOrgs.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--text-tertiary)', fontSize: 13 }}>
              Sin datos.
            </div>
          ) : (
            <div className="a-card-pad">
              {data.topOrgs.slice(0, 10).map((o) => {
                const pct = (o.events / maxOrg) * 100
                return (
                  <div
                    key={o.orgName}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 1fr 90px',
                      gap: 12,
                      alignItems: 'center',
                      padding: '8px 0',
                    }}
                  >
                    <Monogram name={o.orgName} size={26} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--text-primary)',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {o.orgName}
                      </div>
                      <div
                        className="track"
                        style={{ marginTop: 4, height: 4 }}
                      >
                        <div className="fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="pct">{fmtN(o.events)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
