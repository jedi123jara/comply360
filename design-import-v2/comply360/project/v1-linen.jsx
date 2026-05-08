/* global React */
const { useMemo } = React;

// ============================================================================
// V1 — LIMA LINEN
// Editorial calm. Warm paper, Instrument Serif headings, single emerald accent.
// Inspiración: Stripe Atlas + Mercury + editorial print.
// ============================================================================
function V1Linen() {
  const d = window.cockpitData;
  return (
    <div className="v1-linen" style={{ width: "100%", height: "100%", display: "flex", fontFamily: "'Inter', system-ui, sans-serif", color: "#1a1815", background: "#f6f1e7" }}>
      <style>{`
        .v1-linen { letter-spacing: -0.005em; }
        .v1-linen .serif { font-family: 'Instrument Serif', Georgia, serif; letter-spacing: -0.01em; font-weight: 400; }
        .v1-linen .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; letter-spacing: -0.01em; }
        .v1-linen .ru { color: rgba(26,24,21,0.55); font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 500; }
        .v1-linen .card { background: #fbf7ee; border: 1px solid rgba(26,24,21,0.08); border-radius: 6px; padding: 20px; }
        .v1-linen .divider { border-top: 1px solid rgba(26,24,21,0.08); }
        .v1-linen .nav-item { color: rgba(26,24,21,0.6); font-size: 13.5px; padding: 7px 12px; border-radius: 4px; cursor: pointer; }
        .v1-linen .nav-item.active { background: rgba(26,24,21,0.05); color: #1a1815; }
        .v1-linen .pill { display:inline-flex; align-items:center; gap:6px; padding:3px 9px; border-radius:999px; font-size:11px; }
        .v1-linen .emerald { color: #1f6f4f; }
        .v1-linen .emerald-bg { background: #1f6f4f; color: #f6f1e7; }
        .v1-linen .crimson { color: #b04a36; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: 220, padding: "26px 18px", borderRight: "1px solid rgba(26,24,21,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 28 }}>
          <div style={{ width: 26, height: 26, background: "#1a1815", borderRadius: 4, display:"flex", alignItems:"center", justifyContent:"center", color:"#f6f1e7", fontFamily:"Instrument Serif, serif", fontSize: 16, fontStyle:"italic" }}>c</div>
          <div className="serif" style={{ fontSize: 19 }}>comply<span style={{ fontStyle: "italic" }}>360</span></div>
        </div>
        <div className="ru" style={{ marginBottom: 8, paddingLeft: 12 }}>Operación</div>
        <div style={{ display: "grid", gap: 2, marginBottom: 22 }}>
          <div className="nav-item active">⌂ Cockpit</div>
          <div className="nav-item">Trabajadores</div>
          <div className="nav-item">Contratos</div>
          <div className="nav-item">SST</div>
          <div className="nav-item">Planilla</div>
          <div className="nav-item">Capacitaciones</div>
        </div>
        <div className="ru" style={{ marginBottom: 8, paddingLeft: 12 }}>Inteligencia</div>
        <div style={{ display: "grid", gap: 2, marginBottom: 22 }}>
          <div className="nav-item">Diagnóstico</div>
          <div className="nav-item">Asistente IA</div>
          <div className="nav-item">Riesgo SUNAFIL</div>
          <div className="nav-item">Decisiones</div>
        </div>
        <div className="ru" style={{ marginBottom: 8, paddingLeft: 12 }}>Cuenta</div>
        <div style={{ display: "grid", gap: 2 }}>
          <div className="nav-item">Configuración</div>
          <div className="nav-item">Plan & facturación</div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "28px 36px", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div className="ru" style={{ marginBottom: 6 }}>Lunes, 8 de mayo · Semana 19</div>
            <div className="serif" style={{ fontSize: 30, lineHeight: 1.1 }}>Buen día, Diana.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "#fbf7ee", border: "1px solid rgba(26,24,21,0.08)", borderRadius: 999, fontSize: 12.5 }}>
              <span style={{ width:6, height:6, background:"#1f6f4f", borderRadius:999 }}></span>
              {d.org.name} · RUC {d.org.ruc}
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 999, background:"#1a1815", color:"#f6f1e7", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Instrument Serif", fontSize:14 }}>D</div>
          </div>
        </div>

        {/* Hero score */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22, marginBottom: 22 }}>
          <div className="card" style={{ padding: "30px 32px", position: "relative", overflow: "hidden" }}>
            <div className="ru" style={{ marginBottom: 14 }}>Score de cumplimiento</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <div className="serif" style={{ fontSize: 96, lineHeight: 0.95 }}>72</div>
              <div className="serif" style={{ fontSize: 30, color: "rgba(26,24,21,0.4)" }}>/ 100</div>
              <div className="pill emerald-bg" style={{ marginLeft: 8 }}>↑ +4 esta semana</div>
            </div>
            <div className="serif" style={{ fontSize: 19, marginTop: 18, fontStyle:"italic", color:"rgba(26,24,21,0.7)", maxWidth: 460, lineHeight: 1.35 }}>
              Estás a 13 puntos de la <span style={{ color:"#1a1815", fontStyle:"normal" }}>zona segura SUNAFIL</span>. Tres acciones pueden cerrar la brecha esta semana.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
              <button style={{ padding: "10px 18px", background: "#1a1815", color: "#f6f1e7", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor:"pointer" }}>Ver plan de acción →</button>
              <button style={{ padding: "10px 18px", background: "transparent", color: "#1a1815", border: "1px solid rgba(26,24,21,0.2)", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor:"pointer" }}>Cómo se calcula</button>
            </div>
            {/* decorative score arc */}
            <svg width="180" height="180" style={{ position: "absolute", right: -20, bottom: -28, opacity: 0.15 }}>
              <circle cx="90" cy="90" r="70" fill="none" stroke="#1f6f4f" strokeWidth="2" />
              <circle cx="90" cy="90" r="55" fill="none" stroke="#1f6f4f" strokeWidth="1" strokeDasharray="2 4" />
            </svg>
          </div>

          <div className="card">
            <div className="ru" style={{ marginBottom: 14 }}>Composición</div>
            <div style={{ display: "grid", gap: 10 }}>
              {d.breakdown.map(b => (
                <div key={b.area}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span>{b.area} <span className="mono" style={{ color:"rgba(26,24,21,0.45)", marginLeft:6 }}>w{b.weight}</span></span>
                    <span className="mono" style={{ fontWeight:500 }}>{b.score}</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(26,24,21,0.08)", borderRadius: 2 }}>
                    <div style={{ width: `${b.score}%`, height: "100%", background: b.status === "ok" ? "#1f6f4f" : "#b04a36", borderRadius: 2 }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
          {[
            { l: "Trabajadores activos", v: "47", s: "+2 este mes" },
            { l: "Vencimientos / 7 días", v: "8", s: "3 en SST", warn:true },
            { l: "Alertas críticas", v: "3", s: "Revisar hoy", warn:true },
            { l: "Multa evitada", v: "S/ 84,200", s: "vs. semana pasada", emerald:true },
          ].map(k => (
            <div key={k.l} className="card" style={{ padding: "16px 18px" }}>
              <div className="ru" style={{ marginBottom: 8 }}>{k.l}</div>
              <div className="serif" style={{ fontSize: 32, lineHeight: 1, color: k.emerald ? "#1f6f4f" : "#1a1815" }}>{k.v}</div>
              <div style={{ fontSize: 11.5, marginTop: 6, color: k.warn ? "#b04a36" : "rgba(26,24,21,0.55)" }}>{k.s}</div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 22 }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="serif" style={{ fontSize: 20 }}>Lo que se viene</div>
              <span className="ru">Próximos 14 días</span>
            </div>
            <div>
              {d.deadlines.map((dl, i) => (
                <div key={dl.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", alignItems:"center", padding: "12px 0", borderTop: i ? "1px solid rgba(26,24,21,0.06)" : "none" }}>
                  <div>
                    <div className="serif" style={{ fontSize: 28, lineHeight: 1, color: dl.urgency === "high" ? "#b04a36" : "#1a1815" }}>{dl.days}d</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{dl.what}</div>
                    <div style={{ fontSize: 12, color: "rgba(26,24,21,0.55)" }}>{dl.who} · {dl.area}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(26,24,21,0.5)" }}>↗</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: "#1a1815", color: "#f6f1e7", border: "none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: 14 }}>
              <div style={{ width:24, height:24, borderRadius:999, background:"#1f6f4f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Instrument Serif", fontSize:14, fontStyle:"italic" }}>c</div>
              <div className="ru" style={{ color:"rgba(246,241,231,0.5)" }}>Copilot</div>
            </div>
            <div className="serif" style={{ fontSize: 22, lineHeight: 1.25, marginBottom: 16, fontStyle:"italic" }}>
              "Detecté que Carlos no completó su examen médico — la multa potencial es S/ 12,150. ¿Te genero el plan de remediación?"
            </div>
            <div style={{ display:"grid", gap: 6, marginBottom: 14 }}>
              {d.copilotSuggestions.map(s => (
                <div key={s} style={{ padding: "9px 12px", background: "rgba(246,241,231,0.06)", borderRadius: 4, fontSize: 12.5, lineHeight: 1.4 }}>{s}</div>
              ))}
            </div>
            <div style={{ display:"flex", gap: 8, padding: "10px 12px", background: "rgba(246,241,231,0.06)", borderRadius: 4, fontSize: 13, color: "rgba(246,241,231,0.5)" }}>
              <span>Pregunta a Comply…</span>
              <span style={{ marginLeft:"auto", fontFamily:"JetBrains Mono", fontSize:11 }}>⌘K</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

window.V1Linen = V1Linen;
