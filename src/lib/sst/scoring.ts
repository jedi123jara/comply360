/**
 * Motor de Scoring SST — específico de Fase 5 SST Premium.
 *
 * Calcula un score global 0-100 ponderando 6 dimensiones SST y la exposición
 * económica potencial según el cuadro de infracciones del D.S. 019-2006-TR
 * (en su texto vigente actualizado) + UIT 2026 = S/ 5,500.
 *
 * Función pura — recibe un snapshot del estado de la org y devuelve un objeto
 * estructurado. NO hace I/O. El caller (endpoint /api/sst/score) carga el
 * snapshot desde Prisma y luego invoca esta función.
 *
 * Ponderación (suma 100):
 *   - IPERC vigente y actualizado:           25 pts
 *   - Cobertura EMO de trabajadores:         20 pts
 *   - Cumplimiento SAT (accidentes):         15 pts
 *   - Comité SST conforme:                   15 pts
 *   - Field Audit reciente con hallazgos atendidos: 15 pts
 *   - Sedes con datos completos:             10 pts
 */

export const UIT_2026 = 5500
export const RMV_2026 = 1130

/**
 * Tabla simplificada de multas SUNAFIL (UIT) según D.S. 019-2006-TR vigente.
 * Cada fila es por número de trabajadores afectados; multiplicar por UIT.
 *
 * Solo incluimos columnas usadas por el módulo SST. Para casos completos,
 * el motor de compliance general usa otra tabla más extensa.
 */
const ESCALA_INFRACCIONES_SST = {
  // Infracciones SST muy graves (Anexo D.S. 019-2006-TR — Art. 28)
  // Por accidente mortal sin notificación, IPERC inexistente, etc.
  MUY_GRAVE: {
    // Por número de trabajadores afectados (rangos oficiales)
    '1-10': 1.6,
    '11-25': 4.0,
    '26-50': 6.4,
    '51-100': 7.5,
    '101-200': 12.5,
    '201-300': 16.5,
    '301-400': 20.0,
    '401-500': 22.0,
    '501-999': 24.0,
    '1000+': 26.0, // tope inferior para grandes empresas
  },
  GRAVE: {
    '1-10': 0.8,
    '11-25': 2.0,
    '26-50': 3.6,
    '51-100': 5.0,
    '101-200': 7.5,
    '201-300': 9.5,
    '301-400': 11.0,
    '401-500': 12.5,
    '501-999': 14.5,
    '1000+': 16.5,
  },
  LEVE: {
    '1-10': 0.45,
    '11-25': 0.9,
    '26-50': 1.5,
    '51-100': 2.0,
    '101-200': 2.7,
    '201-300': 3.5,
    '301-400': 4.6,
    '401-500': 5.6,
    '501-999': 6.5,
    '1000+': 7.5,
  },
} as const

type Tipicidad = keyof typeof ESCALA_INFRACCIONES_SST

function rangoTrabajadores(n: number): keyof typeof ESCALA_INFRACCIONES_SST.MUY_GRAVE {
  if (n >= 1000) return '1000+'
  if (n >= 501) return '501-999'
  if (n >= 401) return '401-500'
  if (n >= 301) return '301-400'
  if (n >= 201) return '201-300'
  if (n >= 101) return '101-200'
  if (n >= 51) return '51-100'
  if (n >= 26) return '26-50'
  if (n >= 11) return '11-25'
  return '1-10'
}

/**
 * Calcula la multa potencial en soles según infracción + tamaño.
 * Retorna 0 si la org es MYPE (régimen especial reduce la multa, pero el
 * cálculo MYPE exacto se delega al motor de compliance general).
 */
export function calcularMultaSoles(
  tipicidad: Tipicidad,
  numeroTrabajadores: number,
  esMype = false,
): number {
  const tabla = ESCALA_INFRACCIONES_SST[tipicidad]
  const rango = rangoTrabajadores(numeroTrabajadores)
  const uits = tabla[rango]
  const multa = uits * UIT_2026
  // Régimen MYPE: aplicar reducción aproximada del 50% (Ley 30222 / D.S. 010-2014-TR).
  // Para cálculo exacto el motor general aplica subsanación + reincidencia.
  return esMype ? Math.round(multa * 0.5) : Math.round(multa)
}

