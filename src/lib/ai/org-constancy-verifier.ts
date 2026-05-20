/**
 * Org Constancy Verifier — auto-verifica las constancias que el cliente sube
 * (SCTR, REMYPE, CTS, AFP, EsSalud, PLAME, DJ Utilidades, informes de laboratorio,
 * actas de simulacros, registros SUNAFIL de tercerizadoras, etc.).
 *
 * A diferencia de `document-verifier.ts` que verifica documentos del worker,
 * acá verificamos documentos de la **empresa** y validamos campos contra los
 * datos de la org (RUC, razón social, régimen, sector).
 *
 * Cada tipo tiene un prompt especializado que indica a la IA:
 *  1. Cómo identificar el documento (ej. "busca la palabra REMYPE y un código RM-...")
 *  2. Qué campos extraer (numeroRegistro, vigenciaHasta, etc.)
 *  3. Qué validaciones cruzadas hacer (RUC concuerda, asegurador en whitelist, etc.)
 *
 * Devuelve estructuras tipadas + decisión legible al admin. Nunca lanza.
 */

import { callAI, type AIMessage } from '@/lib/ai/provider'
import type { OrgDocType } from '@/generated/prisma/client'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface OrgIdentity {
  ruc: string | null
  razonSocial: string | null
  regimenPrincipal: string | null
  sector: string | null
}

export interface ConstancyInput {
  fileUrl: string
  mimeType: string | null
  documentType: OrgDocType
  /** Identidad de la org para cross-match (RUC + razón social). */
  org: OrgIdentity
}

export type ConstancyDecision =
  | 'auto-verified'
  | 'needs-review'
  | 'mismatch'
  | 'wrong-type'
  | 'unreadable'
  | 'unsupported'
  | 'error'

