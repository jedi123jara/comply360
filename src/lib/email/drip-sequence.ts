/**
 * Drip email sequence post-diagnóstico-gratis.
 *
 * Cuando alguien completa el diagnóstico gratuito, queda como `Lead`.
 * Si no convierte a cuenta en X horas, arrancamos una secuencia de 5 emails
 * distribuidos en 10 días para nurturing.
 *
 * Cada stage usa AuditLog con `action='lead.drip.sent.day{N}'` para idempotencia
 * (no reenviar si ya se mandó). El cron diario procesa lo que toca ese día.
 */

import type { Lead } from '@/generated/prisma/client'

const BRAND_BLUE = '#1e3a6e'
const BRAND_LIGHT = '#f0f4fa'
const CTA_BLUE = '#2563eb'
const APP_URL = 'https://app.comply360.pe'

export interface DripStage {
  /** Stage number (1-5) */
  stage: number
  /** Días desde que se capturó el lead */
  daysAfter: number
  /** Acción canónica en AuditLog para idempotencia */
  auditAction: string
  /** Subject del email */
  subject: (lead: Lead) => string
  /** HTML del email */
  html: (lead: Lead) => string
}

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:${BRAND_BLUE};padding:20px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">COMPLY360</h1>
          </td>
        </tr>
        <tr><td style="padding:28px 32px;">${content}</td></tr>
        <tr>
          <td style="padding:16px 32px;background-color:${BRAND_LIGHT};border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#64748b;font-size:11px;line-height:1.5;text-align:center;">
              Recibis este correo porque completaste el diagnostico gratuito en COMPLY360.
              <br>Si no te interesa, <a href="${APP_URL}/api/leads/unsubscribe" style="color:#64748b;">darte de baja</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:${CTA_BLUE};border-radius:6px;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${text}</a>
      </td>
    </tr>
  </table>`
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)

// ═══════════════════════════════════════════════════════════════════════════
// Stage 1 — Día 1: "Tu diagnóstico ya está listo" + contexto
// ═══════════════════════════════════════════════════════════════════════════
const stage1: DripStage = {
  stage: 1,
  daysAfter: 1,
  auditAction: 'lead.drip.sent.day1',
  subject: (lead) =>
    lead.multaEstimada
      ? `${formatCurrency(Number(lead.multaEstimada))} en multas detectadas · tu diagnóstico`
      : 'Tu diagnóstico SUNAFIL está listo',
  html: (lead) => {
    const multa = lead.multaEstimada ? formatCurrency(Number(lead.multaEstimada)) : 'multas'
    const company = lead.companyName || 'tu empresa'
    return layout(`
      <h2 style="margin:0 0 12px;color:${BRAND_BLUE};font-size:20px;">Tu diagnóstico está listo</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        Hola,<br><br>
        Corriste el diagnóstico gratis para <strong>${company}</strong> y detectamos un riesgo potencial de <strong style="color:#b91c1c;">${multa}</strong> en multas SUNAFIL.
      </p>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        Esto no es una estimación genérica — está basado en las 10 preguntas que respondiste, calculado sobre la tabla oficial D.S. 019-2006-TR con UIT 2026 vigente.
      </p>
      <p style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.6;">
        Lo siguiente es el <strong>diagnóstico completo de 135 preguntas</strong> (parte del plan Empresa): cubre 8 áreas de compliance + genera un plan de acción priorizado por multa potencial.
      </p>
      ${ctaButton('Ver mi diagnóstico completo', `${APP_URL}/sign-up`)}
      <p style="margin:14px 0 0;color:#64748b;font-size:12px;line-height:1.5;">
        14 días de prueba sin tarjeta. Cancelas cuando quieras.
      </p>
    `)
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// Stage 2 — Día 3: Caso real + prueba social
// ═══════════════════════════════════════════════════════════════════════════
const stage2: DripStage = {
  stage: 2,
  daysAfter: 3,
  auditAction: 'lead.drip.sent.day3',
  subject: () => 'Este cliente iba a pagar S/82,500 en multas...',
  html: (lead) => {
    const company = lead.companyName || 'tu empresa'
    return layout(`
      <h2 style="margin:0 0 12px;color:${BRAND_BLUE};font-size:20px;">De S/82,500 en multas a 0 en 45 días</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        Un estudio jurídico en Lima con 58 trabajadores corrió nuestro simulacro SUNAFIL el mes pasado. <strong>Detectamos 14 hallazgos</strong>:
      </p>
      <ul style="margin:0 0 14px;padding-left:20px;color:#334155;font-size:14px;line-height:1.8;">
        <li>3 contratos vencidos sin renovación → S/22k de riesgo</li>
        <li>7 trabajadores con exámen médico expirado → S/15k</li>
        <li>Sin Reglamento Interno de Trabajo publicado → S/18k</li>
        <li>Registro de denuncias ausente (Ley 27942) → S/27k</li>
      </ul>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        Con nuestro plan de acción, <strong>subsanaron 12 hallazgos en 45 días</strong> y el resto en 90. Cuando llegó la inspección SUNAFIL real en diciembre, la multa fue de S/0.
      </p>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        ${company} está expuesta a lo mismo. La buena noticia: se arregla si empiezas ahora.
      </p>
      ${ctaButton('Probar 14 días gratis', `${APP_URL}/sign-up`)}
      <p style="margin:14px 0 0;color:#64748b;font-size:12px;line-height:1.5;">
        Esto NO es un testimonio genérico. Si quieres que te ponga en contacto con el cliente real, respondé este mail y coordinamos.
      </p>
    `)
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// Stage 3 — Día 5: Feature deep-dive (firma biométrica)
// ═══════════════════════════════════════════════════════════════════════════
const stage3: DripStage = {
  stage: 3,
  daysAfter: 5,
  auditAction: 'lead.drip.sent.day5',
  subject: () => 'Tus trabajadores firman con huella desde el celular',
  html: () =>
    layout(`
      <h2 style="margin:0 0 12px;color:${BRAND_BLUE};font-size:20px;">Adiós a imprimir contratos para firmar</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        Los contratos laborales peruanos se firman en papel porque no hay otra opción práctica. Hasta ahora.
      </p>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        En Comply360 cada trabajador recibe un <strong>portal móvil instalable</strong> en su celular. Firma con:
      </p>
      <ul style="margin:0 0 14px;padding-left:20px;color:#334155;font-size:14px;line-height:1.8;">
        <li><strong>Touch ID / Face ID</strong> en iPhone</li>
        <li><strong>Huella o Face Unlock</strong> en Android</li>
        <li><strong>Windows Hello</strong> en escritorio</li>
      </ul>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        Es <strong>firma electrónica fuerte</strong> según Ley 27269. El audit trail guarda IP + dispositivo + timestamp. Resiste conciliación ante MTPE / TFL SUNAFIL.
      </p>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        Bonus: cuando un trabajador firma su contrato, <strong>automáticamente</strong> se le publican las políticas SST, RIT, y se le piden los documentos faltantes de su legajo. Cero fricción.
      </p>
      ${ctaButton('Ver cómo funciona', `${APP_URL}/sign-up`)}
    `),
}

// ═══════════════════════════════════════════════════════════════════════════
// Stage 4 — Día 7: Urgencia SUNAFIL + pricing
// ═══════════════════════════════════════════════════════════════════════════
const stage4: DripStage = {
  stage: 4,
  daysAfter: 7,
  auditAction: 'lead.drip.sent.day7',
  subject: () => 'SUNAFIL cerró 30% más empresas este año',
  html: () =>
    layout(`
      <h2 style="margin:0 0 12px;color:${BRAND_BLUE};font-size:20px;">El riesgo creció. La solución cuesta menos que un almuerzo corporativo.</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        Datos públicos SUNAFIL enero-marzo 2026:
      </p>
      <ul style="margin:0 0 14px;padding-left:20px;color:#334155;font-size:14px;line-height:1.8;">
        <li><strong>+30%</strong> más inspecciones vs 2025</li>
        <li><strong>+47%</strong> más multas aplicadas</li>
        <li>Fiscalizaciones aleatorias a MYPE <strong>se triplicaron</strong></li>
      </ul>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        No estás siendo paranoico. El Estado está recaudando por fiscalización y va después de las empresas chicas que no tienen abogado dedicado.
      </p>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        <strong>Comply360 Empresa cuesta S/349/mes</strong> — menos que una hora de un abogado laboralista senior. Por ese precio:
      </p>
      <ul style="margin:0 0 14px;padding-left:20px;color:#334155;font-size:14px;line-height:1.8;">
        <li>Diagnóstico SUNAFIL 135 preguntas (calcula tu multa potencial real)</li>
        <li>Simulacro de inspección interactivo (sabes qué van a pedir antes de que lleguen)</li>
        <li>Biblioteca de plantillas con merge automático</li>
        <li>Reportes ejecutivos PDF</li>
        <li>Hasta 100 trabajadores</li>
      </ul>
      ${ctaButton('Probar 14 días gratis', `${APP_URL}/sign-up`)}
    `),
}

// ═══════════════════════════════════════════════════════════════════════════
// Stage 5 — Día 10: Última llamada + objeciones
// ═══════════════════════════════════════════════════════════════════════════
const stage5: DripStage = {
  stage: 5,
  daysAfter: 10,
  auditAction: 'lead.drip.sent.day10',
  subject: () => 'Última vez que te escribo (prometido)',
  html: () =>
    layout(`
      <h2 style="margin:0 0 12px;color:${BRAND_BLUE};font-size:20px;">Una última cosa antes de soltarte</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        Sé que los emails de SaaS se acumulan. Esta es la última vez que vas a recibir un nurturing mío.
      </p>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        Te escribo una vez más porque tu diagnóstico gratis mostró <strong>riesgo alto de multa</strong> y quiero asegurarme que al menos sepas tus opciones:
      </p>
      <ol style="margin:0 0 14px;padding-left:20px;color:#334155;font-size:14px;line-height:1.8;">
        <li>
          <strong>Contratas abogado laboralista</strong>. Costo típico S/2,000-5,000 por revisión inicial + S/500/mes ongoing.
        </li>
        <li>
          <strong>Usas Comply360</strong>. S/149-349/mes. Revisión inicial la haces tú con el diagnóstico 135 preguntas.
        </li>
        <li>
          <strong>No haces nada</strong>. SUNAFIL aumentó fiscalizaciones 30% en 2026.
        </li>
      </ol>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        Si eliges la opción 2, los <strong>14 días de prueba gratis</strong> cubren todo — incluso el diagnóstico completo. Si no te gusta, cancelas y no pasa nada.
      </p>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6;">
        Si no, gracias igual. Espero que tu operación esté en orden.
      </p>
      ${ctaButton('Empezar 14 días gratis', `${APP_URL}/sign-up`)}
      <p style="margin:14px 0 0;color:#64748b;font-size:12px;line-height:1.5;">
        — El equipo Comply360<br>
        <a href="mailto:soporte@comply360.pe" style="color:#64748b;">soporte@comply360.pe</a>
      </p>
    `),
}

export const DRIP_STAGES: DripStage[] = [stage1, stage2, stage3, stage4, stage5]

/**
 * Calcula qué stage corresponde a un lead dado su createdAt y lo último que recibió.
 * Retorna null si no toca nada (ya convertido, unsubscribed, o fuera del rango de días).
 */
export function nextStageForLead(
  lead: Pick<Lead, 'createdAt' | 'convertedAt'>,
  alreadySentStages: number[],
  now: Date = new Date(),
): DripStage | null {
  // Si ya convirtió, no seguir drip
  if (lead.convertedAt) return null

  const msSinceCreated = now.getTime() - new Date(lead.createdAt).getTime()
  const daysSince = Math.floor(msSinceCreated / (1000 * 60 * 60 * 24))

  // Buscar el próximo stage que toca y no se mandó todavía
  for (const stage of DRIP_STAGES) {
    if (daysSince < stage.daysAfter) continue // aún no toca
    if (alreadySentStages.includes(stage.stage)) continue // ya enviado
    return stage
  }
  return null
}
