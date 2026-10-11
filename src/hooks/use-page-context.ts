'use client'

import { usePathname, useParams } from 'next/navigation'
import { useMemo } from 'react'
import { NAV_HUBS, resolveNavLocation, type NavHub } from '@/lib/constants'

/**
 * Pregunta sugerida del asistente.
 * - `label`: la pregunta tal como la diría un gerente sin formación legal.
 * - `prompt`: el mensaje que se envía (pide explicación sencilla y ejemplos).
 */
export interface AssistantSuggestion {
  readonly label: string
  readonly prompt: string
}

export type PageEntityType =
  | 'worker'
  | 'contract'
  | 'diagnostic'
  | 'complaint'
  | 'sst'
  | 'document'
  | 'inspection'
  | null

/**
 * Contexto de la página actual, extraído de la ruta.
 * El asistente lo usa para mostrar dónde está el usuario y qué preguntas
 * sugerirle. OJO: el chat NO recibe este contexto (solo los datos generales
 * de la empresa), por eso las sugerencias son preguntas autónomas que se
 * entienden sin saber qué ficha está abierta.
 */
export interface PageContext {
  hub: NavHub
  /** Pathname completo. */
  pathname: string
  /** ID del recurso principal en la ruta (workerId, contractId, etc.) si aplica. */
  entityId: string | null
  /** Tipo de entidad detectada por la ruta. */
  entityType: PageEntityType
  /** Nombre corto de la pantalla para el asistente ("Trabajadores", "Ficha de un trabajador"). */
  humanLabel: string
  /** Hasta 4 preguntas sugeridas para esta pantalla. */
  suggestions: readonly AssistantSuggestion[]
}

export interface PageContextOptions {
  /** Cuenta recién creada (sin trabajadores): se priorizan preguntas de arranque. */
  isNewAccount?: boolean
}

/** Rango de preguntas sugeridas que muestra el asistente en cada pantalla. */
export const MIN_SUGGESTIONS = 3
export const MAX_SUGGESTIONS = 4

/* ── Banco de preguntas ─────────────────────────────────────────────── */

function q(label: string, prompt: string): AssistantSuggestion {
  return { label, prompt }
}