// ── Snapshot de entrada ──────────────────────────────────────────────────

export interface SstScoreSnapshot {
  numeroTrabajadores: number
  esMype: boolean
  /** Sedes activas. Cada una se considera completa si tiene ubigeo + tipo. */
  sedes: Array<{
    id: string
    activa: boolean
    ubigeoCompleto: boolean
  }>
  /** IPERC bases por sede. Una sede sin IPERC vigente es penalización. */
  ipercBases: Array<{
    sedeId: string
    estado: 'BORRADOR' | 'REVISION' | 'VIGENTE' | 'VENCIDO' | 'ARCHIVADO'
    fechaAprobacion: Date | null
    /** Filas con riesgo significativo no cerrado (sin plazoCierre cumplido). */
    filasSignificativasAbiertas: number
  }>
  /** EMO por trabajador con vigencia. */
  emos: Array<{
    workerId: string
    proximoExamenAntes: Date | null
  }>
  /** Lista de IDs de workers activos. */
  workerIdsActivos: string[]
  /** Accidentes registrados en los últimos 12 meses. */
  accidentes: Array<{
    id: string
    fechaHora: Date
    plazoLegalHoras: number
    satEstado: 'PENDIENTE' | 'EN_PROCESO' | 'NOTIFICADO' | 'CONFIRMADO' | 'RECHAZADO'
    satFechaEnvioManual: Date | null
  }>
  /** Comité SST (puede haber 0 o 1 vigente). */
  comite: {
    estado: 'VIGENTE' | 'EN_ELECCION' | 'INACTIVO'
    miembrosActivos: number
    representantesEmpleador: number
    representantesTrabajadores: number
    tienePresidente: boolean
    tieneSecretario: boolean
    mandatoFin: Date
  } | null
  /** Visitas Field Audit en últimos 180 días. */
  visitasUlt6Meses: Array<{
    id: string
    estado: 'PROGRAMADA' | 'EN_CAMPO' | 'PENDIENTE_INGESTA' | 'EN_INGESTA' | 'CERRADA' | 'CANCELADA'
    hallazgosTotal: number
    hallazgosSignificativosAbiertos: number
  }>
}

// ── Output ───────────────────────────────────────────────────────────────

export type Recomendacion = {
  prioridad: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  area: 'IPERC' | 'EMO' | 'SAT' | 'COMITE' | 'FIELD_AUDIT' | 'SEDES'
  titulo: string
  detalle: string
  impactoSoles: number
}

export interface SstScoreResult {
  scoreGlobal: number
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
  breakdown: {
    iperc: { score: number; max: number; nota: string }
    emo: { score: number; max: number; nota: string }
    sat: { score: number; max: number; nota: string }
    comite: { score: number; max: number; nota: string }
    fieldAudit: { score: number; max: number; nota: string }
    sedes: { score: number; max: number; nota: string }
  }
  exposicionEconomica: {
    totalSoles: number
    detalle: Array<{
      area: string
      tipicidad: Tipicidad
      multaSoles: number
      motivo: string
    }>
  }
  recomendaciones: Recomendacion[]
}

// ── Función principal ────────────────────────────────────────────────────

const MS_DAY = 24 * 60 * 60 * 1000

export function calcularScoreSst(s: SstScoreSnapshot, now: Date = new Date()): SstScoreResult {
  const breakdown = {
    iperc: scoreIperc(s, now),
    emo: scoreEmo(s, now),
    sat: scoreSat(s),
    comite: scoreComite(s, now),
    fieldAudit: scoreFieldAudit(s),
    sedes: scoreSedes(s),
  }

  const scoreGlobal = Object.values(breakdown).reduce((sum, b) => sum + b.score, 0)
  const semaforo: 'VERDE' | 'AMARILLO' | 'ROJO' =
    scoreGlobal >= 80 ? 'VERDE' : scoreGlobal >= 60 ? 'AMARILLO' : 'ROJO'

  const exposicionEconomica = calcularExposicion(s, now)
  const recomendaciones = generarRecomendaciones(s, breakdown, exposicionEconomica)

  return {
    scoreGlobal,
    semaforo,
    breakdown,
    exposicionEconomica,
    recomendaciones,
  }
}

// ── Breakdown por dimensión ──────────────────────────────────────────────

