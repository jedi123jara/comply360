/**
 * "¿Qué contrato necesito?" — lógica pura del orientador de tipo de contrato.
 *
 * Es ORIENTATIVO: hace pocas preguntas simples y sugiere el modelo de contrato
 * más probable según el régimen laboral general (D.Leg. 728 / D.S. 003-97-TR)
 * y el Código Civil (locación de servicios). No reemplaza la asesoría legal.
 *
 * Sin dependencias de React para poder probarlo en Node.
 */

export type AdvisorSubordinacion = 'si' | 'no'
export type AdvisorDuracion = 'permanente' | 'temporal'
export type AdvisorMotivo = 'proyecto' | 'temporada' | 'reemplazo' | 'aumento' | 'sin-motivo'
export type AdvisorJornada = 'completa' | 'parcial'

export interface AdvisorAnswers {
  subordinacion?: AdvisorSubordinacion
  duracion?: AdvisorDuracion
  motivo?: AdvisorMotivo
  jornada?: AdvisorJornada
}

export type AdvisorQuestionId = keyof AdvisorAnswers

export interface AdvisorOption {
  value: string
  label: string
  hint?: string
}

export interface AdvisorQuestion {
  id: AdvisorQuestionId
  question: string
  help?: string
  options: AdvisorOption[]
}

export type AdvisorContractKind = 'indeterminado' | 'plazo-fijo' | 'tiempo-parcial' | 'locacion'

/** IDs de CONTRACT_TEMPLATES (src/lib/legal-engine/contracts/templates.ts). */
export type AdvisorTemplateId = 'laboral-indefinido' | 'laboral-plazo-fijo' | 'locacion-servicios'

export interface AdvisorRecommendation {
  kind: AdvisorContractKind
  templateId: AdvisorTemplateId
  /** Nombre del modelo que se abrirá, tal como lo ve el usuario. */
  templateLabel: string
  title: string
  reason: string
  tips: string[]
  warning?: string
  /** Valores que se dejan marcados en el formulario al usar la sugerencia. */
  presetFields?: Record<string, string>
}

export const ADVISOR_DISCLAIMER =
  'Esta guía es orientativa y no reemplaza la asesoría de un abogado. Cada caso puede tener detalles que cambien la recomendación.'

export const DESNATURALIZACION_WARNING =
  'Ojo: si en la práctica la persona tiene horario, un jefe y recibe órdenes, la locación de servicios puede considerarse una relación laboral (desnaturalización). En ese caso tendrías que reconocer sus beneficios laborales y podrías recibir multas de SUNAFIL.'

/** Explicación en una línea de los cuatro contratos más usados. */
export const CONTRACT_KIND_SUMMARIES: ReadonlyArray<{
  kind: AdvisorContractKind
  title: string
  line: string
}> = [
  {
    kind: 'indeterminado',
    title: 'Plazo indeterminado',
    line: 'Para puestos permanentes. No tiene fecha de fin y es la regla general.',
  },
  {
    kind: 'plazo-fijo',
    title: 'Plazo fijo (sujeto a modalidad)',
    line: 'Solo cuando hay una causa temporal real (un proyecto, una temporada, un reemplazo o un aumento pasajero de trabajo) y se escribe en el contrato.',
  },
  {
    kind: 'tiempo-parcial',
    title: 'Tiempo parcial',
    line: 'Para jornadas de menos de 4 horas diarias en promedio. Debe ser por escrito y algunos beneficios cambian.',
  },
  {
    kind: 'locacion',
    title: 'Locación de servicios',
    line: 'Para un servicio independiente, sin horario ni jefe. Es un contrato civil, no laboral.',
  },
]

const QUESTION_SUBORDINACION: AdvisorQuestion = {
  id: 'subordinacion',
  question: '¿La persona tendrá un horario y un jefe que le dé instrucciones?',
  help: 'Por ejemplo: cumple un horario o turnos, recibe órdenes sobre cómo hacer su trabajo y usa los medios de tu empresa.',
  options: [
    { value: 'si', label: 'Sí, tendrá horario y jefe' },
    { value: 'no', label: 'No, trabajará por su cuenta y entregará un resultado' },
  ],
}