// Preguntas que se repiten en varias pantallas.
const Q = {
  porDondeEmpiezo: q(
    '¿Por dónde empiezo?',
    'Recién empiezo a ordenar la parte laboral de mi empresa. Explícame en palabras simples cuáles son mis obligaciones básicas con mis trabajadores y por cuáles debería empezar.',
  ),
  regimenMype: q(
    '¿Me corresponde el régimen MYPE?',
    '¿Cómo sé si mi empresa puede estar en el régimen MYPE? Explícame en palabras simples los requisitos y qué cambia para mis trabajadores frente al régimen general.',
  ),
  documentosTrabajador: q(
    '¿Qué documentos debo tener de cada trabajador?',
    '¿Qué documentos debo tener de cada trabajador? Dame una lista sencilla, empezando por los más importantes.',
  ),
  sunafilInspeccion: q(
    '¿Qué me pide SUNAFIL en una inspección?',
    '¿Qué me pide SUNAFIL cuando hace una inspección? Explícame en palabras simples qué revisan y cómo prepararme.',
  ),
  queHagoPrimero: q(
    '¿Qué debería atender primero?',
    'Con los datos de mi empresa, ¿qué obligaciones laborales debería atender primero esta semana y por qué?',
  ),
  puntaje: q(
    '¿Qué significa mi puntaje de cumplimiento?',
    'Explícame en palabras simples qué significa mi puntaje de cumplimiento laboral y qué acciones suelen subirlo más rápido.',
  ),
  cts: q(
    'Explícame la CTS con un ejemplo',
    'Explícame qué es la CTS, a quién le corresponde, cuándo se deposita y cómo se calcula, con un ejemplo con números sencillos.',
  ),
  gratificacion: q(
    'Explícame la gratificación con un ejemplo',
    'Explícame qué es la gratificación de julio y diciembre, a quién le corresponde y cómo se calcula, con un ejemplo con números sencillos.',
  ),
  horasExtra: q(
    '¿Cómo se pagan las horas extra?',
    '¿Cómo se pagan las horas extra en Perú? Explícamelo con un ejemplo con números sencillos.',
  ),
  vacacionesDias: q(
    '¿Cuántos días de vacaciones le tocan a cada uno?',
    '¿Cuántos días de vacaciones le corresponden a un trabajador según su régimen laboral y desde cuándo puede tomarlas?',
  ),
  vacacionesNoGozadas: q(
    '¿Qué pasa si alguien no sale de vacaciones?',
    '¿Qué pasa si un trabajador no toma sus vacaciones a tiempo? Explícame la indemnización por vacaciones no gozadas con un ejemplo.',
  ),
  contratar: q(
    '¿Qué debo hacer cuando contrato a alguien?',
    'Voy a contratar a una persona. Explícame paso a paso qué debo hacer para que todo esté en regla: contrato, registro en planilla y documentos.',
  ),
  terminarRelacion: q(
    '¿Cómo termino una relación laboral sin problemas?',
    '¿Cuáles son las formas correctas de terminar la relación con un trabajador (renuncia, mutuo acuerdo, fin de contrato o despido) y qué debo cuidar en cada una?',
  ),
  liquidacion: q(
    '¿Qué le pago a quien deja la empresa?',
    'Cuando un trabajador deja la empresa, ¿qué le debo pagar en su liquidación y en qué plazo? Explícamelo con un ejemplo con números sencillos.',
  ),
  tipoContrato: q(
    '¿Qué tipo de contrato me conviene?',
    'Explícame en palabras simples los tipos de contrato de trabajo (indefinido, a plazo fijo y a tiempo parcial) y cuándo conviene cada uno.',
  ),
  contratoVencido: q(
    '¿Qué pasa si un contrato vence y no lo renuevo?',
    '¿Qué pasa si un contrato a plazo fijo vence y el trabajador sigue trabajando sin que lo renueve?',
  ),
  clausulasClave: q(
    '¿Qué no puede faltar en un contrato?',
    '¿Qué cláusulas no pueden faltar en un contrato de trabajo y cuáles suelen ser riesgosas o ilegales? Dame ejemplos.',
  ),
  plazoFijoIndefinido: q(
    '¿Cuándo un contrato temporal se vuelve indefinido?',
    '¿En qué casos un contrato a plazo fijo se convierte en indefinido? Explícamelo en palabras simples y con ejemplos.',
  ),
  documentosInternos: q(
    '¿Qué políticas y reglamentos me exige la ley?',
    '¿Qué políticas y reglamentos internos me exige la ley según el tamaño de mi empresa? Por ejemplo: reglamento interno, política contra el hostigamiento sexual y política de seguridad y salud.',
  ),
  reglamentoInterno: q(
    '¿Qué es el reglamento interno de trabajo?',
    'Explícame qué es el reglamento interno de trabajo, desde cuántos trabajadores es obligatorio y qué debe incluir.',
  ),
  firmaPoliticas: q(
    '¿Mis trabajadores deben firmar las políticas?',
    '¿Mis trabajadores deben firmar que recibieron las políticas y reglamentos? ¿Cómo lo demuestro ante SUNAFIL?',
  ),
  multasCalculo: q(
    '¿Cómo se calculan las multas de SUNAFIL?',
    '¿Cómo se calculan las multas de SUNAFIL? Explícamelo con un ejemplo para una empresa pequeña.',
  ),
  multasComunes: q(
    '¿Cuáles son las multas más comunes?',
    '¿Cuáles son las multas de SUNAFIL más comunes en empresas pequeñas y cómo puedo evitarlas?',
  ),
  corregirATiempo: q(
    'Si corrijo una falta a tiempo, ¿me rebajan la multa?',
    'Si corrijo una falta laboral antes o durante una inspección de SUNAFIL, ¿me rebajan la multa? Explícame cuánto y en qué casos.',
  ),
  inspeccionPasoAPaso: q(
    '¿Cómo es una inspección paso a paso?',
    'Explícame paso a paso cómo es una inspección de SUNAFIL, desde que llega el inspector hasta que termina.',
  ),
  llegoInspector: q(
    'Llegó el inspector, ¿qué hago?',
    'Llegó un inspector de SUNAFIL a mi empresa. ¿Qué debo hacer ahora mismo y qué no debo hacer?',
  ),
  comites: q(
    '¿Qué comités me obliga a tener la ley?',
    'Según la cantidad de trabajadores, ¿qué comités o responsables me obliga a tener la ley (seguridad y salud, hostigamiento sexual y otros)? Explícamelo en palabras simples.',
  ),
  cuadroCategorias: q(
    '¿Qué es el cuadro de categorías y funciones?',
    'Explícame qué es el cuadro de categorías y funciones, para qué sirve y si mi empresa está obligada a tenerlo.',
  ),
  locadorVsTrabajador: q(
    '¿En qué se diferencia un locador de un trabajador?',
    '¿Cuál es la diferencia entre un locador de servicios y un trabajador en planilla? ¿Cuándo puede SUNAFIL considerar que un locador es en realidad un trabajador?',
  ),
  retencionHonorarios: q(
    '¿Cuándo retengo impuesto en un recibo por honorarios?',
    '¿Cuándo debo retener el impuesto de cuarta categoría en un recibo por honorarios? Explícamelo con un ejemplo.',
  ),
  plame: q(
    '¿Qué es la PLAME y cuándo se presenta?',
    '¿Qué es la PLAME, para qué sirve y cuándo se presenta? Explícamelo en palabras simples.',
  ),
  tregistro: q(
    '¿Qué es el T-REGISTRO?',
    '¿Qué es el T-REGISTRO, en qué plazo debo registrar a un trabajador y qué pasa si lo hago tarde?',
  ),
  sstBasico: q(
    '¿Qué me exige la ley de seguridad y salud?',
    'Explícame en palabras simples qué me exige la ley de seguridad y salud en el trabajo (SST) y por dónde empiezo.',
  ),
  comiteOSupervisor: q(
    '¿Necesito comité o supervisor de SST?',
    '¿Mi empresa necesita un comité de seguridad y salud en el trabajo o basta con un supervisor? ¿De qué depende?',
  ),
  sstDocumentos: q(
    '¿Qué documentos de SST me puede pedir SUNAFIL?',
    '¿Qué documentos de seguridad y salud en el trabajo me puede pedir SUNAFIL? Dame una lista sencilla.',
  ),
  hostigamientoDenuncia: q(
    '¿Qué hago si recibo una denuncia de hostigamiento?',
    'Recibí una denuncia de hostigamiento sexual en mi empresa. Explícame paso a paso qué debo hacer y en qué plazos.',
  ),
  hostigamientoProteccion: q(
    '¿Qué medidas de protección debo dar?',
    '¿Qué medidas de protección debo dar a la persona que denuncia hostigamiento sexual mientras se investiga el caso?',
  ),
  hostigamientoPrevencion: q(
    '¿Qué necesito para prevenir el hostigamiento?',
    '¿Qué debe tener mi empresa para prevenir el hostigamiento sexual (política, comité o delegado y capacitaciones)?',
  ),
  datosPersonales: q(
    '¿Qué datos de mis trabajadores puedo guardar?',
    '¿Qué datos personales de mis trabajadores puedo guardar y qué cuidados debo tener según la ley de protección de datos personales?',
  ),
} as const

