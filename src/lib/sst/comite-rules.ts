/**
 * Reglas de composición del Comité SST y Supervisor SST.
 *
 * Base legal:
 *   - Ley 29783 (SST) — Arts. 29 a 32
 *   - R.M. 245-2021-TR — Reglamento del Comité y del Supervisor de SST
 *
 * Lógica:
 *   - Empleadores con < 20 trabajadores → no requieren Comité, basta un
 *     Supervisor de SST (un solo trabajador).
 *   - Empleadores con ≥ 20 trabajadores → Comité paritario.
 *
 * Tabla referencial de tamaño mínimo del Comité (paritario, número par):
 *
 *   20  – 49  → 4 miembros (2 + 2)
 *   50  – 99  → 6 miembros (3 + 3)
 *   100 – 499 → 8 miembros (4 + 4)
 *   500 – 999 → 10 miembros (5 + 5)
 *   ≥ 1000   → 12 miembros (6 + 6)
 *
 * El reglamento permite que la empresa lo amplíe; este helper devuelve
 * el MÍNIMO legal. Función pura, testeable.
 */

export type TipoOrganoSST = 'COMITE' | 'SUPERVISOR'

export interface ComposicionMinima {
  tipo: TipoOrganoSST
  /** Total de miembros mínimo (incluyendo ambas representaciones). */
  totalMiembros: number
  /** Número mínimo de representantes del empleador. */
  representantesEmpleador: number
  /** Número mínimo de representantes de los trabajadores. */
  representantesTrabajadores: number
  /** Texto explicativo para mostrar al usuario. */
  descripcion: string
  /** Norma exacta. */
  baseLegal: string
}

export function calcularComposicionMinima(numeroTrabajadores: number): ComposicionMinima {
  if (numeroTrabajadores < 20) {
    return {
      tipo: 'SUPERVISOR',
      totalMiembros: 1,
      representantesEmpleador: 0,
      representantesTrabajadores: 1,
      descripcion:
        'Empresas con menos de 20 trabajadores no requieren Comité. Designan un Supervisor de SST elegido por los trabajadores.',
      baseLegal: 'Ley 29783 Art. 30 + R.M. 245-2021-TR',
    }
  }

  let total = 4
  if (numeroTrabajadores >= 1000) total = 12
  else if (numeroTrabajadores >= 500) total = 10
  else if (numeroTrabajadores >= 100) total = 8
  else if (numeroTrabajadores >= 50) total = 6

  const half = total / 2
  return {
    tipo: 'COMITE',
    totalMiembros: total,
    representantesEmpleador: half,
    representantesTrabajadores: half,
    descripcion: `Empresas con ${numeroTrabajadores} trabajadores requieren Comité paritario de ${total} miembros (${half} representantes del empleador + ${half} representantes de los trabajadores).`,
    baseLegal: 'Ley 29783 Arts. 29-32 + R.M. 245-2021-TR',
  }
}

export interface AnalisisComite {
  /** Composición mínima legal según número de trabajadores. */
  minimo: ComposicionMinima
  /** Conteo actual de miembros activos. */
  actual: {
    total: number
    representantesEmpleador: number
    representantesTrabajadores: number
    presidente: boolean
    secretario: boolean
  }
  /** Diferencia entre actual y mínimo (>0 = faltan miembros). */
  brecha: {
    representantesEmpleador: number
    representantesTrabajadores: number
    total: number
  }
  /** Si la composición actual cumple el mínimo legal Y la paridad. */
  cumple: boolean
  /** Si está faltando algún cargo obligatorio. */
  faltaCargo: 'PRESIDENTE' | 'SECRETARIO' | null
  /** Mensajes accionables para mostrar al usuario. */
  observaciones: string[]
}

export interface MiembroLite {
  cargo: 'PRESIDENTE' | 'SECRETARIO' | 'MIEMBRO'
  origen: 'REPRESENTANTE_EMPLEADOR' | 'REPRESENTANTE_TRABAJADORES'
  fechaBaja: Date | null
}

/**
 * Analiza la composición actual de un Comité SST contra el mínimo legal y
 * devuelve observaciones accionables.
 */
export function analizarComite(
  numeroTrabajadores: number,
  miembros: MiembroLite[],
): AnalisisComite {
  const minimo = calcularComposicionMinima(numeroTrabajadores)
  const activos = miembros.filter((m) => m.fechaBaja == null)

  const repE = activos.filter((m) => m.origen === 'REPRESENTANTE_EMPLEADOR').length
  const repT = activos.filter((m) => m.origen === 'REPRESENTANTE_TRABAJADORES').length
  const total = activos.length
  const tienePresidente = activos.some((m) => m.cargo === 'PRESIDENTE')
  const tieneSecretario = activos.some((m) => m.cargo === 'SECRETARIO')

  const brechaE = Math.max(0, minimo.representantesEmpleador - repE)
  const brechaT = Math.max(0, minimo.representantesTrabajadores - repT)
  const brechaTotal = Math.max(0, minimo.totalMiembros - total)

  const observaciones: string[] = []
  if (minimo.tipo === 'COMITE') {
    if (brechaE > 0) {
      observaciones.push(`Faltan ${brechaE} representante(s) del empleador.`)
    }
    if (brechaT > 0) {
      observaciones.push(`Faltan ${brechaT} representante(s) de los trabajadores.`)
    }
    if (repE !== repT && total > 0) {
      observaciones.push(
        `Composición no paritaria: ${repE} representantes del empleador vs ${repT} de los trabajadores.`,
      )
    }
    if (!tienePresidente && total > 0) {
      observaciones.push('No hay un Presidente designado.')
    }
    if (!tieneSecretario && total > 0) {
      observaciones.push('No hay un Secretario designado.')
    }
  }

  let faltaCargo: 'PRESIDENTE' | 'SECRETARIO' | null = null
  if (minimo.tipo === 'COMITE' && total > 0) {
    if (!tienePresidente) faltaCargo = 'PRESIDENTE'
    else if (!tieneSecretario) faltaCargo = 'SECRETARIO'
  }

  const paritario = repE === repT
  const cumple =
    minimo.tipo === 'SUPERVISOR'
      ? total >= 1
      : total >= minimo.totalMiembros &&
        paritario &&
        tienePresidente &&
        tieneSecretario

  return {
    minimo,
    actual: {
      total,
      representantesEmpleador: repE,
      representantesTrabajadores: repT,
      presidente: tienePresidente,
      secretario: tieneSecretario,
    },
    brecha: {
      representantesEmpleador: brechaE,
      representantesTrabajadores: brechaT,
      total: brechaTotal,
    },
    cumple,
    faltaCargo,
    observaciones,
  }
}

/**
 * Calcula la fecha de fin del mandato (2 años desde inicio) según R.M.
 * 245-2021-TR. La función es pura — no maneja zona horaria peruana
 * explícitamente (asume input en UTC con conversión local en UI).
 */
export function calcularFinMandato(inicio: Date): Date {
  const fin = new Date(inicio)
  fin.setFullYear(fin.getFullYear() + 2)
  return fin
}

/**
 * Días restantes del mandato. Negativo = vencido.
 */
export function diasRestantesMandato(fin: Date, now: Date = new Date()): number {
  return Math.floor((fin.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}
