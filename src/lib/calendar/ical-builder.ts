/**
 * iCal builder — genera feeds RFC-5545 compatibles con Google Calendar,
 * Outlook, Apple Calendar y cualquier cliente que soporte iCal subscription.
 *
 * Uso:
 *   const ics = buildICalFeed({
 *     calendarName: 'Comply360 - Mi Empresa',
 *     events: [...],
 *   })
 *   return new Response(ics, { headers: { 'Content-Type': 'text/calendar' } })
 *
 * Diseño minimalista — cubre 95% de casos reales sin dependencias externas:
 *   - VCALENDAR + VEVENT
 *   - DTSTART/DTEND como DATE (all-day events)
 *   - SUMMARY, DESCRIPTION, UID, DTSTAMP
 *   - CATEGORIES + PRIORITY (mapeo a 1-9 RFC)
 *   - URL para CTA contextual
 *
 * Compatible con suscripción remota (URL pública con token) — el cliente
 * sincroniza automáticamente cada hora.
 */

export interface ICalEvent {
  id: string         // único (será el UID RFC-5545)
  title: string
  date: string       // YYYY-MM-DD (all-day event)
  description?: string
  category?: string
  priority?: 'critical' | 'high' | 'medium' | 'low'
  url?: string
}

export interface BuildICalOptions {
  calendarName: string
  events: ICalEvent[]
  /** TTL en segundos para que el cliente refresh la suscripción. Default 1h. */
  refreshTtlSec?: number
}

const PRIORITY_MAP: Record<NonNullable<ICalEvent['priority']>, number> = {
  critical: 1,
  high: 3,
  medium: 5,
  low: 7,
}

/**
 * Genera un feed iCal completo. Devuelve el body como string listo para
 * servir con Content-Type: text/calendar.
 */
export function buildICalFeed(opts: BuildICalOptions): string {
  const { calendarName, events, refreshTtlSec = 3600 } = opts
  const lines: string[] = []
  const now = formatICalDateTime(new Date())

  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//Comply360//Calendar Export//ES')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push(`X-WR-CALNAME:${escapeICalText(calendarName)}`)
  lines.push(`X-WR-TIMEZONE:America/Lima`)
  lines.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${Math.round(refreshTtlSec / 60)}M`)
  lines.push(`X-PUBLISHED-TTL:PT${Math.round(refreshTtlSec / 60)}M`)

  for (const e of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${e.id}@comply360.pe`)
    lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g, '')}`)
    // All-day events: DTEND es el día siguiente exclusive
    lines.push(`DTEND;VALUE=DATE:${addOneDay(e.date)}`)
    lines.push(`SUMMARY:${escapeICalText(e.title)}`)
    if (e.description) {
      lines.push(`DESCRIPTION:${escapeICalText(e.description)}`)
    }
    if (e.category) {
      lines.push(`CATEGORIES:${escapeICalText(e.category)}`)
    }
    if (e.priority) {
      lines.push(`PRIORITY:${PRIORITY_MAP[e.priority]}`)
    }
    if (e.url) {
      lines.push(`URL:${e.url}`)
    }
    lines.push('TRANSP:TRANSPARENT') // no marca como "ocupado" en el calendario
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  // RFC-5545 requiere CRLF, no LF
  return lines.join('\r\n')
}

/**
 * Escapa caracteres especiales según RFC-5545 §3.3.11:
 *   - \\ → \\\\
 *   - ; → \\;
 *   - , → \\,
 *   - \n → \\n
 *   - CR → eliminado
 */
function escapeICalText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n')
}

/**
 * Convierte Date a string ICAL_DATETIME en UTC: YYYYMMDDTHHMMSSZ
 */
function formatICalDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

/**
 * Suma 1 día a un string YYYY-MM-DD y devuelve YYYYMMDD (sin guiones).
 * Usado para DTEND de all-day events según RFC-5545.
 */
function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
}
