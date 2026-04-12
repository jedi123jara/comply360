/**
 * Action Plan AI Engine
 *
 * Genera un plan de acción priorizado a partir del resultado de un diagnóstico
 * de compliance. Toma las áreas con menor score y construye un cronograma con
 * tareas específicas, responsables sugeridos, plazos e impacto esperado.
 */

import { callAI, extractJson, getModelName } from './provider'
import { getRelevantLegalContext } from './rag/retriever'

export interface DiagnosticInput {
  orgName: string
  scoreGlobal: number
  scoreByArea: Record<string, number>
  totalMultaRiesgo: number
  regimenLaboral?: string | null
  numTrabajadores?: number
  // Áreas o brechas detectadas (texto libre)
  topGaps?: string[]
}

export interface ActionPlanTask {
  id: string
  titulo: string
  descripcion: string
  area: string
  responsable: 'RRHH' | 'LEGAL' | 'GERENCIA' | 'SST' | 'CONTABILIDAD' | 'IT'
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
  plazoDias: number
  impactoScore: number // puntos que sumaría al score global
  baseLegal: string
  multaEvitada?: number
}

export interface ActionPlan {
  generadoPor: 'ai' | 'simulated'
  modelo: string
  generadoAt: string
  resumen: string
  tareas: ActionPlanTask[]
  proyeccionScore: {
    actual: number
    estimadoTrasPlan: number
    incremento: number
  }
  multaEvitadaTotal: number
}

const SYSTEM_PROMPT = `Eres un consultor laboral peruano senior, experto en compliance SUNAFIL.
Tu trabajo es generar planes de acción accionables a partir del diagnóstico de cumplimiento de una empresa.

REGLAS ESTRICTAS:
1. Devuelve SOLO un JSON válido (sin texto adicional, sin markdown).
2. Usa exclusivamente normativa peruana real (D.Leg. 728, D.S. 003-97-TR, Ley 29783, Ley 29733, Ley 30709, etc.).
3. Las tareas deben ser específicas y ejecutables, no genéricas.
4. Prioriza áreas con menor score y mayor multa potencial.
5. Cada tarea debe tener entre 1 y 30 días de plazo (no más).
6. Usa lenguaje profesional pero conciso (no más de 80 palabras por descripción).
7. Máximo 8 tareas. Calidad sobre cantidad.

FORMATO DE SALIDA (JSON):
{
  "resumen": "string (2-3 oraciones)",
  "tareas": [
    {
      "id": "string",
      "titulo": "string (imperativo, max 60 chars)",
      "descripcion": "string (1-2 oraciones)",
      "area": "string (ej: contratos, sst, planilla)",
      "responsable": "RRHH" | "LEGAL" | "GERENCIA" | "SST" | "CONTABILIDAD" | "IT",
      "prioridad": "CRITICA" | "ALTA" | "MEDIA" | "BAJA",
      "plazoDias": number,
      "impactoScore": number,
      "baseLegal": "string (norma específica)",
      "multaEvitada": number (en soles, opcional)
    }
  ],
  "proyeccionIncremento": number
}`

function buildUserPrompt(input: DiagnosticInput): string {
  const areas = Object.entries(input.scoreByArea)
    .sort(([, a], [, b]) => a - b)
    .map(([k, v]) => `  - ${k}: ${v}/100`)
    .join('\n')

  const gaps = input.topGaps && input.topGaps.length > 0
    ? `\nBrechas detectadas:\n${input.topGaps.map(g => `  - ${g}`).join('\n')}`
    : ''

  return `Empresa: ${input.orgName}
Score global actual: ${input.scoreGlobal}/100
Multa potencial estimada: S/ ${input.totalMultaRiesgo.toLocaleString('es-PE')}
${input.regimenLaboral ? `Régimen laboral: ${input.regimenLaboral}` : ''}
${input.numTrabajadores ? `Trabajadores: ${input.numTrabajadores}` : ''}

Score por área:
${areas}
${gaps}

Genera un plan de acción priorizado con máximo 8 tareas para llevar el score sobre 85/100 en 90 días.
Cada tarea debe atacar las áreas más débiles primero. Devuelve SOLO el JSON especificado.`
}

