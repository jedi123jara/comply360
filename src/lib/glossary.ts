/**
 * Glosario laboral peruano — fuente única de las explicaciones "¿Qué es?".
 *
 * Lo usan:
 *  - `<Term id="cts">CTS</Term>` (src/components/ui/term.tsx): popover con la
 *    explicación al pasar el mouse, enfocar con teclado o tocar.
 *  - La sección "Glosario" de /dashboard/ayuda (anclas `#glosario-<id>`).
 *  - La prop `help` de KpiCard.
 *
 * Reglas de contenido:
 *  - Lenguaje simple, frases cortas, tuteo peruano (nunca voseo).
 *  - Los montos salen de `PERU_LABOR` (UIT, RMV, tasas): no se escriben a mano.
 *  - Si un dato no es seguro, se formula con prudencia en vez de afirmarlo.
 *  - Es información general: no reemplaza la asesoría de un abogado.
 */

import {
  PERU_LABOR,
  calcularMultaSunafil,
  calcularMultaSunafilSoles,
} from '@/lib/legal-engine/peru-labor'

// ── Tipos ────────────────────────────────────────────────────────────────────

export type GlossaryCategory =
  | 'beneficios'
  | 'valores'
  | 'regimenes'
  | 'planilla'
  | 'contratos'
  | 'seguros'
  | 'sst'
  | 'convivencia'
  | 'sunafil'

export interface GlossaryEntry {
  /** Identificador estable en kebab-case. Se usa en `<Term id>` y en el ancla `#glosario-<id>`. */
  id: string
  /** Nombre visible del término. */
  term: string
  /** Siglas, sinónimos y formas comunes de buscarlo. */
  aliases: readonly string[]
  categoria: GlossaryCategory
  /** Qué es, en 1-2 frases simples. */
  queEs: string
  /** Consecuencia práctica: multa, derecho del trabajador, riesgo. */
  porQueImporta: string
  /** Ejemplo concreto, con números calculados con las constantes vigentes. */
  ejemplo?: string
  /** Plazos u oportunidad, si aplica. */
  cuando?: string
  /** Norma principal, dicha en simple. */
  baseLegal: string
  /** Otros términos del glosario que conviene leer después. */
  relacionados?: readonly string[]
}

export const GLOSSARY_CATEGORIES: Record<GlossaryCategory, { label: string; descripcion: string }> = {
  beneficios: { label: 'Beneficios y pagos', descripcion: 'Lo que le corresponde cobrar al trabajador.' },
  valores: { label: 'Valores de referencia', descripcion: 'Montos oficiales que se usan para calcular.' },
  regimenes: { label: 'Regímenes laborales', descripcion: 'Conjuntos de reglas según el tipo de empresa o actividad.' },
  planilla: { label: 'Planilla y documentos', descripcion: 'Registros y papeles que debes tener al día.' },
  contratos: { label: 'Contratos', descripcion: 'Formas de contratar y sus riesgos.' },
  seguros: { label: 'Seguros y pensiones', descripcion: 'Salud, riesgo, vida y jubilación.' },
  sst: { label: 'Seguridad y salud (SST)', descripcion: 'Prevención de accidentes y enfermedades.' },
  convivencia: { label: 'Reglas internas', descripcion: 'Normas de convivencia y prevención del hostigamiento.' },
  sunafil: { label: 'SUNAFIL e inspecciones', descripcion: 'Fiscalización, actas y multas.' },
}

// ── Helpers de formato ───────────────────────────────────────────────────────

