/**
 * SMS Service — Twilio integration for critical alerts
 * Used for: contract expirations, SUNAFIL deadlines, compliance drops
 */

interface SmsResult {
  success: boolean
  messageId?: string
  error?: string
}

interface SmsOptions {
  to: string       // Phone number with country code: +51999999999
  body: string     // Message body (max 1600 chars)
  priority?: 'normal' | 'urgent'
}

// ── Twilio Config ──────────────────────────────────
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER

function isTwilioConfigured(): boolean {
  return !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM &&
    TWILIO_SID !== 'ACxxxxx')
}

// ── Send SMS ───────────────────────────────────────
export async function sendSms(options: SmsOptions): Promise<SmsResult> {
  const { to, body } = options

  // Validate phone number (Peru format)
  if (!/^\+\d{10,15}$/.test(to)) {
    return { success: false, error: 'Numero de telefono invalido. Use formato +51XXXXXXXXX' }
  }

  // Truncate if too long
  const truncatedBody = body.length > 1600 ? body.slice(0, 1597) + '...' : body

  // Dev mode — log instead of sending
  if (!isTwilioConfigured()) {
    console.log('[SMS-DEV] To:', to)
    console.log('[SMS-DEV] Body:', truncatedBody)
    return { success: true, messageId: `dev_${Date.now()}` }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_FROM!,
        Body: truncatedBody,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message || `Twilio error ${response.status}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.sid }
  } catch (error) {
    console.error('[SMS] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al enviar SMS',
    }
  }
}

// ── Alert Templates ────────────────────────────────
export function smsContractExpiring(workerName: string, daysLeft: number): string {
  return `[COMPLY 360] ALERTA: El contrato de ${workerName} vence en ${daysLeft} dias. Ingrese a la plataforma para renovar o generar nuevo contrato.`
}

export function smsComplianceDrop(orgName: string, newScore: number): string {
  return `[COMPLY 360] URGENTE: El score de cumplimiento de ${orgName} bajo a ${newScore}%. Revise el diagnostico para identificar areas criticas.`
}

export function smsSunafilDeadline(description: string, daysLeft: number): string {
  return `[COMPLY 360] SUNAFIL: "${description}" vence en ${daysLeft} dias. Accion inmediata requerida.`
}

export function smsSstIncident(type: string, location: string): string {
  return `[COMPLY 360] SST: Incidente reportado - ${type} en ${location}. Registre la investigacion dentro de 24 horas (Ley 29783).`
}

export function smsGenericAlert(title: string, message: string): string {
  return `[COMPLY 360] ${title}: ${message}`
}

// ── Bulk SMS ───────────────────────────────────────
export async function sendBulkSms(
  recipients: { phone: string; body: string }[]
): Promise<{ sent: number; failed: number; results: SmsResult[] }> {
  const results: SmsResult[] = []
  let sent = 0
  let failed = 0

  // Send with 200ms delay between messages (Twilio rate limit)
  for (const { phone, body } of recipients) {
    const result = await sendSms({ to: phone, body })
    results.push(result)
    if (result.success) sent++
    else failed++

    if (isTwilioConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  return { sent, failed, results }
}