function scoreIperc(s: SstScoreSnapshot, now: Date) {
  const max = 25
  const sedesActivas = s.sedes.filter((x) => x.activa)
  if (sedesActivas.length === 0) {
    return { score: 0, max, nota: 'No hay sedes activas registradas.' }
  }
  // Por cada sede: IPERC VIGENTE y aprobado en último año = 1.0; vigente
  // pero >365 días = 0.5; sin IPERC vigente = 0.
  const porSede: number[] = sedesActivas.map((sede) => {
    const matrices = s.ipercBases.filter((ip) => ip.sedeId === sede.id)
    const vigente = matrices.find((ip) => ip.estado === 'VIGENTE')
    if (!vigente) return 0
    if (!vigente.fechaAprobacion) return 0.5
    const dias = (now.getTime() - vigente.fechaAprobacion.getTime()) / MS_DAY
    return dias > 365 ? 0.5 : 1.0
  })
  const promedio = porSede.reduce((a: number, b: number) => a + b, 0) / porSede.length

  // Penalización por filas significativas abiertas (max 5pts)
  const filasAbiertas = s.ipercBases.reduce(
    (sum, ip) => sum + (ip.estado === 'VIGENTE' ? ip.filasSignificativasAbiertas : 0),
    0,
  )
  const penalizacion = Math.min(5, filasAbiertas)

  const score = Math.max(0, Math.round(promedio * max - penalizacion))
  const conIperc = porSede.filter((v) => v > 0).length
  return {
    score,
    max,
    nota: `${conIperc}/${sedesActivas.length} sedes con IPERC vigente${
      filasAbiertas > 0 ? ` · ${filasAbiertas} filas significativas abiertas` : ''
    }.`,
  }
}

function scoreEmo(s: SstScoreSnapshot, now: Date) {
  const max = 20
  if (s.workerIdsActivos.length === 0) {
    return { score: max, max, nota: 'Sin trabajadores activos para evaluar.' }
  }
  const conEmoVigente = new Set(
    s.emos
      .filter((e) => !e.proximoExamenAntes || e.proximoExamenAntes >= now)
      .map((e) => e.workerId),
  )
  const cobertura =
    s.workerIdsActivos.filter((id) => conEmoVigente.has(id)).length /
    s.workerIdsActivos.length
  const score = Math.round(cobertura * max)
  return {
    score,
    max,
    nota: `Cobertura EMO: ${Math.round(cobertura * 100)}% de trabajadores activos.`,
  }
}

function scoreSat(s: SstScoreSnapshot) {
  const max = 15
  if (s.accidentes.length === 0) {
    return { score: max, max, nota: 'Sin accidentes registrados en últimos 12 meses.' }
  }
  const cumplidos = s.accidentes.filter((a) => {
    if (a.satEstado !== 'NOTIFICADO' && a.satEstado !== 'CONFIRMADO') return false
    if (!a.satFechaEnvioManual) return false
    const deadline = new Date(a.fechaHora.getTime() + a.plazoLegalHoras * 60 * 60 * 1000)
    return a.satFechaEnvioManual <= deadline
  }).length
  const ratio = cumplidos / s.accidentes.length
  const score = Math.round(ratio * max)
  return {
    score,
    max,
    nota: `${cumplidos}/${s.accidentes.length} accidentes notificados a SAT en plazo legal.`,
  }
}

