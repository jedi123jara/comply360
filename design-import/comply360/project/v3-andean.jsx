/* global React */

// ============================================================================
// V3 — ANDEAN BOLD
// White base, big display type, terracotta + emerald, decisive. Brutalist edges.
// ============================================================================
function V3Andean() {
  const d = window.cockpitData;
  return (
    <div className="v3-andean" style={{ width:"100%", height:"100%", display:"flex", fontFamily:"'Inter', system-ui, sans-serif", color:"#0d0d0d", background:"#ffffff" }}>
      <style>{`
        .v3-andean { letter-spacing: -0.012em; }
        .v3-andean .display { font-family: 'Fraunces', Georgia, serif; font-weight: 600; letter-spacing: -0.025em; }
        .v3-andean .mono { font-family: 'Geist Mono', monospace; }
        .v3-andean .terracotta { color: #c84a2c; }
        .v3-andean .emerald { color: #117a4d; }
        .v3-andean .card { background:#fff; border:1.5px solid #0d0d0d; border-radius:0; }
        .v3-andean .nav { padding: 9px 14px; font-size:14px; font-weight:500; border-radius:0; cursor:pointer; display:flex; align-items:center; gap:10px; border-left: 3px solid transparent; }
        .v3-andean .nav.active { border-left-color: #c84a2c; background:#faf5ec; }
        .v3-andean .nav:hover { background:#f5f1ea; }
        .v3-andean .stamp { display:inline-block; padding: 4px 10px; font-size:11px; font-weight:700; text-transform: uppercase; letter-spacing: 0.08em; border:1.5px solid currentColor; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: 220, borderRight:"1.5px solid #0d0d0d", padding:"22px 0", display:"flex", flexDirection:"column", background:"#faf5ec" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0 18px", marginBottom: 22 }}>
          <div style={{ width:32, height:32, background:"#0d0d0d", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
            <span className="display" style={{ fontSize:22, color:"#c84a2c" }}>c</span>
          </div>
          <div>
            <div className="display" style={{ fontSize:20, lineHeight:1 }}>Comply<span className="terracotta">360</span></div>
            <div className="mono" style={{ fontSize:9.5, marginTop:2, letterSpacing:"0.08em", color:"#666" }}>COMPLIANCE PERÚ</div>
          </div>
        </div>

        <div style={{ display:"grid", gap:0 }}>
          <div className="nav active">▰ Cockpit</div>
          <div className="nav">∷ Trabajadores <span className="mono" style={{ marginLeft:"auto", fontSize:11 }}>47</span></div>
          <div className="nav">≡ Contratos</div>
          <div className="nav">⌑ SST <span className="stamp terracotta" style={{ marginLeft:"auto", fontSize:9, padding:"2px 6px" }}>3 ⚠</span></div>
          <div className="nav">▤ Planilla</div>
          <div className="nav">◉ Capacitaciones</div>
          <div className="nav">◇ Diagnóstico IA</div>
          <div className="nav">⌬ Asistente</div>
        </div>

        <div style={{ marginTop:"auto", padding:"16px 18px", borderTop:"1.5px solid #0d0d0d" }}>
          <div className="display" style={{ fontSize:14, marginBottom:4 }}>Plan PRO</div>
          <div className="mono" style={{ fontSize:10, color:"#666" }}>9 días de trial</div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {/* Top bar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 28px", borderBottom:"1.5px solid #0d0d0d" }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:14 }}>
            <div className="display" style={{ fontSize:22 }}>Cockpit</div>
            <div className="mono" style={{ fontSize:11, color:"#666", textTransform:"uppercase", letterSpacing:"0.1em" }}>Constructora Andes SAC · Lun 8 May</div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <button style={{ padding:"9px 14px", background:"#fff", color:"#0d0d0d", border:"1.5px solid #0d0d0d", fontSize:13, fontWeight:500, cursor:"pointer" }}>Ver auditoría</button>
            <button style={{ padding:"9px 16px", background:"#c84a2c", color:"#fff", border:"1.5px solid #c84a2c", fontSize:13, fontWeight:600, cursor:"pointer" }}>Disparar diagnóstico ↗</button>
            <div style={{ width:34, height:34, background:"#0d0d0d", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600 }}>D</div>
          </div>
        </div>

        <div style={{ flex:1, overflow:"auto", padding:"24px 28px", display:"grid", gap:18 }}>
          {/* Hero — magazine cover */}
          <div className="card" style={{ padding:"28px 32px", display:"grid", gridTemplateColumns:"1.3fr 1fr", gap: 32, position:"relative", overflow:"hidden" }}>
            {/* striped corner */}
            <svg style={{ position:"absolute", top:0, right:0, width:140, height:140 }} viewBox="0 0 140 140">
              {[...Array(12)].map((_,i)=>(<line key={i} x1={140-i*12} y1="0" x2="140" y2={i*12} stroke="#c84a2c" strokeWidth="1.5"/>))}
            </svg>
            <div>
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                <span className="stamp" style={{ background:"#0d0d0d", color:"#fff", borderColor:"#0d0d0d" }}>Score Q2</span>
                <span className="stamp emerald">+4 esta semana</span>
              </div>
              <div className="display" style={{ fontSize:108, lineHeight:0.9, marginBottom:8 }}>72<span style={{ fontSize:48, color:"#999" }}>/100</span></div>
              <div className="display" style={{ fontSize:30, lineHeight:1.15, maxWidth:520, marginBottom:18 }}>
                Estás <span className="terracotta">cerca</span> — pero todavía no en zona segura.
              </div>
              <div style={{ fontSize:14, color:"#444", lineHeight:1.5, maxWidth:460, marginBottom:20 }}>
                Te separan <strong>13 puntos</strong> del benchmark sectorial de construcción. Tres acciones cierran la brecha esta semana — y te alejan de una multa estimada en S/ 84,200.
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button style={{ padding:"12px 22px", background:"#0d0d0d", color:"#fff", border:"none", fontSize:14, fontWeight:600, cursor:"pointer" }}>Ver plan de 3 acciones →</button>
                <button style={{ padding:"12px 22px", background:"transparent", color:"#0d0d0d", border:"1.5px solid #0d0d0d", fontSize:14, fontWeight:600, cursor:"pointer" }}>Cómo se calcula</button>
              </div>
            </div>

            <div style={{ display:"grid", gap:12, alignContent:"start" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div style={{ borderTop:"3px solid #0d0d0d", paddingTop:8 }}>
                  <div className="mono" style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", color:"#666" }}>Sector</div>
                  <div className="display" style={{ fontSize:32 }}>68</div>
                </div>
                <div style={{ borderTop:"3px solid #c84a2c", paddingTop:8 }}>
                  <div className="mono" style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", color:"#666" }}>Tu org</div>
                  <div className="display terracotta" style={{ fontSize:32 }}>72</div>
                </div>
                <div style={{ borderTop:"3px solid #117a4d", paddingTop:8 }}>
                  <div className="mono" style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", color:"#666" }}>Target</div>
                  <div className="display emerald" style={{ fontSize:32 }}>85</div>
                </div>
                <div style={{ borderTop:"3px solid #0d0d0d", paddingTop:8 }}>
                  <div className="mono" style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", color:"#666" }}>Top 10%</div>
                  <div className="display" style={{ fontSize:32 }}>92</div>
                </div>
              </div>
              <div style={{ marginTop:6 }}>
                <div className="mono" style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", color:"#666", marginBottom:8 }}>Composición</div>
                {d.breakdown.map(b=>(
                  <div key={b.area} style={{ display:"grid", gridTemplateColumns:"100px 1fr 30px", gap:10, alignItems:"center", padding:"4px 0" }}>
                    <div style={{ fontSize:12.5 }}>{b.area}</div>
                    <div style={{ height:8, background:"#f5f1ea", border:"1px solid #0d0d0d" }}>
                      <div style={{ width:`${b.score}%`, height:"100%", background: b.status==="ok"?"#117a4d":"#c84a2c" }}></div>
                    </div>
                    <div className="mono" style={{ fontSize:12, textAlign:"right" }}>{b.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strip of KPIs and rest */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14 }}>
            {[
              { l:"Trabajadores", v:"47", s:"+2 mes", a:"#0d0d0d" },
              { l:"Vencimientos 7d", v:"08", s:"3 en SST", a:"#c84a2c" },
              { l:"Alertas críticas", v:"03", s:"revisar hoy", a:"#c84a2c" },
              { l:"Multa evitada", v:"84.2k", s:"soles · mes", a:"#117a4d" },
            ].map(k=>(
              <div key={k.l} className="card" style={{ padding:"14px 16px", borderTop:`5px solid ${k.a}` }}>
                <div className="mono" style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", color:"#666", marginBottom:6 }}>{k.l}</div>
                <div className="display" style={{ fontSize:36, lineHeight:1, color:k.a }}>{k.v}</div>
                <div style={{ fontSize:11.5, color:"#666", marginTop:4 }}>{k.s}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:18 }}>
            <div className="card" style={{ padding:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"16px 22px", borderBottom:"1.5px solid #0d0d0d" }}>
                <div className="display" style={{ fontSize:22 }}>Lo que se viene</div>
                <span className="mono" style={{ fontSize:11, color:"#666" }}>Próximos 14 días</span>
              </div>
              {d.deadlines.map((dl,i)=>(
                <div key={dl.id} style={{ display:"grid", gridTemplateColumns:"72px 1fr 100px 80px", gap:14, alignItems:"center", padding:"14px 22px", borderTop: i?"1px solid rgba(13,13,13,0.1)":"none" }}>
                  <div className="display" style={{ fontSize:34, lineHeight:1, color: dl.urgency==="high"?"#c84a2c":"#0d0d0d" }}>{dl.days}<span style={{ fontSize:14, color:"#999" }}>d</span></div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500 }}>{dl.what}</div>
                    <div style={{ fontSize:12, color:"#666" }}>{dl.who}</div>
                  </div>
                  <div className="mono" style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", color:"#666" }}>{dl.area}</div>
                  <div>
                    {dl.urgency==="high"
                      ? <span className="stamp terracotta">URGENTE</span>
                      : dl.urgency==="med" ? <span className="stamp" style={{ color:"#0d0d0d" }}>PRONTO</span>
                      : <span className="stamp" style={{ color:"#666" }}>PROGR.</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ background:"#0d0d0d", color:"#fff", borderColor:"#0d0d0d", padding:"22px 24px", position:"relative", overflow:"hidden" }}>
              <svg style={{ position:"absolute", bottom:-30, left:-30, width:160, height:160, opacity:0.5 }} viewBox="0 0 160 160">
                {[...Array(8)].map((_,i)=>(<rect key={i} x={i*22} y={i*22} width="14" height="14" fill="#c84a2c" opacity={0.5-i*0.05}/>))}
              </svg>
              <div className="stamp" style={{ borderColor:"#c84a2c", color:"#c84a2c", marginBottom:16 }}>● COPILOT</div>
              <div className="display" style={{ fontSize:24, lineHeight:1.2, marginBottom:18 }}>
                "Carlos no completó su examen médico. Multa potencial: <span className="terracotta">S/ 12,150</span>. Te genero el plan."
              </div>
              <div style={{ display:"grid", gap:6 }}>
                {d.copilotSuggestions.slice(0,2).map(s=>(
                  <div key={s} style={{ padding:"10px 12px", background:"rgba(255,255,255,0.08)", fontSize:12.5, lineHeight:1.4, borderLeft:"2px solid #c84a2c" }}>{s}</div>
                ))}
              </div>
              <div style={{ marginTop:14, display:"flex", alignItems:"center", padding:"10px 12px", background:"#fff", color:"#666", fontSize:13 }}>
                <span>Pregunta a Comply…</span>
                <span className="mono" style={{ marginLeft:"auto", fontSize:11, padding:"2px 6px", background:"#f5f1ea", color:"#0d0d0d" }}>⌘K</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

window.V3Andean = V3Andean;
