/**
 * 🏆 AGENTE ANALIZADOR SUNAFIL
 *
 * Recibe un acta de inspección de SUNAFIL en PDF/DOCX, extrae los cargos
 * imputados, los mapea a artículos legales peruanos, calcula la multa
 * proyectada con la UIT 2026 (S/5,500) y sugiere defensas/descargos.
 *
 * Este es el agente estrella de COMPLY360 v2.0 — el moat competitivo.
 * Ningún competidor LATAM tiene esto entrenado en jurisprudencia peruana.
 *
 * Base legal:
 *  - Ley 28806 (Ley General de Inspección del Trabajo)
 *  - D.S. 019-2006-TR (Reglamento Ley General de Inspección)
 *  - UIT 2026: S/5,500 (D.S. 380-2025-EF)
 *  - Escala de multas: D.S. 008-2020-TR modificado por D.S. 015-2017-TR
 */

import { callAI } from '@/lib/ai/provider'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import { extractTextFromBuffer, truncateForLlm } from './extract-text'
import type {
  AgentDefinition,
  AgentInput,
  AgentRunContext,
  AgentResult,
  AgentAction,
} from './types'

// =============================================
// CONSTANTES LEGALES PERÚ — fuente única PERU_LABOR
// =============================================

/** UIT vigente desde PERU_LABOR (fuente única de verdad) */
const UIT_2026 = PERU_LABOR.UIT

/** Tipo de empresa para escala de multas */
type TipoEmpresa = 'MICRO' | 'PEQUENA' | 'NO_MYPE'

/**
 * Escala SUNAFIL vigente (en UITs) — se lee de PERU_LABOR.MULTAS_SUNAFIL.ESCALA.
 * Fuente: D.S. 019-2006-TR modificado por D.S. 008-2020-TR.
 */
const ESCALA_MULTAS_UIT: Record<TipoEmpresa, Record<'LEVE' | 'GRAVE' | 'MUY_GRAVE', { min: number; max: number }>> =
  PERU_LABOR.MULTAS_SUNAFIL.ESCALA

// =============================================
// SHAPE DEL OUTPUT
// =============================================

export interface SunafilCharge {
  /** Número del cargo en el acta */
  numero: number
  /** Descripción del cargo */
  descripcion: string
  /** Artículo legal infringido (ej: "Art. 23.2 D.S. 019-2006-TR") */
  articuloInfringido: string
  /** Norma legal de referencia */
  normaLegal: string
  /** Gravedad calificada por el agente */
  gravedad: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  /** Trabajadores afectados (si se menciona) */
  trabajadoresAfectados?: number
  /** Multa estimada en soles (rango) */
  multaEstimadaSoles: { min: number; max: number }
  /** Defensa sugerida por el agente */
  defensaSugerida: string
  /** ¿Es subsanable antes de la resolución? */
  subsanable: boolean
}

export interface SunafilAnalysisOutput {
  /** Datos del acta */
  numeroActa?: string
  fechaInspeccion?: string
  inspector?: string
  intendenciaRegional?: string
  /** Datos del inspeccionado */
  empresaRazonSocial?: string
  empresaRuc?: string
  tipoEmpresaDetectado: TipoEmpresa
  /** Cargos extraídos */
  cargos: SunafilCharge[]
  /** Resumen del acta */
  resumenActa: string
  /** Multa total proyectada (suma de mínimos y máximos) */
  multaTotalProyectada: { min: number; max: number }
  /** Riesgo global */
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  /** Estrategia de defensa global recomendada */
  estrategiaDefensa: string
  /** Plazo para descargo (días hábiles según ley) */
  plazoDescargoDias: number
  /** Fecha límite calculada */
  fechaLimiteDescargo?: string
}

// =============================================
// PROMPT
// =============================================

