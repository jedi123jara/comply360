/**
 * Guía didáctica del diagnóstico SUNAFIL, para usuarios sin formación legal.
 *
 * Todo se deriva de los datos que ya trae cada pregunta (texto, área, base
 * legal, gravedad), así que funciona igual para las 135 preguntas del banco y
 * para los diagnósticos guardados antes de que existieran estas ayudas:
 *
 *  - `explicarPregunta`: «¿Por qué te lo preguntamos?». Usa el `helpText` de la
 *    pregunta; si no tiene, explica en simple la base legal y la gravedad.
 *  - `comoVerificar`: para las respuestas «No sé», qué documento buscar o a quién
 *    preguntar para salir de la duda.
 *  - `terminosDeLaPregunta`: términos del glosario que aparecen en el texto
 *    (CTS, IPERC, EMO, SCTR, legajo, T-Registro…), para mostrarlos como chips.
 *  - `gravedadEnPalabras`: «Leve», «Grave», «Muy grave», para no depender del color.
 *
 * Es información general y referencial: no reemplaza la asesoría de un abogado.
 */
import { getTerm, normalizeText } from '@/lib/glossary'
import { isAnswerOption } from './questions/types'
import type { AnswerOption, AreaKey, ComplianceQuestion, InfraccionGravedad } from './questions/types'

// ── Respuestas guardadas ─────────────────────────────────────────────────────

export interface RespuestaGuardada {
  questionId: string
  answer: AnswerOption | null
}

/**
 * Lee `ComplianceDiagnostic.questionsJson` de forma tolerante: acepta los
 * diagnósticos antiguos (solo SI / PARCIAL / NO) y los nuevos (con NO_SE y
 * NO_APLICA). Ignora lo que no tenga forma de respuesta (por ejemplo, los
 * hallazgos que guarda un simulacro).
 */
export function leerRespuestasGuardadas(questionsJson: unknown): RespuestaGuardada[] {
  if (!Array.isArray(questionsJson)) return []
  const out: RespuestaGuardada[] = []
  for (const item of questionsJson) {
    if (!item || typeof item !== 'object') continue
    const { questionId, answer } = item as { questionId?: unknown; answer?: unknown }
    if (typeof questionId !== 'string' || !questionId) continue
    if (answer !== null && answer !== undefined && !isAnswerOption(answer)) continue
    out.push({ questionId, answer: isAnswerOption(answer) ? answer : null })
  }
  return out
}

// ── Gravedad en palabras ─────────────────────────────────────────────────────

const GRAVEDAD_PALABRAS: Record<InfraccionGravedad, string> = {
  LEVE: 'Leve',
  GRAVE: 'Grave',
  MUY_GRAVE: 'Muy grave',
}

/** "Leve" | "Grave" | "Muy grave". Si el valor no se reconoce, lo devuelve tal cual. */
export function gravedadEnPalabras(gravedad: string): string {
  return GRAVEDAD_PALABRAS[gravedad as InfraccionGravedad] ?? gravedad
}

/** "Infracción leve" | "Infracción grave" | "Infracción muy grave". */
export function infraccionEnPalabras(gravedad: string): string {
  const palabra = GRAVEDAD_PALABRAS[gravedad as InfraccionGravedad]
  return palabra ? `Infracción ${palabra.toLowerCase()}` : 'Infracción'
}

// ── Texto de la pregunta ─────────────────────────────────────────────────────

/** Quita «¿» y «?» para usar la pregunta como enunciado: "¿Se paga X?" → "Se paga X". */
export function enunciadoDePregunta(texto: string): string {
  return texto.trim().replace(/^¿\s*/, '').replace(/\?\s*$/, '').trim()
}

// ── Base legal en simple ─────────────────────────────────────────────────────

/**
 * Nombre en simple de cada norma que aparece en el banco. La clave es el
 * inicio del fragmento de base legal (sin el artículo).
 */