/** "S/ 1,130" o "S/ 1,166.67" (formato peruano usual: coma de miles, punto decimal). */
export function solesCortos(monto: number): string {
  const redondeado = Math.round(monto * 100) / 100
  const opciones: Intl.NumberFormatOptions = Number.isInteger(redondeado)
    ? { maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  return `S/ ${redondeado.toLocaleString('en-US', opciones)}`
}

/** "9 %" con espacio duro, para que el número y el signo no se separen. */
const pct = (tasa: number) => `${Math.round(tasa * 10000) / 100} %`

// ── Valores vigentes (todos desde PERU_LABOR) ───────────────────────────────

const UIT = PERU_LABOR.UIT
const RMV = PERU_LABOR.RMV
const ASIG_FAM = RMV * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE
const BONIF_EXT = PERU_LABOR.GRATIFICACION.BONIFICACION_EXTRAORDINARIA
const ESSALUD = PERU_LABOR.APORTES.ESSALUD_TASA
const ONP = PERU_LABOR.APORTES.ONP_TASA
const AFP_APORTE = PERU_LABOR.APORTES.AFP_APORTE_OBLIGATORIO
const DIA_CTS = PERU_LABOR.CTS.DEPOSITO_MAYO.dia
const DIA_GRATI = PERU_LABOR.GRATIFICACION.PERIODOS.JULIO.pago_dia
const VACACIONES_DIAS = PERU_LABOR.VACACIONES.DIAS_POR_ANO
const MYPE = PERU_LABOR.MYPE
const INDEM = PERU_LABOR.INDEMNIZACION.INDEFINIDO
const VIDA_LEY = PERU_LABOR.SEGURO_VIDA_LEY
const BETA = RMV * PERU_LABOR.AGRARIO.BETA_PORCENTAJE
const MAX_DESCUENTO_SUBSANACION = PERU_LABOR.MULTAS_SUNAFIL.DESCUENTOS.SUBSANACION_VOLUNTARIA

// Sueldo de ejemplo usado en varias entradas (número redondo y fácil de seguir).
const SUELDO = 2000
const CTS_SEMESTRE = (SUELDO + SUELDO / 6) / 2
const MULTA_EJEMPLO_UIT = calcularMultaSunafil('PEQUENA', 'GRAVE', 8)
const MULTA_EJEMPLO_SOLES = calcularMultaSunafilSoles('PEQUENA', 'GRAVE', 8)
const INDEM_EJEMPLO_SUELDO = 3000
const INDEM_EJEMPLO_ANOS = 4

// ── Glosario ─────────────────────────────────────────────────────────────────

export const GLOSSARY: readonly GlossaryEntry[] = [
  // ── Beneficios y pagos ────────────────────────────────────────────────────
  {
    id: 'cts',
    term: 'CTS (Compensación por Tiempo de Servicios)',
    aliases: ['CTS', 'compensación por tiempo de servicios', 'depósito CTS'],
    categoria: 'beneficios',
    queEs:
      'Un ahorro que la empresa deposita para el trabajador en el banco que él elige. Le sirve de respaldo si se queda sin trabajo.',
    porQueImporta:
      'Si no la depositas completa y a tiempo, debes intereses y SUNAFIL puede multarte.',
    ejemplo: `Sueldo de ${solesCortos(SUELDO)} y 6 meses completos: (${solesCortos(SUELDO)} + 1/6 de la gratificación) ÷ 2 = ${solesCortos(CTS_SEMESTRE)}. En la microempresa no corresponde y en la pequeña empresa es la mitad.`,
    cuando: `Dos depósitos al año: hasta el ${DIA_CTS} de mayo y hasta el ${DIA_CTS} de noviembre.`,
    baseLegal: 'TUO de la Ley de CTS (D.S. 001-97-TR).',
    relacionados: ['gratificacion', 'liquidacion', 'regimen-mype'],
  },
  {
    id: 'gratificacion',
    term: 'Gratificación',
    aliases: ['gratificaciones', 'grati', 'gratificación de julio', 'gratificación de diciembre'],
    categoria: 'beneficios',
    queEs:
      'Un sueldo extra que se paga dos veces al año: en julio (Fiestas Patrias) y en diciembre (Navidad).',
    porQueImporta:
      'Es un derecho del trabajador. Si no la pagas completa y a tiempo, debes intereses y te expones a multa.',
    ejemplo: `Sueldo de ${solesCortos(SUELDO)} y semestre completo: recibe ${solesCortos(SUELDO)} de gratificación, más ${solesCortos(SUELDO * BONIF_EXT)} de bonificación extraordinaria (${pct(BONIF_EXT)}). Si trabajó menos meses, se paga en proporción.`,
    cuando: `Hasta el ${DIA_GRATI} de julio y hasta el ${DIA_GRATI} de diciembre.`,
    baseLegal: 'Ley 27735 y su reglamento (D.S. 005-2002-TR).',
    relacionados: ['bonificacion-extraordinaria', 'cts', 'regimen-mype'],
  },
  {
    id: 'bonificacion-extraordinaria',
    term: `Bonificación extraordinaria (${pct(BONIF_EXT)})`,
    aliases: ['bonificación extraordinaria', 'bonificación del 9 %', 'Ley 30334', 'bono de gratificación'],
    categoria: 'beneficios',
    queEs: `Un pago adicional del ${pct(BONIF_EXT)} de la gratificación que va directo al trabajador. Es lo que antes la empresa aportaba a EsSalud por la gratificación.`,
    porQueImporta:
      'Si la olvidas, la gratificación queda incompleta y el trabajador puede reclamar la diferencia.',
    ejemplo: `Gratificación de ${solesCortos(SUELDO)}: bonificación de ${solesCortos(SUELDO * BONIF_EXT)}. Si el trabajador está afiliado a una EPS, el porcentaje es menor (6.75 %).`,
    cuando: 'Se paga junto con cada gratificación, en julio y en diciembre.',
    baseLegal: 'Ley 30334.',
    relacionados: ['gratificacion', 'essalud'],
  },
  {
    id: 'vacaciones',
    term: 'Vacaciones',
    aliases: ['descanso vacacional', 'vacaciones anuales', 'récord vacacional'],
    categoria: 'beneficios',
    queEs: `Un descanso pagado de ${VACACIONES_DIAS} días por cada año completo de trabajo. En la micro y pequeña empresa son ${MYPE.MICRO.VACACIONES_DIAS} días.`,
    porQueImporta:
      'Si el trabajador no las goza a tiempo, la empresa debe pagar una indemnización adicional.',
    ejemplo:
      'Si ingresó el 1 de marzo de 2025 y cumplió los días de trabajo exigidos, desde el 1 de marzo de 2026 ya ganó sus vacaciones. Debe gozarlas antes del 1 de marzo de 2027.',
    cuando: 'Se ganan al cumplir cada año de trabajo y deben gozarse dentro del año siguiente.',
    baseLegal: 'D.Leg. 713 y su reglamento (D.S. 012-92-TR).',
    relacionados: ['vacaciones-truncas', 'indemnizacion-vacacional'],
  },
  {
    id: 'vacaciones-truncas',
    term: 'Vacaciones truncas',
    aliases: ['vacaciones proporcionales', 'récord trunco'],
    categoria: 'beneficios',
    queEs:
      'El pago por las vacaciones del tiempo trabajado que no llegó a un año completo, cuando el trabajador deja la empresa.',
    porQueImporta:
      'Es parte de la liquidación. Si no la pagas, el extrabajador puede reclamarla con intereses.',
    ejemplo: `Sueldo de ${solesCortos(2400)} y 5 meses desde su último aniversario: ${solesCortos(2400)} ÷ 12 × 5 = ${solesCortos((2400 / 12) * 5)}.`,
    cuando: 'Se pagan con la liquidación, si trabajó al menos un mes.',
    baseLegal: 'D.Leg. 713, artículo 22.',
    relacionados: ['vacaciones', 'liquidacion'],
  },
  {
    id: 'indemnizacion-vacacional',
    term: 'Indemnización vacacional (triple vacacional)',
    aliases: ['indemnización vacacional', 'triple vacacional', 'vacaciones no gozadas', 'vacaciones vencidas'],
    categoria: 'beneficios',
    queEs:
      'Si el trabajador no goza sus vacaciones dentro del año siguiente a ganarlas, la empresa le debe un sueldo más como indemnización. Por eso se habla de "triple vacacional".',
    porQueImporta:
      'Cuesta un sueldo extra por cada periodo vencido. Programar las vacaciones a tiempo lo evita.',
    ejemplo: `Sueldo de ${solesCortos(SUELDO)} y un periodo vencido sin gozar: además de lo normal, debes ${solesCortos(SUELDO)} de indemnización.`,
    cuando: 'Se genera cuando vence el año que había para gozar las vacaciones.',
    baseLegal: 'D.Leg. 713, artículo 23.',
    relacionados: ['vacaciones'],
  },
  {
    id: 'liquidacion',
    term: 'Liquidación de beneficios sociales',
    aliases: ['liquidación', 'beneficios sociales', 'pago final', 'finiquito'],
    categoria: 'beneficios',
    queEs:
      'El pago final cuando un trabajador deja la empresa. Suma lo que se le debe hasta su último día: CTS, gratificación y vacaciones pendientes.',
    porQueImporta:
      'Si no la pagas a tiempo, generas intereses y una posible multa. Además, el extrabajador puede demandarte.',
    ejemplo:
      'Incluye, por ejemplo, la CTS trunca, la gratificación trunca y las vacaciones truncas o pendientes. Si hubo despido sin causa justa, se agrega la indemnización.',
    cuando: 'Dentro de las 48 horas siguientes al cese.',
    baseLegal: 'D.S. 001-97-TR (CTS), Ley 27735 (gratificaciones) y D.Leg. 713 (vacaciones).',
    relacionados: ['cts', 'vacaciones-truncas', 'indemnizacion-despido'],
  },
  {
    id: 'indemnizacion-despido',
    term: 'Indemnización por despido arbitrario',
    aliases: ['indemnización por despido', 'despido arbitrario', 'despido injustificado', 'despido sin causa'],
    categoria: 'beneficios',
    queEs:
      'El pago que corresponde al trabajador cuando lo despides sin una causa justa prevista en la ley.',
    porQueImporta:
      'Es un monto alto. En algunos casos, el trabajador puede pedir que lo repongan en su puesto en vez de la indemnización.',
    ejemplo: `Régimen general: ${INDEM.FACTOR_POR_ANO} sueldos por año trabajado, con un máximo de ${INDEM.TOPE_SUELDOS} sueldos. Sueldo de ${solesCortos(INDEM_EJEMPLO_SUELDO)} y ${INDEM_EJEMPLO_ANOS} años: ${solesCortos(INDEM_EJEMPLO_SUELDO * INDEM.FACTOR_POR_ANO * INDEM_EJEMPLO_ANOS)}. En la micro y pequeña empresa el monto es menor.`,
    cuando: 'Se paga con la liquidación. El trabajador tiene un plazo corto (30 días) para demandar si no está de acuerdo con el despido.',
    baseLegal: 'TUO del D.Leg. 728 (D.S. 003-97-TR), artículos 34 y 38.',
    relacionados: ['periodo-de-prueba', 'liquidacion', 'regimen-general'],
  },
  {
    id: 'asignacion-familiar',
    term: 'Asignación familiar',
    aliases: ['asig. familiar', 'asignación por hijos'],
    categoria: 'beneficios',
    queEs: `Un pago mensual del ${pct(PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE)} de la RMV para el trabajador que tiene hijos menores de 18 años, o hasta 24 si siguen estudios superiores.`,
    porQueImporta:
      'Si le corresponde y no la pagas, debes los montos atrasados y te expones a multa.',
    ejemplo: `Hoy equivale a ${solesCortos(ASIG_FAM)} al mes (${pct(PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE)} de ${solesCortos(RMV)}). Es el mismo monto aunque tenga varios hijos.`,
    cuando: 'Cada mes, con el sueldo, desde que el trabajador acredita a sus hijos.',
    baseLegal: 'Ley 25129 y su reglamento (D.S. 035-90-TR).',
    relacionados: ['rmv'],
  },

  // ── Valores de referencia ─────────────────────────────────────────────────
  {
    id: 'rmv',
    term: 'RMV (Remuneración Mínima Vital)',
    aliases: ['RMV', 'remuneración mínima vital', 'sueldo mínimo', 'salario mínimo'],
    categoria: 'valores',
    queEs: `El sueldo mínimo mensual para una jornada completa. Hoy es ${solesCortos(RMV)}.`,
    porQueImporta:
      'Pagar menos es una infracción. Además, varios beneficios se calculan con ella, como la asignación familiar.',
    ejemplo: `Jornada completa: mínimo ${solesCortos(RMV)} al mes. La asignación familiar es el ${pct(PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE)}: ${solesCortos(ASIG_FAM)}.`,
    cuando: 'Cambia solo cuando el Gobierno la sube por decreto supremo.',
    baseLegal: 'Constitución, artículo 24. El monto lo fija el Gobierno por decreto supremo.',
    relacionados: ['asignacion-familiar', 'uit'],
  },
  {
    id: 'uit',
    term: 'UIT (Unidad Impositiva Tributaria)',
    aliases: ['UIT', 'unidad impositiva tributaria'],
    categoria: 'valores',
    queEs: `Un valor de referencia que el Estado fija cada año para calcular multas, impuestos y límites. En 2026 es ${solesCortos(UIT)}.`,
    porQueImporta:
      'Las multas de SUNAFIL se expresan en UIT: si la UIT sube, la multa en soles también sube.',
    ejemplo: `Una multa de 2 UIT equivale a ${solesCortos(2 * UIT)}.`,
    cuando: 'Se actualiza cada año, desde enero.',
    baseLegal: 'La fija el Ministerio de Economía y Finanzas cada año por decreto supremo.',
    relacionados: ['multa-sunafil', 'rmv'],
  },

  // ── Regímenes laborales ───────────────────────────────────────────────────
  {
    id: 'regimen-general',
    term: 'Régimen general',
    aliases: ['régimen común', 'D.Leg. 728', 'régimen laboral general', 'régimen privado'],
    categoria: 'regimenes',
    queEs:
      'Las reglas laborales comunes de la actividad privada. Se aplican si tu empresa no está en un régimen especial, como el MYPE o el agrario.',
    porQueImporta: `Da los beneficios completos: CTS, dos gratificaciones, ${VACACIONES_DIAS} días de vacaciones e indemnización por despido arbitrario.`,
    ejemplo: `Indemnización por despido arbitrario: ${INDEM.FACTOR_POR_ANO} sueldos por año trabajado, hasta ${INDEM.TOPE_SUELDOS} sueldos.`,
    baseLegal: 'D.Leg. 728 (TUO aprobado por D.S. 003-97-TR).',
    relacionados: ['regimen-mype', 'cts', 'gratificacion'],
  },
  {
    id: 'regimen-mype',
    term: 'Régimen MYPE (micro y pequeña empresa)',
    aliases: ['MYPE', 'microempresa', 'pequeña empresa', 'régimen especial MYPE', 'Ley 32353'],
    categoria: 'regimenes',
    queEs:
      'Un régimen laboral con beneficios reducidos para micro y pequeñas empresas inscritas en el REMYPE.',
    porQueImporta:
      'Solo puedes aplicarlo con una inscripción vigente en el REMYPE. Sin ella, corresponden los beneficios del régimen general.',
    ejemplo: `Microempresa: sin CTS ni gratificaciones y ${MYPE.MICRO.VACACIONES_DIAS} días de vacaciones. Pequeña empresa: CTS y gratificaciones a la mitad y ${MYPE.PEQUENA.VACACIONES_DIAS} días de vacaciones.`,
    cuando:
      'Desde que la empresa está inscrita en el REMYPE. Consulta con tu asesor antes de aplicarlo a quienes ya estaban en planilla.',
    baseLegal: 'Ley 32353 (Ley MYPE de 2025).',
    relacionados: ['remype', 'regimen-general'],
  },
  {
    id: 'remype',
    term: 'REMYPE',
    aliases: ['REMYPE', 'Registro Nacional de la Micro y Pequeña Empresa', 'registro MYPE'],
    categoria: 'regimenes',
    queEs:
      'El registro del Ministerio de Trabajo donde se inscriben las micro y pequeñas empresas. Es el requisito para usar el régimen laboral MYPE.',
    porQueImporta:
      'Sin inscripción vigente, tus trabajadores tienen los beneficios del régimen general, aunque tu empresa sea pequeña.',
    ejemplo: `Microempresa: ventas de hasta ${MYPE.MICRO.VENTAS_MAX_UIT_ANUALES} UIT al año (${solesCortos(MYPE.MICRO.VENTAS_MAX_UIT_ANUALES * UIT)}). Pequeña empresa: hasta ${MYPE.PEQUENA.VENTAS_MAX_UIT_ANUALES.toLocaleString('en-US')} UIT (${solesCortos(MYPE.PEQUENA.VENTAS_MAX_UIT_ANUALES * UIT)}).`,
    cuando: 'Antes de aplicar el régimen MYPE. Revisa que la inscripción siga vigente.',
    baseLegal: 'Ley 32353 (Ley MYPE de 2025).',
    relacionados: ['regimen-mype', 'uit'],
  },
  {
    id: 'regimen-agrario',
    term: 'Régimen agrario',
    aliases: ['agrario', 'Ley 31110', 'agroexportación', 'agroindustria', 'BETA'],
    categoria: 'regimenes',
    queEs:
      'Un régimen especial para trabajadores de actividades agrarias, agroexportadoras y agroindustriales.',
    porQueImporta:
      'Tiene reglas propias: la CTS y las gratificaciones pueden pagarse dentro de la remuneración diaria, y se suma una bonificación especial llamada BETA.',
    ejemplo: `La BETA equivale al ${pct(PERU_LABOR.AGRARIO.BETA_PORCENTAJE)} de la RMV: hoy ${solesCortos(BETA)} al mes. El aporte a EsSalud también tiene una tasa especial.`,
    baseLegal: 'Ley 31110 y su reglamento.',
    relacionados: ['regimen-general', 'rmv'],
  },
  {
    id: 'construccion-civil',
    term: 'Construcción civil',
    aliases: ['régimen de construcción civil', 'obreros de construcción', 'BUC', 'jornal de construcción'],
    categoria: 'regimenes',
    queEs:
      'Un régimen especial para obreros de obras de construcción. Sus jornales y beneficios se fijan en el convenio colectivo del sector.',
    porQueImporta:
      'Se paga por jornal (por día) y con bonificaciones propias, como la BUC. Usar las reglas del régimen general da montos equivocados.',
    ejemplo:
      'Un operario, un oficial y un peón tienen jornales distintos, fijados en el convenio vigente.',
    cuando: 'Los jornales se actualizan cuando se firma un nuevo convenio, por lo general cada año.',
    baseLegal:
      'Convenio colectivo de construcción civil (CAPECO y la Federación de Trabajadores en Construcción Civil) y normas del sector.',
    relacionados: ['sctr', 'regimen-general'],
  },

  // ── Planilla y documentos ─────────────────────────────────────────────────
  {
    id: 'planilla-electronica',
    term: 'Planilla electrónica',
    aliases: ['planilla', 'estar en planilla', 'planillas'],
    categoria: 'planilla',
    queEs:
      'El registro oficial de tus trabajadores y de lo que les pagas, que se presenta a SUNAT. Tiene dos partes: el T-Registro y la PLAME.',
    porQueImporta:
      'Un trabajador fuera de planilla es informal: SUNAFIL puede multarte y acumulas deudas por aportes de salud y pensión.',
    ejemplo:
      'Al contratar a alguien, lo registras en el T-Registro. Luego, cada mes, declaras su sueldo y aportes en la PLAME.',
    cuando: 'Alta en el T-Registro hasta el día en que empieza a trabajar. PLAME cada mes.',
    baseLegal: 'D.S. 018-2007-TR y sus modificatorias.',
    relacionados: ['t-registro', 'plame', 'boleta-de-pago'],
  },
  {
    id: 't-registro',
    term: 'T-Registro',
    aliases: ['T-REGISTRO', 'registro de información laboral', 'alta de trabajador'],
    categoria: 'planilla',
    queEs:
      'La parte de la planilla electrónica donde registras a cada trabajador: sus datos, contrato, régimen, seguro de salud y sistema de pensiones.',
    porQueImporta:
      'Es la prueba de que tu trabajador es formal. Si no lo registras a tiempo, SUNAFIL puede multarte.',
    ejemplo:
      'Si Ana empieza a trabajar un lunes, debes darla de alta en el T-Registro como máximo ese mismo lunes.',
    cuando: 'Alta: hasta el día en que empieza a trabajar. Baja: hasta el día hábil siguiente al cese.',
    baseLegal: 'D.S. 018-2007-TR (planilla electrónica) y sus modificatorias.',
    relacionados: ['planilla-electronica', 'plame'],
  },
  {
    id: 'plame',
    term: 'PLAME (Planilla Mensual de Pagos)',
    aliases: ['PLAME', 'planilla mensual de pagos', 'PDT PLAME'],
    categoria: 'planilla',
    queEs:
      'La declaración mensual que presentas a SUNAT con los sueldos, descuentos y aportes de tus trabajadores (EsSalud, ONP, renta de quinta categoría).',
    porQueImporta:
      'Si no la presentas o declaras mal, SUNAT puede multarte y los aportes de tus trabajadores quedan mal registrados.',
    ejemplo:
      'La planilla de marzo se declara y paga en abril, en la fecha que te toca según el último dígito de tu RUC.',
    cuando: 'Cada mes, según el cronograma de SUNAT.',
    baseLegal: 'D.S. 018-2007-TR y normas de SUNAT.',
    relacionados: ['planilla-electronica', 'essalud', 'onp'],
  },
  {
    id: 'boleta-de-pago',
    term: 'Boleta de pago',
    aliases: ['boleta', 'boletas', 'recibo de sueldo'],
    categoria: 'planilla',
    queEs:
      'El documento que muestra cuánto se pagó al trabajador en el mes: sueldo, descuentos y aportes.',
    porQueImporta:
      'Debes entregarla y guardar la constancia de entrega. Si no lo haces, SUNAFIL puede multarte.',
    ejemplo:
      'Si pagas el sueldo el día 30, entrega la boleta hasta el tercer día hábil siguiente. Puede ser electrónica.',
    cuando: 'A más tardar el tercer día hábil después del pago.',
    baseLegal: 'D.S. 001-98-TR. La boleta electrónica está permitida por el D.Leg. 1310.',
    relacionados: ['planilla-electronica', 'legajo'],
  },
  {
    id: 'legajo',
    term: 'Legajo del trabajador',
    aliases: ['legajo digital', 'file del trabajador', 'expediente del trabajador'],
    categoria: 'planilla',
    queEs:
      'La carpeta con los documentos de cada trabajador: DNI, contrato, boletas, constancias de entrega y capacitaciones, entre otros.',
    porQueImporta:
      'En una inspección, SUNAFIL te pide estos documentos. Si no los tienes, te será difícil demostrar que cumpliste.',
    ejemplo:
      'Para probar que entregaste el EPP, guarda en el legajo la constancia firmada por el trabajador.',
    cuando: 'Se arma desde el ingreso y se actualiza durante toda la relación laboral.',
    baseLegal:
      'No hay una sola norma: cada documento viene de una obligación distinta (contratos, boletas, SST, entre otras).',
    relacionados: ['boleta-de-pago', 'epp', 'inspeccion'],
  },

  // ── Contratos ─────────────────────────────────────────────────────────────
  {
    id: 'contrato-indefinido',
    term: 'Contrato a plazo indeterminado',
    aliases: ['contrato indefinido', 'plazo indeterminado', 'contrato permanente', 'indefinido'],
    categoria: 'contratos',
    queEs: 'Un contrato sin fecha de término. Es la forma normal de contratar en el Perú.',
    porQueImporta:
      'Si un contrato temporal no cumple los requisitos, la ley lo trata como indeterminado.',
    ejemplo:
      'Puede ser verbal o escrito, pero conviene tenerlo por escrito para probar las condiciones pactadas.',
    baseLegal: 'TUO del D.Leg. 728 (D.S. 003-97-TR), artículo 4.',
    relacionados: ['contrato-plazo-fijo', 'desnaturalizacion'],
  },
  {
    id: 'contrato-plazo-fijo',
    term: 'Contrato a plazo fijo (sujeto a modalidad)',
    aliases: ['plazo fijo', 'contrato modal', 'contrato sujeto a modalidad', 'contrato temporal'],
    categoria: 'contratos',
    queEs:
      'Un contrato con fecha de término. Solo se permite por causas concretas, como inicio de actividad, necesidad del mercado, obra determinada o suplencia.',
    porQueImporta:
      'Debe ser escrito y explicar la causa. Si no la cumple, se puede convertir en un contrato indeterminado.',
    ejemplo:
      'Sumando renovaciones, los contratos temporales con un mismo trabajador pueden durar como máximo 5 años.',
    cuando:
      'Presenta una copia al Ministerio de Trabajo dentro de los 15 días naturales de firmado.',
    baseLegal: 'TUO del D.Leg. 728 (D.S. 003-97-TR), artículos 53 al 83.',
    relacionados: ['contrato-indefinido', 'desnaturalizacion'],
  },
  {
    id: 'periodo-de-prueba',
    term: 'Periodo de prueba',
    aliases: ['período de prueba', 'prueba', 'meses de prueba'],
    categoria: 'contratos',
    queEs:
      'Los primeros meses de trabajo, en los que el trabajador todavía no tiene protección contra el despido arbitrario.',
    porQueImporta:
      'Pasado ese tiempo, si despides sin causa justa, debes pagar indemnización.',
    ejemplo:
      'Lo normal son 3 meses. Se puede ampliar por escrito: hasta 6 meses para personal calificado o de confianza, y hasta 1 año para personal de dirección.',
    cuando: 'Corre desde el primer día de trabajo.',
    baseLegal: 'TUO del D.Leg. 728 (D.S. 003-97-TR), artículo 10.',
    relacionados: ['indemnizacion-despido', 'contrato-indefinido'],
  },
  {
    id: 'locacion-de-servicios',
    term: 'Locación de servicios',
    aliases: ['locación', 'recibo por honorarios', 'honorarios', 'prestador de servicios', 'servicios independientes'],
    categoria: 'contratos',
    queEs:
      'Un contrato civil para servicios independientes. La persona emite recibo por honorarios y no está en planilla.',
    porQueImporta:
      'Si en la práctica cumple horario, recibe órdenes y cobra un monto fijo, es un trabajador: SUNAFIL o un juez pueden exigirte beneficios y aportes.',
    ejemplo:
      'Un contador externo que atiende a varias empresas con sus propios horarios: es locación. Una recepcionista con horario fijo: es trabajadora y debe estar en planilla.',
    baseLegal: 'Código Civil, artículos 1764 y siguientes.',
    relacionados: ['desnaturalizacion', 'planilla-electronica'],
  },
  {
    id: 'desnaturalizacion',
    term: 'Desnaturalización del contrato',
    aliases: ['desnaturalización', 'contrato desnaturalizado', 'primacía de la realidad'],
    categoria: 'contratos',
    queEs:
      'Cuando un contrato no se usó como manda la ley y se considera, en realidad, un contrato de trabajo a plazo indeterminado.',
    porQueImporta:
      'El trabajador pasa a tener estabilidad y todos los beneficios desde el inicio, con los pagos atrasados.',
    ejemplo:
      'Un contrato temporal que sigue después de su fecha de término, sin renovarse por escrito, se vuelve indeterminado.',
    baseLegal:
      'TUO del D.Leg. 728 (D.S. 003-97-TR), artículo 77, y el principio de primacía de la realidad.',
    relacionados: ['contrato-plazo-fijo', 'locacion-de-servicios'],
  },

  // ── Seguros y pensiones ───────────────────────────────────────────────────
  {
    id: 'sctr',
    term: 'SCTR (Seguro Complementario de Trabajo de Riesgo)',
    aliases: ['SCTR', 'seguro complementario de trabajo de riesgo', 'seguro de riesgo'],
    categoria: 'seguros',
    queEs:
      'Un seguro obligatorio para quienes hacen actividades de riesgo, como construcción, minería o ciertas industrias. Cubre salud y pensión ante un accidente de trabajo o una enfermedad profesional.',
    porQueImporta:
      'Si no lo contratas y ocurre un accidente, la empresa responde por la atención y la pensión. Además, es una infracción ante SUNAFIL.',
    ejemplo:
      'Un obrero de obra necesita SCTR de salud y de pensión. Una persona que trabaja solo en oficina, sin exposición al riesgo, por lo general no.',
    cuando: 'Desde el primer día en que el trabajador hace la actividad de riesgo.',
    baseLegal:
      'Ley 26790 y D.S. 003-98-SA. Las actividades de riesgo están en el Anexo 5 del D.S. 009-97-SA.',
    relacionados: ['essalud', 'sst'],
  },
  {
    id: 'essalud',
    term: 'EsSalud',
    aliases: ['ESSALUD', 'seguro social de salud', 'aporte de salud'],
    categoria: 'seguros',
    queEs: `El seguro de salud público para los trabajadores en planilla y sus familias. Lo paga la empresa: ${pct(ESSALUD)} del sueldo.`,
    porQueImporta:
      'Si no declaras y pagas el aporte, acumulas deuda con intereses y tu trabajador puede tener problemas para atenderse.',
    ejemplo: `Sueldo de ${solesCortos(SUELDO)}: la empresa aporta ${solesCortos(SUELDO * ESSALUD)} al mes. No se descuenta al trabajador. La base mínima es la RMV, así que el aporte mínimo es ${solesCortos(RMV * ESSALUD)}.`,
    cuando: 'Cada mes, con la PLAME.',
    baseLegal: 'Ley 26790. Algunos regímenes, como el agrario, tienen una tasa distinta.',
    relacionados: ['essalud-vida', 'plame', 'sctr'],
  },
  {
    id: 'essalud-vida',
    term: 'EsSalud +Vida',
    aliases: ['+Vida', 'EsSalud más vida', 'seguro más vida'],
    categoria: 'seguros',
    queEs:
      'Un seguro voluntario de EsSalud contra accidentes personales. No es obligatorio para la empresa.',
    porQueImporta:
      'Si el trabajador se afilió, la empresa descuenta la prima de su sueldo y la declara en la PLAME. Si no se afilió, no lo marques.',
    ejemplo:
      'Paga una indemnización si el asegurado fallece o queda con invalidez permanente por un accidente.',
    cuando: 'Solo si el trabajador decidió afiliarse.',
    baseLegal: 'Seguro voluntario ofrecido por EsSalud.',
    relacionados: ['essalud', 'seguro-vida-ley'],
  },
  {
    id: 'afp',
    term: 'AFP (Sistema Privado de Pensiones)',
    aliases: ['AFP', 'SPP', 'sistema privado de pensiones', 'administradora de fondos de pensiones'],
    categoria: 'seguros',
    queEs:
      'Empresas privadas que administran el fondo de jubilación de cada trabajador en una cuenta individual.',
    porQueImporta:
      'La empresa retiene el aporte del sueldo y lo paga a la AFP. Si no lo paga a tiempo, cae en mora y debe intereses.',
    ejemplo: `Sueldo de ${solesCortos(SUELDO)}: ${pct(AFP_APORTE)} va al fondo (${solesCortos(SUELDO * AFP_APORTE)}), más la prima de seguro y la comisión de la AFP.`,
    cuando: 'Se paga en los primeros 5 días hábiles del mes siguiente.',
    baseLegal: 'TUO de la Ley del Sistema Privado de Pensiones (D.S. 054-97-EF).',
    relacionados: ['onp', 'cuspp'],
  },
  {
    id: 'onp',
    term: 'ONP (Sistema Nacional de Pensiones)',
    aliases: ['ONP', 'SNP', 'sistema nacional de pensiones', 'D.Ley 19990'],
    categoria: 'seguros',
    queEs: `El sistema público de pensiones. El trabajador aporta ${pct(ONP)} de su sueldo a un fondo común del Estado.`,
    porQueImporta: `La empresa retiene el ${pct(ONP)} y lo declara y paga con la PLAME. Si no lo hace, genera deuda con SUNAT.`,
    ejemplo: `Sueldo de ${solesCortos(SUELDO)}: descuento ONP de ${solesCortos(SUELDO * ONP)}.`,
    cuando: 'Cada mes, con la PLAME.',
    baseLegal: 'D.Ley 19990.',
    relacionados: ['afp', 'plame'],
  },
  {
    id: 'cuspp',
    term: 'CUSPP',
    aliases: ['CUSPP', 'código único del sistema privado de pensiones', 'código AFP'],
    categoria: 'seguros',
    queEs:
      'El código único de 12 caracteres que identifica al trabajador en el Sistema Privado de Pensiones (AFP).',
    porQueImporta: 'Lo necesitas para declarar y pagar sus aportes a la AFP correcta.',
    ejemplo:
      'Tiene 12 caracteres, entre números y letras. Está en la constancia de afiliación o en la web de la AFP.',
    cuando: 'Pídelo al ingreso del trabajador. Si no lo tienes a la mano, puedes completarlo después.',
    baseLegal: 'TUO de la Ley del Sistema Privado de Pensiones (D.S. 054-97-EF).',
    relacionados: ['afp'],
  },
  {
    id: 'seguro-vida-ley',
    term: 'Seguro Vida Ley',
    aliases: ['vida ley', 'seguro de vida ley', 'seguro de vida', 'D.Leg. 688'],
    categoria: 'seguros',
    queEs:
      'Un seguro de vida que la empresa debe contratar y pagar para cada trabajador en planilla.',
    porQueImporta:
      'Si un trabajador fallece sin seguro, la empresa debe pagar a sus beneficiarios lo que habría pagado la aseguradora.',
    ejemplo: `Sueldo de ${solesCortos(SUELDO)}: por muerte natural, sus beneficiarios reciben ${VIDA_LEY.COBERTURA_MINIMA_SUELDOS} sueldos (${solesCortos(SUELDO * VIDA_LEY.COBERTURA_MINIMA_SUELDOS)}). Por muerte accidental, ${VIDA_LEY.COBERTURA_ACCIDENTE_SUELDOS} sueldos (${solesCortos(SUELDO * VIDA_LEY.COBERTURA_ACCIDENTE_SUELDOS)}).`,
    cuando: 'Desde el primer día de trabajo.',
    baseLegal: 'D.Leg. 688, modificado por el D.U. 044-2019.',
    relacionados: ['essalud-vida', 'sctr'],
  },

  // ── Seguridad y salud en el trabajo ───────────────────────────────────────
  {
    id: 'sst',
    term: 'SST (Seguridad y Salud en el Trabajo)',
    aliases: ['SST', 'seguridad y salud en el trabajo', 'seguridad ocupacional', 'Ley 29783'],
    categoria: 'sst',
    queEs:
      'Las reglas para prevenir accidentes y enfermedades en el trabajo: identificar riesgos, capacitar, entregar equipos de protección y registrar incidentes.',
    porQueImporta:
      'Aplica a todas las empresas, incluso las pequeñas, y es una de las áreas que más revisa SUNAFIL.',
    ejemplo:
      'Incluye tener una política de SST, la matriz IPERC, exámenes médicos y al menos 4 capacitaciones al año.',
    cuando: 'Es permanente. Algunas tareas son anuales, como el plan anual de SST.',
    baseLegal: 'Ley 29783 y su reglamento (D.S. 005-2012-TR).',
    relacionados: ['iperc', 'comite-sst', 'emo', 'epp'],
  },
  {
    id: 'comite-sst',
    term: 'Comité de SST',
    aliases: ['comité de seguridad y salud en el trabajo', 'CSST', 'comité paritario'],
    categoria: 'sst',
    queEs:
      'Un grupo con representantes de la empresa y de los trabajadores, en igual número, que vigila la seguridad y salud en el trabajo.',
    porQueImporta:
      'Es obligatorio si tienes 20 trabajadores o más. Si no lo conformas, SUNAFIL puede multarte.',
    ejemplo:
      'Con 30 trabajadores, el comité debe tener al menos 4 miembros: 2 de la empresa y 2 elegidos por los trabajadores.',
    cuando: 'El mandato dura entre 1 y 2 años. Se reúne una vez al mes.',
    baseLegal: 'Ley 29783 (artículo 29) y D.S. 005-2012-TR.',
    relacionados: ['supervisor-sst', 'sst'],
  },
  {
    id: 'supervisor-sst',
    term: 'Supervisor de SST',
    aliases: ['supervisor de seguridad y salud en el trabajo', 'supervisor de seguridad'],
    categoria: 'sst',
    queEs:
      'La persona que eligen los trabajadores para vigilar la seguridad y salud cuando la empresa tiene menos de 20 trabajadores.',
    porQueImporta: 'Reemplaza al comité en empresas pequeñas. Si no lo tienes, incumples la ley de SST.',
    ejemplo: 'Una empresa de 12 trabajadores elige a un supervisor de SST en vez de formar un comité.',
    cuando: 'Lo eligen los trabajadores. El mandato dura entre 1 y 2 años.',
    baseLegal: 'Ley 29783, artículo 30.',
    relacionados: ['comite-sst', 'sst'],
  },
  {
    id: 'iperc',
    term: 'IPERC',
    aliases: ['IPERC', 'matriz IPERC', 'identificación de peligros', 'evaluación de riesgos', 'matriz de riesgos'],
    categoria: 'sst',
    queEs:
      'La matriz donde identificas los peligros de cada puesto, evalúas qué tan graves son y defines cómo controlarlos. Son las siglas de Identificación de Peligros, Evaluación de Riesgos y Control.',
    porQueImporta:
      'Es la base del sistema de SST. Sin IPERC, no puedes demostrar que previniste los riesgos.',
    ejemplo: 'Peligro: piso mojado. Riesgo: caída. Control: señal de advertencia y limpieza programada.',
    cuando:
      'Actualízala al menos una vez al año y cada vez que cambien los puestos o las máquinas, o haya un accidente.',
    baseLegal: 'Ley 29783, D.S. 005-2012-TR y R.M. 050-2013-TR (formatos referenciales).',
    relacionados: ['sst', 'epp'],
  },
  {
    id: 'emo',
    term: 'EMO (Examen Médico Ocupacional)',
    aliases: ['EMO', 'examen médico ocupacional', 'examen ocupacional', 'examen preocupacional', 'examen de retiro'],
    categoria: 'sst',
    queEs:
      'Exámenes que evalúan si la salud del trabajador es compatible con su puesto. Los paga la empresa, que solo recibe el resultado de aptitud, no el diagnóstico.',
    porQueImporta:
      'Ayudan a detectar a tiempo enfermedades causadas por el trabajo. No hacerlos es una infracción de SST.',
    ejemplo:
      'En actividades de alto riesgo, el examen se hace al ingresar, durante el trabajo y al terminar la relación laboral.',
    cuando: 'Como mínimo cada 2 años.',
    baseLegal: 'Ley 29783, artículo 49, literal d.',
    relacionados: ['sst'],
  },
  {
    id: 'epp',
    term: 'EPP (Equipo de Protección Personal)',
    aliases: ['EPP', 'equipo de protección personal', 'equipos de protección'],
    categoria: 'sst',
    queEs:
      'Los equipos que protegen al trabajador de un riesgo: casco, guantes, lentes, botas, mascarilla o arnés, entre otros. La empresa los entrega sin costo.',
    porQueImporta:
      'Si no los entregas o no registras la entrega, eres responsable si ocurre un accidente.',
    ejemplo: 'Al entregar un casco, anota la fecha y pide la firma del trabajador. Así pruebas que cumpliste.',
    cuando: 'Al ingreso y cada vez que se desgasten o se dañen.',
    baseLegal: 'Ley 29783 (artículo 60) y D.S. 005-2012-TR.',
    relacionados: ['iperc', 'legajo'],
  },

  // ── Reglas internas ───────────────────────────────────────────────────────
  {
    id: 'rit',
    term: 'RIT (Reglamento Interno de Trabajo)',
    aliases: ['RIT', 'reglamento interno de trabajo', 'reglamento interno'],
    categoria: 'convivencia',
    queEs:
      'El documento con las reglas internas de la empresa: horarios, permisos, faltas, sanciones y derechos.',
    porQueImporta:
      'Es obligatorio si tienes más de 100 trabajadores. Sin reglas claras, es más difícil sancionar faltas de forma válida.',
    ejemplo:
      'Indica la hora de ingreso, cómo pedir permisos y qué sanción corresponde a cada falta. No lo confundas con el reglamento interno de SST, obligatorio desde 20 trabajadores.',
    cuando: 'Al superar los 100 trabajadores. Preséntalo al Ministerio de Trabajo y entrega una copia a cada trabajador.',
    baseLegal: 'D.S. 039-91-TR.',
    relacionados: ['sst', 'hostigamiento-sexual'],
  },
  {
    id: 'hostigamiento-sexual',
    term: 'Hostigamiento sexual',
    aliases: ['hostigamiento', 'acoso sexual', 'Ley 27942', 'comité de intervención'],
    categoria: 'convivencia',
    queEs:
      'Conductas de naturaleza sexual no deseadas que crean un ambiente intimidatorio u ofensivo en el trabajo.',
    porQueImporta:
      'La empresa debe prevenirlo, tener un canal de denuncias y actuar rápido. Si no lo hace, se expone a multas altas de SUNAFIL.',
    ejemplo:
      'Con 20 trabajadores o más, necesitas un comité de intervención; con menos, un delegado. Al recibir una queja, debes dar medidas de protección a la víctima.',
    cuando: 'Las medidas de protección se dan en un máximo de 3 días hábiles desde la queja.',
    baseLegal: 'Ley 27942 y su reglamento (D.S. 014-2019-MIMP).',
    relacionados: ['rit'],
  },

  // ── SUNAFIL e inspecciones ────────────────────────────────────────────────
  {
    id: 'sunafil',
    term: 'SUNAFIL',
    aliases: ['SUNAFIL', 'Superintendencia Nacional de Fiscalización Laboral', 'inspector de trabajo'],
    categoria: 'sunafil',
    queEs:
      'La entidad del Estado que fiscaliza el cumplimiento de las normas laborales y de SST. Puede inspeccionar y multar.',
    porQueImporta:
      'Una inspección puede terminar en multas en UIT que suben según la gravedad y el número de trabajadores afectados.',
    ejemplo: 'Puede llegar por la denuncia de un trabajador, por un operativo o por decisión propia de SUNAFIL.',
    cuando: 'En cualquier momento. No necesita avisarte antes.',
    baseLegal: 'Ley 29981 (creación de SUNAFIL) y Ley 28806 (Ley General de Inspección del Trabajo).',
    relacionados: ['inspeccion', 'multa-sunafil'],
  },
  {
    id: 'inspeccion',
    term: 'Inspección de trabajo',
    aliases: ['inspección', 'fiscalización laboral', 'visita inspectiva', 'actuaciones inspectivas'],
    categoria: 'sunafil',
    queEs:
      'La revisión que hace un inspector de SUNAFIL, en tu centro de trabajo o de forma virtual, para verificar si cumples.',
    porQueImporta:
      'Si no muestras los documentos que te piden, el inspector puede considerar que no cumpliste.',
    ejemplo:
      'El inspector te pide boletas, contratos y registros de SST, y te da un plazo para presentarlos.',
    cuando: 'La investigación dura como máximo 30 días hábiles, que pueden ampliarse.',
    baseLegal: 'Ley 28806 y su reglamento (D.S. 019-2006-TR).',
    relacionados: ['acta-de-infraccion', 'subsanacion', 'legajo'],
  },
  {
    id: 'acta-de-infraccion',
    term: 'Acta de infracción',
    aliases: ['acta', 'acta de inspección', 'procedimiento sancionador'],
    categoria: 'sunafil',
    queEs:
      'El documento que emite el inspector cuando encuentra incumplimientos que no se corrigieron. Con ella empieza el procedimiento para multarte.',
    porQueImporta:
      'Después del acta, la multa es probable. Todavía puedes presentar descargos y subsanar para reducirla.',
    ejemplo:
      'Si no corriges una falta después del requerimiento del inspector, se emite el acta y se inicia el procedimiento sancionador.',
    cuando: 'Tienes un plazo para presentar descargos, que se indica en la notificación.',
    baseLegal: 'Ley 28806 y D.S. 019-2006-TR.',
    relacionados: ['subsanacion', 'multa-sunafil'],
  },
  {
    id: 'subsanacion',
    term: 'Subsanación',
    aliases: ['subsanar', 'corregir la infracción', 'medida de requerimiento', 'descuento de multa'],
    categoria: 'sunafil',
    queEs:
      'Corregir un incumplimiento laboral. Si lo haces a tiempo, la multa puede no llegar o bajar mucho.',
    porQueImporta: `Corregir cuando el inspector te lo pide puede evitar el acta. Después del acta, la ley prevé descuentos de hasta ${pct(MAX_DESCUENTO_SUBSANACION)}, según el momento.`,
    ejemplo:
      'Si el inspector detecta boletas sin entregar y las entregas dentro del plazo que te da, evitas que esa falta pase al acta.',
    cuando: 'Mientras antes, mejor: idealmente apenas el inspector te lo pide.',
    baseLegal: 'Ley 28806 (artículo 40) y D.S. 019-2006-TR.',
    relacionados: ['acta-de-infraccion', 'multa-sunafil'],
  },
  {
    id: 'multa-sunafil',
    term: 'Multa SUNAFIL',
    aliases: ['multa', 'multas', 'sanción', 'infracción leve', 'infracción grave', 'infracción muy grave'],
    categoria: 'sunafil',
    queEs:
      'La sanción económica por incumplir normas laborales. Se calcula en UIT según la gravedad (leve, grave o muy grave), el tamaño de la empresa y los trabajadores afectados.',
    porQueImporta:
      'Crece rápido: una misma falta que afecta a muchos trabajadores cuesta mucho más. Si reincides, la multa aumenta.',
    ejemplo: `Pequeña empresa, infracción grave que afecta a 8 trabajadores: ${MULTA_EJEMPLO_UIT} UIT, es decir, ${solesCortos(MULTA_EJEMPLO_SOLES)}.`,
    cuando: 'Se impone al final del procedimiento sancionador, después del acta de infracción.',
    baseLegal: 'Ley 28806 y su reglamento (D.S. 019-2006-TR), con sus modificatorias.',
    relacionados: ['uit', 'subsanacion', 'sunafil'],
  },
]

// ── Búsqueda ─────────────────────────────────────────────────────────────────

/** Minúsculas, sin tildes ni diéresis, espacios simples. "Gratificación" → "gratificacion". */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Forma compacta para comparar siglas: "T-Registro" → "tregistro", "+Vida" → "vida". */
export function compactKey(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9ñ]/g, '')
}

