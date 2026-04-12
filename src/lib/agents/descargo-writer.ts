/**
 * 🏆 AGENTE GENERADOR DE DESCARGOS SUNAFIL
 *
 * Toma el output del SUNAFIL Analyzer (o input manual) y redacta un escrito
 * legal de descargo listo para presentar ante SUNAFIL, citando artículos y
 * jurisprudencia, en tono jurídico formal peruano.
 *
 * Base legal:
 *  - Art. 17 Ley 28806 (subsanación voluntaria)
 *  - Art. 49 D.S. 019-2006-TR (plazo y forma del descargo)
 *  - Ley del Procedimiento Administrativo General N° 27444
 */

import { callAI } from '@/lib/ai/provider'
import type {
  AgentDefinition,
  AgentInput,
  AgentRunContext,
  AgentResult,
  AgentAction,
} from './types'
import type { SunafilAnalysisOutput } from './sunafil-analyzer'

export interface DescargoOutput {
  /** Texto del descargo en formato legal listo para imprimir */
  textoDescargo: string
  /** Sumilla / asunto del documento */
  sumilla: string
  /** Argumentos legales por cargo */
  argumentosPorCargo: Array<{
    numeroCargo: number
    argumentoPrincipal: string
    fundamentoLegal: string
    medioProbatorio: string
  }>
  /** Petitorio final */
  petitorio: string
  /** Cantidad estimada de páginas */
  paginasEstimadas: number
  /** Fortaleza de la defensa (1-100) */
  fortalezaDefensa: number
}

interface DescargoParams {
  analysis: SunafilAnalysisOutput
  empresaRepresentanteLegal?: string
  empresaDniRepresentante?: string
  empresaDomicilioFiscal?: string
}

function buildDescargoPrompt(params: DescargoParams): string {
  const a = params.analysis
  const cargosBlock = (a.cargos || [])
    .map(
      c => `- Cargo #${c.numero} (${c.gravedad}): ${c.descripcion}
  Norma: ${c.normaLegal} — ${c.articuloInfringido}
  Defensa preliminar sugerida: ${c.defensaSugerida}
  ¿Subsanable?: ${c.subsanable ? 'Sí' : 'No'}`
    )
    .join('\n\n')

  return `Eres un abogado laboralista peruano con 25 años defendiendo empresas ante SUNAFIL. Redacta un ESCRITO DE DESCARGO formal, riguroso y persuasivo en respuesta al siguiente acta de inspección.

DATOS DEL ACTA:
- Número: ${a.numeroActa || 'POR DEFINIR'}
- Fecha inspección: ${a.fechaInspeccion || 'POR DEFINIR'}
- Inspector: ${a.inspector || 'POR DEFINIR'}
- Intendencia regional: ${a.intendenciaRegional || 'POR DEFINIR'}
- Empresa: ${a.empresaRazonSocial || '[RAZÓN SOCIAL]'} (RUC ${a.empresaRuc || '[RUC]'})
- Tipo empresa: ${a.tipoEmpresaDetectado}
- Representante legal: ${params.empresaRepresentanteLegal || '[REPRESENTANTE LEGAL]'}
- DNI representante: ${params.empresaDniRepresentante || '[DNI]'}
- Domicilio: ${params.empresaDomicilioFiscal || '[DOMICILIO FISCAL]'}

CARGOS A REBATIR:
${cargosBlock}

CONTEXTO LEGAL APLICABLE:
- Ley 28806 (Ley General de Inspección del Trabajo)
- D.S. 019-2006-TR (Reglamento)
- Ley 27444 (Procedimiento Administrativo General)
- Principio de tipicidad, presunción de licitud, debido procedimiento
- Subsanación voluntaria (Art. 17 Ley 28806)
- Reducción de multa por reconocimiento (D.S. 008-2020-TR)

INSTRUCCIONES:
Devuelve EXCLUSIVAMENTE un JSON con esta estructura:

{
  "sumilla": "Presenta descargos contra Acta de Infracción N° XXX",
  "textoDescargo": "TEXTO COMPLETO DEL ESCRITO LEGAL EN MARKDOWN, con secciones: I. DATOS DEL ADMINISTRADO, II. ANTECEDENTES, III. FUNDAMENTOS DE HECHO, IV. FUNDAMENTOS DE DERECHO (un sub-bloque por cada cargo), V. MEDIOS PROBATORIOS, VI. PETITORIO. Tono jurídico formal peruano. Mínimo 800 palabras. Cita artículos específicos. Usa argumentos como: prescripción, atipicidad, falta de motivación, debido procedimiento, subsanación voluntaria, principio de proporcionalidad, error de calificación de gravedad.",
  "argumentosPorCargo": [
    {
      "numeroCargo": 1,
      "argumentoPrincipal": "Resumen en 1-2 oraciones del argumento más fuerte",
      "fundamentoLegal": "Cita específica: artículo, ley, jurisprudencia",
      "medioProbatorio": "Documento concreto a adjuntar (T-REGISTRO, planilla, etc.)"
    }
  ],
  "petitorio": "Texto del petitorio (2-3 oraciones)",
  "paginasEstimadas": 6,
  "fortalezaDefensa": 75
}

REGLAS:
1. NO inventes jurisprudencia con número falso. Cita solo principios y leyes verificables.
2. fortalezaDefensa: 1-100 según qué tan rebatibles sean los cargos (cargos formales subsanables = alta; muy graves no subsanables = baja).
3. El textoDescargo debe ser un documento listo para que el abogado lo revise y firme — NO es un borrador conceptual.
4. Usa lenguaje jurídico peruano formal: "Por lo expuesto", "En tal sentido", "Conforme a lo dispuesto en", "Sírvase tener presente".
5. DEVUELVE SOLO EL JSON.`
}