interface RawAIResponse {
  resumen?: string
  tareas?: Partial<ActionPlanTask>[]
  proyeccionIncremento?: number
}

/**
 * Genera plan de acción usando IA. Si falla, devuelve un plan simulado base.
 */
export async function generateActionPlan(input: DiagnosticInput): Promise<ActionPlan> {
  const generadoAt = new Date().toISOString()

  try {
    // Recuperar normativa relevante via RAG (áreas con peor score)
    const ragQuery = `multa sunafil ${Object.keys(input.scoreByArea).join(' ')} ${input.topGaps?.join(' ') ?? ''}`
    const ragContext = getRelevantLegalContext(ragQuery, 4)
    const systemWithRag = SYSTEM_PROMPT + ragContext

    const content = await callAI(
      [
        { role: 'system', content: systemWithRag },
        { role: 'user', content: buildUserPrompt(input) },
      ],
      { temperature: 0.2, maxTokens: 1800, jsonMode: true, feature: 'action-plan' }
    )

    const parsed = extractJson<RawAIResponse>(content)

    if (!parsed.tareas || !Array.isArray(parsed.tareas) || parsed.tareas.length === 0) {
      throw new Error('Respuesta del LLM sin tareas')
    }

    const tareas: ActionPlanTask[] = parsed.tareas.slice(0, 8).map((t, idx) => ({
      id: t.id || `task-${idx + 1}`,
      titulo: String(t.titulo || 'Tarea sin título').slice(0, 80),
      descripcion: String(t.descripcion || ''),
      area: String(t.area || 'general'),
      responsable: (['RRHH', 'LEGAL', 'GERENCIA', 'SST', 'CONTABILIDAD', 'IT'].includes(t.responsable as string)
        ? t.responsable
        : 'RRHH') as ActionPlanTask['responsable'],
      prioridad: (['CRITICA', 'ALTA', 'MEDIA', 'BAJA'].includes(t.prioridad as string)
        ? t.prioridad
        : 'MEDIA') as ActionPlanTask['prioridad'],
      plazoDias: Math.min(Math.max(Number(t.plazoDias) || 15, 1), 90),
      impactoScore: Math.min(Math.max(Number(t.impactoScore) || 3, 1), 25),
      baseLegal: String(t.baseLegal || 'Normativa laboral peruana'),
      multaEvitada: t.multaEvitada ? Number(t.multaEvitada) : undefined,
    }))

    const incrementoTotal = tareas.reduce((acc, t) => acc + t.impactoScore, 0)
    const multaEvitadaTotal = tareas.reduce((acc, t) => acc + (t.multaEvitada ?? 0), 0)
    const estimadoTrasPlan = Math.min(input.scoreGlobal + incrementoTotal, 100)

    return {
      generadoPor: 'ai',
      modelo: getModelName({ feature: 'action-plan' }),
      generadoAt,
      resumen: parsed.resumen || 'Plan de acción generado para mejorar el compliance laboral.',
      tareas,
      proyeccionScore: {
        actual: input.scoreGlobal,
        estimadoTrasPlan,
        incremento: estimadoTrasPlan - input.scoreGlobal,
      },
      multaEvitadaTotal,
    }
  } catch (error) {
    console.warn('[action-plan] AI falló, usando plan simulado:', error)
    return generateSimulatedPlan(input, generadoAt)
  }
}

/**
 * Plan simulado basado en heurísticas — fallback cuando la IA no responde.
 * Genera tareas según las áreas con menor score.
 */
