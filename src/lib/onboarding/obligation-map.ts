/**
 * Mapa de obligaciones del registro: "esto es lo que te toca cumplir".
 *
 * Módulo PURO (sin Prisma ni React): recibe el número de trabajadores, el
 * régimen, el sector y la fecha de hoy, y devuelve las obligaciones laborales
 * que le aplican a la empresa, cada una con una frase de qué es, su próxima
 * fecha (en hora de Lima), si depende del régimen, su prioridad y de dónde
 * sale la regla. También calcula la multa máxima de referencia de UNA
 * infracción muy grave para una empresa de ese tamaño.
 *
 * Fuentes (no se escriben montos ni umbrales a mano):
 *  - Fechas de CTS y gratificación, porcentajes MYPE, topes de trabajadores y
 *    ventas: `PERU_LABOR` (src/lib/legal-engine/peru-labor.ts).
 *  - Días de vacaciones por régimen: `getDiasVacacionesPorRegimen`.
 *  - Supervisor/Comité de SST, hostigamiento, cuadro de categorías, brigada,
 *    lactario y asistenta social: `evaluarComitesObligatorios`
 *    (src/lib/orgchart/comites-obligatorios.ts).
 *  - Multa: `calcularMultaSunafil` / `calcularMultaSunafilSoles`.
 *  - Los pocos umbrales que no están en esas fuentes van en `UMBRALES_NORMA`,
 *    cada uno con su norma (candidatos a mudarse a peru-labor.ts).
 *
 * Es información general para orientar al usuario: no reemplaza la asesoría
 * de un abogado.
 */

import {
  PERU_LABOR,
  calcularMultaSunafil,
  calcularMultaSunafilSoles,
  getDiasVacacionesPorRegimen,
  type TipoEmpresaSunafil,
} from '@/lib/legal-engine/peru-labor'
import {
  COMITES_OBLIGATORIOS,
  type ComiteObligacion,
  type ComiteSeverity,
} from '@/lib/orgchart/comites-obligatorios'
import { getLimaParts } from '@/lib/time/lima'
import { solesCortos } from '@/lib/glossary'

// ── Tipos ────────────────────────────────────────────────────────────────────

/** Regímenes que ofrece el asistente de registro. */
export type RegimenOnboarding =
  | 'GENERAL'
  | 'MYPE_MICRO'
  | 'MYPE_PEQUENA'
  | 'AGRARIO'
  | 'CONSTRUCCION_CIVIL'
  | 'OTRO'

export type PrioridadObligacion = 'alta' | 'media' | 'baja'

/**
 * - `obligatorio`: con los datos dados, la empresa debe cumplirla.
 * - `segun-tu-caso`: aplica solo si se da una condición que aún no sabemos
 *   (actividad de riesgo, número de mujeres, utilidades, régimen especial).
 */
export type ExigenciaObligacion = 'obligatorio' | 'segun-tu-caso'

export type FrecuenciaObligacion = 'semestral' | 'mensual' | 'anual' | 'permanente'

export interface ProximaFecha {
  /** Fecha civil de Lima, "YYYY-MM-DD". Si no es exacta, es una referencia para ordenar. */
  fecha: string
  /** true si la ley fija ese día; false si depende de otro dato (p. ej. el RUC en la PLAME). */
  exacta: boolean
  /** Texto listo para mostrar: "15 de noviembre de 2026" o "Octubre de 2026". */
  etiqueta: string
  /** Aclaración corta, si hace falta ("el día depende del último dígito de tu RUC"). */
  nota?: string
  /** Días de calendario (Lima) desde hoy hasta `fecha`. 0 = hoy. */
  diasFaltan: number
}

export interface FuenteRegla {
  tipo: 'peru-labor' | 'comites-obligatorios' | 'norma'
  /** Clave o norma concreta: "PERU_LABOR.CTS", "comites:sst", "D.S. 039-91-TR". */
  ref: string
}

export interface ObligacionMapa {
  id: string
  /** Título simple, sin siglas sueltas. */
  titulo: string
  /** Id del glosario (src/lib/glossary.ts) para usar con <Term>, si existe. */
  glosarioId?: string
  /** Qué es, en una frase. */
  queEs: string
  /** Cómo le aplica a esta empresa (régimen, tamaño, umbral). */
  comoTeAplica: string
  frecuencia: FrecuenciaObligacion
  proximaFecha: ProximaFecha | null
  exigencia: ExigenciaObligacion
  prioridad: PrioridadObligacion
  /** true si el monto o la forma de cumplirla cambia según el régimen laboral. */
  dependeDelRegimen: boolean
  baseLegal: string
  fuente: FuenteRegla
}

export interface ObligacionNoAplica {
  id: string
  /** Nombre corto para usar dentro de una frase ("CTS", "gratificaciones"). */
  titulo: string
  glosarioId?: string
  motivo: string
}

export interface MultaReferencia {
  tipoEmpresa: TipoEmpresaSunafil
  trabajadoresAfectados: number
  uit: number
  soles: number
  /** "Una sola infracción muy grave podría costar hasta S/ 2,475." */
  texto: string
  /** Explicación prudente de dónde sale el monto. */
  nota: string
  baseLegal: string
}

