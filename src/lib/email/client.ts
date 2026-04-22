// Email client using Resend API
// Falls back to console.log in development if RESEND_API_KEY not set

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.log('[email] No RESEND_API_KEY — logging email instead:')
    console.log(`  To: ${options.to}`)
    console.log(`  Subject: ${options.subject}`)
    return true
  }

  try {
    // Resend requires the "from" domain to be verified. We fallback to
    // Resend's sandbox address while propagation finalises, so outbound
    // notifications don't silently drop.
    const fromAddress =
      process.env.EMAIL_FROM ??
      (process.env.RESEND_FROM ?? 'COMPLY360 <notificaciones@comply360.pe>')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    })

    if (!res.ok) {
      let detail: string
      try {
        detail = JSON.stringify(await res.json())
      } catch {
        detail = await res.text().catch(() => '(no body)')
      }
      console.error(
        `[email] Resend rejected (${res.status}) from=${fromAddress} to=${options.to}: ${detail}`,
      )
    }
    return res.ok
  } catch (err) {
    console.error('[email] Failed to send:', err)
    return false
  }
}
