/* global React */

// ============================================================================
// V4 — SOFT ATELIER
// Cool light gray, glassmorphic cards, rounded-2xl, lavender + emerald pastel.
// Inspiración: Notion / Mercury / Linear-light.
// ============================================================================
function V4Atelier() {
  const d = window.cockpitData;
  return (
    <div className="v4-atelier" style={{ width:"100%", height:"100%", display:"flex", fontFamily:"'Inter', system-ui, sans-serif", color:"#1d1f2b", background:"#f4f3f7" }}>
      <style>{`
        .v4-atelier { letter-spacing: -0.012em; }
        .v4-atelier .display { font-family:'Inter', system-ui, sans-serif; font-weight: 600; letter-spacing:-0.025em; }
        .v4-atelier .mono { font-family:'Geist Mono', monospace; font-feature-settings: 'tnum' 1; }
        .v4-atelier .card { background:#fff; border-radius:18px; box-shadow: 0 1px 0 rgba(29,31,43,0.04), 0 4px 16px rgba(29,31,43,0.04); }
        .v4-atelier .nav { padding:8px 12px; font-size:13.5px; color:#6b6f80; border-radius:10px; cursor:pointer; display:flex; align-items:center; gap:10px; }
        .v4-atelier .nav.active { background:#fff; color:#1d1f2b; box-shadow: 0 1px 0 rgba(29,31,43,0.04), 0 2px 8px rgba(29,31,43,0.05); font-weight: 500; }
        .v4-atelier .nav:hover { background:rgba(255,255,255,0.6); }
        .v4-atelier .ico { width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; color:#9ea2b3; }
        .v4-atelier .pill { display:inline-flex; align-items:center; gap:6px; padding:3px 10px; border-radius:999px; font-size:11.5px; font-weight:500; }
        .v4-atelier .lbl { font-size:11.5px; color:#9ea2b3; font-weight:500; }
        .v4-atelier .em { color:#0e9b6f; }
        .v4-atelier .lav { color:#7159d1; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width:228, padding:"22px 14px", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"4px 10px", marginBottom:18 }}>
          <div style={{ width:30, height:30, borderRadius:9, background:"linear-gradient(135deg,#a5e8d2 0%,#7159d1 100%)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14 }}>c</div>
          <div className="display" style={{ fontSize:16 }}>Comply<span style={{ color:"#7159d1" }}>360</span></div>
        </div>

        {/* Org card */}
        <div className="card" style={{ padding:"10px 12px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#ffd6c2,#f29c79)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:11, color:"#7a3414" }}>CA</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Constructora Andes</div>
            <div className="mono" style={{ fontSize:10, color:"#9ea2b3" }}>20512934087</div>
          </div>
          <div style={{ color:"#9ea2b3", fontSize:11 }}>⇅</div>
        </div>

        <div className="lbl" style={{ padding:"4px 12px 6px", textTransform:"uppercase", letterSpacing:"0.08em", fontSize:10.5 }}>Operación</div>
        <div className="nav active"><span className="ico">◧</span>Cockpit</div>
        <div className="nav"><span className="ico">◯</span>Trabajadores <span className="mono" style={{ marginLeft:"auto", fontSize:11, color:"#9ea2b3" }}>47</span></div>
        <div className="nav"><span className="ico">◰</span>Contratos</div>
        <div className="nav"><span className="ico">⌑</span>SST <span className="pill" style={{ marginLeft:"auto", background:"#fff0ef", color:"#d8453a" }}>3</span></div>
        <div className="nav"><span className="ico">$</span>Planilla</div>
        <div className="nav"><span className="ico">◉</span>Capacitaciones</div>

        <div className="lbl" style={{ padding:"14px 12px 6px", textTransform:"uppercase", letterSpacing:"0.08em", fontSize:10.5 }}>Inteligencia</div>
        <div className="nav"><span className="ico">◇</span>Diagnóstico</div>
        <div className="nav"><span className="ico">⌬</span>Asistente IA <span className="pill" style={{ marginLeft:"auto", background:"#efeaff", color:"#7159d1" }}>nuevo</span></div>
        <div className="nav"><span className="ico">▴</span>Riesgo SUNAFIL</div>

        <div className="card" style={{ marginTop:"auto", padding:"14px 14px", background:"linear-gradient(135deg,#efeaff 0%,#dff7ee 100%)", boxShadow:"none" }}>
          <div className="display" style={{ fontSize:13, marginBottom:4 }}>Plan PRO · Trial</div>
          <div className="mono" style={{ fontSize:10.5, color:"#6b6f80", marginBottom:8 }}>9 días restantes</div>
          <div style={{ height:5, background:"rgba(255,255,255,0.6)", borderRadius:3, overflow:"hidden" }}>
            <div style={{ width:"36%", height:"100%", background:"linear-gradient(90deg,#7159d1,#0e9b6f)", borderRadius:3 }}></div>
          </div>
          <button style={{ marginTop:10, width:"100%", padding:"7px 10px", background:"#1d1f2b", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer" }}>Activar PRO</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, padding:"22px 26px", overflow:"auto", display:"grid", gap:14, gridAutoRows:"min-content" }}>
        {/* Greeting */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div className="lbl" style={{ marginBottom:4 }}>Lunes 8 de mayo</div>
            <div className="display" style={{ fontSize:24 }}>Hola, Diana 👋</div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <div className="card" style={{ padding:"8px 12px", display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#6b6f80", boxShadow:"none", border:"1px solid #ebebf2" }}>
              <span>⌕</span> Buscar… <span className="mono" style={{ marginLeft:14, fontSize:10, padding:"2px 6px", background:"#f4f3f7", borderRadius:4 }}>⌘K</span>
            </div>
            <button style={{ padding:"9px 16px", background:"linear-gradient(135deg,#1d1f2b,#3b3f54)", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:500, cursor:"pointer" }}>Ejecutar diagnóstico ✨</button>
          </div>
        </div>

        {/* Hero */}
        <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:14 }}>
          <div className="card" style={{ padding:"24px 26px", position:"relative", overflow:"hidden", background:"linear-gradient(135deg,#fff 0%,#fbfaff 60%,#f3fbf6 100%)" }}>
            {/* aurora blob */}
            <div style={{ position:"absolute", right:-40, top:-40, width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle, rgba(113,89,209,0.18), rgba(14,155,111,0.05) 50%, transparent 70%)", filter:"blur(20px)" }}></div>
            <div style={{ position:"relative" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div className="lbl">SCORE GLOBAL · CUMPLIMIENTO</div>
                <div className="pill" style={{ background:"#dff7ee", color:"#0e9b6f" }}>↑ +4 vs sem. pasada</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:24 }}>
                {/* Donut */}
                <div style={{ position:"relative", width:140, height:140, flexShrink:0 }}>
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r="58" fill="none" stroke="#f4f3f7" strokeWidth="14" />
                    <circle cx="70" cy="70" r="58" fill="none" stroke="url(#g4)" strokeWidth="14" strokeDasharray={`${72/100*364} 364`} strokeLinecap="round" transform="rotate(-90 70 70)" />
                    <defs>
                      <linearGradient id="g4" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#7159d1" />
                        <stop offset="100%" stopColor="#0e9b6f" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                    <div className="display" style={{ fontSize:42, lineHeight:1 }}>72</div>
                    <div className="lbl" style={{ marginTop:2 }}>de 100</div>
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <div className="display" style={{ fontSize:20, lineHeight:1.3, marginBottom:8 }}>
                    Estás a <span className="lav">13 puntos</span> de la zona segura.
                  </div>
                  <div style={{ fontSize:13, color:"#6b6f80", marginBottom:14, lineHeight:1.5 }}>
                    Tu sector promedia 68. Tres acciones cierran la brecha esta semana.
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button style={{ padding:"8px 14px", background:"#1d1f2b", color:"#fff", border:"none", borderRadius:9, fontSize:12.5, fontWeight:500, cursor:"pointer" }}>Ver plan →</button>
                    <button style={{ padding:"8px 14px", background:"#fff", color:"#1d1f2b", border:"1px solid #ebebf2", borderRadius:9, fontSize:12.5, fontWeight:500, cursor:"pointer" }}>Cómo se calcula</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding:"22px 24px" }}>
            <div className="lbl" style={{ marginBottom:12, textTransform:"uppercase", letterSpacing:"0.08em" }}>Composición</div>
            <div style={{ display:"grid", gap:11 }}>
              {d.breakdown.map(b => (
                <div key={b.area}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:5 }}>
                    <span>{b.area}</span>
                    <span className="mono" style={{ fontWeight:500 }}>{b.score}</span>
                  </div>
                  <div style={{ height:6, background:"#f4f3f7", borderRadius:999, overflow:"hidden" }}>
                    <div style={{ width:`${b.score}%`, height:"100%", background: b.status==="ok"?"linear-gradient(90deg,#7159d1,#0e9b6f)":"linear-gradient(90deg,#f29c79,#d8453a)", borderRadius:999 }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
          {[
            { l:"Trabajadores", v:"47", s:"+2 este mes", c:"#7159d1", icon:"👥" },
            { l:"Vencimientos 7d", v:"8", s:"3 críticos", c:"#f29c79", icon:"📅" },
            { l:"Alertas", v:"3", s:"revisar", c:"#d8453a", icon:"⚠" },
            { l:"Multa evitada", v:"S/ 84.2k", s:"este mes", c:"#0e9b6f", icon:"✓" },
          ].map(k => (
            <div key={k.l} className="card" style={{ padding:"16px 18px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ width:30, height:30, borderRadius:9, background:`${k.c}1a`, color:k.c, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{k.icon}</div>
                <span style={{ fontSize:11, color:"#9ea2b3" }}>↗</span>
              </div>
              <div className="display" style={{ fontSize:24, lineHeight:1 }}>{k.v}</div>
              <div className="lbl" style={{ marginTop:4 }}>{k.l}</div>
              <div style={{ fontSize:11, marginTop:2, color:"#6b6f80" }}>{k.s}</div>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:14 }}>
          <div className="card" style={{ padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
              <div className="display" style={{ fontSize:15 }}>Lo que se viene</div>
              <span className="lbl">Próximos 14 días</span>
            </div>
            <div style={{ display:"grid", gap:6 }}>
              {d.deadlines.map(dl => (
                <div key={dl.id} style={{ display:"grid", gridTemplateColumns:"42px 1fr auto", gap:12, alignItems:"center", padding:"9px 10px", borderRadius:10, background: dl.urgency==="high"?"#fff5f3":"transparent" }}>
                  <div style={{ width:42, height:42, borderRadius:10, background:"#f4f3f7", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                    <div className="display" style={{ fontSize:16, lineHeight:1, color: dl.urgency==="high"?"#d8453a":"#1d1f2b" }}>{dl.days}</div>
                    <div style={{ fontSize:9, color:"#9ea2b3" }}>días</div>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{dl.what}</div>
                    <div style={{ fontSize:11.5, color:"#9ea2b3" }}>{dl.who} · {dl.area}</div>
                  </div>
                  <button style={{ padding:"6px 11px", border:"1px solid #ebebf2", background:"#fff", borderRadius:8, fontSize:11.5, cursor:"pointer", color:"#6b6f80" }}>Resolver</button>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding:"20px 22px", background:"linear-gradient(135deg,#1d1f2b 0%,#2d2f4a 100%)", color:"#fff" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ width:26, height:26, borderRadius:8, background:"linear-gradient(135deg,#a5e8d2,#7159d1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>✦</div>
              <div className="display" style={{ fontSize:13.5 }}>Copilot</div>
              <span className="pill" style={{ marginLeft:"auto", background:"rgba(165,232,210,0.18)", color:"#a5e8d2", fontSize:10 }}>● activo</span>
            </div>
            <div className="display" style={{ fontSize:15.5, lineHeight:1.4, marginBottom:16 }}>
              Carlos no completó su examen médico — la multa potencial es <span style={{ color:"#a5e8d2" }}>S/ 12,150</span>. ¿Te genero el plan?
            </div>
            <div style={{ display:"grid", gap:6, marginBottom:14 }}>
              {d.copilotSuggestions.slice(0,2).map(s=>(
                <div key={s} style={{ padding:"9px 11px", background:"rgba(255,255,255,0.06)", borderRadius:8, fontSize:12, lineHeight:1.4, border:"1px solid rgba(255,255,255,0.05)" }}>{s}</div>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", padding:"9px 12px", background:"rgba(255,255,255,0.08)", borderRadius:9, fontSize:12.5, color:"rgba(255,255,255,0.6)" }}>
              <span>Pregunta a Comply…</span>
              <span className="mono" style={{ marginLeft:"auto", fontSize:10, padding:"2px 5px", background:"rgba(255,255,255,0.1)", borderRadius:3 }}>⌘K</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

window.V4Atelier = V4Atelier;