/** Preguntas de arranque para cuentas nuevas (sin trabajadores registrados). */
export const STARTER_SUGGESTIONS: readonly AssistantSuggestion[] = [
  Q.porDondeEmpiezo,
  Q.regimenMype,
  Q.documentosTrabajador,
  Q.sunafilInspeccion,
]

/** Preguntas generales: Inicio y cualquier pantalla sin preguntas propias. */
export const GENERAL_SUGGESTIONS: readonly AssistantSuggestion[] = [
  Q.queHagoPrimero,
  Q.puntaje,
  Q.cts,
  Q.sunafilInspeccion,
]

/**
 * Preguntas por grupo del menú (llaves de `NAV_HUBS`). Se usan cuando la
 * página no tiene preguntas propias en `PAGE_SUGGESTIONS`.
 */
export const HUB_SUGGESTIONS: Readonly<Record<string, readonly AssistantSuggestion[]>> = {
  cockpit: GENERAL_SUGGESTIONS,
  equipo: [Q.documentosTrabajador, Q.contratar, Q.vacacionesDias, Q.regimenMype],
  planilla: [
    q(
      '¿Qué descuentos van en la planilla?',
      'Explícame qué descuentos y aportes van en la planilla de un trabajador (AFP u ONP, EsSalud y renta de quinta categoría), con un ejemplo con números sencillos.',
    ),
    Q.cts,
    Q.gratificacion,
    Q.plame,
  ],
  'contratos-docs': [Q.tipoContrato, Q.clausulasClave, Q.contratoVencido, Q.documentosInternos],
  riesgo: [Q.sunafilInspeccion, Q.multasCalculo, Q.corregirATiempo, Q.multasComunes],
  sst: [Q.sstBasico, Q.comiteOSupervisor, Q.sstDocumentos],
  config: [Q.porDondeEmpiezo, Q.regimenMype, Q.datosPersonales],
}