export interface ConstancyResult {
  decision: ConstancyDecision
  confidence: number // 0-1
  /** Campos extraídos del documento según su tipo. */
  extracted: Record<string, string | null | number | string[]>
  issues: string[]
  summary: string
  /** Fecha de vencimiento extraída (ISO YYYY-MM-DD). */
  expiresAt: string | null
  /** Señales de manipulación detectadas. */
  suspicionFlags: string[]
  model?: string
  errorMessage?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// Prompts especializados por tipo
// ═══════════════════════════════════════════════════════════════════════════

interface PromptDef {
  /** Descripción del documento esperado. */
  description: string
  /** Campos JSON que debe extraer la IA. */
  fieldsToExtract: string[]
  /** Validaciones específicas. */
  validations: string[]
}

const PROMPTS: Partial<Record<OrgDocType, PromptDef>> = {
  SCTR_POLIZA: {
    description:
      'Póliza de Seguro Complementario de Trabajo de Riesgo (SCTR), emitida por aseguradora privada (Pacífico, Rímac, Mapfre, Positiva, La Positiva Vida) o EsSalud (cobertura Salud) + AFP (cobertura Pensión).',
    fieldsToExtract: [
      'numeroPoliza',
      'asegurador',
      'rucCliente',
      'razonSocialCliente',
      'vigenciaDesde (YYYY-MM-DD)',
      'vigenciaHasta (YYYY-MM-DD)',
      'coberturaSalud (boolean)',
      'coberturaPension (boolean)',
      'actividadesCubiertas (lista)',
    ],
    validations: [
      'El RUC del cliente debe coincidir con el RUC de la org.',
      'El asegurador debe ser una aseguradora autorizada por SBS.',
      'La vigencia debe ser ≤ 1 año desde la emisión (típico SCTR).',
    ],
  },
  REMYPE_CONSTANCIA: {
    description:
      'Constancia de inscripción en el Registro Nacional de la Micro y Pequeña Empresa (REMYPE), emitida por SUNAT/MTPE. Lleva un código alfanumérico tipo "RM-XXXX-XXX".',
    fieldsToExtract: [
      'numeroRegistro',
      'rucEmpresa',
      'razonSocial',
      'fechaInscripcion (YYYY-MM-DD)',
      'regimenMype (MICRO | PEQUENA)',
      'vigenteHasta (YYYY-MM-DD o "INDEFINIDO")',
    ],
    validations: [
      'El RUC debe coincidir con el de la org.',
      'El régimen MYPE debe coincidir con Organization.regimenPrincipal.',
    ],
  },
  CTS_DEPOSITO_CONSTANCIA: {
    description:
      'Constancia bancaria de depósito de CTS (Compensación por Tiempo de Servicios). Emitida por Banco de Crédito, Interbank, BBVA, Scotiabank, etc. Indica banco, número de cuenta, monto y periodo (MAY-OCT o NOV-ABR).',
    fieldsToExtract: [
      'banco',
      'numeroCuenta',
      'monto (PEN)',
      'periodoDepositado (MAY-OCT | NOV-ABR)',
      'fechaDeposito (YYYY-MM-DD)',
      'dniTrabajador',
      'nombreTrabajador',
    ],
    validations: [
      'La fecha de depósito debe ser ≤ 15 mayo o 15 noviembre del año correspondiente.',
      'El banco debe ser autorizado por SBS.',
    ],
  },
  AFP_PAGO_CONSTANCIA: {
    description:
      'Constancia de pago de aportes a AFP (Profuturo, Integra, Prima, Habitat). Indica periodo, monto y número de declaración.',
    fieldsToExtract: [
      'afp',
      'periodo (YYYY-MM)',
      'montoAportes (PEN)',
      'numeroDeclaracion',
      'fechaPago (YYYY-MM-DD)',
    ],
    validations: [
      'El pago debe ser dentro de los 5 días hábiles del mes siguiente al periodo.',
    ],
  },
  ONP_PAGO_CONSTANCIA: {
    description:
      'Constancia de pago de aportes a ONP. Indica periodo, monto y número de declaración SUNAT.',
    fieldsToExtract: [
      'periodo (YYYY-MM)',
      'montoAportes (PEN)',
      'numeroDeclaracion',
      'fechaPago (YYYY-MM-DD)',
    ],
    validations: [
      'El pago debe ser dentro de los 5 días hábiles del mes siguiente al periodo.',
    ],
  },
  ESSALUD_PAGO_CONSTANCIA: {
    description:
      'Constancia de pago de aportes a EsSalud (9% de planilla). Emitida por SUNAT.',
    fieldsToExtract: [
      'periodo (YYYY-MM)',
      'montoAportes (PEN)',
      'numeroDJ',
      'fechaPago (YYYY-MM-DD)',
    ],
    validations: ['El monto debe ser ≥ 9% de la planilla del periodo.'],
  },
  PLAME_CONFIRMACION: {
    description:
      'Confirmación de envío de la Planilla Electrónica Mensual (PLAME) a SUNAT. Indica periodo, número de DJ, fecha de presentación y número de trabajadores.',
    fieldsToExtract: [
      'periodo (YYYY-MM)',
      'numeroDJ',
      'fechaPresentacion (YYYY-MM-DD)',
      'numeroTrabajadores',
    ],
    validations: [
      'El periodo debe coincidir con el mes calendario reportado.',
      'La fecha de presentación debe respetar el cronograma SUNAT.',
    ],
  },
  DJ_UTILIDADES: {
    description:
      'Declaración Jurada anual de utilidades (D.Leg. 892). Indica ejercicio fiscal, utilidad distribuible, monto total pagado.',
    fieldsToExtract: [
      'ejercicio (YYYY)',
      'utilidadDistribuible (PEN)',
      'montoTotal (PEN)',
      'fechaPago (YYYY-MM-DD)',
    ],
    validations: [
      'El pago a trabajadores debe ser dentro de los 30 días de vencido el plazo de la DJ Anual SUNAT.',
    ],
  },
  INFORME_LAB_FISICO: {
    description:
      'Informe de laboratorio de monitoreo de agentes físicos (ruido, vibración, iluminación, temperatura, radiación). Emitido por laboratorio acreditado por INACAL.',
    fieldsToExtract: [
      'laboratorio',
      'numeroAcreditacionInacal',
      'fechaInforme (YYYY-MM-DD)',
      'agentesEvaluados (lista)',
      'lugaresMedidos (lista)',
      'conformidad (CONFORME | NO_CONFORME)',
      'vigenciaHasta (YYYY-MM-DD)',
    ],
    validations: [
      'El laboratorio debe estar acreditado por INACAL.',
      'La vigencia típica es 1 año.',
    ],
  },
  INFORME_LAB_QUIMICO: {
    description:
      'Informe de laboratorio de monitoreo de agentes químicos (gases, vapores, polvos, neblinas). Emitido por laboratorio acreditado.',
    fieldsToExtract: [
      'laboratorio',
      'fechaInforme (YYYY-MM-DD)',
      'sustanciasEvaluadas (lista)',
      'lugaresMedidos (lista)',
      'conformidad (CONFORME | NO_CONFORME)',
      'vigenciaHasta (YYYY-MM-DD)',
    ],
    validations: ['Laboratorio acreditado INACAL.'],
  },
  INFORME_LAB_BIOLOGICO: {
    description:
      'Informe de laboratorio de monitoreo de agentes biológicos (bacterias, virus, hongos).',
    fieldsToExtract: [
      'laboratorio',
      'fechaInforme (YYYY-MM-DD)',
      'agentesBiologicos (lista)',
      'conformidad (CONFORME | NO_CONFORME)',
      'vigenciaHasta (YYYY-MM-DD)',
    ],
    validations: ['Laboratorio acreditado INACAL.'],
  },
  INFORME_LAB_ERGONOMICO: {
    description:
      'Evaluación ergonómica de puestos de trabajo (Norma Básica Ergonomía R.M. 375-2008-TR).',
    fieldsToExtract: [
      'evaluador',
      'fechaInforme (YYYY-MM-DD)',
      'puestosEvaluados (lista)',
      'factoresEvaluados (lista)',
      'conformidad (CONFORME | NO_CONFORME)',
      'vigenciaHasta (YYYY-MM-DD)',
    ],
    validations: [
      'Debe seguir metodología R.M. 375-2008-TR (REBA, RULA, OWAS, etc.).',
    ],
  },
  INFORME_LAB_PSICOSOCIAL: {
    description:
      'Evaluación de riesgos psicosociales (estrés, carga mental, hostigamiento, etc.).',
    fieldsToExtract: [
      'evaluador',
      'fechaInforme (YYYY-MM-DD)',
      'metodologia',
      'factoresEvaluados (lista)',
      'conformidad (CONFORME | NO_CONFORME)',
    ],
    validations: ['Metodología validada (ISTAS-21, F-PSICO, etc.).'],
  },
  ACTA_SIMULACRO_EVACUACION: {
    description:
      'Acta de simulacro de evacuación (INDECI). Indica fecha, tipo de simulacro, participantes, duración y observaciones.',
    fieldsToExtract: [
      'fecha (YYYY-MM-DD)',
      'tipoSimulacro (EVACUACION | SISMO | INCENDIO | EMERGENCIA_MEDICA)',
      'numeroParticipantes',
      'duracionMinutos',
      'observaciones',
      'firmaResponsable',
    ],
    validations: ['Debe realizarse al menos 2 veces al año.'],
  },
  ACTA_COMITE_SST_MENSUAL: {
    description:
      'Acta mensual del Comité de Seguridad y Salud en el Trabajo (D.S. 005-2012-TR Art. 68).',
    fieldsToExtract: [
      'fechaSesion (YYYY-MM-DD)',
      'numeroSesion',
      'miembrosAsistentes (lista)',
      'acuerdos (lista)',
      'firmas (numero)',
    ],
    validations: [
      'El Comité SST debe sesionar mensualmente.',
      'Cobertura mínima 50% de miembros titulares.',
    ],
  },
  INFORME_ANUAL_HOSTIGAMIENTO_MTPE: {
    description:
      'Informe anual estadístico de casos de hostigamiento sexual remitido al MTPE (D.S. 014-2019-MIMP Art. 30). Anonimizado.',
    fieldsToExtract: [
      'ejercicio (YYYY)',
      'numeroCasosRecibidos',
      'numeroCasosResueltos',
      'numeroCasosDesestimados',
      'fechaPresentacion (YYYY-MM-DD)',
    ],
    validations: [
      'Debe presentarse anualmente incluso con cero casos.',
    ],
  },
  CONVENIO_PRACTICAS_REGISTRADO_MTPE: {
    description:
      'Convenio de prácticas pre-profesionales o profesionales registrado ante el MTPE (Ley 28518 Art. 46). Incluye sello/firma del MTPE.',
    fieldsToExtract: [
      'numeroRegistro',
      'fechaRegistro (YYYY-MM-DD)',
      'dniPracticante',
      'nombrePracticante',
      'centroFormacion',
      'duracion (meses)',
      'fechaInicio (YYYY-MM-DD)',
      'fechaFin (YYYY-MM-DD)',
    ],
    validations: [
      'Registrado dentro de los 15 días de firmado.',
      'El centro de formación debe estar acreditado.',
    ],
  },
  AUTORIZACION_MTPE_EXTRANJERO: {
    description:
      'Autorización del MTPE para contratación de trabajador extranjero (D.Leg. 689 Art. 4). Incluye número de expediente y plazo máximo.',
    fieldsToExtract: [
      'numeroExpediente',
      'fechaAutorizacion (YYYY-MM-DD)',
      'dniExtranjero',
      'nombreExtranjero',
      'nacionalidad',
      'plazoMaximoMeses',
      'fechaVencimiento (YYYY-MM-DD)',
      'restricciones',
    ],
    validations: ['Autorización vigente (no vencida).'],
  },
  REGISTRO_SUNAFIL_TERCERIZADORA: {
    description:
      'Constancia de inscripción de empresa tercerizadora en el Registro Nacional de Empresas Tercerizadoras de SUNAFIL (D.Leg. 1038, D.S. 006-2008-TR).',
    fieldsToExtract: [
      'numeroRegistro',
      'rucTercerizadora',
      'razonSocialTercerizadora',
      'fechaInscripcion (YYYY-MM-DD)',
      'vigenteHasta (YYYY-MM-DD)',
      'actividadesPermitidas (lista)',
    ],
    validations: [
      'El RUC debe coincidir con el del proveedor (Tercero.ruc) registrado en COMPLY360.',
      'Vigente al día de hoy.',
    ],
  },
  CONSTANCIA_SEGURO_VIDA_LEY: {
    description:
      'Constancia de Seguro de Vida Ley (D.Leg. 688). Obligatorio para trabajadores con 4+ años de servicio.',
    fieldsToExtract: [
      'numeroPoliza',
      'asegurador',
      'rucCliente',
      'vigenciaDesde (YYYY-MM-DD)',
      'vigenciaHasta (YYYY-MM-DD)',
      'trabajadoresCubiertos (numero)',
    ],
    validations: ['El RUC debe coincidir con el de la org.'],
  },
  CUADRO_CATEGORIAS_LEY_30709: {
    description:
      'Cuadro de categorías y funciones equivalentes según Ley 30709 / D.S. 002-2018-TR. Estructurado en categorías A-E con descripción de dimensiones (conocimientos, responsabilidad, esfuerzo, condiciones).',
    fieldsToExtract: [
      'fechaAprobacion (YYYY-MM-DD)',
      'numeroCategorias',
      'metodologia',
      'rangoSalarialMinimo (PEN)',
      'rangoSalarialMaximo (PEN)',
    ],
    validations: [
      'Mínimo 3 categorías.',
      'Debe describir las 4 dimensiones (Ley 30709).',
    ],
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica una constancia subida por el cliente.
 *
 * Devuelve un `ConstancyResult` con campos extraídos + decisión.
 * Nunca lanza — si falla, devuelve `decision: 'error'`.
 */
export async function verifyOrgConstancy(input: ConstancyInput): Promise<ConstancyResult> {
  // Soporte de tipos: solo imágenes y PDFs. DOCX requiere conversión.
  const mime = input.mimeType?.toLowerCase() ?? ''
  if (!mime.startsWith('image/') && mime !== 'application/pdf') {
    return {
      decision: 'unsupported',
      confidence: 0,
      extracted: {},
      issues: [`Tipo de archivo no soportado: ${mime || 'desconocido'}`],
      summary: 'Solo se soportan imágenes (JPG, PNG) y PDFs.',
      expiresAt: null,
      suspicionFlags: [],
    }
  }

  const prompt = PROMPTS[input.documentType]
  if (!prompt) {
    return {
      decision: 'unsupported',
      confidence: 0,
      extracted: {},
      issues: [`No hay verifier configurado para tipo ${input.documentType}`],
      summary: 'Tipo de constancia no reconocido por el verifier.',
      expiresAt: null,
      suspicionFlags: [],
    }
  }

  try {
    const systemPrompt = buildSystemPrompt(input, prompt)
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Analiza este documento y devuelve JSON estricto:\n\n[IMAGEN: ${input.fileUrl}]`,
      },
    ]
    const content = await callAI(messages, {
      feature: 'document-vision',
      maxTokens: 1000,
      temperature: 0.1,
      jsonMode: true,
    })
    return parseResponse(content, prompt)
  } catch (err) {
    return {
      decision: 'error',
      confidence: 0,
      extracted: {},
      issues: ['Falla técnica al consultar la IA.'],
      summary: 'No se pudo verificar el documento. Revisa manualmente.',
      expiresAt: null,
      suspicionFlags: [],
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }
}

function buildSystemPrompt(input: ConstancyInput, prompt: PromptDef): string {
  const orgInfo = [
    input.org.ruc ? `RUC: ${input.org.ruc}` : null,
    input.org.razonSocial ? `Razón social: ${input.org.razonSocial}` : null,
    input.org.regimenPrincipal ? `Régimen: ${input.org.regimenPrincipal}` : null,
    input.org.sector ? `Sector: ${input.org.sector}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return `Eres un auditor de compliance laboral peruano. Analizas documentos oficiales para validar su autenticidad y vigencia.

DOCUMENTO ESPERADO: ${input.documentType}
${prompt.description}

DATOS DE LA EMPRESA (para cross-match):
${orgInfo || '(no disponibles)'}

CAMPOS A EXTRAER:
${prompt.fieldsToExtract.map((f) => `  - ${f}`).join('\n')}

VALIDACIONES:
${prompt.validations.map((v) => `  - ${v}`).join('\n')}

DEVUELVE JSON ESTRICTO con esta estructura:
{
  "decision": "auto-verified" | "needs-review" | "mismatch" | "wrong-type" | "unreadable",
  "confidence": 0.0-1.0,
  "extracted": { <campos extraídos> },
  "issues": ["..."],
  "summary": "1-2 oraciones para el admin",
  "expiresAt": "YYYY-MM-DD" o null,
  "suspicionFlags": ["..."]
}

REGLAS:
- decision="auto-verified" solo si todos los campos clave concuerdan + confianza ≥ 0.85.
- decision="mismatch" si el RUC/datos no coinciden con la org.
- decision="wrong-type" si el documento no es del tipo esperado.
- decision="unreadable" si la imagen es ilegible.
- NUNCA inventes datos. Si no podés leer un campo, usa null.
- NO devuelvas markdown ni texto fuera del JSON.`
}

function parseResponse(content: string, _prompt: PromptDef): ConstancyResult {
  // Extraer JSON del response (a veces viene con markdown wrapping)
  const cleaned = content.trim().replace(/^```json\s*/, '').replace(/```\s*$/, '')
  try {
    const parsed = JSON.parse(cleaned) as ConstancyResult
    return {
      decision: parsed.decision ?? 'needs-review',
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0)),
      extracted: parsed.extracted ?? {},
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      summary: parsed.summary ?? 'Sin resumen',
      expiresAt: parsed.expiresAt ?? null,
      suspicionFlags: Array.isArray(parsed.suspicionFlags) ? parsed.suspicionFlags : [],
    }
  } catch (err) {
    return {
      decision: 'error',
      confidence: 0,
      extracted: {},
      issues: ['La respuesta de la IA no es JSON válido.'],
      summary: 'Falla en el parsing de la respuesta IA.',
      expiresAt: null,
      suspicionFlags: [],
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }
}

/** Lista de tipos soportados — útil para UI. */
export function getSupportedConstancyTypes(): OrgDocType[] {
  return Object.keys(PROMPTS) as OrgDocType[]
}

/** ¿Hay verifier para este tipo? */
export function hasConstancyVerifier(type: OrgDocType): boolean {
  return type in PROMPTS
}