export const GLOSSARY_BY_ID: ReadonlyMap<string, GlossaryEntry> = new Map(
  GLOSSARY.map((entry) => [entry.id, entry]),
)

const KEY_INDEX: ReadonlyMap<string, GlossaryEntry> = (() => {
  const index = new Map<string, GlossaryEntry>()
  for (const entry of GLOSSARY) {
    for (const key of [entry.id, entry.term, ...entry.aliases]) {
      const k = compactKey(key)
      if (k && !index.has(k)) index.set(k, entry)
    }
  }
  return index
})()

/** Busca un término por id, nombre o alias (ignora tildes, mayúsculas y signos). */
export function getTerm(idOrAlias: string | null | undefined): GlossaryEntry | undefined {
  if (!idOrAlias) return undefined
  return GLOSSARY_BY_ID.get(idOrAlias) ?? KEY_INDEX.get(compactKey(idOrAlias))
}

/** Palabras de un texto ya normalizado: "t-registro (alta)" → ["t", "registro", "alta"]. */
function words(normalized: string): string[] {
  return normalized.split(/[^a-z0-9]+/).filter(Boolean)
}

/** Cada palabra buscada es el inicio de alguna palabra del texto ("grati" → "gratificacion"). */
function allTokensPrefix(tokens: string[], textWords: string[]): boolean {
  return tokens.every((t) => textWords.some((w) => w.startsWith(t)))
}

