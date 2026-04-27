// ==============================================
// COMPLY360 — Email Service
// Central email service abstraction
// Uses Resend API (resend.com) — popular, simple, good free tier
// Falls back to console.log if RESEND_API_KEY not set
// ==============================================

import {
  welcomeEmail,
  alertEmail,
  weeklyDigest,
  complaintNotification,
} from './templates'

// ── Types ──────────────────────────────────────

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

interface AlertPayload {
  type: 'CONTRACT_EXPIRY' | 'CTS_DEADLINE' | 'SUNAFIL_INSPECTION' | 'COMPLIANCE_DROP' | 'CUSTOM'
  title: string
  description: string
  actionUrl?: string
  dueDate?: string
}

// ── Brand constants ────────────────────────────

const DEFAULT_FROM = 'COMPLY360 <notificaciones@comply360.pe>'

// ── Core send function ─────────────────────────

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = options.from || DEFAULT_FROM
  const recipients = Array.isArray(options.to) ? options.to : [options.to]

  if (!apiKey) {
    // En PRODUCCIÓN: fallar explícitamente para que el caller sepa que el
    // email NO se mandó. Antes devolvíamos { success: true } engañoso —
    // los admins veían "email enviado" pero los workers nunca lo recibían.
    if (process.env.NODE_ENV === 'production') {
      console.error(
        `[email] BLOCKED: RESEND_API_KEY no configurado en producción. ` +
        `Email a ${recipients.join(', ')} (subject: "${options.subject}") NO enviado. ` +
        `Configura RESEND_API_KEY en Vercel → Settings → Environment Variables.`,
      )
      return {
        success: false,
        error: 'RESEND_API_KEY no configurado en producción. Email no enviado.',
      }
    }
    // En DEV: log + success simulado (para no bloquear desarrollo local)
    console.log('[email] No RESEND_API_KEY set (dev mode) — logging email instead:')
    console.log(`  From: ${from}`)
    console.log(`  To: ${recipients.join(', ')}`)
    console.log(`  Subject: ${options.subject}`)
    console.log(`  HTML length: ${options.html.length} chars`)
    return { success: true, id: `dev-${Date.now()}` }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: options.subject,
        html: options.html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[email] Resend API error ${res.status}: ${body}`)
      return { success: false, error: `Resend API error: ${res.status}` }
    }

    const data = await res.json() as { id: string }
    return { success: true, id: data.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[email] Failed to send: ${message}`)
    return { success: false, error: message }
  }
}

// ── High-level email senders ───────────────────

/**
 * Send an individual alert notification email
 */
export async function sendAlertEmail(
  orgId: string,
  recipientEmail: string,
  alert: AlertPayload
): Promise<void> {
  const html = alertEmail(
    alert.title,
    alert.description,
    alert.dueDate || 'Sin fecha limite'
  )

  const result = await sendEmail({
    to: recipientEmail,
    subject: `[COMPLY360] Alerta: ${alert.title}`,
    html,
  })

  if (!result.success) {
    console.error(`[email] Failed to send alert to org ${orgId}: ${result.error}`)
  }
}

/**
 * Send a weekly digest email with compliance summary
 */
export async function sendDigestEmail(
  orgId: string,
  recipientEmail: string,
  stats: {
    workers: number
    openAlerts: number
    score: number
    pendingActions: number
  }
): Promise<void> {
  // Build HTML combining the stats dashboard and alert list
  const html = weeklyDigest(stats)

  const result = await sendEmail({
    to: recipientEmail,
    subject: `[COMPLY360] Resumen Semanal — Score: ${stats.score}%`,
    html,
  })

  if (!result.success) {
    console.error(`[email] Failed to send digest to org ${orgId}: ${result.error}`)
  }
}

/**
 * Send welcome email after onboarding
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  const html = welcomeEmail(name)

  const result = await sendEmail({
    to: email,
    subject: 'Bienvenido a COMPLY360 — Su cuenta esta lista',
    html,
  })

  if (!result.success) {
    console.error(`[email] Failed to send welcome email to ${email}: ${result.error}`)
  }
}

/**
 * Send complaint notification to compliance officers
 */
export async function sendComplaintEmail(
  recipientEmails: string[],
  complaintCode: string,
  complaintType: string
): Promise<void> {
  const html = complaintNotification(complaintCode, complaintType)

  const result = await sendEmail({
    to: recipientEmails,
    subject: `[COMPLY360] Nueva Denuncia: ${complaintCode}`,
    html,
  })

  if (!result.success) {
    console.error(`[email] Failed to send complaint notification: ${result.error}`)
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<void> {
  const BRAND_BLUE = '#1e3a6e'
  const BRAND_GOLD = '#d4a853'

  // Inline template for password reset — simple and focused
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:${BRAND_BLUE};padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">COMPLY360</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:${BRAND_BLUE};font-size:20px;">Restablecer Contrasena</h2>
            <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">
              Recibimos una solicitud para restablecer la contrasena de su cuenta. Haga clic en el boton para crear una nueva contrasena.
            </p>
            <p style="margin:0 0 24px;color:#64748b;font-size:13px;">
              Este enlace expira en 1 hora. Si no solicito este cambio, ignore este correo.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td style="background-color:${BRAND_GOLD};border-radius:6px;">
                  <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
                    Restablecer Contrasena
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;word-break:break-all;">
              Si el boton no funciona, copie y pegue este enlace en su navegador:<br>${resetUrl}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background-color:#f0f4fa;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#64748b;font-size:12px;text-align:center;">
              &copy; ${new Date().getFullYear()} COMPLY360 — Cumplimiento laboral para Peru.<br>
              <a href="https://app.comply360.pe/settings/notifications" style="color:#64748b;text-decoration:underline;">Gestionar preferencias de correo</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const result = await sendEmail({
    to: email,
    subject: '[COMPLY360] Restablecer contrasena',
    html,
  })

  if (!result.success) {
    console.error(`[email] Failed to send password reset to ${email}: ${result.error}`)
  }
}

/**
 * Send newsletter subscription confirmation
 */
export async function sendNewsletterConfirmation(email: string): Promise<void> {
  const BRAND_BLUE = '#1e3a6e'
  const BRAND_GOLD = '#d4a853'

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:${BRAND_BLUE};padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">COMPLY360</h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Actualizaciones Legales</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:${BRAND_BLUE};font-size:20px;">Suscripcion Confirmada</h2>
            <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">
              Gracias por suscribirte a las actualizaciones legales de COMPLY360.
            </p>
            <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">
              Recibiras contenido sobre:
            </p>
            <ul style="margin:0 0 20px;padding-left:20px;color:#334155;font-size:14px;line-height:1.8;">
              <li>Nuevas leyes y normas laborales</li>
              <li>Alertas de SUNAFIL y plazos criticos</li>
              <li>Tips practicos para cumplimiento laboral</li>
              <li>Guias y recursos exclusivos</li>
            </ul>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td style="background-color:${BRAND_GOLD};border-radius:6px;">
                  <a href="https://comply360.pe/blog.html" target="_blank" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    Ver Blog Legal
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background-color:#f0f4fa;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#64748b;font-size:12px;text-align:center;">
              &copy; ${new Date().getFullYear()} COMPLY360<br>
              <a href="https://comply360.pe/unsubscribe" style="color:#64748b;text-decoration:underline;">Cancelar suscripcion</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const result = await sendEmail({
    to: email,
    subject: 'Suscripcion confirmada — Actualizaciones Legales COMPLY360',
    html,
  })

  if (!result.success) {
    console.error(`[email] Failed to send newsletter confirmation to ${email}: ${result.error}`)
  }
}