function buildSunafilPrompt(actaText: string, tipoEmpresa: TipoEmpresa): string {
  return `Eres un abogado laboralista peruano experto en defensa ante SUNAFIL con 20 años de experiencia litigando actas de inspección. Analiza el siguiente acta de inspección y devuelve un análisis estructurado en JSON.

ACTA DE INSPECCIÓN:
---
${actaText}
---

CONTEXTO LEGAL PERÚ 2026:
- UIT vigente: S/${UIT_2026}
- Tipo de empresa del inspeccionado: ${tipoEmpresa}
- Marco legal: Ley 28806, D.S. 019-2006-TR, D.S. 008-2020-TR
- Escala de multas en UITs (aproximada): MICRO leve 0.045-0.45 / grave 0.11-1.13 / muy grave 0.23-2.25 · PEQUENA leve 0.09-1.13 / grave 0.45-4.50 / muy grave 0.77-7.65 · NO_MYPE leve 0.26-26.12 / grave 1.57-52.53 / muy grave 2.63-52.53
- Plazo descargo: 15 días hábiles desde notificación (Art. 49 D.S. 019-2006-TR)

Extrae información del acta y devuelve SOLO este JSON (sin explicaciones, sin markdown):

{
  "numeroActa": "001-2026-SUNAFIL",
  "fechaInspeccion": "2026-03-15",
  "inspector": "Juan Pérez García",
  "intendenciaRegional": "Lima Metropolitana",
  "empresaRazonSocial": "Empresa SAC",
  "empresaRuc": "20XXXXXXXXX",
  "cargos": [
    {
      "numero": 1,
      "descripcion": "No haber registrado al trabajador en planilla electrónica",
      "articuloInfringido": "Art. 24.1 D.S. 019-2006-TR",
      "normaLegal": "D.S. 019-2006-TR Art. 24.1 inc. b",
      "gravedad": "MUY_GRAVE",
      "trabajadoresAfectados": 3,
      "multaEstimadaSoles": { "min": 14465, "max": 144815 },
      "defensaSugerida": "Acreditar registro mediante T-REGISTRO con fecha anterior. Si fue extemporáneo, alegar subsanación voluntaria conforme Art. 17 Ley 28806.",
      "subsanable": false
    }
  ],
  "resumenActa": "Resumen ejecutivo de 2-3 oraciones describiendo qué encontró el inspector y cuál es el riesgo principal",
  "multaTotalProyectada": { "min": 14465, "max": 144815 },
  "nivelRiesgo": "ALTO",
  "estrategiaDefensa": "Recomendación específica de 3-4 oraciones sobre cómo enfocar el descargo: qué argumentar, qué pruebas presentar, qué precedentes citar.",
  "plazoDescargoDias": 15
}

REGLAS CRÍTICAS:
1. Calcula multaEstimadaSoles MULTIPLICANDO el rango UIT correspondiente × ${UIT_2026} × (trabajadoresAfectados o 1 si no se menciona)
2. Si no encuentras un campo, ponlo en null pero NUNCA inventes datos
3. La gravedad debe basarse en la naturaleza del cargo:
   - LEVE: incumplimientos formales/documentales (no exhibir registros, no actualizar)
   - GRAVE: vulneración de derechos individuales (no pago oportuno, jornada excesiva, no entrega de boleta)
   - MUY_GRAVE: derechos fundamentales (no registrar planilla, trabajo infantil, despido nulo, hostigamiento, discriminación, accidente fatal)
4. nivelRiesgo: BAJO (<5K soles), MEDIO (5-25K), ALTO (25-100K), CRITICO (>100K)
5. defensaSugerida debe citar artículo legal específico cuando sea posible
6. Si el documento NO parece un acta SUNAFIL, devuelve cargos:[] y resumenActa explicando por qué
7. DEVUELVE SOLO EL JSON, sin texto adicional, sin markdown fences`
}

// =============================================
// CÁLCULO DE FECHAS
// =============================================

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return result
}

// =============================================
// FUNCIÓN PRINCIPAL DEL AGENTE
// =============================================

