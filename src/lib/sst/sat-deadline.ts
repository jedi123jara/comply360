/**
 * Plazos legales SAT — D.S. 006-2022-TR (modificatoria del Reglamento de la
 * Ley 29783) y R.M. 144-2022-TR.
 *
 * Plazos por tipo de evento:
 *   MORTAL              → 24 horas desde el evento
 *   INCIDENTE_PELIGROSO → 24 horas desde el evento
 *   NO_MORTAL           → último día hábil del mes siguiente (centro médico)
 *   ENFERMEDAD_OCUPACIONAL → 5 días hábiles desde el diagnóstico (centro médico)
 *
 * Función pura, sin dependencias de DB/red. Determinística según el tipo
 * y la fecha del evento. El UI muestra una cuenta regresiva basada en esto.
 */

export type TipoAccidente = 'MORTAL' | 'NO_MORTAL' | 'INCIDENTE_PELIGROSO' | 'ENFERMEDAD_OCUPACIONAL'

export interface PlazoSAT {
  /** Horas legales totales — informativo, persistido en `Accidente.plazoLegalHoras`. */
  horas: number
  /** Fecha límite efectiva calculada desde la fecha del evento. */
  deadline: Date
  /** Texto resumido del plazo según R.M. 144-2022-TR. */
  descripcion: string
  /** Norma exacta para citar. */
  baseLegal: string
  /** Quién tiene la obligación de notificar. */
  obligadoNotificar: 'EMPLEADOR' | 'CENTRO_MEDICO'
  /** Formulario SAT que aplica. */
  formularioSat: 'FORM_01_MORTAL' | 'FORM_02_INCIDENTE_PELIGROSO' | 'FORM_03_NO_MORTAL' | 'FORM_04_ENF_OCUPACIONAL'
}

/**
 * Suma N días hábiles (lun-vie) a una fecha. NO descuenta feriados peruanos
 * (en una iteración futura se puede integrar con el calendario MTPE para
 * descontar Feriados Nacionales — D.Leg. 713 + leyes específicas).
 */
function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return result
}

/**
 * Último día hábil del mes siguiente al de la fecha.
 * Si el último día del mes siguiente cae sábado o domingo, retrocede al
 * viernes hábil más cercano.
 */
function lastBusinessDayOfNextMonth(from: Date): Date {
  // Día 1 del mes siguiente al siguiente — luego restamos un día = último día del mes siguiente
  const lastDay = new Date(from.getFullYear(), from.getMonth() + 2, 0, 23, 59, 59, 999)
  const dow = lastDay.getDay()
  if (dow === 0) lastDay.setDate(lastDay.getDate() - 2) // Domingo → viernes
  else if (dow === 6) lastDay.setDate(lastDay.getDate() - 1) // Sábado → viernes
  return lastDay
}

/**
 * Calcula el plazo SAT que aplica según el tipo de accidente.
 *
 * @param tipo        Tipo del evento.
 * @param fechaEvento Fecha del accidente / diagnóstico.
 */