export interface ObligationMapInput {
  /** Número de trabajadores en planilla. */
  trabajadores: number
  /** Régimen elegido en el registro. Valores desconocidos se tratan como 'OTRO'. */
  regimen: RegimenOnboarding | string
  /** Sector del registro (COMERCIO, CONSTRUCCION, MINERIA…). */
  sector?: string | null
  /** Fecha de referencia. Se interpreta en hora de Lima. */
  hoy: Date
}

export interface ObligationMap {
  /** "YYYY-MM-DD" de Lima usado como hoy. */
  hoy: string
  trabajadores: number
  regimen: RegimenOnboarding
  /** Ordenadas por prioridad, luego por fecha más cercana. */
  obligaciones: ObligacionMapa[]
  /** Beneficios que NO le tocan por su régimen (para explicarlo). */
  noAplican: ObligacionNoAplica[]
  multaMaxima: MultaReferencia
}

// ── Umbrales que no están en peru-labor.ts ni en comites-obligatorios.ts ─────

/**
 * Umbrales tomados directamente de la norma. Viven aquí porque el asistente
 * los necesita y aún no existen en las fuentes centrales.
 * TODO: mover a PERU_LABOR cuando se toque ese archivo.
 */
export const UMBRALES_NORMA = {
  /** RIT: obligatorio para empleadores con MÁS de 100 trabajadores (D.S. 039-91-TR, art. 1). */
  RIT_MAS_DE: 100,
  /** Cuota de empleo de personas con discapacidad: empleadores privados con MÁS de 50 trabajadores (Ley 29973, art. 49.1). */
  CUOTA_DISCAPACIDAD_MAS_DE: 50,
  /** Cuota mínima del 3 % de la planilla (Ley 29973, art. 49.1). */
  CUOTA_DISCAPACIDAD_PORCENTAJE: 0.03,
  /** Reparto de utilidades: no obligadas las empresas que no excedan de 20 trabajadores (D.Leg. 892, art. 2). */
  UTILIDADES_MAS_DE: 20,
  /** Capacitaciones mínimas de SST al año (Ley 29783, art. 35). */
  CAPACITACIONES_SST_ANUALES: 4,
} as const

/**
 * Referencia para la PLAME: los cronogramas de SUNAT vencen, por lo general,
 * entre mediados y el día 25 del mes. Desde este día asumimos que la
 * declaración del mes ya pasó y mostramos el mes siguiente. Es solo para
 * mostrar una fecha orientativa: el día exacto depende del RUC.
 */
const DIA_CORTE_PLAME = 26

/** Sectores cuya actividad principal está en el Anexo 5 del D.S. 009-97-SA (SCTR obligatorio). */
const SECTORES_SCTR_OBLIGATORIO = new Set(['CONSTRUCCION', 'MINERIA'])
/** Sectores donde algunas actividades suelen estar en el Anexo 5: depende del puesto. */
const SECTORES_SCTR_SEGUN_CASO = new Set(['MANUFACTURA', 'PESCA', 'AGROINDUSTRIA', 'TEXTIL', 'SALUD'])

// ── Helpers de fecha (Lima) ─────────────────────────────────────────────────

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

interface FechaCivil {
  year: number
  month: number // 1-12
  day: number
}

const DAY_MS = 86_400_000

function utcDe(f: FechaCivil): number {
  return Date.UTC(f.year, f.month - 1, f.day)
}

function isoDe(f: FechaCivil): string {
  return `${f.year}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`
}

function diasEntre(desde: FechaCivil, hasta: FechaCivil): number {
  return Math.round((utcDe(hasta) - utcDe(desde)) / DAY_MS)
}

function ultimoDiaDelMes(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function sumarMeses(year: number, month: number, n: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + n
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 }
}

/** Nombre del mes en minúsculas: 1 → "enero". */
export function nombreMes(month: number): string {
  return MESES[(month - 1 + 12) % 12]
}

/** "15 de noviembre de 2026". */
export function fechaLarga(f: FechaCivil): string {
  return `${f.day} de ${nombreMes(f.month)} de ${f.year}`
}

/**
 * Próxima ocurrencia (hoy incluido) de una fecha que se repite cada año
 * en los meses/días dados. Ej.: CTS → 15/5 y 15/11.
 */
function proximaAnual(hoy: FechaCivil, fechas: ReadonlyArray<{ mes: number; dia: number }>): FechaCivil {
  const ordenadas = [...fechas].sort((a, b) => a.mes - b.mes || a.dia - b.dia)
  for (const f of ordenadas) {
    const candidata = { year: hoy.year, month: f.mes, day: f.dia }
    if (utcDe(candidata) >= utcDe(hoy)) return candidata
  }
  const primera = ordenadas[0]
  return { year: hoy.year + 1, month: primera.mes, day: primera.dia }
}

function proximaFechaExacta(hoy: FechaCivil, fecha: FechaCivil): ProximaFecha {
  return {
    fecha: isoDe(fecha),
    exacta: true,
    etiqueta: fechaLarga(fecha),
    diasFaltan: diasEntre(hoy, fecha),
  }
}

/**
 * PLAME: cada mes se declara la planilla del mes anterior, en el día que fija
 * el cronograma de SUNAT según el último dígito del RUC. Devolvemos el mes de
 * la próxima declaración (no un día exacto).
 */
