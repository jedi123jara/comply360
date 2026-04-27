/**
 * POST /api/diagnostics/email-test
 *
 * Admin-only endpoint para diagnosticar el sistema de envío de emails.
 *
 * Body: { to?: string }  // si no se pasa, usa el email del admin autenticado
 *
 * Devuelve un reporte completo:
 *   - hasResendKey: bool
 *   - resendKeyPrefix: string (primeros 6 chars para verificar identidad)
 *   - sendResult: { success, error?, id? }
 *   - resendApiError?: cuerpo completo del error si Resend falló
 *   - environment: NODE_ENV + APP_URL
 *   - timestamp
 *
 * Uso recomendado:
 *   1. Como admin loguea
 *   2. fetch('/api/diagnostics/email-test', { method: 'POST',
 *        body: JSON.stringify({ to: 'tu-email@gmail.com' }) })
 *   3. Lee la respuesta y diagnostica
 *
 * Auth: Admin+ de cualquier org.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  let body: { to?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const targetEmail = body.to ?? ctx.email
  if (!targetEmail) {
    return NextResponse.json({ error: 'No se pudo determinar email destino' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const hasKey = !!apiKey
  const keyPrefix = apiKey ? apiKey.slice(0, 6) + '...' : null

  const baseReport = {
    diagnostics: {
      hasResendKey: hasKey,
      resendKeyPrefix: keyPrefix,
      environment: {
        NODE_ENV: process.env.NODE_ENV ?? 'unknown',
        APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'not set',
      },
      timestamp: new Date().toISOString(),
      targetEmail,
    },
  }

  // Si no hay API key — abort early con reporte claro
  if (!apiKey) {
    return NextResponse.json(
      {
        ...baseReport,
        sendResult: {
          success: false,
          error: 'RESEND_API_KEY no está configurada en este environment',
        },
        suggestion:
          'Configura RESEND_API_KEY en Vercel → Settings → Environment Variables → Production. ' +
          'Después haz redeploy.',
      },
      { status: 200 },
    )
  }

  // Intentar el envío directo (no pasamos por sendEmail wrapper para tener
  // el control completo del error response de Resend).
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'COMPLY360 <notificaciones@comply360.pe>'

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [targetEmail],
        subject: '🧪 COMPLY360 — Email de prueba de diagnóstico',
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #047857;">✓ Tu sistema de email funciona</h1>
            <p style="color: #374151; font-size: 16px;">
              Si recibes este email, significa que <strong>RESEND_API_KEY está bien configurado</strong>
              y el dominio comply360.pe está autorizado para enviar.
            </p>
            <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
              Generado el ${new Date().toLocaleString('es-PE')} desde el endpoint de diagnóstico.
              Disparado por: ${ctx.email ?? 'admin'}
            </p>
          </div>
        `,
      }),
    })

    const responseText = await response.text()
    let responseJson: unknown
    try {
      responseJson = JSON.parse(responseText)
    } catch {
      responseJson = responseText
    }

    if (!response.ok) {
      // Resend rechazó — devolvemos el error completo para diagnóstico
      return NextResponse.json(
        {
          ...baseReport,
          sendResult: {
            success: false,
            httpStatus: response.status,
            error: `Resend API error ${response.status}`,
          },
          resendApiError: responseJson,
          suggestion: getSuggestionByStatus(response.status, responseText),
          fromEmail,
        },
        { status: 200 },
      )
    }

    return NextResponse.json({
      ...baseReport,
      sendResult: {
        success: true,
        httpStatus: response.status,
        resendId: (responseJson as { id?: string })?.id ?? 'unknown',
      },
      message: `✓ Email enviado a ${targetEmail}. Revisa tu bandeja (y spam) en los próximos 30 segundos.`,
      fromEmail,
    })
  } catch (err) {
    return NextResponse.json(
      {
        ...baseReport,
        sendResult: {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        },
        suggestion: 'Error de red o Resend caído. Reintenta en unos minutos.',
      },
      { status: 200 },
    )
  }
})

function getSuggestionByStatus(status: number, body: string): string {
  if (status === 401 || status === 403) {
    return 'API key inválida o revocada. Regenera una nueva en https://resend.com/api-keys y actualiza RESEND_API_KEY en Vercel.'
  }
  if (status === 422 && body.includes('domain')) {
    return 'El dominio comply360.pe NO está verificado en Resend. Ve a https://resend.com/domains, agrega el dominio y configura los 3 records DNS (SPF/DKIM/DMARC).'
  }
  if (status === 422) {
    return 'Resend rechazó el payload (422). Probablemente el "from" address no está autorizado. Verifica el dominio o usa onboarding@resend.dev temporalmente para probar.'
  }
  if (status === 429) {
    return 'Rate limit de Resend excedido. Tu plan free permite 100 emails/día y 3,000/mes. Espera o sube de plan.'
  }
  return `Resend devolvió ${status}. Revisa logs de Resend en https://resend.com/logs para detalles.`
}