const NORMAS_EN_SIMPLE: ReadonlyArray<{ patron: RegExp; nombre: string }> = [
  { patron: /^D\.Leg\. 728\b/, nombre: 'la Ley de Productividad y Competitividad Laboral' },
  { patron: /^D\.S\. 003-97-TR\b/, nombre: 'la ley general de contratos de trabajo y despido' },
  { patron: /^D\.S\. 018-2007-TR\b/, nombre: 'la norma de la planilla electrónica (T-Registro y PLAME)' },
  { patron: /^Ley 28518\b/, nombre: 'la ley de prácticas y modalidades formativas' },
  { patron: /^D\.Leg\. 689\b/, nombre: 'la ley de contratación de trabajadores extranjeros' },
  { patron: /^Ley 32353\b/, nombre: 'la ley del régimen MYPE' },
  { patron: /^D\.S\. 001-97-TR\b/, nombre: 'la ley de la CTS' },
  { patron: /^Ley 27735\b/, nombre: 'la ley de gratificaciones' },
  { patron: /^Ley 30334\b/, nombre: 'la ley de la bonificación extraordinaria del 9 %' },
  { patron: /^D\.Leg\. 713\b/, nombre: 'la ley de descansos remunerados (vacaciones, descanso semanal y feriados)' },
  { patron: /^Ley 25129\b/, nombre: 'la ley de asignación familiar' },
  { patron: /^D\.S\. 054-97-EF\b/, nombre: 'la ley del sistema privado de pensiones (AFP)' },
  { patron: /^Ley 26790\b/, nombre: 'la ley de seguridad social en salud (EsSalud y SCTR)' },
  { patron: /^D\.S\. 003-98-SA\b/, nombre: 'las normas técnicas del SCTR' },
  { patron: /^D\.S\. 007-2002-TR\b/, nombre: 'la ley de jornada de trabajo, horario y horas extras' },
  { patron: /^D\.S\. 001-98-TR\b/, nombre: 'la norma de planillas y boletas de pago' },
  { patron: /^D\.Leg\. 892\b/, nombre: 'la ley de participación en las utilidades' },
  { patron: /^D\.S\. 004-2006-TR\b/, nombre: 'la norma del registro de control de asistencia' },
  { patron: /^Ley 29409\b/, nombre: 'la ley de licencia por paternidad' },
  { patron: /^Ley 26644\b/, nombre: 'la ley del descanso prenatal y posnatal' },
  { patron: /^Ley 27240\b/, nombre: 'la ley del permiso por lactancia materna' },
  { patron: /^Ley 31572\b/, nombre: 'la ley de teletrabajo' },
  { patron: /^Ley 29783\b/, nombre: 'la Ley de Seguridad y Salud en el Trabajo' },
  { patron: /^D\.S\. 005-2012-TR\b/, nombre: 'el reglamento de la Ley de Seguridad y Salud en el Trabajo' },
  { patron: /^R\.M\. 050-2013-TR\b/, nombre: 'los formatos oficiales de registros de SST' },
  { patron: /^D\.S\. 42-F\b/, nombre: 'el reglamento de seguridad industrial' },
  { patron: /^Ley 28551\b/, nombre: 'la ley de planes de contingencia' },
  { patron: /^R\.M\. 375-2008-TR\b/, nombre: 'la norma básica de ergonomía' },
  { patron: /^NTP 399\.010-1\b/, nombre: 'la norma técnica peruana de señales de seguridad' },
  { patron: /^D\.S\. 039-91-TR\b/, nombre: 'la norma del Reglamento Interno de Trabajo' },
  { patron: /^Ley 30709\b/, nombre: 'la ley de igualdad salarial entre hombres y mujeres' },
  { patron: /^D\.S\. 002-2018-TR\b/, nombre: 'el reglamento de la ley de igualdad salarial' },
  { patron: /^D\.Leg\. 688\b/, nombre: 'la ley del Seguro Vida Ley' },
  { patron: /^D\.S\. 014-2019-MIMP\b/, nombre: 'el reglamento de la ley contra el hostigamiento sexual' },
  { patron: /^Ley 27942\b/, nombre: 'la ley de prevención y sanción del hostigamiento sexual' },
  { patron: /^D\.S\. 010-2003-TR\b/, nombre: 'la ley de relaciones colectivas de trabajo (sindicatos, negociación y huelga)' },
  { patron: /^D\.S\. 001-96-TR\b/, nombre: 'el reglamento de la ley de fomento del empleo' },
  { patron: /^Ley 26772\b/, nombre: 'la ley contra la discriminación en las ofertas de empleo' },
  { patron: /^Ley 29973\b/, nombre: 'la ley general de la persona con discapacidad' },
  { patron: /^Ley 28048\b/, nombre: 'la ley de protección a la trabajadora gestante' },
  { patron: /^Ley 29896\b/, nombre: 'la ley de lactarios' },
  { patron: /^Código de los Niños y Adolescentes\b/, nombre: 'el Código de los Niños y Adolescentes' },
  { patron: /^Ley 31047\b/, nombre: 'la ley de las trabajadoras y trabajadores del hogar' },
  { patron: /^Ley 26626\b/, nombre: 'la ley sobre VIH/SIDA' },
  { patron: /^D\.Leg\. 727\b/, nombre: 'la ley de fomento de la construcción' },
  { patron: /^Ley 29245\b/, nombre: 'la ley de tercerización' },
  { patron: /^D\.Leg\. 1038\b/, nombre: 'la norma que precisa la ley de tercerización' },
  { patron: /^D\.S\. 006-2008-TR\b/, nombre: 'el reglamento de la ley de tercerización' },
  { patron: /^Ley 27626\b/, nombre: 'la ley de intermediación laboral («services»)' },
  { patron: /^D\.S\. 003-2002-TR\b/, nombre: 'el reglamento de la ley de intermediación laboral' },
]