/**
 * Preguntas por página, por `href` del menú (ver `NAV_HUBS`). Las páginas
 * ocultas usan las de su `parentHref` si no tienen propias.
 */
export const PAGE_SUGGESTIONS: Readonly<Record<string, readonly AssistantSuggestion[]>> = {
  /* Inicio */
  '/dashboard': GENERAL_SUGGESTIONS,
  '/dashboard/plan-accion': [
    q(
      '¿Cómo decido qué resolver primero?',
      'Tengo varios pendientes laborales. Explícame cómo decidir qué resolver primero según el riesgo de multa y la urgencia.',
    ),
    Q.multasComunes,
    Q.corregirATiempo,
  ],
  '/dashboard/calendario': [
    q(
      '¿Qué pagos laborales tengo en el año?',
      '¿Cuáles son las fechas de pago laborales obligatorias del año (CTS, gratificaciones, AFP y planilla)? Explícamelo como un calendario sencillo.',
    ),
    q(
      '¿Qué pasa si pago tarde la CTS o la gratificación?',
      '¿Qué pasa si deposito la CTS o pago la gratificación fuera de plazo? Explícame las consecuencias y cómo corregirlo.',
    ),
    Q.cts,
    Q.gratificacion,
  ],

  /* Mi personal */
  '/dashboard/trabajadores': [Q.documentosTrabajador, Q.contratar, Q.vacacionesDias, Q.regimenMype],
  '/dashboard/organigrama': [
    Q.comites,
    q(
      '¿Para qué me sirve tener un organigrama?',
      '¿Por qué es útil tener un organigrama y un manual de funciones al día? ¿SUNAFIL me lo puede pedir?',
    ),
    Q.cuadroCategorias,
  ],
  '/dashboard/asistencia': [
    q(
      '¿Estoy obligado a registrar la asistencia?',
      '¿Estoy obligado a llevar un registro de asistencia de mis trabajadores? ¿Qué debe incluir y por cuánto tiempo lo guardo?',
    ),
    Q.horasExtra,
    q(
      '¿Puedo descontar por tardanzas o faltas?',
      '¿Puedo descontar del sueldo por tardanzas o faltas? ¿Qué reglas debo seguir?',
    ),
  ],
  '/dashboard/vacaciones': [
    Q.vacacionesDias,
    Q.vacacionesNoGozadas,
    q(
      '¿Puedo dividir o adelantar las vacaciones?',
      '¿Puedo dividir las vacaciones de un trabajador en partes o adelantárselas? ¿Qué reglas hay?',
    ),
  ],
  '/dashboard/solicitudes': [
    q(
      '¿Qué permisos debo dar por ley?',
      '¿Qué permisos y licencias tengo que dar por ley a mis trabajadores (por ejemplo, por paternidad, enfermedad o fallecimiento de un familiar)?',
    ),
    q(
      '¿Qué es la hora de lactancia?',
      'Explícame la hora de lactancia y el lactario: a quién le corresponde y qué debo hacer como empleador.',
    ),
    Q.vacacionesDias,
  ],
  '/dashboard/prestadores': [
    Q.locadorVsTrabajador,
    Q.retencionHonorarios,
    q(
      '¿Qué contrato le hago a un locador?',
      '¿Qué contrato debo hacerle a un locador de servicios y qué no debe incluir para que no parezca un contrato de trabajo?',
    ),
  ],
  '/dashboard/honorarios': [Q.retencionHonorarios, Q.locadorVsTrabajador],
  '/dashboard/terceros': [
    q(
      '¿Qué reviso de una empresa contratista?',
      'Si contrato a una empresa que me envía personal (tercerización o intermediación), ¿qué debo revisar y de qué soy responsable?',
    ),
    Q.locadorVsTrabajador,
  ],
  '/dashboard/capacitaciones': [
    q(
      '¿Qué capacitaciones son obligatorias?',
      '¿Qué capacitaciones son obligatorias para mis trabajadores y cuántas veces al año? Explícamelo en palabras simples.',
    ),
    q(
      '¿Cómo demuestro que capacité a mi personal?',
      '¿Qué pruebas debo guardar de las capacitaciones (registro, firmas, certificados) para que SUNAFIL las acepte?',
    ),
    q(
      '¿Las capacitaciones van dentro del horario?',
      '¿Las capacitaciones obligatorias deben darse dentro del horario de trabajo? ¿Debo pagar ese tiempo?',
    ),
  ],
  '/dashboard/denuncias': [Q.hostigamientoDenuncia, Q.hostigamientoProteccion, Q.hostigamientoPrevencion],
  '/dashboard/igualdad-salarial': [
    q(
      '¿Qué me exige la ley de igualdad salarial?',
      'Explícame en palabras simples qué me exige la ley de igualdad salarial entre hombres y mujeres.',
    ),
    q(
      '¿Puedo pagar distinto a dos personas en el mismo puesto?',
      '¿Puedo pagar sueldos distintos a dos personas con el mismo puesto? ¿Qué razones son válidas?',
    ),
    Q.cuadroCategorias,
  ],
  '/dashboard/relaciones-colectivas': [
    q(
      '¿Qué hago si mis trabajadores forman un sindicato?',
      'Mis trabajadores quieren formar un sindicato. ¿Qué derechos tienen y qué debo y no debo hacer como empleador?',
    ),
    q(
      '¿Qué es un pliego de reclamos?',
      'Explícame en palabras simples qué es un pliego de reclamos y cómo funciona la negociación colectiva.',
    ),
    q(
      '¿Puedo despedir a un dirigente sindical?',
      '¿Qué protección tienen los dirigentes sindicales (fuero sindical) y qué debo tener en cuenta como empleador?',
    ),
  ],

  /* Planilla y pagos */
  '/dashboard/planilla': [
    q(
      '¿Qué descuentos van en la planilla?',
      'Explícame qué descuentos y aportes van en la planilla de un trabajador (AFP u ONP, EsSalud y renta de quinta categoría), con un ejemplo con números sencillos.',
    ),
    q(
      '¿Cuánto me cuesta un trabajador al año?',
      'Si contrato a alguien con un sueldo de S/ 1,500 al mes en el régimen general, ¿cuánto me cuesta en total al año como empleador? Explícamelo paso a paso.',
    ),
    Q.plame,
  ],
  '/dashboard/boletas': [
    q(
      '¿Qué debe decir una boleta de pago?',
      '¿Qué información debe tener una boleta de pago y en qué plazo debo entregarla?',
    ),
    q(
      '¿Qué pasa si un trabajador no firma su boleta?',
      '¿Qué pasa si un trabajador no firma su boleta de pago? ¿Cómo demuestro que se la entregué?',
    ),
    q(
      '¿Puedo entregar boletas digitales?',
      '¿Puedo entregar las boletas de pago de forma digital? ¿Qué requisitos debo cumplir?',
    ),
  ],
  '/dashboard/liquidaciones': [
    Q.liquidacion,
    q(
      '¿Qué cambia si renuncia o si lo despido?',
      '¿Qué cambia en la liquidación si el trabajador renuncia o si lo despido? Explícamelo en palabras simples.',
    ),
    q(
      '¿Qué pasa si pago la liquidación tarde?',
      '¿Qué pasa si pago la liquidación de un trabajador después del plazo legal?',
    ),
  ],
  '/dashboard/calculadoras': [
    Q.cts,
    Q.gratificacion,
    Q.horasExtra,
    q(
      '¿Qué beneficios cambian en el régimen MYPE?',
      '¿Qué beneficios cambian para un trabajador del régimen MYPE frente al régimen general (CTS, gratificación, vacaciones e indemnización)?',
    ),
  ],

  /* Contratos y documentos */
  '/dashboard/contratos': [Q.tipoContrato, Q.contratoVencido, Q.clausulasClave, Q.regimenMype],
  '/dashboard/configuracion/empresa/plantillas': [Q.clausulasClave, Q.tipoContrato, Q.plazoFijoIndefinido],
  '/dashboard/analizar-contrato': [
    q(
      '¿Qué cláusulas son riesgosas?',
      '¿Qué cláusulas de un contrato de trabajo suelen ser riesgosas o ilegales en Perú? Dame ejemplos.',
    ),
    Q.clausulasClave,
    Q.plazoFijoIndefinido,
  ],
  '/dashboard/documentos': [Q.documentosInternos, Q.reglamentoInterno, Q.firmaPoliticas],
  '/dashboard/generadores': [Q.documentosInternos, Q.reglamentoInterno, Q.hostigamientoPrevencion],
  '/dashboard/normas': [
    q(
      '¿Cómo sé si una norma nueva me afecta?',
      'Cuando sale una norma laboral nueva, ¿cómo sé si afecta a mi empresa y qué debo hacer?',
    ),
    q(
      '¿Qué es la UIT y para qué sirve?',
      '¿Qué es la UIT y por qué se usa para calcular las multas laborales? Explícamelo con un ejemplo.',
    ),
    Q.regimenMype,
  ],

  /* Inspección SUNAFIL */
  '/dashboard/diagnostico': [Q.sunafilInspeccion, Q.multasCalculo, Q.corregirATiempo],
  '/dashboard/simulacro': [
    Q.inspeccionPasoAPaso,
    q(
      '¿Qué documentos me pedirán primero?',
      '¿Qué documentos me piden con más frecuencia en una inspección de SUNAFIL?',
    ),
    q(
      '¿Qué es un acta de requerimiento?',
      '¿Qué es un acta de requerimiento de SUNAFIL y qué pasa si no cumplo lo que me piden en el plazo?',
    ),
  ],
  '/dashboard/sunafil-ready': [
    Q.sunafilInspeccion,
    q(
      '¿Cuánto tiempo guardo los documentos laborales?',
      '¿Por cuánto tiempo debo guardar los documentos laborales (boletas, contratos, planillas y registros)?',
    ),
    q(
      '¿Qué pasa si me falta un documento?',
      '¿Qué pasa si el inspector de SUNAFIL me pide un documento que no tengo?',
    ),
  ],
  '/dashboard/riesgo-laboral': [Q.multasCalculo, Q.multasComunes, Q.corregirATiempo],
  '/dashboard/inspeccion-en-vivo': [
    Q.llegoInspector,
    q(
      '¿Puedo pedir más plazo para entregar documentos?',
      '¿Puedo pedir un plazo para entregar los documentos que me pide el inspector de SUNAFIL?',
    ),
    q(
      '¿Qué derechos tengo durante la inspección?',
      '¿Qué derechos tengo como empleador durante una inspección de SUNAFIL?',
    ),
  ],
  '/dashboard/centro-sunafil': [Q.sunafilInspeccion, Q.inspeccionPasoAPaso, Q.multasCalculo, Q.corregirATiempo],

  /* Seguridad y salud (SST) */
  '/dashboard/sst': [Q.sstBasico, Q.comiteOSupervisor, Q.sstDocumentos],
  '/dashboard/sst/iperc': [
    q(
      '¿Qué es el IPERC y cómo se hace?',
      'Explícame qué es el IPERC con un ejemplo sencillo de un puesto de oficina y cómo se hace paso a paso.',
    ),
    q(
      '¿Cada cuánto actualizo el IPERC?',
      '¿Cada cuánto tiempo debo actualizar el IPERC y en qué casos debo hacerlo antes?',
    ),
    q(
      '¿Qué es un procedimiento de trabajo seguro?',
      'Explícame en palabras simples qué son el PETS, el PETAR y el ATS, y cuándo necesito cada uno.',
    ),
  ],
  '/dashboard/sst/accidentes': [
    q(
      'Tuve un accidente de trabajo, ¿qué hago?',
      'Un trabajador tuvo un accidente de trabajo. ¿Qué debo hacer y en qué plazo debo avisar al Ministerio de Trabajo?',
    ),
    q(
      '¿Qué diferencia hay entre incidente y accidente?',
      '¿Cuál es la diferencia entre un incidente y un accidente de trabajo? ¿Debo registrar los dos?',
    ),
    q(
      '¿Qué es el SCTR y quién lo necesita?',
      '¿Qué es el SCTR (seguro complementario de trabajo de riesgo) y qué trabajadores lo necesitan?',
    ),
  ],
  '/dashboard/sst/emo': [
    q(
      '¿Qué son los exámenes médicos ocupacionales?',
      'Explícame qué son los exámenes médicos ocupacionales (EMO), cuándo se hacen y quién los paga.',
    ),
    q(
      '¿Puedo ver el diagnóstico médico de un trabajador?',
      '¿Puedo conocer el diagnóstico médico de un trabajador? ¿Qué información médica sí puedo guardar como empleador?',
    ),
    q(
      '¿Cada cuánto se repiten los exámenes?',
      '¿Cada cuánto tiempo deben repetirse los exámenes médicos ocupacionales de mis trabajadores?',
    ),
  ],
  '/dashboard/sst/epp': [
    q(
      '¿Qué equipos de protección debo entregar?',
      '¿Cómo sé qué equipos de protección personal (EPP) debo entregar a cada trabajador?',
    ),
    q(
      '¿Cómo registro la entrega de EPP?',
      '¿Cómo debo registrar la entrega de equipos de protección para que SUNAFIL la acepte?',
    ),
    q(
      '¿Puedo descontar el EPP del sueldo?',
      '¿Puedo cobrar o descontar del sueldo los equipos de protección que entrego a mis trabajadores?',
    ),
  ],
  '/dashboard/sst/comite': [
    Q.comiteOSupervisor,
    q(
      '¿Cómo se elige el comité de SST?',
      '¿Cómo se elige el comité de seguridad y salud en el trabajo? Explícame los pasos en palabras simples.',
    ),
    q(
      '¿Cada cuánto se reúne el comité?',
      '¿Cada cuánto debe reunirse el comité de seguridad y salud en el trabajo y qué se anota en sus actas?',
    ),
  ],
  '/dashboard/sst/plan-anual': [
    q(
      '¿Qué debe tener el plan anual de SST?',
      '¿Qué debe tener el plan anual de seguridad y salud en el trabajo? Explícamelo con un ejemplo para una empresa pequeña.',
    ),
    q(
      '¿Cuántas capacitaciones de SST debo dar?',
      '¿Cuántas capacitaciones de seguridad y salud en el trabajo debo dar al año y sobre qué temas?',
    ),
    Q.sstDocumentos,
  ],

  /* Ajustes y ayuda */
  '/dashboard/sst/arco': [
    q(
      '¿Qué son los derechos ARCO?',
      'Explícame en palabras simples qué son los derechos ARCO de mis trabajadores y en qué plazo debo responder un pedido.',
    ),
    Q.datosPersonales,
    q(
      '¿Necesito el consentimiento de mis trabajadores?',
      '¿Necesito el consentimiento de mis trabajadores para guardar sus datos personales y médicos?',
    ),
  ],
  '/dashboard/integraciones': [Q.tregistro, Q.plame],
  '/dashboard/ayuda': STARTER_SUGGESTIONS,
}

