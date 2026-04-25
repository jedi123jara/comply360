/**
 * Skeleton para cualquier pantalla del Command Center mientras carga.
 * Matchea la estructura del nuevo diseño: a-page-head + grids 2-1 + KPI row.
 */
export default function AdminLoading() {
  const pulse = {
    background: 'var(--neutral-100)',
    borderRadius: 12,
    animation: 'pulseEmerald 2s infinite',
  } as const

  return (
    <>
      {/* Page head */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginBottom: 22 }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...pulse, height: 12, width: 140, marginBottom: 8 }} />
          <div style={{ ...pulse, height: 32, width: 320, marginBottom: 6 }} />
          <div style={{ ...pulse, height: 14, width: 480 }} />
        </div>
        <div style={{ ...pulse, height: 32, width: 240 }} />
      </div>

      {/* Narrative + MRR hero */}
      <div className="a-grid-2-1" style={{ marginBottom: 18 }}>
        <div style={{ ...pulse, height: 220, borderRadius: 14 }} />
        <div style={{ ...pulse, height: 220, borderRadius: 14 }} />
      </div>

      {/* KPI row */}
      <div className="a-grid-4" style={{ marginBottom: 18 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ ...pulse, height: 116 }} />
        ))}
      </div>

      {/* Secondary cards */}
      <div className="a-grid-2" style={{ marginBottom: 18 }}>
        <div style={{ ...pulse, height: 280 }} />
        <div style={{ ...pulse, height: 280 }} />
      </div>
    </>
  )
}