const QUESTION_DURACION: AdvisorQuestion = {
  id: 'duracion',
  question: '¿El puesto es permanente o temporal?',
  options: [
    { value: 'permanente', label: 'Permanente', hint: 'Tu empresa necesitará este puesto de forma continua' },
    { value: 'temporal', label: 'Temporal', hint: 'Hay un motivo concreto que tiene fecha de fin' },
  ],
}

const QUESTION_MOTIVO: AdvisorQuestion = {
  id: 'motivo',
  question: '¿Por qué es temporal?',
  options: [
    { value: 'proyecto', label: 'Por un proyecto u obra con fin definido' },
    { value: 'temporada', label: 'Por una temporada o campaña (verano, fiestas, cosecha)' },
    { value: 'reemplazo', label: 'Para reemplazar a alguien que está de licencia o vacaciones' },
    { value: 'aumento', label: 'Por un aumento pasajero de trabajo o una actividad nueva' },
    { value: 'sin-motivo', label: 'No hay un motivo concreto: queremos probar a la persona' },
  ],
}

const QUESTION_JORNADA: AdvisorQuestion = {
  id: 'jornada',
  question: '¿Cuántas horas trabajará al día?',
  options: [
    { value: 'completa', label: '4 horas o más al día en promedio' },
    { value: 'parcial', label: 'Menos de 4 horas al día en promedio' },
  ],
}

/** Preguntas visibles, en orden, según lo que ya se respondió. */
export function getAdvisorQuestions(answers: AdvisorAnswers): AdvisorQuestion[] {
  const questions: AdvisorQuestion[] = [QUESTION_SUBORDINACION]
  if (answers.subordinacion !== 'si') return questions

  questions.push(QUESTION_DURACION)
  if (!answers.duracion) return questions

  if (answers.duracion === 'temporal') {
    questions.push(QUESTION_MOTIVO)
    if (!answers.motivo) return questions
  }

  questions.push(QUESTION_JORNADA)
  return questions
}

const MOTIVO_REASON: Record<Exclude<AdvisorMotivo, 'sin-motivo'>, string> = {
  proyecto: 'un proyecto u obra con fin definido',
  temporada: 'una temporada o campaña',
  reemplazo: 'el reemplazo de una persona ausente',
  aumento: 'un aumento pasajero de trabajo o una actividad nueva',
}

const MODALIDAD_TIP: Record<Exclude<AdvisorMotivo, 'sin-motivo'>, string> = {
  proyecto: 'En la plantilla, la modalidad que suele corresponder es «Para obra o servicio específico».',
  reemplazo:
    'En la plantilla, la modalidad que suele corresponder es «De suplencia»: indica a quién reemplaza y por qué está ausente.',
  aumento:
    'En la plantilla, suele corresponder «Por inicio o incremento de actividad» o «Por necesidades del mercado», según tu caso.',
  temporada:
    'Las campañas que se repiten cada año tienen una modalidad propia (contrato de temporada). Si no la encuentras en la plantilla, consúltalo con tu asesor antes de firmar.',
}

const CAUSA_TIP =
  'Escribe en el contrato la causa con hechos concretos: qué pasa, desde cuándo y hasta cuándo.'
const PLAZO_FIJO_LIMITE_TIP =
  'Si la persona sigue trabajando después de la fecha de fin, o la causa no es real, el contrato puede considerarse a plazo indeterminado.'

const TEMPLATE_LABELS: Record<AdvisorTemplateId, string> = {
  'laboral-indefinido': 'Plazo indeterminado',
  'laboral-plazo-fijo': 'Plazo fijo',
  'locacion-servicios': 'Locación de servicios',
}

/**
 * Devuelve la sugerencia cuando hay respuestas suficientes; si faltan
 * respuestas devuelve `null`. Las respuestas que ya no aplican (por ejemplo,
 * el motivo cuando el puesto pasó a ser permanente) se ignoran.
 */