/** Preguntas para fichas o detalles abiertos (rutas con `[id]`). */
const ENTITY_SUGGESTIONS: Partial<Record<Exclude<PageEntityType, null>, readonly AssistantSuggestion[]>> = {
  worker: [Q.documentosTrabajador, Q.liquidacion, Q.terminarRelacion, Q.vacacionesDias],
  contract: [
    Q.clausulasClave,
    q(
      '¿Cómo renuevo un contrato a plazo fijo?',
      '¿Cómo renuevo correctamente un contrato a plazo fijo y cuál es el plazo máximo que puede durar?',
    ),
    Q.contratoVencido,
  ],
  diagnostic: [
    q(
      '¿Por dónde empiezo a corregir?',
      'Ya hice el diagnóstico laboral de mi empresa. ¿Cómo decido por dónde empezar a corregir las faltas según el riesgo de multa?',
    ),
    Q.multasCalculo,
    Q.corregirATiempo,
  ],
  complaint: [Q.hostigamientoDenuncia, Q.hostigamientoProteccion, Q.hostigamientoPrevencion],
  inspection: [
    Q.llegoInspector,
    q(
      '¿Qué derechos tengo durante la inspección?',
      '¿Qué derechos tengo como empleador durante una inspección de SUNAFIL?',
    ),
    Q.corregirATiempo,
  ],
}