/**
 * Busca en el glosario sin importar tildes, mayúsculas ni signos. Cada palabra
 * buscada debe ser el inicio de una palabra del término (así "vida" no
 * encuentra "actividad"). Ordena por relevancia: sigla o nombre exacto, inicio
 * del nombre, alias, y por último coincidencias en la explicación.
 * Con texto vacío devuelve todo el glosario en orden alfabético.
 */
export function searchGlossary(query: string): GlossaryEntry[] {
  const q = normalizeText(query)
  const tokens = words(q)
  if (tokens.length === 0) return [...GLOSSARY].sort(byTerm)

  const qCompact = compactKey(query)

  const scored: Array<{ entry: GlossaryEntry; score: number }> = []
  for (const entry of GLOSSARY) {
    const term = normalizeText(entry.term)
    const aliases = entry.aliases.map(normalizeText)
    const names = [term, ...aliases]
    const nameWords = names.flatMap(words)
    const queEsWords = words(normalizeText(entry.queEs))
    const bodyWords = words(
      normalizeText([entry.porQueImporta, entry.ejemplo ?? '', entry.cuando ?? '', entry.baseLegal].join(' ')),
    )

    const exact = compactKey(entry.id) === qCompact || names.some((n) => compactKey(n) === qCompact)
    if (!exact && !allTokensPrefix(tokens, [...nameWords, ...queEsWords, ...bodyWords])) continue

    let score = 1
    if (exact) score = 100
    else if (term.startsWith(q)) score = 80
    else if (aliases.some((a) => a.startsWith(q))) score = 70
    else if (allTokensPrefix(tokens, nameWords)) score = 60
    else if (allTokensPrefix(tokens, [...nameWords, ...queEsWords])) score = 20
    scored.push({ entry, score })
  }

  return scored
    .sort((a, b) => b.score - a.score || byTerm(a.entry, b.entry))
    .map((s) => s.entry)
}

function byTerm(a: GlossaryEntry, b: GlossaryEntry): number {
  return a.term.localeCompare(b.term, 'es')
}

// ── Enlaces ──────────────────────────────────────────────────────────────────

export const GLOSSARY_ANCHOR_PREFIX = 'glosario-'

/** Id del elemento en la página de Ayuda: "glosario-cts". */
export function glossaryAnchor(id: string): string {
  return `${GLOSSARY_ANCHOR_PREFIX}${id}`
}

/** Enlace a la entrada en la página de Ayuda: "/dashboard/ayuda#glosario-cts". */
export function glossaryHref(id: string): string {
  return `/dashboard/ayuda#${glossaryAnchor(id)}`
}