export function recommendContract(answers: AdvisorAnswers): AdvisorRecommendation | null {
  if (!answers.subordinacion) return null

  if (answers.subordinacion === 'no') {
    return {
      kind: 'locacion',
      templateId: 'locacion-servicios',
      templateLabel: TEMPLATE_LABELS['locacion-servicios'],
      title: 'Locación de servicios (contrato civil, no laboral)',
      reason:
        'La persona prestará un servicio de forma independiente: organiza su propio trabajo y no tendrá horario ni jefe.',
      tips: [
        'Describe el servicio o los entregables, el plazo y cómo se pagará.',
        'No le fijes horario ni le des órdenes como a un trabajador de planilla.',
      ],
      warning: DESNATURALIZACION_WARNING,
    }
  }

  if (!answers.duracion) return null
  const esTemporal = answers.duracion === 'temporal'
  if (esTemporal && !answers.motivo) return null
  if (!answers.jornada) return null

  const sinCausaReal = esTemporal && answers.motivo === 'sin-motivo'
  const usaPlazoFijo = esTemporal && !sinCausaReal
  const motivo = usaPlazoFijo ? (answers.motivo as Exclude<AdvisorMotivo, 'sin-motivo'>) : null
  const templateId: AdvisorTemplateId = usaPlazoFijo ? 'laboral-plazo-fijo' : 'laboral-indefinido'

  const sinCausaWarning = sinCausaReal
    ? 'Un contrato a plazo fijo sin una causa temporal real puede considerarse a plazo indeterminado (desnaturalización). Para evaluar a la persona existe el periodo de prueba.'
    : undefined

  if (answers.jornada === 'parcial') {
    const tips = [
      `Usa la plantilla de ${TEMPLATE_LABELS[templateId].toLowerCase()} y en «Jornada» elige «Tiempo parcial». Ya lo dejamos marcado.`,
      'El contrato a tiempo parcial debe hacerse por escrito.',
      'Algunos beneficios cambian: por ejemplo, con menos de 4 horas diarias en promedio no corresponde CTS.',
    ]
    if (motivo) tips.push(CAUSA_TIP, MODALIDAD_TIP[motivo])
    return {
      kind: 'tiempo-parcial',
      templateId,
      templateLabel: TEMPLATE_LABELS[templateId],
      title: usaPlazoFijo ? 'Contrato a tiempo parcial y a plazo fijo' : 'Contrato a tiempo parcial',
      reason: motivo
        ? `La persona trabajará menos de 4 horas diarias en promedio y la necesidad es temporal por ${MOTIVO_REASON[motivo]}.`
        : 'La persona trabajará con horario y jefe, pero menos de 4 horas diarias en promedio.',
      tips,
      warning: sinCausaWarning,
      presetFields: { jornada: 'parcial' },
    }
  }

  if (motivo) {
    return {
      kind: 'plazo-fijo',
      templateId,
      templateLabel: TEMPLATE_LABELS[templateId],
      title: 'Contrato a plazo fijo (sujeto a modalidad)',
      reason: `Hay un motivo temporal concreto: ${MOTIVO_REASON[motivo]}.`,
      tips: [
        CAUSA_TIP,
        MODALIDAD_TIP[motivo],
        PLAZO_FIJO_LIMITE_TIP,
        'Por lo general, la suma de contratos a plazo fijo con la misma persona no puede superar 5 años.',
      ],
    }
  }

  return {
    kind: 'indeterminado',
    templateId,
    templateLabel: TEMPLATE_LABELS[templateId],
    title: 'Contrato a plazo indeterminado',
    reason: sinCausaReal
      ? 'Para un contrato a plazo fijo la ley exige una causa temporal real. Si solo quieres evaluar a la persona, usa el periodo de prueba de un contrato a plazo indeterminado.'
      : 'El puesto cubre una necesidad permanente de tu empresa y la persona trabajará con horario y bajo tus instrucciones.',
    tips: [
      'No necesita fecha de fin: el contrato sigue mientras dure la relación laboral.',
      'Puedes pactar un periodo de prueba; por lo general es de 3 meses.',
    ],
    warning: sinCausaWarning,
  }
}
