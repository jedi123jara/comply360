/**
 * Feriados Nacionales del Peru
 * Base legal: D.Leg. 713 y Ley 29972
 *
 * Incluye feriados fijos y variables (Semana Santa).
 * Las empresas deben considerar estos dias como descanso
 * remunerado obligatorio (Art. 5 D.Leg. 713).
 */

export interface Feriado {
  /** Fecha en formato MM-DD (fijos) o YYYY-MM-DD (variables) */
  date: string
  name: string
  /** Base legal */
  law: string
  /** true = calculado anualmente (Semana Santa) */
  variable: boolean
}

// ── Feriados Fijos ─────────────────────────────────
export const FERIADOS_FIJOS: Feriado[] = [
  { date: '01-01', name: 'Ano Nuevo', law: 'D.Leg. 713 Art. 6', variable: false },
  { date: '05-01', name: 'Dia del Trabajo', law: 'D.Leg. 713 Art. 6', variable: false },
  { date: '06-07', name: 'Dia de la Bandera', law: 'Ley 30846', variable: false },
  { date: '06-29', name: 'San Pedro y San Pablo', law: 'D.Leg. 713 Art. 6', variable: false },
  { date: '07-23', name: 'Dia de la Fuerza Aerea del Peru', law: 'Ley 31112', variable: false },
  { date: '07-28', name: 'Fiestas Patrias', law: 'D.Leg. 713 Art. 6', variable: false },
  { date: '07-29', name: 'Fiestas Patrias', law: 'D.Leg. 713 Art. 6', variable: false },
  { date: '08-06', name: 'Batalla de Junin', law: 'Ley 30029', variable: false },
  { date: '08-30', name: 'Santa Rosa de Lima', law: 'D.Leg. 713 Art. 6', variable: false },
  { date: '10-08', name: 'Combate de Angamos', law: 'D.Leg. 713 Art. 6', variable: false },
  { date: '11-01', name: 'Dia de Todos los Santos', law: 'D.Leg. 713 Art. 6', variable: false },
  { date: '12-08', name: 'Inmaculada Concepcion', law: 'D.Leg. 713 Art. 6', variable: false },
  { date: '12-09', name: 'Batalla de Ayacucho', law: 'Ley 30029', variable: false },
  { date: '12-25', name: 'Navidad', law: 'D.Leg. 713 Art. 6', variable: false },
]

// ── Calculo de Semana Santa ────────────────────────
/**
 * Calcula la fecha de Pascua usando el algoritmo de Gauss/Meeus
 */
function calculateEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/**
 * Retorna Jueves y Viernes Santo para un ano dado
 */
export function getSemanaSanta(year: number): Feriado[] {
  const easter = calculateEaster(year)

  const juevesSanto = new Date(easter)
  juevesSanto.setDate(easter.getDate() - 3)

  const viernesSanto = new Date(easter)
  viernesSanto.setDate(easter.getDate() - 2)

  const format = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return [
    {
      date: format(juevesSanto),
      name: 'Jueves Santo',
      law: 'D.Leg. 713 Art. 6',
      variable: true,
    },
    {
      date: format(viernesSanto),
      name: 'Viernes Santo',
      law: 'D.Leg. 713 Art. 6',
      variable: true,
    },
  ]
}

// ── Obtener todos los feriados de un ano ───────────
export function getFeriadosForYear(year: number): Array<Feriado & { fullDate: string }> {
  const result: Array<Feriado & { fullDate: string }> = []

  // Feriados fijos
  for (const f of FERIADOS_FIJOS) {
    result.push({
      ...f,
      fullDate: `${year}-${f.date}`,
    })
  }

  // Semana Santa (variable)
  const semanaSanta = getSemanaSanta(year)
  for (const f of semanaSanta) {
    result.push({
      ...f,
      fullDate: f.date,
    })
  }

  // Ordenar por fecha
  result.sort((a, b) => a.fullDate.localeCompare(b.fullDate))

  return result
}

// ── Verificar si una fecha es feriado ──────────────
export function isFeriado(date: Date): { isFeriado: boolean; feriado?: Feriado } {
  const year = date.getFullYear()
  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const fullDate = `${year}-${mmdd}`

  // Check fijos
  const fijo = FERIADOS_FIJOS.find(f => f.date === mmdd)
  if (fijo) return { isFeriado: true, feriado: fijo }

  // Check Semana Santa
  const ss = getSemanaSanta(year)
  const variable = ss.find(f => f.date === fullDate)
  if (variable) return { isFeriado: true, feriado: variable }

  return { isFeriado: false }
}

// ── Dias laborables entre dos fechas ───────────────
export function diasLaborables(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    // Excluir sabados (6) y domingos (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const { isFeriado: esFeriado } = isFeriado(current)
      if (!esFeriado) {
        count++
      }
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

// ── Proximo feriado ────────────────────────────────
export function proximoFeriado(fromDate: Date = new Date()): Feriado & { fullDate: string; daysUntil: number } {
  const year = fromDate.getFullYear()
  const feriados = [
    ...getFeriadosForYear(year),
    ...getFeriadosForYear(year + 1),
  ]

  const today = fromDate.toISOString().slice(0, 10)

  for (const f of feriados) {
    if (f.fullDate >= today) {
      const diff = Math.ceil(
        (new Date(f.fullDate).getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return { ...f, daysUntil: diff }
    }
  }

  // Fallback (should never happen)
  const first = getFeriadosForYear(year + 1)[0]
  return { ...first, daysUntil: 365 }
}
