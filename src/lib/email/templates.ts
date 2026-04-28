// ==============================================
// COMPLY360 — Email HTML Templates
// All templates use inline styles for email compatibility
// ==============================================

const BRAND_BLUE = '#1e3a6e'
const BRAND_LIGHT = '#f0f4fa'
const CTA_BLUE = '#2563eb'

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background-color:${BRAND_BLUE};padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">COMPLY360</h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Plataforma de Cumplimiento Laboral</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background-color:${BRAND_LIGHT};border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#64748b;font-size:12px;text-align:center;">
              Este es un correo automatico de COMPLY360. No responda a este mensaje.<br>
              &copy; ${new Date().getFullYear()} COMPLY360 — Cumplimiento laboral para Peru.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:${CTA_BLUE};border-radius:6px;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
        ${text}
      </a>
    </td>
  </tr>
</table>`
}

// ==============================================
// Welcome email — after onboarding
// ==============================================
export function welcomeEmail(companyName: string): string {
  return layout(`
    <h2 style="margin:0 0 16px;color:${BRAND_BLUE};font-size:20px;">Bienvenido a COMPLY360</h2>
    <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">
      Hola, <strong>${companyName}</strong>.
    </p>
    <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">
      Su cuenta ha sido configurada exitosamente. Ahora puede comenzar a gestionar el cumplimiento laboral de su empresa desde un solo lugar.
    </p>
    <p style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.6;">Esto es lo que puede hacer ahora:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#334155;font-size:14px;line-height:1.8;">
      <li>Registrar trabajadores y generar contratos</li>
      <li>Calcular beneficios sociales (CTS, gratificaciones, liquidaciones)</li>
      <li>Ejecutar el diagnostico de cumplimiento</li>
      <li>Configurar alertas automaticas de vencimientos</li>
    </ul>
    ${ctaButton('Ir al Dashboard', 'https://comply360.pe/dashboard')}
    <p style="margin:0;color:#64748b;font-size:13px;">Si tiene consultas, responda a este correo o escribanos a soporte@comply360.pe.</p>
  `)
}

// ==============================================
// Alert email — individual alert notification
// ==============================================
export function alertEmail(alertTitle: string, alertDescription: string, dueDate: string): string {
  return layout(`
    <h2 style="margin:0 0 16px;color:${BRAND_BLUE};font-size:20px;">Alerta de Cumplimiento</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background-color:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 4px;color:#991b1b;font-size:16px;font-weight:600;">${alertTitle}</p>
          <p style="margin:0 0 8px;color:#7f1d1d;font-size:14px;line-height:1.5;">${alertDescription}</p>
          <p style="margin:0;color:#991b1b;font-size:13px;font-weight:600;">Fecha limite: ${dueDate}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6;">
      Ingrese a la plataforma para revisar esta alerta y tomar las acciones necesarias antes de la fecha limite.
    </p>
    ${ctaButton('Ver Alertas', 'https://comply360.pe/alertas')}
    <p style="margin:0;color:#64748b;font-size:12px;">Puede configurar sus preferencias de notificacion en Configuracion &gt; Notificaciones.</p>
  `)
}

// ==============================================
// Weekly digest — summary of the week
// ==============================================
export function weeklyDigest(stats: {
  workers: number
  openAlerts: number
  score: number
  pendingActions: number
}): string {
  const scoreColor = stats.score >= 80 ? '#16a34a' : stats.score >= 60 ? '#ca8a04' : '#dc2626'

  return layout(`
    <h2 style="margin:0 0 16px;color:${BRAND_BLUE};font-size:20px;">Resumen Semanal</h2>
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
      Este es el resumen de cumplimiento de su organizacion esta semana.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="padding:12px;text-align:center;background-color:${BRAND_LIGHT};border-radius:8px 0 0 0;">
          <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Trabajadores</p>
          <p style="margin:4px 0 0;color:${BRAND_BLUE};font-size:28px;font-weight:700;">${stats.workers}</p>
        </td>
        <td width="50%" style="padding:12px;text-align:center;background-color:${BRAND_LIGHT};border-radius:0 8px 0 0;">
          <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Score Cumplimiento</p>
          <p style="margin:4px 0 0;color:${scoreColor};font-size:28px;font-weight:700;">${stats.score}%</p>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding:12px;text-align:center;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:0 0 0 8px;">
          <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Alertas Abiertas</p>
          <p style="margin:4px 0 0;color:${stats.openAlerts > 0 ? '#dc2626' : '#16a34a'};font-size:28px;font-weight:700;">${stats.openAlerts}</p>
        </td>
        <td width="50%" style="padding:12px;text-align:center;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:0 0 8px 0;">
          <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Acciones Pendientes</p>
          <p style="margin:4px 0 0;color:${stats.pendingActions > 0 ? '#ca8a04' : '#16a34a'};font-size:28px;font-weight:700;">${stats.pendingActions}</p>
        </td>
      </tr>
    </table>
    ${ctaButton('Ver Dashboard Completo', 'https://comply360.pe/dashboard')}
    <p style="margin:0;color:#64748b;font-size:12px;">Recibira este resumen cada lunes. Puede desactivarlo en Configuracion.</p>
  `)
}

// ==============================================
// Complaint notification — new complaint received
// ==============================================
export function complaintNotification(complaintCode: string, complaintType: string): string {
  const typeLabels: Record<string, string> = {
    HOSTIGAMIENTO_SEXUAL: 'Hostigamiento Sexual',
    DISCRIMINACION: 'Discriminacion',
    ACOSO_LABORAL: 'Acoso Laboral',
    OTRO: 'Otro',
  }
  const typeLabel = typeLabels[complaintType] || complaintType

  return layout(`
    <h2 style="margin:0 0 16px;color:${BRAND_BLUE};font-size:20px;">Nueva Denuncia Recibida</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background-color:#fefce8;border-left:4px solid #ca8a04;border-radius:4px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 8px;color:#854d0e;font-size:14px;font-weight:600;">ATENCION: Plazo legal de respuesta</p>
          <p style="margin:0;color:#713f12;font-size:13px;line-height:1.5;">
            Segun la Ley N.° 27942 y su reglamento, tiene un plazo de 5 dias habiles para iniciar la investigacion.
          </p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;font-size:13px;">Codigo:</span>
          <span style="color:${BRAND_BLUE};font-size:14px;font-weight:600;margin-left:8px;">${complaintCode}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;font-size:13px;">Tipo:</span>
          <span style="color:#334155;font-size:14px;font-weight:500;margin-left:8px;">${typeLabel}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;font-size:13px;">Estado:</span>
          <span style="color:#ca8a04;font-size:14px;font-weight:500;margin-left:8px;">Recibida</span>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6;">
      Ingrese al modulo de denuncias para revisar los detalles y asignar un responsable de investigacion.
    </p>
    ${ctaButton('Gestionar Denuncia', 'https://comply360.pe/denuncias')}
    <p style="margin:0;color:#64748b;font-size:12px;">Esta notificacion se envia automaticamente al correo de alertas registrado por su organizacion.</p>
  `)
}

// ==============================================
// Worker onboarding cascade email
// Dispatched when a worker's contract transitions to SIGNED
// ==============================================
export interface WorkerOnboardingPayload {
  workerName: string
  orgName: string
  /** Cantidad de OrgDocuments publicados para el trabajador (RIT, políticas, etc). */
  documentsCount: number
  /** Cantidad de solicitudes pendientes (docs que debe subir). */
  pendingActions: number
}

export function workerOnboardingEmail(payload: WorkerOnboardingPayload): string {
  const { workerName, orgName, documentsCount, pendingActions } = payload
  // CRÍTICO: el link DEBE ir a /mi-portal/registrarse (no a /mi-portal directo).
  // /mi-portal/registrarse usa <SignUp unsafeMetadata={{ signupAs: 'WORKER' }} />
  // que marca al user como WORKER en el JIT. Si va a /mi-portal sin cuenta,
  // Clerk redirige a /sign-up (el genérico) y crea OWNER por error.
  const portalUrl = 'https://comply360.pe/mi-portal/registrarse'
  return layout(`
    <h2 style="margin:0 0 12px;color:${BRAND_BLUE};font-size:22px;">Bienvenido a bordo en ${orgName}</h2>
    <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
      Hola <strong>${workerName}</strong>, tu contrato ha sido firmado y tu portal en Comply360 ya esta activo.
      Desde ahi vas a poder ver tus boletas, solicitar vacaciones, y mantener tu documentacion al dia.
    </p>

    <div style="background-color:${BRAND_LIGHT};border-radius:8px;padding:20px;margin:20px 0;">
      <h3 style="margin:0 0 12px;color:${BRAND_BLUE};font-size:16px;">Para empezar, tenes:</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;color:#334155;font-size:14px;">
            <strong style="color:${BRAND_BLUE};">${documentsCount}</strong> documento(s) de la empresa para leer
            <span style="color:#64748b;font-size:12px;display:block;margin-top:2px;">
              RIT, politicas de SST, codigo de etica y otros que te compartio tu empleador.
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#334155;font-size:14px;border-top:1px solid #e2e8f0;">
            <strong style="color:${BRAND_BLUE};">${pendingActions}</strong> accion(es) pendiente(s)
            <span style="color:#64748b;font-size:12px;display:block;margin-top:2px;">
              Documentos que la empresa necesita de ti (DNI, CV, examen medico, etc.).
            </span>
          </td>
        </tr>
      </table>
    </div>

    ${ctaButton('Ir a mi portal', portalUrl)}

    <p style="margin:16px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
      Tu portal tambien funciona como app movil — podes instalarlo en tu celular desde el menu del navegador.
      Firma de documentos con huella, consulta de boletas y mas.
    </p>
  `)
}

// ==============================================
// Morning briefing (admin) — 7am PET cron
// Retention tool: darle al admin una razón para abrir COMPLY360 cada mañana
// ==============================================
export interface MorningBriefingPayload {
  orgName: string
  signedYesterday: number
  docsUploadedYesterday: number
  criticalAlertsOpen: number
  upcomingDeadlines: number
  multaEvitadaMes: number
}

export function morningBriefingEmail(payload: MorningBriefingPayload): string {
  const {
    orgName,
    signedYesterday,
    docsUploadedYesterday,
    criticalAlertsOpen,
    upcomingDeadlines,
    multaEvitadaMes,
  } = payload
  const dashboardUrl = 'https://comply360.pe/dashboard'
  const alertsUrl = 'https://comply360.pe/dashboard/alertas'

  const hoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const multaFmt = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(multaEvitadaMes)

  return layout(`
    <h2 style="margin:0 0 8px;color:${BRAND_BLUE};font-size:22px;">Buenos dias, ${orgName}</h2>
    <p style="margin:0 0 18px;color:#64748b;font-size:13px;">${hoy}</p>

    ${multaEvitadaMes > 0 ? `
    <div style="background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border:1px solid #10b981;border-radius:10px;padding:16px;margin-bottom:20px;">
      <p style="margin:0;color:#065f46;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">Multa evitada este mes</p>
      <p style="margin:4px 0 0;color:#047857;font-size:28px;font-weight:700;">${multaFmt}</p>
    </div>
    ` : ''}

    <h3 style="margin:0 0 10px;color:${BRAND_BLUE};font-size:15px;">Lo que paso ayer</h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#334155;font-size:14px;">
          ${signedYesterday > 0 ? `<strong style="color:${BRAND_BLUE};">${signedYesterday}</strong> contrato(s) firmado(s) por trabajadores` : 'Sin firmas nuevas'}
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#334155;font-size:14px;">
          ${docsUploadedYesterday > 0 ? `<strong style="color:${BRAND_BLUE};">${docsUploadedYesterday}</strong> documento(s) subido(s) al legajo` : 'Sin nuevos documentos'}
        </td>
      </tr>
    </table>

    ${criticalAlertsOpen > 0 || upcomingDeadlines > 0 ? `
    <h3 style="margin:0 0 10px;color:#b45309;font-size:15px;">Para hoy</h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${criticalAlertsOpen > 0 ? `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#334155;font-size:14px;">
          <strong style="color:#b91c1c;">${criticalAlertsOpen}</strong> alerta(s) critica(s)/alta(s) abierta(s)
        </td>
      </tr>
      ` : ''}
      ${upcomingDeadlines > 0 ? `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#334155;font-size:14px;">
          <strong style="color:#b45309;">${upcomingDeadlines}</strong> contrato(s) vencen en 7 dias
        </td>
      </tr>
      ` : ''}
    </table>
    ` : ''}

    ${ctaButton(criticalAlertsOpen > 0 ? 'Resolver alertas' : 'Ir al dashboard', criticalAlertsOpen > 0 ? alertsUrl : dashboardUrl)}

    <p style="margin:18px 0 0;color:#94a3b8;font-size:11px;line-height:1.5;">
      Recibes este briefing porque tienes un plan activo en COMPLY360. Para desactivar los mails diarios,
      ajusta tus preferencias en configuracion/notificaciones.
    </p>
  `)
}

// ==============================================
// Founder Daily Digest — email privado al dueño de la plataforma
// NO usa el layout() standard — tiene estética propia "god mode"
// ==============================================
export interface FounderDigestData {
  date: string // "Mar 15 abr 2026"
  mrr: number
  mrrDeltaVsPrev30d: number
  mrrDeltaPct: number | null
  activeSubscriptions: number
  trialingCount: number
  newOrgs7d: number
  activationRate7d: number | null
  dau: number
  mau: number
  stickinessPct: number | null
  trialsExpiring7d: number
  churnRiskOrgs: number
  cancelledLast30d: number
  aiVerifyAutoVerified30d: number
  copilotQueries30d: number
  topEvents7d: Array<{ action: string; count: number }>
  narrative: string[]
  adminUrl: string
}

function fmtS(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`
}
function fmtDelta(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`
}
function fmtPct(n: number | null): string {
  return n === null ? '—' : `${n > 0 ? '+' : ''}${n}%`
}

function kpiRow(label: string, value: string, sub?: string, color?: string): string {
  return `<tr>
    <td style="padding:10px 14px;border-bottom:1px solid #27272a;color:#a1a1aa;font-size:13px;">${label}</td>
    <td style="padding:10px 14px;border-bottom:1px solid #27272a;color:${color ?? '#fafafa'};font-size:15px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;">${value}</td>
    <td style="padding:10px 14px;border-bottom:1px solid #27272a;color:#71717a;font-size:11px;text-align:right;">${sub ?? ''}</td>
  </tr>`
}

export function founderDigestEmail(data: FounderDigestData): string {
  const mrrDeltaColor = data.mrrDeltaVsPrev30d >= 0 ? '#10b981' : '#ef4444'
  const churnColor = data.churnRiskOrgs > 0 ? '#f59e0b' : '#10b981'
  const trialsColor = data.trialsExpiring7d > 0 ? '#f59e0b' : '#a1a1aa'

  const narrativeBlock = data.narrative
    .map((n) => `<li style="margin:0 0 6px;color:#d4d4d8;font-size:13px;line-height:1.5;">${n}</li>`)
    .join('')

  const topEventsRows = data.topEvents7d
    .slice(0, 5)
    .map(
      (e) => `<tr>
        <td style="padding:6px 0;color:#d4d4d8;font-size:12px;font-family:'SF Mono',Menlo,Consolas,monospace;">${e.action}</td>
        <td style="padding:6px 0;color:#fafafa;font-size:12px;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;">${e.count}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;border:1px solid #27272a;border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="padding:24px 28px 16px;border-bottom:1px solid #27272a;">
            <p style="margin:0 0 4px;color:#10b981;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Founder Digest · Comply360</p>
            <h1 style="margin:0;color:#fafafa;font-size:22px;font-weight:600;letter-spacing:-0.3px;">${data.date}</h1>
          </td>
        </tr>

        <!-- Narrativa -->
        <tr>
          <td style="padding:20px 28px;background-color:#0f0f13;">
            <ul style="margin:0;padding-left:18px;list-style:disc;">
              ${narrativeBlock}
            </ul>
          </td>
        </tr>

        <!-- Business KPIs -->
        <tr>
          <td style="padding:24px 28px 8px;">
            <p style="margin:0 0 12px;color:#10b981;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">💰 Business</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${kpiRow('MRR', fmtS(data.mrr), `${fmtDelta(data.mrrDeltaVsPrev30d)} vs 30d · ${fmtPct(data.mrrDeltaPct)}`, mrrDeltaColor)}
              ${kpiRow('ARR proyectado', fmtS(data.mrr * 12))}
              ${kpiRow('Suscripciones activas', `${data.activeSubscriptions}`, `${data.trialingCount} en trial`)}
              ${kpiRow('Canceladas 30d', `${data.cancelledLast30d}`, data.cancelledLast30d > 0 ? 'revisar' : 'zero churn', data.cancelledLast30d > 0 ? '#ef4444' : '#10b981')}
            </table>
          </td>
        </tr>

        <!-- Growth -->
        <tr>
          <td style="padding:16px 28px 8px;">
            <p style="margin:0 0 12px;color:#10b981;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">📈 Growth</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${kpiRow('Nuevas empresas 7d', `${data.newOrgs7d}`)}
              ${kpiRow('Activation rate', fmtPct(data.activationRate7d), 'cohorte 7-14d')}
            </table>
          </td>
        </tr>

        <!-- Engagement -->
        <tr>
          <td style="padding:16px 28px 8px;">
            <p style="margin:0 0 12px;color:#10b981;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">🔥 Engagement</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${kpiRow('DAU / MAU', `${data.dau} / ${data.mau}`, `Stickiness ${fmtPct(data.stickinessPct)}`)}
              ${kpiRow('IA auto-verify 30d', `${data.aiVerifyAutoVerified30d}`, 'docs sin intervención')}
              ${kpiRow('Copilot queries 30d', `${data.copilotQueries30d}`)}
            </table>
          </td>
        </tr>

        <!-- Health -->
        <tr>
          <td style="padding:16px 28px 8px;">
            <p style="margin:0 0 12px;color:#10b981;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">⚠️ Health</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${kpiRow('Trials expirando 7d', `${data.trialsExpiring7d}`, data.trialsExpiring7d > 0 ? 'outreach' : 'OK', trialsColor)}
              ${kpiRow('Churn risk (sin login 14d)', `${data.churnRiskOrgs}`, data.churnRiskOrgs > 0 ? 'intervenir' : 'OK', churnColor)}
            </table>
          </td>
        </tr>

        <!-- Top events -->
        ${
          topEventsRows
            ? `<tr>
          <td style="padding:16px 28px 8px;">
            <p style="margin:0 0 12px;color:#10b981;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">📊 Top eventos 7d</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${topEventsRows}
            </table>
          </td>
        </tr>`
            : ''
        }

        <!-- CTA -->
        <tr>
          <td align="center" style="padding:24px 28px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:#10b981;border-radius:8px;">
                  <a href="${data.adminUrl}" target="_blank" style="display:inline-block;padding:11px 24px;color:#09090b;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                    Abrir Founder Console →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:14px 28px 18px;background-color:#0a0a0f;border-top:1px solid #27272a;">
            <p style="margin:0;color:#52525b;font-size:10px;text-align:center;line-height:1.5;">
              Este digest es privado — solo se envía al founder de Comply360. · Generado ${new Date().toISOString()}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
