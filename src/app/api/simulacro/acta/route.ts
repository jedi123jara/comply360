/**
 * POST /api/simulacro/acta
 *
 * Genera el Acta de Requerimiento Virtual formato R.M. 199-2016-TR
 * a partir del resultado de un simulacro SUNAFIL guardado en DB.
 *
 * Body:
 *   diagnosticId  string   — ID de ComplianceDiagnostic tipo SIMULATION
 *   orgName       string   — Nombre de la empresa (para el acta)
 *   ruc           string   — RUC de la empresa
 *
 * Returns:
 *   { html: string }  — HTML profesional listo para imprimir/PDF
 *
 * El HTML incluye:
 *   - Carátula oficial con datos del inspector virtual y la empresa
 *   - Tabla de hallazgos con base legal y multa estimada
 *   - Resumen de infracciones (leves / graves / muy graves)
 *   - Plan de subsanación sugerido con plazos
 *   - Bloque de firmas (empresa + inspector SUNAFIL)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// ─── Types for diagnostic questionsJson ─────────────────────────────────────

interface HallazgoItem {
  solicitudId?: string
  estado?: string
  documentoLabel?: string
  baseLegal?: string
  gravedad?: string
  multaUIT?: number
  multaPEN?: number
  mensaje?: string
}

interface SimulacroQuestionsJson {
  tipo?: string
  hallazgos?: HallazgoItem[]
  multaTotal?: number
  multaConSubsanacion?: number
  multaConSubsanacionDurante?: number
  infraccionesLeves?: number
  infraccionesGraves?: number
  infraccionesMuyGraves?: number
  cumple?: number
  parcial?: number
  noCumple?: number
  totalSolicitudes?: number
}

const UIT_2026 = 5500

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function rowColor(estado: string): string {
  switch (estado) {
    case 'CUMPLE':    return '#dcfce7'
    case 'PARCIAL':   return '#fef9c3'
    case 'NO_CUMPLE': return '#fee2e2'
    default:          return '#f1f5f9'
  }
}

function estadoLabel(estado: string): string {
  switch (estado) {
    case 'CUMPLE':    return '✓ CUMPLE'
    case 'PARCIAL':   return '⚠ PARCIAL'
    case 'NO_CUMPLE': return '✗ INCUMPLE'
    case 'NO_APLICA': return '— N/A'
    default:          return estado
  }
}

function gravedadBadge(gravedad: string): string {
  switch (gravedad) {
    case 'LEVE':      return '<span style="background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px;font-size:10pt">LEVE</span>'
    case 'GRAVE':     return '<span style="background:#fee2e2;color:#991b1b;padding:1px 6px;border-radius:4px;font-size:10pt">GRAVE</span>'
    case 'MUY_GRAVE': return '<span style="background:#7f1d1d;color:#fff;padding:1px 6px;border-radius:4px;font-size:10pt">MUY GRAVE</span>'
    default:          return gravedad
  }
}

function generateActaHtml(params: {
  orgName: string
  ruc: string
  diagnostic: { id: string; createdAt: Date; scoreGlobal: number; questionsJson: SimulacroQuestionsJson }
}): string {
  const { orgName, ruc, diagnostic } = params
  const q = diagnostic.questionsJson
  const fechaActa = new Date(diagnostic.createdAt).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const horaActa = new Date(diagnostic.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

  const hallazgos = q.hallazgos ?? []
  const incumplimientos = hallazgos.filter(h => h.estado === 'NO_CUMPLE' || h.estado === 'PARCIAL')
  const multaTotal = q.multaTotal ?? 0
  const multaSubsanacion = q.multaConSubsanacion ?? (multaTotal * 0.10)
  const multaDurante = q.multaConSubsanacionDurante ?? (multaTotal * 0.30)

  const rows = hallazgos.map((h, i) => `
    <tr style="background:${rowColor(h.estado ?? '')}">
      <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;font-size:10pt">${i + 1}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10pt">${esc(h.documentoLabel ?? '')}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:9pt">${esc(h.baseLegal ?? '')}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10pt;text-align:center">${estadoLabel(h.estado ?? '')}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10pt;text-align:center">${gravedadBadge(h.gravedad ?? '')}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10pt;text-align:right">${h.multaUIT?.toFixed(2) ?? '—'} UIT</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10pt;text-align:right">${h.multaPEN ? `S/ ${h.multaPEN.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—'}</td>
    </tr>
  `).join('')

  const subsRows = incumplimientos.map((h, i) => {
    // Suggest subsanation deadlines: LEVE 15d, GRAVE 30d, MUY_GRAVE 10d
    const dias = h.gravedad === 'MUY_GRAVE' ? 10 : h.gravedad === 'GRAVE' ? 30 : 15
    const deadline = new Date(diagnostic.createdAt)
    deadline.setDate(deadline.getDate() + dias)
    const deadlineStr = deadline.toLocaleDateString('es-PE')
    return `
      <tr>
        <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;font-size:10pt">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10pt">${esc(h.documentoLabel ?? '')}</td>
        <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:9pt">${esc(h.mensaje ?? 'Regularizar conforme a la base legal indicada')}</td>
        <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10pt;text-align:center">${dias} dias habiles</td>
        <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:10pt;text-align:center">${deadlineStr}</td>
      </tr>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Acta de Requerimiento Virtual — ${esc(orgName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #1e293b;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 50px;
      line-height: 1.5;
    }
    .header-logo {
      display: flex;
      align-items: center;
      gap: 20px;
      border-bottom: 3px solid #1e3a6e;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header-logo .escudo {
      font-size: 32pt;
      line-height: 1;
    }
    .header-logo .titles h1 {
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #1e3a6e;
      margin: 0 0 2px;
      letter-spacing: 0.05em;
    }
    .header-logo .titles h2 {
      font-size: 9pt;
      color: #64748b;
      font-weight: normal;
      margin: 0;
    }
    h2.section {
      font-size: 11pt;
      text-transform: uppercase;
      color: #1e3a6e;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 24px;
    }
    .title-acta {
      text-align: center;
      margin: 20px 0;
    }
    .title-acta h1 {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #1e3a6e;
      margin: 0 0 4px;
    }
    .title-acta p {
      font-size: 10pt;
      color: #64748b;
      margin: 0;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 16px 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      background: #f8fafc;
    }
    .info-item label {
      font-size: 9pt;
      text-transform: uppercase;
      color: #64748b;
      font-weight: bold;
      display: block;
      margin-bottom: 2px;
    }
    .info-item span {
      font-size: 11pt;
      color: #1e293b;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 10pt;
    }
    thead tr {
      background: #1e3a6e;
      color: white;
    }
    thead th {
      padding: 8px;
      border: 1px solid #1e3a6e;
      font-size: 9pt;
      font-weight: bold;
      text-align: left;
    }
    .summary-boxes {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 16px 0;
    }
    .summary-box {
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .summary-box .val {
      font-size: 22pt;
      font-weight: bold;
      display: block;
      line-height: 1;
    }
    .summary-box .lbl {
      font-size: 9pt;
      margin-top: 4px;
    }
    .score-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      font-size: 22pt;
      font-weight: bold;
      border: 4px solid;
    }
    .disclaimer {
      font-size: 9pt;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 24px;
    }
    .signature-block {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
    }
    .signature-line {
      border-top: 1px solid #1e293b;
      padding-top: 8px;
    }
    .signature-line p {
      font-size: 10pt;
      margin: 2px 0;
    }
    @media print {
      body { padding: 20px 30px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

<!-- CABECERA -->
<div class="header-logo">
  <div class="escudo">🏛️</div>
  <div class="titles">
    <h1>SUNAFIL — Superintendencia Nacional de Fiscalización Laboral</h1>
    <h2>Ministerio de Trabajo y Promoción del Empleo — República del Perú</h2>
  </div>
</div>

<!-- TÍTULO -->
<div class="title-acta">
  <h1>Acta de Requerimiento Virtual N° ${String(diagnostic.id).slice(-8).toUpperCase()}</h1>
  <p>Simulacro de Inspección Laboral — Generado por COMPLY360 | Formato: R.M. N° 199-2016-TR</p>
</div>

<!-- DATOS GENERALES -->
<h2 class="section">I. Datos de la Inspección</h2>
<div class="info-grid">
  <div class="info-item"><label>Empresa Inspeccionada</label><span>${esc(orgName)}</span></div>
  <div class="info-item"><label>RUC</label><span>${esc(ruc)}</span></div>
  <div class="info-item"><label>Tipo de Inspección</label><span>${esc(q.tipo ?? 'PREVENTIVA')}</span></div>
  <div class="info-item"><label>Fecha del Simulacro</label><span>${fechaActa}</span></div>
  <div class="info-item"><label>Hora</label><span>${horaActa} hrs.</span></div>
  <div class="info-item"><label>Inspector Virtual</label><span>Sistema COMPLY360</span></div>
  <div class="info-item"><label>Documentos Revisados</label><span>${q.totalSolicitudes ?? 0}</span></div>
  <div class="info-item"><label>N° Expediente</label><span>${String(diagnostic.id).slice(-12).toUpperCase()}</span></div>
</div>

<!-- SCORE RESUMEN -->
<h2 class="section">II. Resultado Global del Simulacro</h2>
<div style="display:flex;align-items:center;gap:32px;margin:16px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
  <div class="score-circle" style="color:${diagnostic.scoreGlobal >= 80 ? '#16a34a' : diagnostic.scoreGlobal >= 60 ? '#d97706' : '#dc2626'};border-color:${diagnostic.scoreGlobal >= 80 ? '#16a34a' : diagnostic.scoreGlobal >= 60 ? '#d97706' : '#dc2626'}">
    ${diagnostic.scoreGlobal}%
  </div>
  <div>
    <p style="font-size:14pt;font-weight:bold;margin:0;color:${diagnostic.scoreGlobal >= 80 ? '#16a34a' : diagnostic.scoreGlobal >= 60 ? '#d97706' : '#dc2626'}">
      ${diagnostic.scoreGlobal >= 80 ? 'NIVEL ACEPTABLE DE COMPLIANCE' : diagnostic.scoreGlobal >= 60 ? 'NIVEL EN RIESGO — ACCIÓN REQUERIDA' : 'NIVEL CRÍTICO — ACCIÓN INMEDIATA'}
    </p>
    <p style="font-size:10pt;color:#64748b;margin:4px 0 0">
      La empresa muestra un cumplimiento del ${diagnostic.scoreGlobal}% en los aspectos evaluados.
      ${diagnostic.scoreGlobal < 80 ? 'Se recomienda subsanar las infracciones detectadas antes de una inspección real.' : 'Mantener el nivel actual y atender los puntos pendientes.'}
    </p>
  </div>
</div>

<div class="summary-boxes">
  <div class="summary-box" style="background:#dcfce7;color:#166534">
    <span class="val">${q.cumple ?? 0}</span>
    <div class="lbl">✓ Cumple</div>
  </div>
  <div class="summary-box" style="background:#fef9c3;color:#854d0e">
    <span class="val">${q.parcial ?? 0}</span>
    <div class="lbl">⚠ Parcial</div>
  </div>
  <div class="summary-box" style="background:#fee2e2;color:#991b1b">
    <span class="val">${q.noCumple ?? 0}</span>
    <div class="lbl">✗ Incumple</div>
  </div>
  <div class="summary-box" style="background:#f1f5f9;color:#1e3a6e">
    <span class="val">${q.totalSolicitudes ?? 0}</span>
    <div class="lbl">Total</div>
  </div>
</div>

<div class="summary-boxes">
  <div class="summary-box" style="background:#fef3c7;color:#78350f;border:1px solid #fcd34d">
    <span class="val">${q.infraccionesLeves ?? 0}</span>
    <div class="lbl">Infracciones Leves</div>
  </div>
  <div class="summary-box" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5">
    <span class="val">${q.infraccionesGraves ?? 0}</span>
    <div class="lbl">Infracciones Graves</div>
  </div>
  <div class="summary-box" style="background:#7f1d1d;color:#fff;border:1px solid #7f1d1d">
    <span class="val">${q.infraccionesMuyGraves ?? 0}</span>
    <div class="lbl">Infracciones Muy Graves</div>
  </div>
  <div class="summary-box" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">
    <span class="val">S/ ${multaTotal.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
    <div class="lbl">Multa Total Estimada</div>
  </div>
</div>

<!-- HALLAZGOS DETALLADOS -->
<h2 class="section">III. Hallazgos por Requerimiento</h2>
<table>
  <thead>
    <tr>
      <th style="width:3%">#</th>
      <th style="width:20%">Documento / Requerimiento</th>
      <th style="width:20%">Base Legal</th>
      <th style="width:10%">Estado</th>
      <th style="width:10%">Gravedad</th>
      <th style="width:10%">Multa (UIT)</th>
      <th style="width:12%">Multa (S/)</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<!-- MULTAS CON DESCUENTO -->
<h2 class="section">IV. Escala de Multas según Momento de Subsanación</h2>
<table>
  <thead>
    <tr>
      <th>Escenario de Subsanación</th>
      <th>Base Legal</th>
      <th>Descuento</th>
      <th>Multa Aplicable</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #cbd5e1">Sin subsanación (multa íntegra)</td>
      <td style="padding:8px;border:1px solid #cbd5e1">D.S. 019-2006-TR</td>
      <td style="padding:8px;border:1px solid #cbd5e1;text-align:center">0%</td>
      <td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;color:#dc2626;text-align:right">S/ ${multaTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr style="background:#fef9c3">
      <td style="padding:8px;border:1px solid #cbd5e1">Subsanación DURANTE la inspección</td>
      <td style="padding:8px;border:1px solid #cbd5e1">Ley 28806, Art. 40°</td>
      <td style="padding:8px;border:1px solid #cbd5e1;text-align:center">Hasta 70%</td>
      <td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;color:#d97706;text-align:right">S/ ${multaDurante.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr style="background:#dcfce7">
      <td style="padding:8px;border:1px solid #cbd5e1"><strong>Subsanación ANTES de la inspección (recomendado)</strong></td>
      <td style="padding:8px;border:1px solid #cbd5e1">Ley 28806, Art. 40°</td>
      <td style="padding:8px;border:1px solid #cbd5e1;text-align:center"><strong>90%</strong></td>
      <td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;color:#16a34a;text-align:right"><strong>S/ ${multaSubsanacion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></td>
    </tr>
  </tbody>
</table>

<!-- PLAN DE SUBSANACIÓN -->
${incumplimientos.length > 0 ? `
<h2 class="section">V. Requerimiento de Subsanación</h2>
<p style="font-size:10pt;color:#475569">
  De conformidad con el Art. 13° del D.S. N° 019-2006-TR y el Art. 40° de la Ley N° 28806,
  se REQUIERE al empleador subsanar las siguientes infracciones en los plazos indicados:
</p>
<table>
  <thead>
    <tr>
      <th style="width:3%">#</th>
      <th style="width:25%">Infracción Detectada</th>
      <th style="width:35%">Medida de Subsanación Requerida</th>
      <th style="width:12%">Plazo</th>
      <th style="width:13%">Fecha Límite</th>
    </tr>
  </thead>
  <tbody>${subsRows}</tbody>
</table>
<p style="font-size:9pt;color:#64748b;margin-top:8px">
  (*) El empleador que subsane la totalidad de las infracciones antes del plazo indicado podrá acogerse al 90% de descuento sobre la multa calculada, conforme al Art. 40° de la Ley N° 28806. El descuento aplica solo cuando la subsanación es verificada y acreditada documentalmente.
</p>
` : `
<h2 class="section">V. Plan de Subsanación</h2>
<p style="color:#16a34a;font-weight:bold">✓ No se detectaron incumplimientos que requieran subsanación. La empresa mantiene un nivel de compliance aceptable.</p>
`}

<!-- CONSTANCIA DE DERECHOS -->
<h2 class="section">VI. Constancia de Derechos y Obligaciones</h2>
<p style="font-size:10pt;color:#475569">
  El empleador tiene derecho a:
</p>
<ul style="font-size:10pt;color:#475569">
  <li>Presentar descargos y pruebas de subsanación en los plazos establecidos.</li>
  <li>Acogerse al descuento del 90% por subsanación voluntaria previa a la inspección (Art. 40° Ley 28806).</li>
  <li>Impugnar el resultado ante la autoridad inspectiva competente.</li>
  <li>Ser asesorado por el abogado de su elección durante todo el procedimiento.</li>
</ul>

<!-- FIRMA -->
<div class="signature-block">
  <div>
    <div class="signature-line">
      <p><strong>${esc(orgName)}</strong></p>
      <p>RUC: ${esc(ruc)}</p>
      <p>Representante Legal / RRHH</p>
      <p style="font-size:9pt;color:#64748b">Fecha: ${fechaActa}</p>
    </div>
  </div>
  <div>
    <div class="signature-line">
      <p><strong>Inspector SUNAFIL Virtual</strong></p>
      <p>Sistema COMPLY360</p>
      <p>Módulo de Simulacro</p>
      <p style="font-size:9pt;color:#64748b">UIT 2026: S/ ${UIT_2026.toLocaleString('es-PE')}</p>
    </div>
  </div>
</div>

<!-- DISCLAIMER -->
<div class="disclaimer">
  <strong>AVISO IMPORTANTE:</strong> Este documento es generado por el módulo de Simulacro de Inspección de COMPLY360 y tiene carácter orientativo y preventivo. No constituye un acto administrativo de SUNAFIL ni tiene efectos jurídicos vinculantes. Su finalidad es ayudar a las empresas a prepararse para una inspección real. Para efectos legales, solo los actos expedidos por SUNAFIL tienen validez oficial. Base del simulacro: R.M. N° 199-2016-TR (Protocolo de Inspección del Trabajo), D.S. N° 019-2006-TR (Reglamento de la Ley General de Inspección del Trabajo), Ley N° 28806 (Ley General de Inspección del Trabajo).
</div>

</body>
</html>`
}

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const diagnosticId = typeof body.diagnosticId === 'string' ? body.diagnosticId : undefined
  const orgName = typeof body.orgName === 'string' ? body.orgName : 'Empresa'
  const ruc = typeof body.ruc === 'string' ? body.ruc : '—'

  if (!diagnosticId) {
    return NextResponse.json({ error: 'diagnosticId is required' }, { status: 400 })
  }

  // Fetch the diagnostic — must belong to the authenticated org
  const diagnostic = await prisma.complianceDiagnostic.findFirst({
    where: { id: diagnosticId, orgId: ctx.orgId, type: 'SIMULATION' },
    select: {
      id: true,
      scoreGlobal: true,
      questionsJson: true,
      createdAt: true,
    },
  })

  if (!diagnostic) {
    return NextResponse.json({ error: 'Diagnostic not found' }, { status: 404 })
  }

  const html = generateActaHtml({
    orgName,
    ruc,
    diagnostic: {
      id: diagnostic.id,
      createdAt: diagnostic.createdAt,
      scoreGlobal: diagnostic.scoreGlobal,
      questionsJson: diagnostic.questionsJson as SimulacroQuestionsJson,
    },
  })

  return NextResponse.json({ html })
})
