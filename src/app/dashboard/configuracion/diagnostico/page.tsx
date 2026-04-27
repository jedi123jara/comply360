/**
 * /dashboard/configuracion/diagnostico
 *
 * Panel de diagnóstico técnico para el admin/founder.
 * Botones para probar integraciones externas (Resend, IA, etc.) y ver
 * el resultado completo en una sola pantalla, sin DevTools ni console.
 *
 * Por ahora solo cubre Resend (email). Sprint futuro: Anthropic, DeepSeek,
 * OpenAI, RENIEC, SUNAT — cada uno como su propia card.
 */

import { DiagnosticoClient } from './client'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Diagnóstico técnico | Comply360',
  description: 'Verifica el estado de las integraciones externas (Resend, IA, etc.)',
}

export default function DiagnosticoPage() {
  return <DiagnosticoClient />
}
