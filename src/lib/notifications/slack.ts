/**
 * Slack Webhook — notificaciones al canal del founder.
 *
 * Usa un Incoming Webhook de Slack (https://api.slack.com/messaging/webhooks).
 * Config: setear `SLACK_FOUNDER_WEBHOOK_URL` en env. Sin esa env var, los
 * eventos se loggean a consola y se silencian — no rompen la app.
 *
 * Eventos sugeridos para notificar:
 *  - Nueva empresa registrada (`notifyFounder('signup_completed', { orgName })`)
 *  - Pago completado (`notifyFounder('payment_completed', { orgName, plan, amount })`)
 *  - Trial expirando pronto (`notifyFounder('trial_expiring', { orgName, daysLeft })`)
 *  - Churn risk detectado (`notifyFounder('churn_risk', { orgName, daysSinceActivity })`)
 *  - Daily digest summary (`notifySlackRaw(markdownBlock)`)
 *
 * NO envía PII sensible — emails/DNIs nunca van al webhook por privacidad.
 */

type FounderEvent =
  | { type: 'signup_completed'; orgName: string; plan?: string; sector?: string }
  | { type: 'payment_completed'; orgName: string; plan: string; amount: number }
  | { type: 'trial_expiring'; orgName: string; daysLeft: number }
  | { type: 'trial_expired'; orgName: string }
  | { type: 'churn_risk'; orgName: string; daysSinceActivity: number }
  | { type: 'plan_upgraded'; orgName: string; fromPlan: string; toPlan: string }
  | { type: 'plan_downgraded'; orgName: string; fromPlan: string; toPlan: string }
  | { type: 'error_spike'; count: number; window: string }

const EVENT_EMOJI: Record<FounderEvent['type'], string> = {
  signup_completed: '🎉',
  payment_completed: '💰',
  trial_expiring: '⏰',
  trial_expired: '💔',
  churn_risk: '🔥',
  plan_upgraded: '📈',
  plan_downgraded: '📉',
  error_spike: '🚨',
}

function formatEvent(evt: FounderEvent): string {
  const emoji = EVENT_EMOJI[evt.type]
  switch (evt.type) {
    case 'signup_completed':
      return `${emoji} *Nueva empresa registrada:* ${evt.orgName}${evt.plan ? ` (${evt.plan})` : ''}${evt.sector ? ` — ${evt.sector}` : ''}`
    case 'payment_completed':
      return `${emoji} *Pago recibido:* ${evt.orgName} → ${evt.plan} · S/ ${evt.amount.toFixed(2)}`
    case 'trial_expiring':
      return `${emoji} *Trial expira en ${evt.daysLeft}d:* ${evt.orgName} — momento de outreach`
    case 'trial_expired':
      return `${emoji} *Trial expiró:* ${evt.orgName} — convertir a pago o churnea`
    case 'churn_risk':
      return `${emoji} *Churn risk:* ${evt.orgName} sin login ${evt.daysSinceActivity}d — intervenir`
    case 'plan_upgraded':
      return `${emoji} *Upgrade:* ${evt.orgName} pasó de ${evt.fromPlan} → ${evt.toPlan}`
    case 'plan_downgraded':
      return `${emoji} *Downgrade:* ${evt.orgName} pasó de ${evt.fromPlan} → ${evt.toPlan}`
    case 'error_spike':
      return `${emoji} *Error spike:* ${evt.count} errores en ${evt.window} — check Sentry`
  }
}

/**
 * Envía un mensaje al webhook del founder.
 * Nunca throw — si falla, loggea y sigue.
 */
export async function notifyFounder(evt: FounderEvent): Promise<void> {
  const webhook = process.env.SLACK_FOUNDER_WEBHOOK_URL
  const text = formatEvent(evt)

  if (!webhook) {
    console.log(`[slack-founder] ${text} (webhook no configurado)`)
    return
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mrkdwn: true }),
    })
    if (!res.ok) {
      console.warn(`[slack-founder] webhook returned ${res.status}`)
    }
  } catch (err) {
    console.error('[slack-founder] failed:', err)
  }
}

/**
 * Envía texto markdown arbitrario (para el daily digest).
 */
export async function notifySlackRaw(markdown: string): Promise<void> {
  const webhook = process.env.SLACK_FOUNDER_WEBHOOK_URL
  if (!webhook) {
    console.log(`[slack-founder]\n${markdown}`)
    return
  }

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: markdown, mrkdwn: true }),
    })
  } catch (err) {
    console.error('[slack-founder] raw failed:', err)
  }
}