function scoreComite(s: SstScoreSnapshot, now: Date) {
  const max = 15
  // Si <20 trabajadores no obliga comité — score completo si supervisor existe
  if (s.numeroTrabajadores < 20) {
    if (!s.comite || s.comite.miembrosActivos === 0) {
      return { score: max - 5, max, nota: 'Empresa <20 trab.: basta Supervisor SST.' }
    }
    return { score: max, max, nota: 'Supervisor SST registrado.' }
  }
  if (!s.comite || s.comite.estado !== 'VIGENTE') {
    return { score: 0, max, nota: 'No hay Comité SST vigente (Ley 29783 obliga).' }
  }
  let score = 0
  if (s.comite.miembrosActivos >= 4) score += 5
  if (s.comite.representantesEmpleador === s.comite.representantesTrabajadores) score += 4
  if (s.comite.tienePresidente && s.comite.tieneSecretario) score += 3
  // Mandato vigente con margen >60 días
  const diasRest = (s.comite.mandatoFin.getTime() - now.getTime()) / MS_DAY
  if (diasRest > 60) score += 3
  else if (diasRest > 0) score += 1

  const notas: string[] = []
  if (s.comite.miembrosActivos < 4) notas.push('miembros insuficientes')
  if (s.comite.representantesEmpleador !== s.comite.representantesTrabajadores)
    notas.push('no paritario')
  if (!s.comite.tienePresidente) notas.push('sin presidente')
  if (!s.comite.tieneSecretario) notas.push('sin secretario')
  if (diasRest <= 60 && diasRest > 0) notas.push('mandato vence pronto')
  if (diasRest <= 0) notas.push('mandato vencido')

  return {
    score,
    max,
    nota: notas.length > 0 ? `Comité con observaciones: ${notas.join(', ')}.` : 'Comité conforme.',
  }
}

function scoreFieldAudit(s: SstScoreSnapshot) {
  const max = 15
  if (s.visitasUlt6Meses.length === 0) {
    return {
      score: 5,
      max,
      nota: 'Sin visitas Field Audit en últimos 6 meses (recomendado al menos 1 por semestre).',
    }
  }
  const cerradas = s.visitasUlt6Meses.filter((v) => v.estado === 'CERRADA').length
  const ratioCerradas = cerradas / s.visitasUlt6Meses.length
  const significativosAbiertos = s.visitasUlt6Meses.reduce(
    (sum, v) => sum + v.hallazgosSignificativosAbiertos,
    0,
  )
  let score = Math.round(ratioCerradas * 10)
  // Bonus si hay visitas (5pts) y todas las significativas atendidas
  score += 5
  if (significativosAbiertos > 5) score = Math.max(0, score - 5)
  else if (significativosAbiertos > 0) score = Math.max(0, score - 2)
  score = Math.min(max, score)
  return {
    score,
    max,
    nota: `${s.visitasUlt6Meses.length} visitas (${cerradas} cerradas)${
      significativosAbiertos > 0 ? ` · ${significativosAbiertos} hallazgos significativos abiertos` : ''
    }.`,
  }
}

function scoreSedes(s: SstScoreSnapshot) {
  const max = 10
  const activas = s.sedes.filter((x) => x.activa)
  if (activas.length === 0) {
    return { score: 0, max, nota: 'Sin sedes registradas.' }
  }
  const completas = activas.filter((x) => x.ubigeoCompleto).length
  const ratio = completas / activas.length
  const score = Math.round(ratio * max)
  return {
    score,
    max,
    nota: `${completas}/${activas.length} sedes con datos completos (ubigeo INEI).`,
  }
}

// ── Exposición económica ─────────────────────────────────────────────────

