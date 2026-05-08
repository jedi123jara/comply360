/* global React */

// ============================================================================
// V5 — OPERATIVO PRO
// Banking-grade. Cobalt primary, emerald only for success. IBM Plex Mono labels.
// Hairlines, dense, SUNAT/legal-authority. Inspiración: Bloomberg + Stripe Sigma.
// ============================================================================
function V5Operativo() {
  const d = window.cockpitData;
  return (
    <div className="v5-op" style={{ width:"100%", height:"100%", display:"flex", fontFamily:"'IBM Plex Sans', 'Inter', system-ui, sans-serif", color:"#0a1628", background:"#f7f8fa" }}>
      <style>{`
        .v5-op { letter-spacing: -0.005em; font-size: 12.5px; }
        .v5-op .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-feature-settings:'tnum' 1; letter-spacing:-0.005em; }
        .v5-op .lbl { font-family: 'IBM Plex Mono', monospace; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:#5a6478; font-weight:500; }
        .v5-op .card { background:#fff; border:1px solid #e1e5ec; border-radius:4px; }
        .v5-op .nav { padding:7px 12px; font-size:13px; color:#3a4254; cursor:pointer; display:flex; align-items:center; gap:9px; border-left:2px solid transparent; }
        .v5-op .nav.active { background:#eef3fb; color:#0a1628; border-left-color:#0850c4; font-weight:500; }
        .v5-op .nav:hover { background:#f0f3f8; }
        .v5-op .cobalt { color:#0850c4; }
        .v5-op .em { color:#117a4d; }
        .v5-op .red { color:#c43d3d; }
        .v5-op .amber { color:#a36400; }
        .v5-op .num { font-family:'IBM Plex Mono', monospace; font-feature-settings:'tnum' 1; font-variant-numeric: tabular-nums; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width:208, background:"#fff", borderRight:"1px solid #e1e5ec", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"14px 16px", borderBottom:"1px solid #e1e5ec", display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:24, height:24, borderRadius:3, background:"#0850c4", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13 }}>C</div>
          <div style={{ fontWeight:600, fontSize:14 }}>Comply<span style={{ color:"#0850c4" }}>360</span></div>
          <span className="lbl" style={{ marginLeft:"auto", color:"#0850c4", padding:"1px 5px", background:"#eef3fb", borderRadius:2, fontSize:9 }}>PRO</span>
        </div>

        {/* Org switcher */}
        <div style={{ padding:"10px 14px", borderBottom:"1px solid #e1e5ec" }}>
          <div className="lbl" style={{ marginBottom:4, fontSize:9 }}>ORGANIZACIÓN</div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div>
              <div style={{ fontSize:12.5, fontWeight:500 }}>Constructora Andes</div>
              <div className="mono" style={{ fontSize:10, color:"#5a6478" }}>RUC 20512934087</div>
            </div>
            <div style={{ marginLeft:"auto", color:"#5a6478", fontSize:12 }}>⇅</div>
          </div>
        </div>

        <div style={{ padding:"10px 0" }}>
          <div className="lbl" style={{ padding:"4px 16px 6px" }}>OPERACIÓN</div>
          <div className="nav active">▣ Cockpit</div>
          <div className="nav">⌗ Trabajadores <span className="mono" style={{ marginLeft:"auto", fontSize:11, color:"#5a6478" }}>47</span></div>
          <div className="nav">▤ Contratos <span className="mono" style={{ marginLeft:"auto", fontSize:11, color:"#5a6478" }}>52</span></div>
          <div className="nav">⌑ SST <span className="mono" style={{ marginLeft:"auto", fontSize:10, padding:"1px 5px", background:"#fef0f0", color:"#c43d3d", borderRadius:2 }}>3</span></div>
          <div className="nav">$ Planilla</div>
          <div className="nav">◉ Capacitaciones</div>

          <div className="lbl" style={{ padding:"14px 16px 6px" }}>CUMPLIMIENTO</div>
          <div className="nav">◇ Diagnóstico</div>
          <div className="nav">▴ Riesgo SUNAFIL</div>
          <div className="nav">≡ Normas</div>
          <div className="nav">⌬ Asistente IA</div>

          <div className="lbl" style={{ padding:"14px 16px 6px" }}>REPORTES</div>
          <div className="nav">▰ Auditoría</div>
          <div className="nav">⊞ Calendario</div>
        </div>

        <div style={{ marginTop:"auto", padding:"12px 14px", borderTop:"1px solid #e1e5ec", display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:28, height:28, borderRadius:4, background:"#0a1628", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11.5, fontWeight:600 }}>DQ</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:500 }}>Diana Quispe</div>
            <div className="mono" style={{ fontSize:10, color:"#5a6478" }}>OWNER</div>
          </div>
          <div style={{ color:"#5a6478", fontSize:12 }}>⚙</div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {/* Top bar */}
        <div style={{ display:"flex", alignItems:"center", padding:"10px 22px", background:"#fff", borderBottom:"1px solid #e1e5ec", gap:14 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
            <span className="lbl">VISTA</span>
            <div style={{ fontSize:14, fontWeight:600 }}>Cockpit · Vista ejecutiva</div>
          </div>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:"#f7f8fa", border:"1px solid #e1e5ec", borderRadius:3, maxWidth:340, marginLeft:24 }}>
            <span style={{ color:"#5a6478", fontSize:12 }}>⌕</span>
            <span style={{ color:"#5a6478", fontSize:12 }}>Buscar trabajador, contrato, norma…</span>
            <span className="mono" style={{ marginLeft:"auto", fontSize:10, color:"#5a6478", padding:"1px 5px", border:"1px solid #e1e5ec", borderRadius:2 }}>⌘K</span>
          </div>
          <div className="lbl" style={{ marginLeft:"auto" }}>L 08 MAY · 14:32 PET</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 9px", background:"#eef9f3", border:"1px solid #b9e3cb", borderRadius:3 }}>
            <span style={{ width:6, height:6, background:"#117a4d", borderRadius:999 }}></span>
            <span className="mono" style={{ fontSize:10.5, color:"#117a4d" }}>SYNCED</span>
          </div>
          <button style={{ padding:"6px 12px", background:"#0850c4", color:"#fff", border:"none", borderRadius:3, fontSize:12.5, fontWeight:500, cursor:"pointer" }}>Diagnóstico ↗</button>
        </div>

        {/* Tabs strip */}
        <div style={{ display:"flex", padding:"0 22px", background:"#fff", borderBottom:"1px solid #e1e5ec", gap:0 }}>
          {["Resumen","Score","Vencimientos","Workers","Auditoría"].map((t,i)=>(
            <div key={t} className={i===0?"lbl":"lbl"} style={{ padding:"10px 14px", borderBottom: i===0?"2px solid #0850c4":"2px solid transparent", color: i===0?"#0a1628":"#5a6478", cursor:"pointer", fontSize:11 }}>{t}</div>
          ))}
        </div>

        <div style={{ flex:1, overflow:"auto", padding:"16px 22px", display:"grid", gap:14, gridTemplateColumns:"repeat(12, 1fr)", gridAutoRows:"min-content", background:"#f7f8fa" }}>
          {/* Hero score card */}
          <div className="card" style={{ gridColumn:"span 5", padding:"16px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <div className="lbl">SCORE GLOBAL</div>
              <div className="lbl">SEMANA 19 · 2026</div>
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <div className="num" style={{ fontSize:60, lineHeight:1, fontWeight:500, letterSpacing:"-0.04em", color:"#0a1628" }}>72.4</div>
              <div className="mono" style={{ fontSize:14, color:"#5a6478" }}>/ 100</div>
              <div className="mono" style={{ marginLeft:8, fontSize:12, padding:"2px 7px", background:"#eef9f3", color:"#117a4d", borderRadius:2 }}>+4.2 ↑</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:0, marginTop:14, borderTop:"1px solid #e1e5ec" }}>
              <div style={{ padding:"10px 0 0", borderRight:"1px solid #e1e5ec", paddingRight:12 }}>
                <div className="lbl" style={{ marginBottom:3 }}>SECTOR P50</div>
                <div className="num" style={{ fontSize:18, fontWeight:500 }}>68.0</div>
                <div className="mono" style={{ fontSize:10, color:"#117a4d" }}>+4.4 vs sector</div>
              </div>
              <div style={{ padding:"10px 12px 0", borderRight:"1px solid #e1e5ec" }}>
                <div className="lbl" style={{ marginBottom:3 }}>TARGET Q2</div>
                <div className="num" style={{ fontSize:18, fontWeight:500 }}>85.0</div>
                <div className="mono" style={{ fontSize:10, color:"#a36400" }}>−12.6 a target</div>
              </div>
              <div style={{ padding:"10px 0 0 12px" }}>
                <div className="lbl" style={{ marginBottom:3 }}>ZONA</div>
                <div className="num amber" style={{ fontSize:14, fontWeight:600, marginTop:2 }}>RIESGO MEDIO</div>
                <div className="mono" style={{ fontSize:10, color:"#5a6478" }}>SUNAFIL · IGI</div>
              </div>
            </div>
            {/* sparkline */}
            <div style={{ marginTop:14 }}>
              <div className="lbl" style={{ marginBottom:6 }}>EVOLUCIÓN · 12 SEMANAS</div>
              <svg viewBox="0 0 360 60" style={{ width:"100%", height:60 }}>
                <line x1="0" y1="22" x2="360" y2="22" stroke="#e1e5ec" strokeDasharray="2 3" />
                <line x1="0" y1="42" x2="360" y2="42" stroke="#e1e5ec" strokeDasharray="2 3" />
                <path d="M0 50 L30 48 L60 52 L90 44 L120 46 L150 38 L180 40 L210 32 L240 30 L270 26 L300 22 L330 18 L360 14" fill="none" stroke="#0850c4" strokeWidth="1.5" />
                {[0,30,60,90,120,150,180,210,240,270,300,330,360].map((x,i)=>(
                  <circle key={i} cx={x} cy={[50,48,52,44,46,38,40,32,30,26,22,18,14][i]} r="2" fill="#0850c4" />
                ))}
              </svg>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="card" style={{ gridColumn:"span 4", padding:0 }}>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid #e1e5ec", display:"flex", justifyContent:"space-between" }}>
              <div className="lbl">COMPOSICIÓN PONDERADA</div>
              <div className="lbl">peso · score</div>
            </div>
            {d.breakdown.map((b,i)=>(
              <div key={b.area} style={{ display:"grid", gridTemplateColumns:"1fr 50px 80px 40px", padding:"9px 16px", alignItems:"center", borderTop: i?"1px solid #f0f3f8":"none", fontSize:12.5, gap:8 }}>
                <div style={{ fontWeight:500 }}>{b.area}</div>
                <div className="mono" style={{ fontSize:11, color:"#5a6478" }}>w{b.weight}</div>
                <div style={{ position:"relative", height:5, background:"#f0f3f8", borderRadius:1, overflow:"hidden" }}>
                  <div style={{ width:`${b.score}%`, height:"100%", background: b.status==="ok"?"#117a4d":"#a36400" }}></div>
                </div>
                <div className="num" style={{ fontSize:12.5, textAlign:"right", fontWeight:500, color: b.status==="ok"?"#117a4d":"#a36400" }}>{b.score}</div>
              </div>
            ))}
          </div>

          {/* Copilot CTA */}
          <div className="card" style={{ gridColumn:"span 3", padding:"14px 16px", background:"linear-gradient(180deg,#0a1628 0%,#142a4a 100%)", color:"#fff", border:"none" }}>
            <div className="lbl" style={{ color:"rgba(255,255,255,0.5)", marginBottom:8 }}>● COPILOT</div>
            <div style={{ fontSize:13, lineHeight:1.4, fontWeight:500, marginBottom:10 }}>
              3 acciones suben tu score a <span style={{ color:"#5fd4a3" }}>78.6</span> en 5 días.
            </div>
            <div className="num" style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.6, marginBottom:12 }}>
              · Examen médico · Carlos M.<br/>
              · Cap. SST · 12 trabajadores<br/>
              · PLAME Nov · vence 6d
            </div>
            <button style={{ width:"100%", padding:"7px 10px", background:"#fff", color:"#0a1628", border:"none", borderRadius:3, fontSize:12, fontWeight:600, cursor:"pointer" }}>Ejecutar plan</button>
          </div>

          {/* KPI strip */}
          {[
            { l:"WORKERS ACTIVOS", v:"47", d:"+2 mes", c:"#0a1628", trend:"+4.5%" },
            { l:"VENCIM. 7 DÍAS", v:"08", d:"3 SST", c:"#a36400", trend:"+2" },
            { l:"ALERTAS CRÍTICAS", v:"03", d:"crít.", c:"#c43d3d", trend:"=" },
            { l:"MULTA EVITADA / MES", v:"S/ 84,200", d:"vs base", c:"#117a4d", trend:"+S/ 12k" },
          ].map(k => (
            <div key={k.l} className="card" style={{ gridColumn:"span 3", padding:"12px 14px" }}>
              <div className="lbl" style={{ marginBottom:6 }}>{k.l}</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <div className="num" style={{ fontSize:22, fontWeight:600, color:k.c, lineHeight:1, letterSpacing:"-0.02em" }}>{k.v}</div>
                <div className="mono" style={{ fontSize:10.5, color: k.c==="#c43d3d"?"#c43d3d":k.c==="#117a4d"?"#117a4d":"#5a6478" }}>{k.trend}</div>
              </div>
              <div style={{ fontSize:11, color:"#5a6478", marginTop:4 }}>{k.d}</div>
            </div>
          ))}

          {/* Deadlines table */}
          <div className="card" style={{ gridColumn:"span 8", padding:0 }}>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid #e1e5ec", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:13, fontWeight:600 }}>Vencimientos · próximos 14 días</div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="lbl" style={{ padding:"4px 8px", background:"#f7f8fa", border:"1px solid #e1e5ec", borderRadius:3, cursor:"pointer", fontSize:10 }}>EXPORTAR CSV</button>
                <button className="lbl" style={{ padding:"4px 8px", background:"#f7f8fa", border:"1px solid #e1e5ec", borderRadius:3, cursor:"pointer", fontSize:10 }}>FILTRAR</button>
              </div>
            </div>
            <div className="lbl" style={{ display:"grid", gridTemplateColumns:"60px 1fr 1.2fr 100px 90px 24px", padding:"7px 16px", background:"#f7f8fa", borderBottom:"1px solid #e1e5ec", fontSize:9.5 }}>
              <div>VENCE</div><div>EVENTO</div><div>RESPONSABLE</div><div>ÁREA</div><div>ESTADO</div><div></div>
            </div>
            {d.deadlines.map((dl,i)=>(
              <div key={dl.id} style={{ display:"grid", gridTemplateColumns:"60px 1fr 1.2fr 100px 90px 24px", padding:"10px 16px", alignItems:"center", borderBottom:"1px solid #f0f3f8", fontSize:12.5 }}>
                <div className="num" style={{ fontWeight:600, color: dl.urgency==="high"?"#c43d3d":dl.urgency==="med"?"#a36400":"#5a6478" }}>{dl.days}d</div>
                <div style={{ fontWeight:500 }}>{dl.what}</div>
                <div style={{ color:"#3a4254" }}>{dl.who}</div>
                <div className="mono" style={{ fontSize:10.5, color:"#5a6478", textTransform:"uppercase" }}>{dl.area}</div>
                <div>
                  <span className="mono" style={{ fontSize:10, padding:"2px 6px", borderRadius:2, background: dl.urgency==="high"?"#fef0f0":dl.urgency==="med"?"#fef5e6":"#f0f3f8", color: dl.urgency==="high"?"#c43d3d":dl.urgency==="med"?"#a36400":"#5a6478" }}>
                    {dl.urgency==="high"?"CRÍTICO":dl.urgency==="med"?"PRONTO":"PROGR."}
                  </span>
                </div>
                <div style={{ color:"#5a6478" }}>↗</div>
              </div>
            ))}
          </div>

          {/* Workers risk */}
          <div className="card" style={{ gridColumn:"span 4", padding:0 }}>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid #e1e5ec" }}>
              <div style={{ fontSize:13, fontWeight:600 }}>Workers en riesgo</div>
              <div className="lbl" style={{ marginTop:2 }}>RANKING POR GAPS · TOP 4</div>
            </div>
            {d.riskWorkers.map((w,i)=>(
              <div key={w.name} style={{ display:"grid", gridTemplateColumns:"24px 1fr 60px 30px", padding:"10px 16px", alignItems:"center", gap:10, borderBottom:"1px solid #f0f3f8" }}>
                <div className="num" style={{ fontSize:11, color:"#5a6478", fontWeight:500 }}>0{i+1}</div>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:500 }}>{w.name}</div>
                  <div className="mono" style={{ fontSize:10, color:"#5a6478" }}>{w.role.toUpperCase()} · {w.missing} GAPS</div>
                </div>
                <div style={{ position:"relative", height:4, background:"#f0f3f8", borderRadius:1, overflow:"hidden" }}>
                  <div style={{ width:`${w.risk}%`, height:"100%", background: w.risk>80?"#c43d3d":w.risk>65?"#a36400":"#117a4d" }}></div>
                </div>
                <div className="num" style={{ fontSize:11.5, fontWeight:600, textAlign:"right", color: w.risk>80?"#c43d3d":w.risk>65?"#a36400":"#117a4d" }}>{w.risk}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

window.V5Operativo = V5Operativo;
