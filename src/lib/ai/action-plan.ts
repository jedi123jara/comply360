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
  /** Pasos concretos de implementación (3-5 items). Opcional para retro-compat. */
  pasos?: string[]
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
      "multaEvitada": number (en soles, opcional),
      "pasos": ["string", "string", ...]   // 3-5 pasos accionables imperativos
    }
  ],
  "proyeccionIncremento": number
}

EJEMPLO DE "pasos" (concretos, ejecutables, max 80 chars cada uno):
  ["Descargar plantilla SUNAFIL en /docs/iperc-modelo.pdf",
   "Identificar 5 puestos de mayor riesgo del organigrama",
   "Reunir comité SST y completar matriz IPERC",
   "Publicar IPERC firmado en zonas comunes y archivar copia"]
`

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
      pasos: Array.isArray(t.pasos)
        ? (t.pasos as unknown[]).map((p) => String(p)).slice(0, 6)
        : undefined,
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
 *
 * Cada template incluye `pasos` accionables (3-5 pasos imperativos cortos)
 * para que el usuario tenga un cronograma ejecutable real, no solo títulos
 * genéricos. Multas calibradas con D.S. 019-2006-TR + UIT 2026 (S/ 5,500).
 */
function generateSimulatedPlan(input: DiagnosticInput, generadoAt: string): ActionPlan {
  const sorted = Object.entries(input.scoreByArea).sort(([, a], [, b]) => a - b)
  const tareas: ActionPlanTask[] = []

  const TEMPLATES: Record<string, Omit<ActionPlanTask, 'id' | 'plazoDias' | 'impactoScore'>> = {
    contratos: {
      titulo: 'Actualizar y firmar contratos pendientes',
      descripcion: 'Revisar todos los contratos vigentes, verificar cláusulas obligatorias y completar firmas faltantes — desencadena multa muy grave si SUNAFIL inspecciona y encuentra trabajadores sin contrato escrito.',
      area: 'contratos',
      responsable: 'LEGAL',
      prioridad: 'CRITICA',
      baseLegal: 'D.S. 003-97-TR (TUO LPCL), Art. 4 · D.Leg. 728 · Multa: 7-25 UIT (D.S. 019-2006-TR)',
      multaEvitada: 23000,
      pasos: [
        'Exportar lista de trabajadores activos desde Equipo > Trabajadores',
        'En cada perfil, revisar tab Contratos y marcar los que falta firma',
        'Generar contratos faltantes con plantillas en Contratos > Plantillas',
        'Enviar a firma biométrica vía /mi-portal del trabajador (Ley 27269)',
        'Archivar PDFs firmados en el legajo digital de cada trabajador',
      ],
    },
    sst: {
      titulo: 'Implementar sistema SST básico (Ley 29783)',
      descripcion: 'Designar comité de SST, redactar política de seguridad, completar IPERC y realizar primer simulacro. Empresa con +20 trabajadores DEBE tener Comité formal — multa muy grave si no.',
      area: 'sst',
      responsable: 'SST',
      prioridad: 'CRITICA',
      baseLegal: 'Ley 29783, Art. 26-29 · R.M. 050-2013-TR · Multa: 5-26 UIT por trabajador afectado',
      multaEvitada: 87000,
      pasos: [
        'En Riesgo > Generadores IA, generar Política SST + Plan Anual SST',
        'Convocar elecciones del Comité SST (proporcional al # de trabajadores)',
        'Levantar matriz IPERC por puesto (descargable desde /dashboard/sst)',
        'Programar primer simulacro de evacuación con registro fotográfico',
        'Publicar política firmada en zonas comunes y archivar acta de comité',
      ],
    },
    documentos: {
      titulo: 'Completar legajos digitales con docs faltantes',
      descripcion: 'Cargar copias de DNI, antecedentes penales/judiciales/policiales, exámenes médicos pre-ocupacionales y certificados de estudios. SUNAFIL exige el legajo completo en cada inspección.',
      area: 'documentos',
      responsable: 'RRHH',
      prioridad: 'ALTA',
      baseLegal: 'D.S. 001-98-TR · Ley 26790 (EsSalud) · Multa: 0.45-15 UIT',
      multaEvitada: 12000,
      pasos: [
        'Filtrar trabajadores con legajoScore < 80 en Equipo > Trabajadores',
        'Disparar cascada de onboarding desde el perfil — mandará email pidiendo docs',
        'El trabajador sube desde su /mi-portal y la IA Vision auto-verifica',
        'Revisar items con badge "Revisar" y aprobar o rechazar manualmente',
        'Archivar versión final de cada doc con fecha de vencimiento si aplica',
      ],
    },
    planilla: {
      titulo: 'Regularizar boletas de pago electrónicas',
      descripcion: 'Generar y entregar boletas electrónicas de los últimos 3 meses con formato SUNAT vigente, incluyendo todos los conceptos remunerativos y descuentos.',
      area: 'planilla',
      responsable: 'CONTABILIDAD',
      prioridad: 'ALTA',
      baseLegal: 'R.M. 020-2008-TR · D.S. 015-72-TR · Multa: 0.45-7 UIT por trabajador',
      multaEvitada: 18000,
      pasos: [
        'En Equipo > Boletas de pago, generar las boletas pendientes de los últimos 3 meses',
        'Verificar conceptos: básico, asignación familiar, AFP/ONP, EsSalud, renta 5ta',
        'Firmar electrónicamente desde /dashboard y enviar a /mi-portal del trabajador',
        'Archivar copia con sello digital en el legajo de cada trabajador',
      ],
    },
    vencimientos: {
      titulo: 'Renovar contratos a plazo fijo próximos a vencer',
      descripcion: 'Identificar contratos a plazo fijo con vencimiento en 30 días, decidir renovación o cierre, y formalizar antes del fin de plazo (sino se desnaturaliza a indefinido).',
      area: 'contratos',
      responsable: 'RRHH',
      prioridad: 'ALTA',
      baseLegal: 'D.S. 003-97-TR, Art. 16 · Multa por desnaturalización: 5-50 UIT',
      multaEvitada: 35000,
      pasos: [
        'En Calendario, filtrar alertas tipo "CONTRATO_POR_VENCER"',
        'Para cada uno: decidir RENOVAR / CESAR / convertir a indefinido',
        'Si renueva: generar addendum con nueva fecha desde Plantillas',
        'Si cesa: programar liquidación + carta de cese 6 días antes',
        'Si pasa a indefinido: generar nuevo contrato GENERAL y firmar',
      ],
    },
    capacitaciones: {
      titulo: 'Programar las 4 capacitaciones SST anuales',
      descripcion: 'Calendarizar las 4 capacitaciones SST obligatorias del año, registrar asistencia en libro digital y emitir certificados con QR de verificación.',
      area: 'sst',
      responsable: 'SST',
      prioridad: 'MEDIA',
      baseLegal: 'Ley 29783, Art. 35 · D.S. 005-2012-TR · Multa: 5-26 UIT',
      multaEvitada: 9000,
      pasos: [
        'En Capacitaciones, asignar las 4 capacitaciones SST a todos los trabajadores',
        'Workers reciben email + acceden desde /mi-portal/capacitaciones',
        'Completan con quiz mínimo 70% para aprobar',
        'Sistema emite certificado PDF con QR de verificación pública',
        'Archivar evidencia (lista firmada o registro digital) en SST',
      ],
    },
    igualdad: {
      titulo: 'Auditar brechas salariales por género (Ley 30709)',
      descripcion: 'Aplicar el método de evaluación DICR (Descripción del puesto, Identificación de funciones, Categorización, Remuneración) y publicar resultados internamente.',
      area: 'igualdad',
      responsable: 'RRHH',
      prioridad: 'MEDIA',
      baseLegal: 'Ley 30709 · D.S. 002-2018-TR · Multa: 1-50 UIT',
      multaEvitada: 27000,
      pasos: [
        'En Riesgo > Igualdad salarial, generar el cuadro de categorías DICR',
        'Asignar a cada puesto su categoría y verificar coherencia',
        'Sistema detecta automáticamente brechas > 5% entre géneros mismo nivel',
        'Plan de cierre de brecha: ajustes salariales en próximos 6-12 meses',
        'Publicar política de igualdad en zonas comunes + intranet',
      ],
    },
    hostigamiento: {
      titulo: 'Activar canal de denuncias de hostigamiento (Ley 27942)',
      descripcion: 'Configurar canal interno de denuncias por hostigamiento sexual, designar Comité de Intervención y publicar la política de prevención. Obligatorio para empresas con +20 trabajadores.',
      area: 'denuncias',
      responsable: 'RRHH',
      prioridad: 'ALTA',
      baseLegal: 'Ley 27942 · D.S. 014-2019-MIMP · Multa: 5-50 UIT',
      multaEvitada: 27500,
      pasos: [
        'En Riesgo > Generadores IA, generar Política de Hostigamiento Sexual',
        'Designar 3 miembros del Comité de Intervención (paritario por género)',
        'Activar canal público en /denuncias/{tu-empresa-slug} (URL gratuita)',
        'Capacitar a los 3 miembros del Comité (mínimo 4 horas)',
        'Publicar política firmada y URL del canal en zonas comunes',
      ],
    },
  }

  const usedAreas = new Set<string>()
  let plazoCum = 7
  for (const [area, score] of sorted.slice(0, 8)) {
    const tplKey = Object.keys(TEMPLATES).find(k => area.toLowerCase().includes(k)) || 'contratos'
    if (usedAreas.has(tplKey)) continue
    usedAreas.add(tplKey)
    const tpl = TEMPLATES[tplKey]
    // Impacto proporcional a la brecha (score 30 → +10 pts; score 80 → +2 pts)
    const impacto = Math.max(2, Math.min(15, Math.round((90 - score) / 6)))
    tareas.push({
      ...tpl,
      id: `task-${tareas.length + 1}`,
      plazoDias: plazoCum,
      impactoScore: impacto,
    })
    plazoCum += 7
  }

  // Si quedaron menos de 5 tareas (porque el diagnostic tenía pocas areas),
  // rellenamos con tareas de áreas no auditadas pero universalmente relevantes.
  const FALLBACK_ORDER = ['contratos', 'sst', 'documentos', 'planilla', 'vencimientos', 'capacitaciones', 'igualdad', 'hostigamiento']
  for (const tplKey of FALLBACK_ORDER) {
    if (tareas.length >= 6) break
    if (usedAreas.has(tplKey)) continue
    usedAreas.add(tplKey)
    tareas.push({
      ...TEMPLATES[tplKey],
      id: `task-${tareas.length + 1}`,
      plazoDias: plazoCum,
      impactoScore: 4,
    })
    plazoCum += 7
  }

  const incrementoTotal = tareas.reduce((acc, t) => acc + t.impactoScore, 0)
  const multaEvitadaTotal = tareas.reduce((acc, t) => acc + (t.multaEvitada ?? 0), 0)
  const estimadoTrasPlan = Math.min(input.scoreGlobal + incrementoTotal, 100)

  return {
    generadoPor: 'simulated',
    modelo: 'heuristic-v2',
    generadoAt,
    resumen: `Plan base sugerido a partir de las áreas con menor puntaje y normativa peruana vigente. Atiende ${tareas.length} brechas para llevar el score de ${input.scoreGlobal} a ${estimadoTrasPlan}/100 y evitar S/ ${multaEvitadaTotal.toLocaleString('es-PE')} en multas SUNAFIL potenciales.`,
    tareas,
    proyeccionScore: {
      actual: input.scoreGlobal,
      estimadoTrasPlan,
      incremento: estimadoTrasPlan - input.scoreGlobal,
    },
    multaEvitadaTotal,
  }
}