/** Una norma de la base legal explicada: "la ley de gratificaciones (Ley 27735, Art. 2-3)". */
function normaEnSimple(fragmento: string): string {
  const limpio = fragmento.trim()
  const hit = NORMAS_EN_SIMPLE.find((n) => n.patron.test(limpio))
  return hit ? `${hit.nombre} (${limpio})` : limpio
}

/**
 * Base legal en simple. "Ley 29783, Art. 57; R.M. 050-2013-TR" →
 * "la Ley de Seguridad y Salud en el Trabajo (Ley 29783, Art. 57) y los
 * formatos oficiales de registros de SST (R.M. 050-2013-TR)".
 */
export function baseLegalEnSimple(baseLegal: string): string {
  const partes = baseLegal
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map(normaEnSimple)
  if (partes.length <= 1) return partes[0] ?? ''
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// ── «¿Por qué te lo preguntamos?» ────────────────────────────────────────────

export interface ExplicacionPregunta {
  /** Texto en lenguaje simple (1-2 frases). */
  texto: string
  /** De dónde salió: la explicación propia de la pregunta o la base legal. */
  origen: 'pregunta' | 'base-legal'
  /** Base legal explicada en simple (siempre disponible para mostrar aparte). */
  normaEnSimple: string
}

/**
 * Explicación de por qué se hace la pregunta. Usa `helpText`; si la pregunta no
 * tiene, arma una frase prudente con la base legal en simple y la gravedad.
 */
export function explicarPregunta(
  q: Pick<ComplianceQuestion, 'helpText' | 'baseLegal' | 'infraccionGravedad'>,
): ExplicacionPregunta {
  const norma = baseLegalEnSimple(q.baseLegal)
  const normaVisible = norma ? capitalizar(norma) : ''
  const help = q.helpText?.trim()
  if (help) return { texto: help, origen: 'pregunta', normaEnSimple: normaVisible }

  const verbo = q.baseLegal.includes(';') ? 'Lo exigen' : 'Lo exige'
  const gravedad = gravedadEnPalabras(q.infraccionGravedad).toLowerCase()
  const texto = norma
    ? `${verbo} ${norma}. No cumplirlo es una infracción ${gravedad} que SUNAFIL puede multar.`
    : `No cumplirlo es una infracción ${gravedad} que SUNAFIL puede multar.`
  return { texto, origen: 'base-legal', normaEnSimple: normaVisible }
}

// ── «No sé» → cómo averiguarlo ───────────────────────────────────────────────

interface ReglaVerificacion {
  patron: RegExp
  pista: string
}

/**
 * Reglas por palabra clave (sobre el texto sin tildes ni mayúsculas). El orden
 * importa: las más específicas van primero (por ejemplo, "capacitaciones sobre
 * hostigamiento" debe caer en hostigamiento, no en capacitación).
 */
const REGLAS_VERIFICACION: readonly ReglaVerificacion[] = [
  {
    patron: /remype|regimen mype|trabajadores mype/,
    pista: 'Consulta tu constancia de inscripción en el REMYPE (en el portal del Ministerio de Trabajo, con tu RUC) y compara los beneficios de las boletas con los del régimen MYPE.',
  },
  {
    patron: /t-registro/,
    pista: 'Pide a tu contador la constancia de alta en el T-Registro de cada trabajador (se consulta en SUNAT Operaciones en Línea con la Clave SOL de la empresa) y compara las fechas con su primer día de trabajo.',
  },
  {
    patron: /hostigamiento|denuncia|procedimiento de investigacion/,
    pista: 'Busca la política contra el hostigamiento sexual, el acta del comité (o la designación del delegado) y las constancias de comunicación y capacitación al personal; si no las encuentras, pregunta a RRHH.',
  },
  {
    patron: /terceriza|intermediacion|destacados/,
    pista: 'Revisa los contratos con tus proveedores de personal y pídeles su constancia de registro vigente en el Ministerio de Trabajo y las constancias de pago a sus trabajadores.',
  },
  {
    patron: /seleccion|prueba de embarazo/,
    pista: 'Revisa los avisos de empleo, formularios de postulación y requisitos de los últimos procesos de selección: no deben pedir edad, sexo, estado civil ni pruebas de embarazo.',
  },
  {
    patron: /sindica|huelga|convenio colectivo/,
    pista: 'Pregunta a RRHH o a tu asesor legal si hay sindicato o convenio colectivo vigente, y revisa los acuerdos y comunicaciones con los trabajadores.',
  },
  {
    patron: /hostilidad/,
    pista: 'Pregunta a RRHH si hubo reclamos recientes por rebajas de sueldo o de categoría, traslados o cambios de horario, y revisa cómo se resolvieron.',
  },
  {
    patron: /extranjero/,
    pista: 'Revisa los contratos de los trabajadores extranjeros, su aprobación en el Ministerio de Trabajo y que su carné de extranjería o permiso migratorio esté vigente.',
  },
  {
    patron: /practicante|modalidad(es)? formativa/,
    pista: 'Revisa los convenios de prácticas (firmados y registrados), las constancias de pago de la subvención y su seguro, y compara el número de practicantes con el de trabajadores.',
  },
  {
    patron: /menores de edad/,
    pista: 'Revisa si tienes trabajadores menores de 18 años y si cuentan con la autorización de trabajo y un horario dentro de lo permitido.',
  },
  {
    patron: /del hogar/,
    pista: 'Revisa el contrato escrito, las boletas y el registro en planilla de cada trabajadora o trabajador del hogar.',
  },
  {
    patron: /vih/,
    pista: 'Pregunta a RRHH si hubo casos y cómo se manejaron; la información de salud del trabajador debe tratarse de forma confidencial.',
  },
  {
    patron: /teletrabaj/,
    pista: 'Revisa los acuerdos de teletrabajo y si se fijó por escrito el horario en que el trabajador puede desconectarse.',
  },
  {
    patron: /construccion civil/,
    pista: 'Revisa las boletas de los obreros de construcción: deben incluir la BUC y los demás conceptos del régimen de construcción civil.',
  },
  {
    patron: /utilidades/,
    pista: 'Pide a tu contador la liquidación de utilidades del último ejercicio y las constancias de pago a cada trabajador.',
  },
  {
    patron: /retencion|descuentos autorizados/,
    pista: 'Revisa en las boletas los descuentos (judiciales u otros) de los trabajadores que los tengan y compáralos con su sueldo.',
  },
  {
    patron: /\bcts\b/,
    pista: 'Pide a tu contador o al área de planillas las constancias de depósito de CTS de mayo y noviembre y compáralas con la lista de trabajadores.',
  },
  {
    patron: /gratificacion|bonificacion extraordinaria/,
    pista: 'Revisa las boletas de julio y diciembre (o pide el cálculo a tu contador): deben mostrar la gratificación y la bonificación extraordinaria del 9 %.',
  },
  {
    patron: /vacacion/,
    pista: 'Revisa el registro de vacaciones de cada trabajador (o pídelo a RRHH): fecha de ingreso, días ganados, días gozados y periodos pendientes.',
  },
  {
    patron: /\bafp\b|\bonp\b|pensiones/,
    pista: 'Pide a tu contador las constancias de pago en AFPnet y el pago de la ONP declarado en el PLAME de los últimos meses.',
  },
  {
    patron: /essalud/,
    pista: 'Pide a tu contador el PLAME y la constancia de pago de los últimos meses: el aporte a EsSalud debe figurar por cada trabajador.',
  },
  {
    patron: /remuneracion minima vital/,
    pista: 'Compara el sueldo de cada trabajador a tiempo completo (en la planilla o en las boletas) con la remuneración mínima vigente.',
  },
  {
    patron: /asignacion familiar/,
    pista: 'Cruza la lista de trabajadores con hijos menores de edad (o que estudian) con sus boletas: debe aparecer la asignación familiar.',
  },
  {
    patron: /plame|planilla electronica/,
    pista: 'Pide a tu contador las constancias de presentación del PLAME de los últimos meses y verifica que figuren todos tus trabajadores.',
  },
  {
    patron: /horas extras|recargo|nocturn|de noche|feriado/,
    pista: 'Compara el registro de asistencia con las boletas: las horas fuera de la jornada, el trabajo nocturno y los feriados trabajados deben aparecer pagados con su recargo.',
  },
  {
    patron: /boleta/,
    pista: 'Revisa en tu sistema de planillas (o con tu contador) las boletas de los últimos meses y las constancias de entrega (firma o envío digital).',
  },
  {
    patron: /sctr/,
    pista: 'Pide a RRHH o a tu corredor de seguros la constancia vigente del SCTR (salud y pensión) con la lista de trabajadores asegurados.',
  },
  {
    patron: /vida ley/,
    pista: 'Pide a RRHH o a tu corredor de seguros la póliza de Seguro Vida Ley vigente y la lista de trabajadores asegurados.',
  },
  {
    patron: /iperc|mapa de riesgos/,
    pista: 'Pide al responsable de SST (o al Comité o Supervisor) la matriz IPERC y el mapa de riesgos vigentes, con fecha y firmas.',
  },
  {
    patron: /politica de seguridad|reglamento interno de sst|plan anual|sistema de gestion/,
    pista: 'Busca la Política de SST, el Reglamento Interno de SST y el Plan Anual de SST, firmados y con fecha, o pídelos al responsable de SST.',
  },
  {
    patron: /comite de sst|supervisor de sst/,
    pista: 'Busca el acta de elección e instalación del Comité de SST (o la del Supervisor de SST) y el libro de actas de sus reuniones.',
  },
  {
    patron: /examenes medicos|emo\b/,
    pista: 'Pide a RRHH o al responsable de SST los certificados de aptitud médica (EMO) de cada trabajador y revisa sus fechas.',
  },
  {
    patron: /\bepp\b|proteccion personal/,
    pista: 'Revisa el registro de entrega de EPP: debe tener la fecha y la firma de cada trabajador.',
  },
  {
    patron: /accidente|incidente/,
    pista: 'Revisa el registro de accidentes e incidentes (formatos oficiales de SST) y las notificaciones hechas al Ministerio de Trabajo.',
  },
  {
    patron: /capacitacion|induccion/,
    pista: 'Revisa los registros de capacitación del último año: tema, fecha y firmas de asistencia de cada trabajador.',
  },
  {
    patron: /discapacidad/,
    pista: 'Revisa con RRHH cuántos trabajadores con discapacidad tienes (con certificado) y qué adaptaciones se hicieron en sus puestos.',
  },
  {
    patron: /igualdad salarial|politica salarial|categorias y funciones|igual valor|discriminacion/,
    pista: 'Pide a RRHH el cuadro de categorías y funciones y la política salarial, y compara los sueldos de hombres y mujeres en puestos de igual valor.',
  },
  {
    patron: /gestante|lactancia|lactario|paternidad|prenatal/,
    pista: 'Revisa con RRHH los casos del último año (embarazos y nacimientos) y los permisos, licencias o cambios de tareas que se otorgaron.',
  },
  {
    patron: /despido|cese|sanciones|certificado de trabajo|liquidacion/,
    pista: 'Revisa los expedientes de los trabajadores que salieron o fueron sancionados en el último año: cartas, liquidaciones y constancias de entrega.',
  },
  {
    patron: /reglamento interno de trabajo/,
    pista: 'Busca el Reglamento Interno de Trabajo aprobado y la constancia de entrega a cada trabajador.',
  },
  {
    patron: /direccion y de confianza/,
    pista: 'Revisa las cartas en las que se comunicó a cada trabajador que su puesto es de dirección o de confianza, y si figura así en la planilla.',
  },
  {
    patron: /exhibe|lugar visible/,
    pista: 'Recorre el local y verifica que el documento esté exhibido en un lugar donde todos los trabajadores puedan verlo.',
  },
  {
    patron: /asistencia|jornada|refrigerio|descanso semanal|horario/,
    pista: 'Revisa el registro de asistencia (cuaderno, reloj marcador o sistema) de las últimas semanas: hora de ingreso, de salida y descansos de cada trabajador.',
  },
  {
    patron: /contrato|causa objetiva|plazo fijo/,
    pista: 'Revisa los contratos de tus trabajadores (físicos o digitales) o pídelos a RRHH: firmas, fechas, tipo de contrato y, si es temporal, la causa.',
  },
  {
    patron: /legajo|documentos/,
    pista: 'Abre el legajo de 2 o 3 trabajadores al azar y revisa que tenga DNI, contrato, boletas y constancias firmadas.',
  },
  {
    patron: /botiquin|simulacro|emergencia|senalizacion|banos|higiene|ergonom|psicosocial|agentes/,
    pista: 'Recorre el local con el responsable de SST y pídele los registros de simulacros, inspecciones y monitoreos del último año.',
  },
]

const PISTA_POR_AREA: Record<AreaKey, string> = {
  contratos_registro: 'Pide a RRHH los contratos y la información del T-Registro de tus trabajadores.',
  remuneraciones_beneficios: 'Pide a tu contador o al área de planillas las boletas y constancias de pago de los últimos meses.',
  jornada_descansos: 'Revisa el registro de asistencia y las boletas de los últimos meses.',
  sst: 'Pide al responsable de SST (Comité o Supervisor) los registros y documentos de SST.',
  documentos_obligatorios: 'Pide a RRHH el archivo (físico o digital) y revisa que el documento exista y esté vigente.',
  relaciones_laborales: 'Pregunta a RRHH o a tu asesor legal cómo se manejaron los últimos casos y revisa los documentos.',
  igualdad_nodiscriminacion: 'Pide a RRHH la política y los registros relacionados.',
  trabajadores_especiales: 'Revisa con RRHH si tienes trabajadores en esta situación y qué documentos los respaldan.',
  tercerizacion_intermediacion: 'Revisa los contratos con tus proveedores de personal y pídeles sus constancias.',
  hostigamiento_sexual_detallado: 'Pregunta a RRHH o al comité de intervención y revisa los documentos del procedimiento.',
}

const PISTA_GENERICA = 'Pregunta a RRHH o a tu contador qué documento lo respalda y revísalo.'

/** Regla que aplica a la pregunta, o `null` si solo queda la pista por área. */
export function reglaDeVerificacion(q: Pick<ComplianceQuestion, 'text'>): string | null {
  const texto = normalizeText(q.text)
  return REGLAS_VERIFICACION.find((r) => r.patron.test(texto))?.pista ?? null
}

/**
 * Indicación concreta para salir de un «No sé»: qué documento buscar o a quién
 * preguntar. Se deriva del texto de la pregunta y, como respaldo, de su área.
 */
export function comoVerificar(q: Pick<ComplianceQuestion, 'text' | 'area'>): string {
  return reglaDeVerificacion(q) ?? PISTA_POR_AREA[q.area] ?? PISTA_GENERICA
}

// ── Términos del glosario en la pregunta ─────────────────────────────────────

export interface TerminoDePregunta {
  /** Id del glosario (para `<Term id>`). */
  id: string
  /** Texto corto para el chip ("CTS", "T-Registro"). */
  etiqueta: string
}

/**
 * Palabras clave → término del glosario. Lista curada (no se buscan todos los
 * alias del glosario) para evitar falsos positivos: "prueba de embarazo" no es
 * "periodo de prueba", ni "Reglamento Interno de SST" es el RIT.
 */
const TERMINOS_CLAVE: ReadonlyArray<{ patron: RegExp; id: string; etiqueta: string }> = [
  { patron: /t-registro/, id: 't-registro', etiqueta: 'T-Registro' },
  { patron: /planilla electronica/, id: 'planilla-electronica', etiqueta: 'Planilla electrónica' },
  { patron: /\bplame\b/, id: 'plame', etiqueta: 'PLAME' },
  { patron: /\bremype\b/, id: 'remype', etiqueta: 'REMYPE' },
  { patron: /\bmype\b/, id: 'regimen-mype', etiqueta: 'Régimen MYPE' },
  { patron: /\bcts\b/, id: 'cts', etiqueta: 'CTS' },
  { patron: /bonificacion extraordinaria/, id: 'bonificacion-extraordinaria', etiqueta: 'Bonificación extraordinaria' },
  { patron: /gratificacion/, id: 'gratificacion', etiqueta: 'Gratificación' },
  { patron: /indemnizacion vacacional|periodos pendientes/, id: 'indemnizacion-vacacional', etiqueta: 'Indemnización vacacional' },
  { patron: /vacacion/, id: 'vacaciones', etiqueta: 'Vacaciones' },
  { patron: /remuneracion minima|\brmv\b/, id: 'rmv', etiqueta: 'RMV' },
  { patron: /asignacion familiar/, id: 'asignacion-familiar', etiqueta: 'Asignación familiar' },
  { patron: /\bafp\b/, id: 'afp', etiqueta: 'AFP' },
  { patron: /\bonp\b/, id: 'onp', etiqueta: 'ONP' },
  { patron: /essalud/, id: 'essalud', etiqueta: 'EsSalud' },
  { patron: /boleta/, id: 'boleta-de-pago', etiqueta: 'Boleta de pago' },
  { patron: /legajo/, id: 'legajo', etiqueta: 'Legajo' },
  { patron: /liquidacion de beneficios/, id: 'liquidacion', etiqueta: 'Liquidación' },
  { patron: /despido arbitrario/, id: 'indemnizacion-despido', etiqueta: 'Indemnización por despido' },
  { patron: /sujetos a modalidad|plazo fijo|contratos temporales|contratos modales/, id: 'contrato-plazo-fijo', etiqueta: 'Contrato a plazo fijo' },
  { patron: /desnaturaliz/, id: 'desnaturalizacion', etiqueta: 'Desnaturalización' },
  { patron: /construccion civil/, id: 'construccion-civil', etiqueta: 'Construcción civil' },
  { patron: /\bsctr\b/, id: 'sctr', etiqueta: 'SCTR' },
  { patron: /vida ley/, id: 'seguro-vida-ley', etiqueta: 'Seguro Vida Ley' },
  { patron: /\biperc\b/, id: 'iperc', etiqueta: 'IPERC' },
  { patron: /\bemo\b|examenes medicos ocupacionales/, id: 'emo', etiqueta: 'EMO' },
  { patron: /\bepp\b|proteccion personal/, id: 'epp', etiqueta: 'EPP' },
  { patron: /comite de sst/, id: 'comite-sst', etiqueta: 'Comité de SST' },
  { patron: /supervisor de sst/, id: 'supervisor-sst', etiqueta: 'Supervisor de SST' },
  { patron: /seguridad y salud en el trabajo|\bsst\b/, id: 'sst', etiqueta: 'SST' },
  { patron: /reglamento interno de trabajo/, id: 'rit', etiqueta: 'RIT' },
  { patron: /hostigamiento sexual/, id: 'hostigamiento-sexual', etiqueta: 'Hostigamiento sexual' },
]

/**
 * Términos del glosario presentes en el texto de la pregunta (máximo `max`),
 * en el orden de la lista curada. Solo devuelve ids que existen en el glosario.
 */
export function terminosDeLaPregunta(texto: string, max = 4): TerminoDePregunta[] {
  const normalizado = normalizeText(texto)
  const vistos = new Set<string>()
  const terminos: TerminoDePregunta[] = []
  for (const t of TERMINOS_CLAVE) {
    if (terminos.length >= max) break
    if (vistos.has(t.id) || !t.patron.test(normalizado)) continue
    if (!getTerm(t.id)) continue
    vistos.add(t.id)
    terminos.push({ id: t.id, etiqueta: t.etiqueta })
  }
  return terminos
}

/** Ids del glosario usados por la lista curada (para validar en los tests). */
export const IDS_TERMINOS_CLAVE: readonly string[] = TERMINOS_CLAVE.map((t) => t.id)