export function calcularPlazoSat(tipo: TipoAccidente, fechaEvento: Date): PlazoSAT {
  switch (tipo) {
    case 'MORTAL': {
      const deadline = new Date(fechaEvento.getTime() + 24 * 60 * 60 * 1000)
      return {
        horas: 24,
        deadline,
        descripcion: '24 horas calendario desde el evento',
        baseLegal: 'D.S. 006-2022-TR · Art. 110 mod. del Reglamento Ley 29783',
        obligadoNotificar: 'EMPLEADOR',
        formularioSat: 'FORM_01_MORTAL',
      }
    }
    case 'INCIDENTE_PELIGROSO': {
      const deadline = new Date(fechaEvento.getTime() + 24 * 60 * 60 * 1000)
      return {
        horas: 24,
        deadline,
        descripcion: '24 horas calendario desde el evento',
        baseLegal: 'D.S. 006-2022-TR · Art. 110 mod. del Reglamento Ley 29783',
        obligadoNotificar: 'EMPLEADOR',
        formularioSat: 'FORM_02_INCIDENTE_PELIGROSO',
      }
    }
    case 'NO_MORTAL': {
      const deadline = lastBusinessDayOfNextMonth(fechaEvento)
      const horas = Math.max(
        24,
        Math.round((deadline.getTime() - fechaEvento.getTime()) / (60 * 60 * 1000)),
      )
      return {
        horas,
        deadline,
        descripcion: 'Hasta el último día hábil del mes siguiente al del evento',
        baseLegal: 'D.S. 006-2022-TR · Art. 110 mod. del Reglamento Ley 29783',
        obligadoNotificar: 'CENTRO_MEDICO',
        formularioSat: 'FORM_03_NO_MORTAL',
      }
    }
    case 'ENFERMEDAD_OCUPACIONAL': {
      const deadline = addBusinessDays(fechaEvento, 5)
      const horas = Math.round(
        (deadline.getTime() - fechaEvento.getTime()) / (60 * 60 * 1000),
      )
      return {
        horas,
        deadline,
        descripcion: '5 días hábiles desde el diagnóstico',
        baseLegal: 'D.S. 006-2022-TR · Art. 110 mod. del Reglamento Ley 29783',
        obligadoNotificar: 'CENTRO_MEDICO',
        formularioSat: 'FORM_04_ENF_OCUPACIONAL',
      }
    }
  }
}

export type EstadoCountdown = 'OK' | 'PROXIMO' | 'CRITICO' | 'VENCIDO'

export interface CountdownInfo {
  estado: EstadoCountdown
  msRestantes: number
  /** Texto humano del tiempo restante / vencimiento. */
  texto: string
}

/**
 * Calcula el estado de la cuenta regresiva al plazo SAT.
 * Útil para badges visuales en el UI.
 */
export function evaluarCountdown(deadline: Date, now: Date = new Date()): CountdownInfo {
  const ms = deadline.getTime() - now.getTime()
  const totalSec = Math.floor(ms / 1000)
  const abs = Math.abs(totalSec)
  const days = Math.floor(abs / 86400)
  const hours = Math.floor((abs % 86400) / 3600)
  const minutes = Math.floor((abs % 3600) / 60)

  if (ms < 0) {
    const txt =
      days > 0
        ? `Vencido hace ${days}d ${hours}h`
        : hours > 0
          ? `Vencido hace ${hours}h ${minutes}m`
          : `Vencido hace ${minutes}m`
    return { estado: 'VENCIDO', msRestantes: ms, texto: txt }
  }

  // Plazos críticos: ≤ 4h restantes.
  if (ms <= 4 * 60 * 60 * 1000) {
    const txt = hours > 0 ? `${hours}h ${minutes}m restantes` : `${minutes}m restantes`
    return { estado: 'CRITICO', msRestantes: ms, texto: txt }
  }
  // Próximos: ≤ 24h.
  if (ms <= 24 * 60 * 60 * 1000) {
    return { estado: 'PROXIMO', msRestantes: ms, texto: `${hours}h restantes` }
  }
  // OK: > 24h.
  if (days >= 1) {
    return { estado: 'OK', msRestantes: ms, texto: `${days}d ${hours}h restantes` }
  }
  return { estado: 'OK', msRestantes: ms, texto: `${hours}h restantes` }
}

/** Texto humano del formulario SAT (para UI). */
export function formularioSatLabel(form: PlazoSAT['formularioSat']): string {
  switch (form) {
    case 'FORM_01_MORTAL':
      return 'Formulario N° 1 — Accidente de Trabajo Mortal'
    case 'FORM_02_INCIDENTE_PELIGROSO':
      return 'Formulario N° 2 — Incidente Peligroso'
    case 'FORM_03_NO_MORTAL':
      return 'Formulario N° 3 — Accidente de Trabajo No Mortal'
    case 'FORM_04_ENF_OCUPACIONAL':
      return 'Formulario N° 4 — Enfermedad Ocupacional'
  }
}