function proximaPlame(hoy: FechaCivil): ProximaFecha {
  const mesDeclaracion = hoy.day >= DIA_CORTE_PLAME ? sumarMeses(hoy.year, hoy.month, 1) : { year: hoy.year, month: hoy.month }
  const periodo = sumarMeses(mesDeclaracion.year, mesDeclaracion.month, -1)
  const referencia: FechaCivil = {
    year: mesDeclaracion.year,
    month: mesDeclaracion.month,
    day: ultimoDiaDelMes(mesDeclaracion.year, mesDeclaracion.month),
  }
  const mes = nombreMes(mesDeclaracion.month)
  return {
    fecha: isoDe(referencia),
    exacta: false,
    etiqueta: `${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${mesDeclaracion.year}`,
    nota: `Declaras la planilla de ${nombreMes(periodo.month)}. El día depende del último dígito de tu RUC.`,
    diasFaltan: diasEntre(hoy, referencia),
  }
}

// ── Helpers de texto ─────────────────────────────────────────────────────────

const pct = (tasa: number) => `${Math.round(tasa * 10000) / 100} %`

/** "≥20" → "20 o más", "<20" → "menos de 20" (los textos del catálogo usan símbolos). */
function legible(texto: string): string {
  return texto
    .replace(/≥\s?(\d+)/g, '$1 o más')
    .replace(/<\s?(\d+)/g, 'menos de $1')
}

const ETIQUETA_REGIMEN: Record<RegimenOnboarding, string> = {
  GENERAL: 'régimen general',
  MYPE_MICRO: 'régimen MYPE de microempresa',
  MYPE_PEQUENA: 'régimen MYPE de pequeña empresa',
  AGRARIO: 'régimen agrario',
  CONSTRUCCION_CIVIL: 'régimen de construcción civil',
  OTRO: 'régimen especial que elegiste',
}

/** "régimen MYPE de microempresa". */
export function etiquetaRegimen(regimen: RegimenOnboarding | string): string {
  return ETIQUETA_REGIMEN[normalizarRegimen(regimen)]
}

const ETIQUETA_TIPO_EMPRESA: Record<TipoEmpresaSunafil, string> = {
  MICRO: 'microempresa',
  PEQUENA: 'pequeña empresa',
  NO_MYPE: 'empresa no MYPE',
}

// ── Normalización de entradas ────────────────────────────────────────────────

const REGIMENES_VALIDOS: ReadonlySet<string> = new Set([
  'GENERAL',
  'MYPE_MICRO',
  'MYPE_PEQUENA',
  'AGRARIO',
  'CONSTRUCCION_CIVIL',
  'OTRO',
])

export function normalizarRegimen(regimen: RegimenOnboarding | string | null | undefined): RegimenOnboarding {
  return regimen && REGIMENES_VALIDOS.has(regimen) ? (regimen as RegimenOnboarding) : 'OTRO'
}