async function runSunafilAnalyzer(
  input: AgentInput,
  ctx: AgentRunContext
): Promise<AgentResult<SunafilAnalysisOutput>> {
  const startTime = Date.now()
  const warnings: string[] = []
  const errors: string[] = []

  // Validar input
  if (input.type !== 'pdf' && input.type !== 'docx') {
    throw new Error('SUNAFIL Analyzer requiere un archivo PDF o DOCX')
  }
  if (!input.fileBuffer || !input.fileName) {
    throw new Error('Falta el archivo en el input')
  }

  // Tipo de empresa (parámetro opcional, default NO_MYPE)
  const tipoEmpresa = (input.params?.tipoEmpresa as TipoEmpresa) || 'NO_MYPE'

  // 1. Extraer texto del archivo
  let actaText = ''
  try {
    actaText = await extractTextFromBuffer(input.fileBuffer, input.fileName)
  } catch (e) {
    throw new Error(
      `No se pudo leer el archivo: ${e instanceof Error ? e.message : 'error desconocido'}`
    )
  }

  if (!actaText || actaText.trim().length < 100) {
    throw new Error(
      'El archivo no contiene texto legible. Si es un acta escaneada, primero pásala por un OCR.'
    )
  }

  const truncated = truncateForLlm(actaText, 12000)
  if (truncated.length < actaText.length) {
    warnings.push(`Acta muy larga: se analizaron ${truncated.length} de ${actaText.length} caracteres`)
  }

  // 2. Llamar al LLM con el prompt especializado
  const prompt = buildSunafilPrompt(truncated, tipoEmpresa)
  let aiResponse = ''
  try {
    aiResponse = await callAI(
      [
        {
          role: 'system',
          content:
            'Eres un abogado laboralista peruano experto en SUNAFIL. Respondes EXCLUSIVAMENTE con JSON válido, sin markdown, sin explicaciones.',
        },
        { role: 'user', content: prompt },
      ],
      {
        temperature: 0.1,
        maxTokens: 3500,
        jsonMode: true,
        feature: 'sunafil-agent',
      }
    )
  } catch (e) {
    throw new Error(
      `Error llamando al modelo de IA: ${e instanceof Error ? e.message : 'desconocido'}`
    )
  }

  // 3. Parsear JSON
  let parsed: SunafilAnalysisOutput
  try {
    const clean = aiResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    parsed = JSON.parse(clean) as SunafilAnalysisOutput
  } catch {
    throw new Error('La IA devolvió un formato inválido. Intenta con otro archivo.')
  }

  // 4. Post-procesamiento: validar y normalizar
  parsed.tipoEmpresaDetectado = tipoEmpresa

  // Validar/recalcular multas si la IA hizo cálculos sospechosos
  if (parsed.cargos && Array.isArray(parsed.cargos)) {
    let totalMin = 0
    let totalMax = 0
    for (const cargo of parsed.cargos) {
      const escala = ESCALA_MULTAS_UIT[tipoEmpresa][cargo.gravedad]
      if (escala) {
        const factor = cargo.trabajadoresAfectados ?? 1
        const calcMin = Math.round(escala.min * UIT_2026 * factor)
        const calcMax = Math.round(escala.max * UIT_2026 * factor)
        // Si la IA dio un valor muy fuera del rango, sobreescribir
        if (
          !cargo.multaEstimadaSoles ||
          cargo.multaEstimadaSoles.min < calcMin * 0.5 ||
          cargo.multaEstimadaSoles.max > calcMax * 1.5
        ) {
          cargo.multaEstimadaSoles = { min: calcMin, max: calcMax }
        }
        totalMin += cargo.multaEstimadaSoles.min
        totalMax += cargo.multaEstimadaSoles.max
      }
    }
    parsed.multaTotalProyectada = { min: totalMin, max: totalMax }

    // Recalcular nivel de riesgo basado en multa máxima
    if (totalMax >= 100000) parsed.nivelRiesgo = 'CRITICO'
    else if (totalMax >= 25000) parsed.nivelRiesgo = 'ALTO'
    else if (totalMax >= 5000) parsed.nivelRiesgo = 'MEDIO'
    else parsed.nivelRiesgo = 'BAJO'
  } else {
    parsed.cargos = []
    parsed.multaTotalProyectada = { min: 0, max: 0 }
    parsed.nivelRiesgo = 'BAJO'
    warnings.push('No se detectaron cargos en el acta — verifica que sea un acta SUNAFIL real')
  }

  // Calcular fecha límite del descargo (15 días hábiles desde fecha del acta)
  parsed.plazoDescargoDias = parsed.plazoDescargoDias || 15
  if (parsed.fechaInspeccion) {
    try {
      const inspDate = new Date(parsed.fechaInspeccion)
      if (!isNaN(inspDate.getTime())) {
        const limite = addBusinessDays(inspDate, parsed.plazoDescargoDias)
        parsed.fechaLimiteDescargo = limite.toISOString().slice(0, 10)
      }
    } catch {
      warnings.push('No se pudo calcular la fecha límite del descargo')
    }
  }

  // 5. Calcular confianza
  const fieldsExpected = ['numeroActa', 'fechaInspeccion', 'empresaRazonSocial', 'empresaRuc', 'inspector']
  const fieldsFound = fieldsExpected.filter(f => Boolean((parsed as unknown as Record<string, unknown>)[f])).length
  const baseConfidence = (fieldsFound / fieldsExpected.length) * 50
  const cargosConfidence = parsed.cargos.length > 0 ? 50 : 0
  const confidence = Math.round(baseConfidence + cargosConfidence)

  // 6. Generar acciones recomendadas
  const recommendedActions: AgentAction[] = []

  if (parsed.cargos.length > 0) {
    recommendedActions.push({
      id: 'generate-descargo',
      label: 'Generar descargo legal con IA',
      description:
        'Redacta automáticamente un escrito de descargo citando los artículos legales y precedentes adecuados para cada cargo',
      type: 'agent-call',
      payload: { agentSlug: 'descargo-writer', context: parsed },
      priority: 'critical',
    })
  }

  if (parsed.fechaLimiteDescargo) {
    recommendedActions.push({
      id: 'add-calendar-reminder',
      label: `Agendar recordatorio antes del ${parsed.fechaLimiteDescargo}`,
      description: 'Crea evento en calendario 3 días antes del vencimiento del plazo',
      type: 'create',
      payload: {
        type: 'calendar-event',
        date: parsed.fechaLimiteDescargo,
        title: `Plazo descargo SUNAFIL ${parsed.numeroActa || ''}`,
      },
      priority: 'important',
    })
  }

  if (parsed.nivelRiesgo === 'CRITICO' || parsed.nivelRiesgo === 'ALTO') {
    recommendedActions.push({
      id: 'consult-lawyer',
      label: 'Consultar con abogado laboralista',
      description: `La multa proyectada supera S/${parsed.multaTotalProyectada.max.toLocaleString('es-PE')}. Recomendamos asesoría legal humana antes del descargo.`,
      type: 'external',
      payload: { url: '/dashboard/marketplace/abogados' },
      priority: 'critical',
    })
  }

  recommendedActions.push({
    id: 'run-diagnostic',
    label: 'Ejecutar diagnóstico de compliance completo',
    description:
      'Identifica si los cargos del acta son síntomas de problemas más amplios en tu empresa',
    type: 'navigate',
    payload: { url: '/dashboard/diagnostico' },
    priority: 'info',
  })

  // 7. Resumen legible
  const summary =
    parsed.cargos.length > 0
      ? `Se identificaron ${parsed.cargos.length} cargos en el acta SUNAFIL${
          parsed.numeroActa ? ` Nº ${parsed.numeroActa}` : ''
        }. Multa proyectada entre S/${parsed.multaTotalProyectada.min.toLocaleString(
          'es-PE'
        )} y S/${parsed.multaTotalProyectada.max.toLocaleString('es-PE')}. Nivel de riesgo: ${
          parsed.nivelRiesgo
        }. ${parsed.fechaLimiteDescargo ? `Plazo de descargo vence el ${parsed.fechaLimiteDescargo}.` : ''}`
      : `No se detectaron cargos formales en el documento. ${parsed.resumenActa || 'Verifica que sea un acta SUNAFIL válida.'}`

  return {
    agentSlug: 'sunafil-analyzer',
    runId: ctx.runId,
    status: errors.length > 0 ? 'partial' : 'success',
    confidence,
    data: parsed,
    summary,
    warnings,
    recommendedActions,
    model: 'comply360-legal',
    durationMs: Date.now() - startTime,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// =============================================
// EXPORT DEFINITION
// =============================================

export const sunafilAnalyzerAgent: AgentDefinition<AgentInput, SunafilAnalysisOutput> = {
  slug: 'sunafil-analyzer',
  name: 'Analizador de Actas SUNAFIL',
  description:
    'Sube un acta de inspección SUNAFIL en PDF/DOCX. La IA extrae los cargos, los mapea a artículos legales, calcula la multa proyectada con UIT 2026 y propone una estrategia de defensa.',
  category: 'sunafil',
  icon: 'ShieldAlert',
  status: 'beta',
  acceptedInputs: ['pdf', 'docx'],
  estimatedTokens: 4000,
  run: runSunafilAnalyzer,
}