/* ── Lógica pura (testeable) ────────────────────────────────────────── */

/**
 * Heurística: detecta el tipo de entidad a partir del segmento padre + param.
 */
export function detectEntity(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
): { type: PageEntityType; id: string | null } {
  // Param [id] (nombre común en rutas dinámicas)
  const rawId =
    (typeof params.id === 'string' && params.id) ||
    (Array.isArray(params.id) && params.id[0]) ||
    null

  if (!rawId) return { type: null, id: null }

  if (pathname.includes('/trabajadores/')) return { type: 'worker', id: rawId }
  if (pathname.includes('/contratos/')) return { type: 'contract', id: rawId }
  if (pathname.includes('/diagnostico/')) return { type: 'diagnostic', id: rawId }
  if (pathname.includes('/denuncias/')) return { type: 'complaint', id: rawId }
  if (pathname.includes('/sst/')) return { type: 'sst', id: rawId }
  if (pathname.includes('/expedientes/') || pathname.includes('/documentos/'))
    return { type: 'document', id: rawId }
  if (pathname.includes('/inspeccion-en-vivo/')) return { type: 'inspection', id: rawId }

  return { type: null, id: rawId }
}

function uniqueByLabel(list: readonly AssistantSuggestion[]): AssistantSuggestion[] {
  const seen = new Set<string>()
  const out: AssistantSuggestion[] = []
  for (const s of list) {
    if (seen.has(s.label)) continue
    seen.add(s.label)
    out.push(s)
  }
  return out
}