function generateSimulatedPlan(input: DiagnosticInput, generadoAt: string): ActionPlan {
  const sorted = Object.entries(input.scoreByArea).sort(([, a], [, b]) => a - b)
  const tareas: ActionPlanTask[] = []

  const TEMPLATES: Record<string, Omit<ActionPlanTask, 'id' | 'plazoDias' | 'impactoScore'>> = {
    contratos: {
      titulo: 'Actualizar y firmar contratos pendientes',
      descripcion: 'Revisar todos los contratos vigentes, verificar cláusulas obligatorias y completar firmas faltantes.',
      area: 'contratos',
      responsable: 'LEGAL',
      prioridad: 'CRITICA',
      baseLegal: 'D.S. 003-97-TR (TUO LPCL), Art. 4',
      multaEvitada: 23000,
    },
    sst: {
      titulo: 'Implementar sistema SST básico',
      descripcion: 'Designar comité de SST, redactar política de seguridad y realizar el primer simulacro de evacuación.',
      area: 'sst',
      responsable: 'SST',
      prioridad: 'CRITICA',
      baseLegal: 'Ley 29783, Art. 26-29',
      multaEvitada: 87000,
    },
    documentos: {
      titulo: 'Subir documentos obligatorios faltantes',
      descripcion: 'Cargar copias de DNI, certificados de antecedentes y exámenes médicos pre-ocupacionales pendientes.',
      area: 'documentos',
      responsable: 'RRHH',
      prioridad: 'ALTA',
      baseLegal: 'D.S. 001-98-TR',
      multaEvitada: 12000,
    },
    planilla: {
      titulo: 'Regularizar boletas de pago electrónicas',
      descripcion: 'Generar y entregar boletas electrónicas de los últimos 3 meses con formato SUNAT vigente.',
      area: 'planilla',
      responsable: 'CONTABILIDAD',
      prioridad: 'ALTA',
      baseLegal: 'R.M. 020-2008-TR',
      multaEvitada: 18000,
    },
    vencimientos: {
      titulo: 'Renovar contratos próximos a vencer',
      descripcion: 'Identificar contratos a plazo fijo con vencimiento en 30 días y decidir renovación o cierre.',
      area: 'contratos',
      responsable: 'RRHH',
      prioridad: 'ALTA',
      baseLegal: 'D.S. 003-97-TR, Art. 16',
    },
    capacitaciones: {
      titulo: 'Programar capacitaciones SST obligatorias',
      descripcion: 'Calendarizar las 4 capacitaciones SST anuales y registrar asistencia en libro digital.',
      area: 'sst',
      responsable: 'SST',
      prioridad: 'MEDIA',
      baseLegal: 'Ley 29783, Art. 35',
      multaEvitada: 9000,
    },
    igualdad: {
      titulo: 'Auditar brechas salariales por género',
      descripcion: 'Aplicar el método DICR y publicar resultados conforme a la Ley 30709.',
      area: 'igualdad',
      responsable: 'RRHH',
      prioridad: 'MEDIA',
      baseLegal: 'Ley 30709, D.S. 002-2018-TR',
    },
  }

  const usedAreas = new Set<string>()
  let plazoCum = 7
  for (const [area, score] of sorted.slice(0, 8)) {
    const tplKey = Object.keys(TEMPLATES).find(k => area.toLowerCase().includes(k)) || 'contratos'
    if (usedAreas.has(tplKey)) continue
    usedAreas.add(tplKey)
    const tpl = TEMPLATES[tplKey]
    const impacto = Math.max(3, Math.min(15, 90 - score) / 6)
    tareas.push({
      ...tpl,
      id: `task-${tareas.length + 1}`,
      plazoDias: plazoCum,
      impactoScore: Math.round(impacto),
    })
    plazoCum += 7
    if (tareas.length >= 6) break
  }

  const incrementoTotal = tareas.reduce((acc, t) => acc + t.impactoScore, 0)
  const multaEvitadaTotal = tareas.reduce((acc, t) => acc + (t.multaEvitada ?? 0), 0)
  const estimadoTrasPlan = Math.min(input.scoreGlobal + incrementoTotal, 100)

  return {
    generadoPor: 'simulated',
    modelo: 'simulated',
    generadoAt,
    resumen: `Plan base sugerido a partir de las áreas con menor puntaje. Atiende ${tareas.length} brechas críticas para llevar el score de ${input.scoreGlobal} a ${estimadoTrasPlan}/100.`,
    tareas,
    proyeccionScore: {
      actual: input.scoreGlobal,
      estimadoTrasPlan,
      incremento: estimadoTrasPlan - input.scoreGlobal,
    },
    multaEvitadaTotal,
  }
}
