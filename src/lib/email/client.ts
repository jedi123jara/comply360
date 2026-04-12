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
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'COMPLY360 <notificaciones@comply360.pe>',
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    })
    return res.ok
  } catch {
    console.error('[email] Failed to send')
    return false
  }
}