/** Entero ≥ 1. Un número inválido se trata como 1 trabajador. */
function normalizarTrabajadores(n: number): number {
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

/** Escala de multas que corresponde según el régimen (las tablas MYPE exigen REMYPE). */
export function tipoEmpresaSunafilPorRegimen(regimen: RegimenOnboarding | string): TipoEmpresaSunafil {
  const r = normalizarRegimen(regimen)
  if (r === 'MYPE_MICRO') return 'MICRO'
  if (r === 'MYPE_PEQUENA') return 'PEQUENA'
  return 'NO_MYPE'
}

// ── Rango de tamaño (compatibilidad con Organization.sizeRange) ──────────────

export type RangoTrabajadores = '1-10' | '11-50' | '51-100' | '101-200' | '200+'

/** Convierte el número exacto al rango que guarda `Organization.sizeRange`. */
export function rangoDeTrabajadores(n: number): RangoTrabajadores {
  const t = normalizarTrabajadores(n)
  if (t <= 10) return '1-10'
  if (t <= 50) return '11-50'
  if (t <= 100) return '51-100'
  if (t <= 200) return '101-200'
  return '200+'
}

/** "1 a 10 trabajadores", "Más de 200 trabajadores". */
export function etiquetaRango(rango: RangoTrabajadores): string {
  if (rango === '200+') return 'Más de 200 trabajadores'
  const [a, b] = rango.split('-')
  return `${a} a ${b} trabajadores`
}

// ── Sugerencia de régimen ────────────────────────────────────────────────────

export interface SugerenciaRegimen {
  /** Régimen que conviene revisar primero. */
  regimen: RegimenOnboarding
  /** true si la sugerencia solo vale con inscripción vigente en el REMYPE. */
  requiereRemype: boolean
  /** Frase principal: "Con 5 trabajadores, tu empresa podría ser microempresa." */
  titulo: string
  /** Aviso por sector (agrario, construcción), si aplica. */
  avisoSector: string | null
  /** Límites de ventas anuales del REMYPE, en UIT y soles (de PERU_LABOR). */
  limitesVentas: {
    microUit: number
    microSoles: number
    pequenaUit: number
    pequenaSoles: number
  }
}

/**
 * Sugiere qué régimen revisar según el número de trabajadores, SIN decidir por
 * el usuario: el régimen MYPE solo aplica con inscripción en el REMYPE y
 * ventas dentro del límite. Si no la tiene, le corresponde el régimen general.
 */
export function sugerirRegimen(input: { trabajadores: number; sector?: string | null }): SugerenciaRegimen {
  const n = normalizarTrabajadores(input.trabajadores)
  const { MICRO, PEQUENA } = PERU_LABOR.MYPE
  const UIT = PERU_LABOR.UIT
  const limitesVentas = {
    microUit: MICRO.VENTAS_MAX_UIT_ANUALES,
    microSoles: MICRO.VENTAS_MAX_UIT_ANUALES * UIT,
    pequenaUit: PEQUENA.VENTAS_MAX_UIT_ANUALES,
    pequenaSoles: PEQUENA.VENTAS_MAX_UIT_ANUALES * UIT,
  }
  const trab = n === 1 ? '1 trabajador' : `${n} trabajadores`

  let avisoSector: string | null = null
  if (input.sector === 'AGROINDUSTRIA') {
    avisoSector = 'Si tu actividad es agraria, agroexportadora o agroindustrial, revisa también el régimen agrario.'
  } else if (input.sector === 'CONSTRUCCION') {
    avisoSector = 'Si tienes obreros en obras de construcción, ellos tienen su propio régimen: construcción civil.'
  }

  if (n <= MICRO.TRABAJADORES_MAX) {
    return {
      regimen: 'MYPE_MICRO',
      requiereRemype: true,
      titulo: `Con ${trab}, tu empresa podría estar en el régimen MYPE como microempresa.`,
      avisoSector,
      limitesVentas,
    }
  }
  if (n <= PEQUENA.TRABAJADORES_MAX) {
    return {
      regimen: 'MYPE_PEQUENA',
      requiereRemype: true,
      titulo: `Con ${trab}, tu empresa podría estar en el régimen MYPE como pequeña empresa.`,
      avisoSector,
      limitesVentas,
    }
  }
  return {
    regimen: 'GENERAL',
    requiereRemype: false,
    titulo: `Con ${trab}, lo más probable es que te corresponda el régimen general.`,
    avisoSector,
    limitesVentas,
  }
}

// ── Construcción del mapa ────────────────────────────────────────────────────

const PRIORIDAD_RANK: Record<PrioridadObligacion, number> = { alta: 0, media: 1, baja: 2 }

const PRIORIDAD_POR_SEVERIDAD: Record<ComiteSeverity, PrioridadObligacion> = {
  CRITICAL: 'alta',
  HIGH: 'media',
  MEDIUM: 'baja',
}

function comite(id: string): ComiteObligacion {
  const found = COMITES_OBLIGATORIOS.find((c) => c.id === id)
  if (!found) throw new Error(`obligation-map: el catálogo de comités no tiene "${id}"`)
  return found
}

/** Construye el mapa de obligaciones. Función pura: misma entrada, misma salida. */
export function buildObligationMap(input: ObligationMapInput): ObligationMap {
  const trabajadores = normalizarTrabajadores(input.trabajadores)
  const regimen = normalizarRegimen(input.regimen)
  const sector = input.sector ?? null
  const p = getLimaParts(input.hoy)
  const hoy: FechaCivil = { year: p.year, month: p.month, day: p.day }

  // El índice en `lista` sirve de desempate estable al ordenar.
  const lista: ObligacionMapa[] = []
  const noAplican: ObligacionNoAplica[] = []
  const add = (o: ObligacionMapa) => {
    lista.push(o)
  }

  const ctx = { workerCount: trabajadores }

  // 1. Planilla electrónica (T-Registro + PLAME) — todas las empresas.
  add({
    id: 'planilla-electronica',
    titulo: 'Planilla electrónica',
    glosarioId: 'planilla-electronica',
    queEs: 'El registro de tus trabajadores y de lo que les pagas, que declaras cada mes a SUNAT.',
    comoTeAplica:
      'Registra a cada trabajador en el T-Registro desde su primer día y declara cada mes la PLAME con sus sueldos y aportes (EsSalud, AFP u ONP).',
    frecuencia: 'mensual',
    proximaFecha: proximaPlame(hoy),
    exigencia: 'obligatorio',
    prioridad: 'alta',
    dependeDelRegimen: false,
    baseLegal: 'D.S. 018-2007-TR y normas de SUNAT.',
    fuente: { tipo: 'norma', ref: 'D.S. 018-2007-TR' },
  })

  // 2. CTS y 3. Gratificación — dependen del régimen (PERU_LABOR).
  const ctsFechas = [
    { mes: PERU_LABOR.CTS.DEPOSITO_MAYO.mes, dia: PERU_LABOR.CTS.DEPOSITO_MAYO.dia },
    { mes: PERU_LABOR.CTS.DEPOSITO_NOVIEMBRE.mes, dia: PERU_LABOR.CTS.DEPOSITO_NOVIEMBRE.dia },
  ]
  const gratiFechas = [
    { mes: PERU_LABOR.GRATIFICACION.PERIODOS.JULIO.pago_mes, dia: PERU_LABOR.GRATIFICACION.PERIODOS.JULIO.pago_dia },
    { mes: PERU_LABOR.GRATIFICACION.PERIODOS.DICIEMBRE.pago_mes, dia: PERU_LABOR.GRATIFICACION.PERIODOS.DICIEMBRE.pago_dia },
  ]
  const proxCts = proximaFechaExacta(hoy, proximaAnual(hoy, ctsFechas))
  const proxGrati = proximaFechaExacta(hoy, proximaAnual(hoy, gratiFechas))
  const ctsQueEs = 'Un ahorro que depositas para cada trabajador en el banco que él elige, dos veces al año.'
  const gratiQueEs = 'Un sueldo extra que pagas en julio (Fiestas Patrias) y en diciembre (Navidad).'

  if (regimen === 'MYPE_MICRO') {
    if (!PERU_LABOR.MYPE.MICRO.CTS) {
      noAplican.push({
        id: 'cts',
        titulo: 'CTS',
        glosarioId: 'cts',
        motivo: 'En la microempresa inscrita en el REMYPE no se paga CTS.',
      })
    }
    if (!PERU_LABOR.MYPE.MICRO.GRATIFICACIONES) {
      noAplican.push({
        id: 'gratificacion',
        titulo: 'gratificaciones',
        glosarioId: 'gratificacion',
        motivo: 'En la microempresa inscrita en el REMYPE no se pagan gratificaciones.',
      })
    }
  } else {
    const esEspecial = regimen === 'OTRO'
    let ctsComo: string
    let gratiComo: string
    let ctsExigencia: ExigenciaObligacion = 'obligatorio'
    let ctsFecha: ProximaFecha | null = proxCts
    let gratiExigencia: ExigenciaObligacion = 'obligatorio'

    switch (regimen) {
      case 'MYPE_PEQUENA':
        ctsComo = `En la pequeña empresa corresponde el ${pct(PERU_LABOR.MYPE.PEQUENA.CTS_PORCENTAJE)} de la CTS del régimen general.`
        gratiComo = `En la pequeña empresa corresponde el ${pct(PERU_LABOR.MYPE.PEQUENA.GRATIFICACIONES_PORCENTAJE)} de la gratificación del régimen general.`
        break
      case 'AGRARIO':
        ctsComo = 'En el régimen agrario la CTS puede estar incluida en la remuneración diaria. Si la pagas por separado, deposítala en estas fechas.'
        gratiComo = 'En el régimen agrario las gratificaciones pueden estar incluidas en la remuneración diaria. Si las pagas por separado, págalas en estas fechas.'
        break
      case 'CONSTRUCCION_CIVIL':
        ctsComo = 'En construcción civil la CTS se calcula sobre los jornales y se paga de otra forma. Revísala con tu convenio o tu asesor.'
        ctsExigencia = 'segun-tu-caso'
        ctsFecha = null
        gratiComo = 'En construcción civil el monto se fija en jornales según el convenio del sector.'
        break
      case 'OTRO':
        ctsComo = 'Tu régimen tiene reglas propias. Confirma con tu asesor si te corresponde y cómo se calcula.'
        gratiComo = 'Tu régimen tiene reglas propias. Confirma con tu asesor si te corresponde y cómo se calcula.'
        ctsExigencia = 'segun-tu-caso'
        gratiExigencia = 'segun-tu-caso'
        break
      default:
        ctsComo = 'En el régimen general corresponde completa: por cada semestre trabajado, un poco más de medio sueldo.'
        gratiComo = `En el régimen general corresponde un sueldo completo por semestre trabajado, más la bonificación extraordinaria del ${pct(PERU_LABOR.GRATIFICACION.BONIFICACION_EXTRAORDINARIA)}.`
    }

    add({
      id: 'cts',
      titulo: 'Depósito de CTS',
      glosarioId: 'cts',
      queEs: ctsQueEs,
      comoTeAplica: ctsComo,
      frecuencia: 'semestral',
      proximaFecha: ctsFecha,
      exigencia: ctsExigencia,
      prioridad: ctsExigencia === 'obligatorio' ? 'alta' : 'media',
      dependeDelRegimen: true,
      baseLegal: PERU_LABOR.CTS.BASE_LEGAL,
      fuente: { tipo: 'peru-labor', ref: esEspecial ? 'PERU_LABOR.CTS (referencial)' : 'PERU_LABOR.CTS' },
    })
    add({
      id: 'gratificacion',
      titulo: 'Pago de gratificación',
      glosarioId: 'gratificacion',
      queEs: gratiQueEs,
      comoTeAplica: gratiComo,
      frecuencia: 'semestral',
      proximaFecha: proxGrati,
      exigencia: gratiExigencia,
      prioridad: gratiExigencia === 'obligatorio' ? 'alta' : 'media',
      dependeDelRegimen: true,
      baseLegal: PERU_LABOR.GRATIFICACION.BASE_LEGAL,
      fuente: { tipo: 'peru-labor', ref: 'PERU_LABOR.GRATIFICACION' },
    })
  }

  // 4. Supervisor o Comité de SST — umbral del catálogo de comités.
  const sst = comite('sst')
  const sstR = sst.resolve(ctx)
  const tieneComiteSst = sstR.templateId === 'comite-sst-paritario'
  add({
    id: 'sst-organo',
    titulo: sstR.resolvedTitle,
    glosarioId: tieneComiteSst ? 'comite-sst' : 'supervisor-sst',
    queEs: tieneComiteSst
      ? 'Un grupo con representantes de la empresa y de los trabajadores, en igual número, que vigila la seguridad en el trabajo.'
      : 'Una persona elegida por tus trabajadores para vigilar la seguridad y la salud en el trabajo.',
    comoTeAplica: sstR.detail,
    frecuencia: 'permanente',
    proximaFecha: null,
    exigencia: 'obligatorio',
    prioridad: PRIORIDAD_POR_SEVERIDAD[sst.severity],
    dependeDelRegimen: false,
    baseLegal: sst.legalBasis,
    fuente: { tipo: 'comites-obligatorios', ref: 'comites:sst' },
  })

  // 5. Seguro Vida Ley — todas las empresas, desde el primer día.
  add({
    id: 'seguro-vida-ley',
    titulo: 'Seguro Vida Ley',
    glosarioId: 'seguro-vida-ley',
    queEs: 'Un seguro de vida que contratas y pagas para cada trabajador en planilla.',
    comoTeAplica: 'Debe estar vigente desde el primer día de trabajo de cada persona.',
    frecuencia: 'permanente',
    proximaFecha: null,
    exigencia: 'obligatorio',
    prioridad: 'alta',
    dependeDelRegimen: false,
    baseLegal: `${PERU_LABOR.SEGURO_VIDA_LEY.BASE_LEGAL}, modificado por el D.U. 044-2019.`,
    fuente: { tipo: 'norma', ref: 'D.Leg. 688 / D.U. 044-2019' },
  })

  // 6. SCTR — solo por actividad de riesgo (sector).
  if (sector && (SECTORES_SCTR_OBLIGATORIO.has(sector) || SECTORES_SCTR_SEGUN_CASO.has(sector))) {
    const obligatorio = SECTORES_SCTR_OBLIGATORIO.has(sector)
    add({
      id: 'sctr',
      titulo: 'Seguro de trabajo de riesgo (SCTR)',
      glosarioId: 'sctr',
      queEs: 'Un seguro de salud y pensión para quienes hacen actividades de riesgo.',
      comoTeAplica: obligatorio
        ? 'Tu actividad es de riesgo: contrátalo para quienes trabajan en obra o en operación, desde su primer día.'
        : 'Algunas actividades de tu sector son de riesgo. Si tus trabajadores las hacen, necesitas SCTR desde su primer día.',
      frecuencia: 'permanente',
      proximaFecha: null,
      exigencia: obligatorio ? 'obligatorio' : 'segun-tu-caso',
      prioridad: obligatorio ? 'alta' : 'baja',
      dependeDelRegimen: false,
      baseLegal: 'Ley 26790 y D.S. 003-98-SA (actividades del Anexo 5 del D.S. 009-97-SA).',
      fuente: { tipo: 'norma', ref: 'D.S. 009-97-SA, Anexo 5' },
    })
  }

  // 7. Hostigamiento sexual — catálogo de comités.
  const host = comite('hostigamiento')
  const hostR = host.resolve(ctx)
  add({
    id: 'hostigamiento',
    titulo: 'Prevención del hostigamiento sexual',
    glosarioId: 'hostigamiento-sexual',
    queEs: 'Un canal para recibir quejas de hostigamiento sexual y actuar rápido para proteger a la víctima.',
    comoTeAplica: hostR.detail,
    frecuencia: 'permanente',
    proximaFecha: null,
    exigencia: 'obligatorio',
    prioridad: PRIORIDAD_POR_SEVERIDAD[host.severity],
    dependeDelRegimen: false,
    baseLegal: host.legalBasis,
    fuente: { tipo: 'comites-obligatorios', ref: 'comites:hostigamiento' },
  })

  // 8. Sistema de gestión de SST — todas las empresas (Ley 29783).
  add({
    id: 'sistema-sst',
    titulo: 'Seguridad y salud en el trabajo',
    glosarioId: 'sst',
    queEs: 'Las reglas para prevenir accidentes: identificar riesgos, capacitar y entregar equipos de protección.',
    comoTeAplica:
      `Aplica a todas las empresas: matriz IPERC, exámenes médicos y al menos ${UMBRALES_NORMA.CAPACITACIONES_SST_ANUALES} capacitaciones al año.` +
      (tieneComiteSst ? ' Por tu tamaño, también necesitas un reglamento interno de SST.' : ''),
    frecuencia: 'anual',
    proximaFecha: null,
    exigencia: 'obligatorio',
    prioridad: 'media',
    dependeDelRegimen: false,
    baseLegal: 'Ley 29783 (arts. 34 y 35) y D.S. 005-2012-TR.',
    fuente: { tipo: 'norma', ref: 'Ley 29783' },
  })

  // 9. Boletas de pago — todas las empresas.
  add({
    id: 'boletas',
    titulo: 'Entrega de boletas de pago',
    glosarioId: 'boleta-de-pago',
    queEs: 'El documento que muestra lo que pagaste a cada trabajador en el mes.',
    comoTeAplica: 'Entrégala a más tardar el tercer día hábil después de cada pago y guarda la constancia. Puede ser electrónica.',
    frecuencia: 'mensual',
    proximaFecha: null,
    exigencia: 'obligatorio',
    prioridad: 'media',
    dependeDelRegimen: false,
    baseLegal: 'D.S. 001-98-TR y D.Leg. 1310.',
    fuente: { tipo: 'norma', ref: 'D.S. 001-98-TR' },
  })

  // 10. Cuadro de categorías y funciones (Ley 30709) — catálogo de comités.
  const cuadro = comite('cuadro-categorias')
  const cuadroR = cuadro.resolve(ctx)
  if (cuadroR.applicability === 'obligatorio') {
    add({
      id: 'cuadro-categorias',
      titulo: 'Cuadro de categorías y funciones',
      queEs: 'Un documento que ordena los puestos por categorías para pagar igual por un trabajo de igual valor.',
      comoTeAplica: 'Es obligatorio para todas las empresas, sin importar su tamaño. Lo aprueba la gerencia.',
      frecuencia: 'permanente',
      proximaFecha: null,
      exigencia: 'obligatorio',
      prioridad: PRIORIDAD_POR_SEVERIDAD[cuadro.severity],
      dependeDelRegimen: false,
      baseLegal: cuadro.legalBasis,
      fuente: { tipo: 'comites-obligatorios', ref: 'comites:cuadro-categorias' },
    })
  }

  // 11. Registro de control de asistencia — todas las empresas.
  add({
    id: 'registro-asistencia',
    titulo: 'Registro de asistencia',
    queEs: 'El control diario de la hora de ingreso y salida de cada trabajador.',
    comoTeAplica: 'Llévalo para todos tus trabajadores, en papel o digital. SUNAFIL lo pide en casi toda inspección.',
    frecuencia: 'permanente',
    proximaFecha: null,
    exigencia: 'obligatorio',
    prioridad: 'media',
    dependeDelRegimen: false,
    baseLegal: 'D.S. 004-2006-TR.',
    fuente: { tipo: 'norma', ref: 'D.S. 004-2006-TR' },
  })

  // 12. Vacaciones — los días dependen del régimen.
  if (regimen === 'GENERAL' || regimen === 'MYPE_MICRO' || regimen === 'MYPE_PEQUENA' || regimen === 'AGRARIO') {
    const dias = getDiasVacacionesPorRegimen(regimen)
    add({
      id: 'vacaciones',
      titulo: 'Vacaciones',
      glosarioId: 'vacaciones',
      queEs: 'Un descanso pagado por cada año completo de trabajo.',
      comoTeAplica: `En el ${ETIQUETA_REGIMEN[regimen]} corresponden ${dias} días por año. Prográmalas a tiempo: si no se gozan, debes una indemnización.`,
      frecuencia: 'anual',
      proximaFecha: null,
      exigencia: 'obligatorio',
      prioridad: 'media',
      dependeDelRegimen: true,
      baseLegal: regimen === 'GENERAL' || regimen === 'AGRARIO' ? PERU_LABOR.VACACIONES.BASE_LEGAL : PERU_LABOR.MYPE.MICRO.BASE_LEGAL,
      fuente: { tipo: 'peru-labor', ref: 'getDiasVacacionesPorRegimen' },
    })
  }

  // 13. RIT — más de 100 trabajadores.
  if (trabajadores > UMBRALES_NORMA.RIT_MAS_DE) {
    add({
      id: 'rit',
      titulo: 'Reglamento Interno de Trabajo',
      glosarioId: 'rit',
      queEs: 'El documento con las reglas internas: horarios, permisos, faltas y sanciones.',
      comoTeAplica: `Es obligatorio con más de ${UMBRALES_NORMA.RIT_MAS_DE} trabajadores. Preséntalo al Ministerio de Trabajo y entrega una copia a cada trabajador.`,
      frecuencia: 'permanente',
      proximaFecha: null,
      exigencia: 'obligatorio',
      prioridad: 'media',
      dependeDelRegimen: false,
      baseLegal: 'D.S. 039-91-TR.',
      fuente: { tipo: 'norma', ref: 'D.S. 039-91-TR, art. 1' },
    })
  }

  // 14. Cuota de empleo para personas con discapacidad — más de 50 trabajadores.
  if (trabajadores > UMBRALES_NORMA.CUOTA_DISCAPACIDAD_MAS_DE) {
    add({
      id: 'cuota-discapacidad',
      titulo: 'Cuota de empleo para personas con discapacidad',
      queEs: 'Una parte mínima de tu planilla debe estar formada por personas con discapacidad.',
      comoTeAplica: `Con más de ${UMBRALES_NORMA.CUOTA_DISCAPACIDAD_MAS_DE} trabajadores, la cuota es de al menos el ${pct(UMBRALES_NORMA.CUOTA_DISCAPACIDAD_PORCENTAJE)} de tu planilla. Se verifica cada año.`,
      frecuencia: 'anual',
      proximaFecha: null,
      exigencia: 'obligatorio',
      prioridad: 'media',
      dependeDelRegimen: false,
      baseLegal: 'Ley 29973 (art. 49) y su reglamento.',
      fuente: { tipo: 'norma', ref: 'Ley 29973, art. 49.1' },
    })
  }

  // 15. Brigada de emergencia — catálogo de comités (solo si es obligatoria).
  const brigada = comite('brigada-emergencia')
  const brigadaR = brigada.resolve(ctx)
  if (brigadaR.applicability === 'obligatorio') {
    add({
      id: 'brigada-emergencia',
      titulo: 'Brigada de emergencia',
      queEs: 'Trabajadores capacitados para evacuar, dar primeros auxilios y actuar ante un amago de incendio.',
      comoTeAplica: 'Por tu número de trabajadores, debe formar parte de tu plan de respuesta ante emergencias de SST.',
      frecuencia: 'permanente',
      proximaFecha: null,
      exigencia: 'obligatorio',
      prioridad: PRIORIDAD_POR_SEVERIDAD[brigada.severity],
      dependeDelRegimen: false,
      baseLegal: brigada.legalBasis,
      fuente: { tipo: 'comites-obligatorios', ref: 'comites:brigada-emergencia' },
    })
  }

  // 16. Reparto de utilidades — más de 20 trabajadores y renta de tercera, no microempresa.
  if (trabajadores > UMBRALES_NORMA.UTILIDADES_MAS_DE && regimen !== 'MYPE_MICRO') {
    add({
      id: 'utilidades',
      titulo: 'Reparto de utilidades',
      queEs: 'Una parte de las ganancias anuales de la empresa que se reparte entre los trabajadores.',
      comoTeAplica: `Con más de ${UMBRALES_NORMA.UTILIDADES_MAS_DE} trabajadores, si tu empresa tuvo utilidades en el año, debes repartirlas dentro de los ${PERU_LABOR.UTILIDADES.PLAZO_PAGO_DIAS} días siguientes al vencimiento de tu declaración anual de renta.`,
      frecuencia: 'anual',
      proximaFecha: null,
      exigencia: 'segun-tu-caso',
      prioridad: 'baja',
      dependeDelRegimen: false,
      baseLegal: PERU_LABOR.UTILIDADES.BASE_LEGAL,
      fuente: { tipo: 'norma', ref: 'D.Leg. 892' },
    })
  }

  // 17-18. Lactario y asistenta social — dependen del número de mujeres, que
  // aún no conocemos. Solo los mostramos si el tamaño los hace posibles
  // (evaluamos el catálogo como si todo el personal cumpliera la condición).
  const lactario = comite('lactario')
  if (lactario.resolve({ workerCount: trabajadores, womenFertileCount: trabajadores }).applicability === 'obligatorio') {
    const r = lactario.resolve({ workerCount: trabajadores })
    add({
      id: 'lactario',
      titulo: 'Lactario',
      queEs: 'Un ambiente privado y adecuado para que las madres extraigan y conserven la leche materna.',
      comoTeAplica: legible(r.detail),
      frecuencia: 'permanente',
      proximaFecha: null,
      exigencia: 'segun-tu-caso',
      prioridad: PRIORIDAD_POR_SEVERIDAD[lactario.severity],
      dependeDelRegimen: false,
      baseLegal: lactario.legalBasis,
      fuente: { tipo: 'comites-obligatorios', ref: 'comites:lactario' },
    })
  }
  const asistenta = comite('asistenta-social')
  if (asistenta.resolve({ workerCount: trabajadores, womenCount: trabajadores }).applicability === 'obligatorio') {
    const r = asistenta.resolve({ workerCount: trabajadores })
    add({
      id: 'asistenta-social',
      titulo: 'Asistenta social',
      queEs: 'Una profesional que atiende el bienestar social de las trabajadoras y sus familias.',
      comoTeAplica: legible(r.detail),
      frecuencia: 'permanente',
      proximaFecha: null,
      exigencia: 'segun-tu-caso',
      prioridad: PRIORIDAD_POR_SEVERIDAD[asistenta.severity],
      dependeDelRegimen: false,
      baseLegal: asistenta.legalBasis,
      fuente: { tipo: 'comites-obligatorios', ref: 'comites:asistenta-social' },
    })
  }

  const obligaciones = lista
    .map((o, orden) => ({ o, orden }))
    .sort((a, b) => {
      const pr = PRIORIDAD_RANK[a.o.prioridad] - PRIORIDAD_RANK[b.o.prioridad]
      if (pr !== 0) return pr
      const da = a.o.proximaFecha ? a.o.proximaFecha.diasFaltan : Number.POSITIVE_INFINITY
      const db = b.o.proximaFecha ? b.o.proximaFecha.diasFaltan : Number.POSITIVE_INFINITY
      if (da !== db) return da - db
      return a.orden - b.orden
    })
    .map(({ o }) => o)

  return {
    hoy: isoDe(hoy),
    trabajadores,
    regimen,
    obligaciones,
    noAplican,
    multaMaxima: calcularMultaReferencia(trabajadores, regimen),
  }
}

/**
 * Multa de referencia: la de UNA infracción muy grave que afecte a todos los
 * trabajadores, con la escala de SUNAFIL que corresponde al régimen (MYPE solo
 * con REMYPE). Sin reincidencia ni descuentos.
 */
export function calcularMultaReferencia(trabajadores: number, regimen: RegimenOnboarding | string): MultaReferencia {
  const n = normalizarTrabajadores(trabajadores)
  const tipoEmpresa = tipoEmpresaSunafilPorRegimen(regimen)
  const uit = calcularMultaSunafil(tipoEmpresa, 'MUY_GRAVE', n)
  const soles = calcularMultaSunafilSoles(tipoEmpresa, 'MUY_GRAVE', n)
  const afectados = n === 1 ? 'a tu trabajador' : `a tus ${n} trabajadores`
  return {
    tipoEmpresa,
    trabajadoresAfectados: n,
    uit,
    soles,
    texto: `Una sola infracción muy grave podría costar hasta ${solesCortos(soles)}.`,
    nota: `Es el monto de la escala de SUNAFIL para una ${ETIQUETA_TIPO_EMPRESA[tipoEmpresa]} cuando la falta afecta ${afectados} (${uit} UIT de ${solesCortos(PERU_LABOR.UIT)}). El monto real depende de cada caso, y corregir a tiempo puede reducirlo mucho.`,
    baseLegal: PERU_LABOR.MULTAS_SUNAFIL.BASE_LEGAL,
  }
}

/** Las N obligaciones principales (ya vienen ordenadas por prioridad y fecha). */
export function obligacionesPrincipales(map: ObligationMap, max = 6): ObligacionMapa[] {
  return map.obligaciones.slice(0, Math.max(0, max))
}