/**
 * Preguntas propias de la pantalla: ficha abierta → página → página padre →
 * grupo del menú → preguntas generales.
 */
function pageSuggestionsFor(
  pathname: string,
  entityType: PageEntityType,
): readonly AssistantSuggestion[] {
  const entitySuggestions = entityType ? ENTITY_SUGGESTIONS[entityType] : undefined
  if (entitySuggestions) return entitySuggestions

  const { hub, entry } = resolveNavLocation(pathname)
  if (entry) {
    const own = PAGE_SUGGESTIONS[entry.href]
    if (own) return own
    const parent = entry.parentHref ? PAGE_SUGGESTIONS[entry.parentHref] : undefined
    if (parent) return parent
  }
  return HUB_SUGGESTIONS[hub.key] ?? GENERAL_SUGGESTIONS
}

/**
 * De 3 a 4 preguntas para la pantalla actual. En cuentas nuevas, las dos
 * primeras son de arranque ("¿Por dónde empiezo?", "¿Me corresponde el
 * régimen MYPE?") y luego van las propias de la pantalla.
 */
export function buildSuggestions(
  pathname: string,
  entityType: PageEntityType,
  options: PageContextOptions = {},
): readonly AssistantSuggestion[] {
  const own = pageSuggestionsFor(pathname, entityType)
  const ordered = options.isNewAccount
    ? [...STARTER_SUGGESTIONS.slice(0, 2), ...own, ...STARTER_SUGGESTIONS.slice(2)]
    : [...own, ...GENERAL_SUGGESTIONS]
  // Siempre 3 o 4 preguntas: si la página tiene menos de 3, se completa con
  // preguntas generales.
  const limit = options.isNewAccount
    ? MAX_SUGGESTIONS
    : Math.max(MIN_SUGGESTIONS, Math.min(own.length, MAX_SUGGESTIONS))
  return uniqueByLabel(ordered).slice(0, limit)
}

