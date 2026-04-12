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
    ${ctaButton('Ir al Dashboard', 'https://app.comply360.pe/dashboard')}
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
    ${ctaButton('Ver Alertas', 'https://app.comply360.pe/alertas')}
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
    ${ctaButton('Ver Dashboard Completo', 'https://app.comply360.pe/dashboard')}
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
    ${ctaButton('Gestionar Denuncia', 'https://app.comply360.pe/denuncias')}
    <p style="margin:0;color:#64748b;font-size:12px;">Esta notificacion se envia automaticamente al correo de alertas registrado por su organizacion.</p>
  `)
}
