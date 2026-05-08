/* global React */

// ============================================================================
// V2 — VAULT PRO
// Deep obsidian + neon emerald. Mono labels. Dense, Bloomberg-meets-Linear-dark.
// ============================================================================
function V2Vault() {
  const d = window.cockpitData;
  return (
    <div className="v2-vault" style={{ width: "100%", height: "100%", display: "flex", fontFamily: "'Geist', 'Inter', system-ui, sans-serif", color: "#e8e9ec", background: "#0b0d10" }}>
      <style>{`
        .v2-vault { letter-spacing: -0.01em; font-size: 13px; }
        .v2-vault .mono { font-family: 'Geist Mono', 'JetBrains Mono', monospace; }
        .v2-vault .lbl { font-family: 'Geist Mono', 'JetBrains Mono', monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
        .v2-vault .card { background: #131619; border: 1px solid #1f2328; border-radius: 8px; }
        .v2-vault .nav { color: #8b929c; font-size: 13px; padding: 6px 10px; border-radius: 4px; cursor: pointer; display:flex; align-items:center; gap:8px; }
        .v2-vault .nav.active { background: #1c2024; color: #e8e9ec; box-shadow: inset 2px 0 0 #00e5a0; }
        .v2-vault .nav:hover { background: #15181c; color: #e8e9ec; }
        .v2-vault .green { color: #00e5a0; }
        .v2-vault .red { color: #ff6470; }
        .v2-vault .amber { color: #ffb547; }
        .v2-vault .chip { display:inline-flex; padding:2px 7px; font-size: 10.5px; font-family:'Geist Mono', monospace; border-radius:3px; letter-spacing:0.04em; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: 200, padding: "16px 12px", borderRight: "1px solid #16191d", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 8px", marginBottom: 18 }}>
          <div style={{ width:22, height:22, borderRadius:5, background:"linear-gradient(135deg,#00e5a0,#00a878)", display:"flex", alignItems:"center", justifyContent:"center", color:"#0b0d10", fontWeight:700, fontSize:13 }}>C</div>
          <div style={{ fontWeight:600, fontSize:14 }}>Comply<span style={{ color:"#00e5a0" }}>360</span></div>
        </div>
        <div style={{ background:"#131619", border:"1px solid #1f2328", borderRadius:6, padding:"7px 9px", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:18, height:18, borderRadius:4, background:"#1f2328", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:600 }}>CA</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11.5, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Constructora Andes</div>
            <div className="mono" style={{ fontSize:9.5, color:"#6b7280" }}>20512934087</div>
          </div>
          <div style={{ color:"#6b7280", fontSize:11 }}>⇅</div>
        </div>

        <div className="lbl" style={{ padding:"0 8px 6px" }}>Operación</div>
        <div className="nav active">▣ Cockpit</div>
        <div className="nav">⌗ Trabajadores <span className="mono" style={{ marginLeft:"auto", fontSize:10, color:"#6b7280" }}>47</span></div>
        <div className="nav">≡ Contratos</div>
        <div className="nav">✚ SST <span className="mono chip" style={{ marginLeft:"auto", background:"rgba(255,100,112,0.12)", color:"#ff6470" }}>3</span></div>
        <div className="nav">$ Planilla</div>
        <div className="nav">◉ Capacitaciones</div>

        <div className="lbl" style={{ padding:"14px 8px 6px" }}>IA</div>
        <div className="nav">◈ Diagnóstico</div>
        <div className="nav">⌬ Asistente</div>
        <div className="nav">▴ Riesgo SUNAFIL</div>

        <div style={{ marginTop:"auto", padding:"10px 8px", borderTop:"1px solid #16191d" }}>
          <div className="lbl" style={{ marginBottom:6 }}>Plan PRO · Trial</div>
          <div style={{ height:4, background:"#1f2328", borderRadius:2, overflow:"hidden" }}>
            <div style={{ width:"40%", height:"100%", background:"#00e5a0" }}></div>
          </div>
          <div className="mono" style={{ fontSize:10, color:"#6b7280", marginTop:6 }}>9d restantes</div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {/* Top bar */}
        <div style={{ display:"flex", alignItems:"center", padding:"12px 22px", borderBottom:"1px solid #16191d", gap:14 }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, padding:"7px 12px", background:"#131619", border:"1px solid #1f2328", borderRadius:6, maxWidth:420 }}>
            <span style={{ color:"#6b7280" }}>⌕</span>
            <span style={{ color:"#6b7280", fontSize:12.5 }}>Buscar trabajadores, contratos, normas…</span>
            <span className="mono" style={{ marginLeft:"auto", fontSize:10, color:"#6b7280", padding:"2px 6px", background:"#1f2328", borderRadius:3 }}>⌘K</span>
          </div>
          <div className="lbl">L · 8 MAY · 14:32</div>
          <div className="chip" style={{ background:"rgba(0,229,160,0.1)", color:"#00e5a0" }}>● LIVE</div>
          <div style={{ display:"flex", gap:8 }}>
            <button style={{ padding:"7px 12px", background:"#131619", border:"1px solid #1f2328", borderRadius:6, color:"#e8e9ec", fontSize:12.5, cursor:"pointer" }}>+ Nuevo</button>
            <button style={{ padding:"7px 14px", background:"#00e5a0", border:"none", borderRadius:6, color:"#0b0d10", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Diagnóstico ↗</button>
          </div>
        </div>

        <div style={{ flex:1, padding:"18px 22px", overflow:"auto", display:"grid", gap:14, gridTemplateColumns:"repeat(12, 1fr)", gridAutoRows:"min-content" }}>
          {/* Hero */}
          <div className="card" style={{ gridColumn:"span 7", padding:"20px 22px", position:"relative", overflow:"hidden" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div className="lbl">SCORE GLOBAL · ZONA: <span className="amber">RIESGO MEDIO</span></div>
              <div className="chip" style={{ background:"rgba(0,229,160,0.1)", color:"#00e5a0" }}>+4.0 ↑ 7d</div>
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
              <div className="mono" style={{ fontSize:84, lineHeight:0.9, fontWeight:500, letterSpacing:"-0.04em", background:"linear-gradient(180deg,#fff 0%,#00e5a0 110%)", WebkitBackgroundClip:"text", color:"transparent" }}>72</div>
              <div className="mono" style={{ fontSize:24, color:"#6b7280" }}>/100</div>
              <div style={{ flex:1 }}></div>
              <div style={{ textAlign:"right" }}>
                <div className="lbl">Target Q2</div>
                <div className="mono" style={{ fontSize:18 }}>85</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div className="lbl">Sector</div>
                <div className="mono" style={{ fontSize:18 }}>68</div>
              </div>
            </div>
            {/* sparkline */}
            <svg viewBox="0 0 400 50" style={{ width:"100%", height:50, marginTop:12 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5a0" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00e5a0" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 38 L40 36 L80 40 L120 32 L160 34 L200 28 L240 30 L280 24 L320 22 L360 18 L400 12 L400 50 L0 50Z" fill="url(#g1)" />
              <path d="M0 38 L40 36 L80 40 L120 32 L160 34 L200 28 L240 30 L280 24 L320 22 L360 18 L400 12" fill="none" stroke="#00e5a0" strokeWidth="1.5" />
            </svg>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop: 6 }}>
              <div className="mono" style={{ fontSize:10, color:"#6b7280" }}>Mar</div>
              <div className="mono" style={{ fontSize:10, color:"#6b7280" }}>Abr</div>
              <div className="mono" style={{ fontSize:10, color:"#6b7280" }}>May</div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="card" style={{ gridColumn:"span 5", padding:"20px 22px" }}>
            <div className="lbl" style={{ marginBottom:12 }}>Composición · pondera 100%</div>
            <div style={{ display:"grid", gap:12 }}>
              {d.breakdown.map(b => (
                <div key={b.area} style={{ display:"grid", gridTemplateColumns:"82px 1fr 36px", alignItems:"center", gap:10 }}>
                  <div style={{ fontSize:12.5 }}>{b.area}</div>
                  <div style={{ position:"relative", height:6, background:"#1f2328", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ width:`${b.score}%`, height:"100%", background: b.status === "ok" ? "#00e5a0" : "#ffb547" }}></div>
                  </div>
                  <div className="mono" style={{ fontSize:12, textAlign:"right" }}>{b.score}</div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI strip */}
          {[
            { l:"WORKERS", v:"47", d:"+2 mom", c:"#e8e9ec" },
            { l:"VENCIM. 7D", v:"8", d:"3 SST", c:"#ffb547" },
            { l:"ALERTAS", v:"3", d:"crít.", c:"#ff6470" },
            { l:"MULTA EVIT.", v:"S/ 84.2k", d:"este mes", c:"#00e5a0" },
          ].map(k => (
            <div key={k.l} className="card" style={{ gridColumn:"span 3", padding:"14px 16px" }}>
              <div className="lbl" style={{ marginBottom:6 }}>{k.l}</div>
              <div className="mono" style={{ fontSize:26, lineHeight:1, color:k.c, letterSpacing:"-0.02em" }}>{k.v}</div>
              <div className="lbl" style={{ marginTop:6, color:"#6b7280", textTransform:"none", letterSpacing:"0.02em" }}>{k.d}</div>
            </div>
          ))}

          {/* Deadlines table */}
          <div className="card" style={{ gridColumn:"span 7", padding:"18px 0 4px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"0 22px 12px" }}>
              <div style={{ fontWeight:600, fontSize:14 }}>Vencimientos · próximos 14d</div>
              <div className="lbl">Ordenado por urgencia</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"50px 1fr 110px 80px 24px", padding:"6px 22px", borderTop:"1px solid #16191d", borderBottom:"1px solid #16191d", background:"#0e1114" }} className="lbl">
              <div>DÍAS</div><div>EVENTO</div><div>ÁREA</div><div>URGENCIA</div><div></div>
            </div>
            {d.deadlines.map((dl, i) => (
              <div key={dl.id} style={{ display:"grid", gridTemplateColumns:"50px 1fr 110px 80px 24px", padding:"10px 22px", alignItems:"center", borderTop: i ? "1px solid #16191d" : "none", fontSize:12.5 }}>
                <div className="mono" style={{ color: dl.urgency==="high"?"#ff6470":dl.urgency==="med"?"#ffb547":"#8b929c" }}>{String(dl.days).padStart(2,"0")}d</div>
                <div>
                  <div>{dl.what}</div>
                  <div style={{ color:"#6b7280", fontSize:11.5 }}>{dl.who}</div>
                </div>
                <div className="mono" style={{ fontSize:11, color:"#8b929c" }}>{dl.area.toUpperCase()}</div>
                <div>
                  <span className="chip" style={{
                    background: dl.urgency==="high"?"rgba(255,100,112,0.12)":dl.urgency==="med"?"rgba(255,181,71,0.12)":"#1f2328",
                    color: dl.urgency==="high"?"#ff6470":dl.urgency==="med"?"#ffb547":"#8b929c"
                  }}>{dl.urgency.toUpperCase()}</span>
                </div>
                <div style={{ color:"#6b7280" }}>↗</div>
              </div>
            ))}
          </div>

          {/* Risk leaderboard */}
          <div className="card" style={{ gridColumn:"span 5", padding:"18px 22px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontWeight:600, fontSize:14 }}>Workers en riesgo</div>
              <div className="lbl">por gaps abiertos</div>
            </div>
            <div style={{ display:"grid", gap:10 }}>
              {d.riskWorkers.map(w => (
                <div key={w.name} style={{ display:"grid", gridTemplateColumns:"24px 1fr 1fr 30px", alignItems:"center", gap:10 }}>
                  <div style={{ width:24, height:24, borderRadius:4, background:"#1f2328", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:600 }}>{w.name.split(" ").map(p=>p[0]).join("").slice(0,2)}</div>
                  <div>
                    <div style={{ fontSize:12.5 }}>{w.name}</div>
                    <div className="mono" style={{ fontSize:10.5, color:"#6b7280" }}>{w.role}</div>
                  </div>
                  <div style={{ position:"relative", height:5, background:"#1f2328", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ width:`${w.risk}%`, height:"100%", background: w.risk>80?"#ff6470":w.risk>65?"#ffb547":"#00e5a0" }}></div>
                  </div>
                  <div className="mono" style={{ fontSize:12, textAlign:"right", color: w.risk>80?"#ff6470":w.risk>65?"#ffb547":"#00e5a0" }}>{w.risk}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

window.V2Vault = V2Vault;