const ENTITY_LABELS: Partial<Record<Exclude<PageEntityType, null>, string>> = {
  worker: 'Ficha de un trabajador',
  contract: 'Detalle de un contrato',
  diagnostic: 'Resultado del diagnóstico',
  complaint: 'Detalle de una denuncia',
  inspection: 'Inspección en curso',
}

/** Nombre corto de la pantalla actual, para mostrar en el asistente. */
export function humanLabelFor(pathname: string, entityType: PageEntityType, entityId: string | null): string {
  const entityLabel = entityType && entityId ? ENTITY_LABELS[entityType] : undefined
  if (entityLabel) return entityLabel
  const { hub, entry } = resolveNavLocation(pathname)
  if (!entry || entry.href === hub.rootHref || entry.label === 'Resumen') return hub.label
  return entry.label
}

/* ── Hook ───────────────────────────────────────────────────────────── */

/**
 * Hook principal: devuelve el contexto de la página actual.
 * Reactivo a cambios de pathname. Sin fetch: solo lee la ruta.
 * `isNewAccount` lo calcula quien llama (el panel del asistente).
 */
export function usePageContext(options: PageContextOptions = {}): PageContext {
  const pathname = usePathname() ?? '/dashboard'
  const rawParams = useParams() ?? {}
  // useParams puede devolver llaves undefined; se tipa como registro estricto
  const params = rawParams as Record<string, string | string[] | undefined>
  const isNewAccount = options.isNewAccount === true

  return useMemo(() => {
    const { hub } = resolveNavLocation(pathname)
    const entity = detectEntity(pathname, params)
    return {
      hub,
      pathname,
      entityId: entity.id,
      entityType: entity.type,
      humanLabel: humanLabelFor(pathname, entity.type, entity.id),
      suggestions: buildSuggestions(pathname, entity.type, { isNewAccount }),
    }
  }, [pathname, params, isNewAccount])
}

/**
 * Re-export de los grupos del menú (compatibilidad con imports previos).
 */
export { NAV_HUBS }
