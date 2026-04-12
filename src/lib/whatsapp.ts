// =============================================
// WHATSAPP INTEGRATION
// Generates pre-filled WhatsApp messages for consultations
// =============================================

const WA_NUMBER = '51916275643'

export interface WhatsAppMessageOptions {
  type: 'liquidacion' | 'cts' | 'gratificacion' | 'indemnizacion' | 'horas_extras' | 'vacaciones' | 'multa_sunafil' | 'contrato' | 'consulta'
  data?: Record<string, string | number>
  total?: number
}

export function generateWhatsAppUrl(options: WhatsAppMessageOptions): string {
  const message = buildMessage(options)
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${WA_NUMBER}?text=${encoded}`
}

export function openWhatsApp(options: WhatsAppMessageOptions): void {
  const url = generateWhatsAppUrl(options)
  window.open(url, '_blank', 'noopener,noreferrer')
}

function buildMessage(options: WhatsAppMessageOptions): string {
  const { type, data, total } = options

  const header = '🏛️ *COMPLY360 — Consulta Legal*\n\n'

  switch (type) {
    case 'liquidacion':
      return `${header}Hola, acabo de calcular una *liquidación laboral* en COMPLY360 y quisiera una asesoría:\n\n` +
        `💰 *Total estimado:* S/ ${formatNum(total || 0)}\n` +
        (data?.sueldo ? `📊 Sueldo: S/ ${formatNum(Number(data.sueldo))}\n` : '') +
        (data?.fechaIngreso ? `📅 Ingreso: ${data.fechaIngreso}\n` : '') +
        (data?.fechaCese ? `📅 Cese: ${data.fechaCese}\n` : '') +
        (data?.motivo ? `📋 Motivo: ${data.motivo}\n` : '') +
        '\n¿Podrían ayudarme con mi caso?'

    case 'cts':
      return `${header}Hola, calculé mi *CTS* en COMPLY360:\n\n` +
        `💰 *CTS estimada:* S/ ${formatNum(total || 0)}\n` +
        (data?.periodo ? `📅 Período: ${data.periodo}\n` : '') +
        '\n¿Podrían verificar este cálculo?'

    case 'gratificacion':
      return `${header}Hola, calculé mi *gratificación* en COMPLY360:\n\n` +
        `💰 *Total:* S/ ${formatNum(total || 0)}\n` +
        (data?.periodo ? `📅 Período: ${data.periodo}\n` : '') +
        '\n¿Es correcto este monto?'

    case 'indemnizacion':
      return `${header}Hola, calculé una *indemnización por despido* en COMPLY360:\n\n` +
        `💰 *Indemnización estimada:* S/ ${formatNum(total || 0)}\n` +
        (data?.tipoContrato ? `📋 Tipo: ${data.tipoContrato}\n` : '') +
        (data?.anos ? `📅 Años de servicio: ${data.anos}\n` : '') +
        '\n¿Podrían asesorarme sobre cómo reclamar este monto?'

    case 'horas_extras':
      return `${header}Hola, calculé mis *horas extras pendientes* en COMPLY360:\n\n` +
        `💰 *Total estimado:* S/ ${formatNum(total || 0)}\n` +
        (data?.horas ? `⏰ Horas acumuladas: ${data.horas}\n` : '') +
        '\n¿Podrían ayudarme a reclamar este pago?'

    case 'vacaciones':
      return `${header}Hola, calculé mis *vacaciones pendientes* en COMPLY360:\n\n` +
        `💰 *Total estimado:* S/ ${formatNum(total || 0)}\n` +
        '\n¿Podrían asesorarme?'

    case 'multa_sunafil':
      return `${header}Hola, estimé una posible *multa SUNAFIL* en COMPLY360:\n\n` +
        `⚠️ *Multa estimada:* S/ ${formatNum(total || 0)}\n` +
        (data?.tipo ? `📋 Tipo infracción: ${data.tipo}\n` : '') +
        (data?.trabajadores ? `👥 Trabajadores: ${data.trabajadores}\n` : '') +
        '\n¿Qué opciones tenemos para reducir o evitar esta multa?'

    case 'contrato':
      return `${header}Hola, generé un *contrato laboral* en COMPLY360 y necesito revisión profesional:\n\n` +
        (data?.tipo ? `📋 Tipo: ${data.tipo}\n` : '') +
        (data?.trabajador ? `👤 Trabajador: ${data.trabajador}\n` : '') +
        '\n¿Podrían revisarlo y darnos feedback?'

    case 'consulta':
    default:
      return `${header}Hola, estoy usando COMPLY360 y quisiera una consulta sobre derecho laboral.\n\n` +
        '¿Podrían ayudarme?'
  }
}

function formatNum(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