async function runDescargoWriter(
  input: AgentInput,
  ctx: AgentRunContext
): Promise<AgentResult<DescargoOutput | null>> {
  const start = Date.now()
  const warnings: string[] = []

  // Este agente se invoca con type='json' y params.analysis (output del sunafil-analyzer)
  const analysis = input.params?.analysis as SunafilAnalysisOutput | undefined
  if (!analysis || !Array.isArray(analysis.cargos)) {
    throw new Error(
      'Falta el parámetro "analysis" (debe ser el output del Agente Analizador SUNAFIL)'
    )
  }
  if (analysis.cargos.length === 0) {
    throw new Error('No hay cargos que rebatir en el análisis proporcionado')
  }

  const params: DescargoParams = {
    analysis,
    empresaRepresentanteLegal: input.params?.representanteLegal as string | undefined,
    empresaDniRepresentante: input.params?.dniRepresentante as string | undefined,
    empresaDomicilioFiscal: input.params?.domicilioFiscal as string | undefined,
  }

  if (!params.empresaRepresentanteLegal) {
    warnings.push('No se proporcionó representante legal — el escrito usa placeholder [REPRESENTANTE LEGAL]')
  }

  let aiResponse = ''
  try {
    aiResponse = await callAI(
      [
        {
          role: 'system',
          content:
            'Eres un abogado laboralista peruano experto en SUNAFIL. Redactas escritos formales en JSON. Responde EXCLUSIVAMENTE con JSON válido.',
        },
        { role: 'user', content: buildDescargoPrompt(params) },
      ],
      {
        temperature: 0.3,
        maxTokens: 4500,
        jsonMode: true,
        feature: 'contract-review',
      }
    )
  } catch (e) {
    throw new Error(
      `Error llamando al modelo: ${e instanceof Error ? e.message : 'desconocido'}`
    )
  }

  let parsed: DescargoOutput
  try {
    const clean = aiResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    parsed = JSON.parse(clean) as DescargoOutput
  } catch {
    throw new Error('La IA devolvió un formato inválido')
  }

  // Sanity check
  if (!parsed.textoDescargo || parsed.textoDescargo.length < 400) {
    warnings.push('El escrito generado es muy corto — considera regenerarlo')
  }

  const recommendedActions: AgentAction[] = [
    {
      id: 'download-pdf',
      label: 'Descargar como PDF',
      description: 'Exporta el descargo a PDF firmable',
      type: 'download',
      payload: { format: 'pdf', content: parsed.textoDescargo },
      priority: 'critical',
    },
    {
      id: 'lawyer-review',
      label: 'Solicitar revisión por abogado humano',
      description:
        'Antes de presentar, recomendamos validación profesional. La IA es asistente, no reemplaza.',
      type: 'external',
      payload: { url: '/dashboard/marketplace/abogados' },
      priority: 'critical',
    },
    {
      id: 'add-evidence',
      label: 'Adjuntar medios probatorios',
      description:
        'Sube los documentos mencionados en cada argumento (T-REGISTRO, boletas, etc.)',
      type: 'navigate',
      payload: { url: '/dashboard/expedientes' },
      priority: 'important',
    },
  ]

  const summary = `Descargo generado con ${parsed.argumentosPorCargo?.length || 0} argumentos legales. Fortaleza estimada de la defensa: ${parsed.fortalezaDefensa}/100. Documento de aproximadamente ${parsed.paginasEstimadas} páginas listo para revisión legal.`

  return {
    agentSlug: 'descargo-writer',
    runId: ctx.runId,
    status: 'success',
    confidence: parsed.fortalezaDefensa || 70,
    data: parsed,
    summary,
    warnings,
    recommendedActions,
    model: 'comply360-legal',
    durationMs: Date.now() - start,
  }
}

export const descargoWriterAgent: AgentDefinition<AgentInput, DescargoOutput | null> = {
  slug: 'descargo-writer',
  name: 'Generador de Descargos SUNAFIL',
  description:
    'Toma el análisis del Agente SUNAFIL y redacta automáticamente el escrito de descargo legal con argumentos por cargo, citas normativas y petitorio formal listo para revisión por abogado.',
  category: 'sunafil',
  icon: 'Scale',
  status: 'beta',
  acceptedInputs: ['json'],
  estimatedTokens: 5000,
  run: runDescargoWriter,
}