function calcularExposicion(s: SstScoreSnapshot, now: Date): SstScoreResult['exposicionEconomica'] {
  const detalle: SstScoreResult['exposicionEconomica']['detalle'] = []

  // 1. IPERC ausente o vencido = MUY_GRAVE (Art. 28.6 D.S. 019-2006-TR)
  const sedesSinIperc = s.sedes
    .filter((x) => x.activa)
    .filter((sede) => {
      const matrices = s.ipercBases.filter((ip) => ip.sedeId === sede.id)
      return !matrices.some((ip) => ip.estado === 'VIGENTE')
    }).length
  if (sedesSinIperc > 0) {
    const multa = calcularMultaSoles('MUY_GRAVE', s.numeroTrabajadores, s.esMype)
    detalle.push({
      area: 'IPERC',
      tipicidad: 'MUY_GRAVE',
      multaSoles: multa,
      motivo: `${sedesSinIperc} sede(s) sin IPERC vigente — falta evaluación de riesgos.`,
    })
  }

  // 2. EMO ausente = GRAVE (Art. 27.6)
  const conEmoVigente = new Set(
    s.emos.filter((e) => !e.proximoExamenAntes || e.proximoExamenAntes >= now).map(
      (e) => e.workerId,
    ),
  )
  const sinEmo = s.workerIdsActivos.filter((id) => !conEmoVigente.has(id)).length
  if (sinEmo > 0) {
    const multa = calcularMultaSoles('GRAVE', s.numeroTrabajadores, s.esMype)
    detalle.push({
      area: 'EMO',
      tipicidad: 'GRAVE',
      multaSoles: multa,
      motivo: `${sinEmo} trabajador(es) sin EMO vigente.`,
    })
  }

  // 3. SAT vencido = MUY_GRAVE por accidente
  const satVencidos = s.accidentes.filter((a) => {
    if (a.satEstado === 'NOTIFICADO' || a.satEstado === 'CONFIRMADO') return false
    const deadline = new Date(a.fechaHora.getTime() + a.plazoLegalHoras * 60 * 60 * 1000)
    return deadline < now
  }).length
  if (satVencidos > 0) {
    const multa = calcularMultaSoles('MUY_GRAVE', s.numeroTrabajadores, s.esMype)
    detalle.push({
      area: 'SAT',
      tipicidad: 'MUY_GRAVE',
      multaSoles: multa * satVencidos,
      motivo: `${satVencidos} accidente(s) sin notificar en plazo legal (D.S. 006-2022-TR).`,
    })
  }

  // 4. Comité ausente cuando obliga = GRAVE
  if (
    s.numeroTrabajadores >= 20 &&
    (!s.comite || s.comite.estado !== 'VIGENTE')
  ) {
    const multa = calcularMultaSoles('GRAVE', s.numeroTrabajadores, s.esMype)
    detalle.push({
      area: 'COMITE',
      tipicidad: 'GRAVE',
      multaSoles: multa,
      motivo: 'Empresa con ≥20 trabajadores sin Comité SST vigente.',
    })
  }

  const totalSoles = detalle.reduce((sum, d) => sum + d.multaSoles, 0)
  return { totalSoles, detalle }
}

// ── Recomendaciones priorizadas ──────────────────────────────────────────

function generarRecomendaciones(
  s: SstScoreSnapshot,
  bd: SstScoreResult['breakdown'],
  exp: SstScoreResult['exposicionEconomica'],
): Recomendacion[] {
  const recs: Recomendacion[] = []

  // SAT vencidos = lo más crítico
  const satExp = exp.detalle.find((d) => d.area === 'SAT')
  if (satExp) {
    recs.push({
      prioridad: 'CRITICAL',
      area: 'SAT',
      titulo: 'Notificar accidentes pendientes ya',
      detalle: satExp.motivo + ' Usa el wizard SAT del módulo Accidentes.',
      impactoSoles: satExp.multaSoles,
    })
  }

  const ipercExp = exp.detalle.find((d) => d.area === 'IPERC')
  if (ipercExp) {
    recs.push({
      prioridad: 'HIGH',
      area: 'IPERC',
      titulo: 'Crear matriz IPERC en sedes pendientes',
      detalle: ipercExp.motivo,
      impactoSoles: ipercExp.multaSoles,
    })
  }

  const comiteExp = exp.detalle.find((d) => d.area === 'COMITE')
  if (comiteExp) {
    recs.push({
      prioridad: 'HIGH',
      area: 'COMITE',
      titulo: 'Instalar Comité SST',
      detalle: comiteExp.motivo + ' R.M. 245-2021-TR exige composición paritaria.',
      impactoSoles: comiteExp.multaSoles,
    })
  }

  const emoExp = exp.detalle.find((d) => d.area === 'EMO')
  if (emoExp) {
    recs.push({
      prioridad: 'MEDIUM',
      area: 'EMO',
      titulo: 'Programar EMO para trabajadores sin examen vigente',
      detalle: emoExp.motivo,
      impactoSoles: emoExp.multaSoles,
    })
  }

  // Field audit como recomendación de mejora si <50% de score
  if (bd.fieldAudit.score < bd.fieldAudit.max * 0.5) {
    recs.push({
      prioridad: 'LOW',
      area: 'FIELD_AUDIT',
      titulo: 'Programar más visitas Field Audit',
      detalle:
        bd.fieldAudit.nota +
        ' Una visita por semestre por sede ayuda a detectar peligros nuevos.',
      impactoSoles: 0,
    })
  }

  // Ordenar por prioridad
  const orden: Record<Recomendacion['prioridad'], number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  }
  recs.sort((a, b) => orden[a.prioridad] - orden[b.prioridad])

  return recs
}
