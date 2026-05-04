/**
 * Generador de propuesta de organigrama desde input simple del usuario.
 *
 * Flujo:
 *   1. Llama al provider IA con prompt estructurado + JSON mode
 *   2. Parsea con Zod (estructura)
 *   3. Valida reglas de negocio (referential integrity, no cycles)
 *   4. Si todo OK → devuelve propuesta IA
 *   5. Si algo falla → fallback a templates determinísticos
 *
 * Server-only — no se debe llamar desde cliente.
 */
import { callAI } from '@/lib/ai/provider'

import {
  onboardingProposalSchema,
  type OnboardingInput,
  type OnboardingProposal,
} from './schema'
import { validateProposal } from './validate-proposal'
import { pickFallbackTemplate } from './fallback-templates'

export interface OnboardingGenerationResult {
  proposal: OnboardingProposal
  source: 'ai' | 'fallback'
  warnings: string[]
  /** Razón del fallback si aplica (debug). */
  fallbackReason?: string
}

const SYSTEM_PROMPT = `Eres un experto en diseño organizacional para empresas peruanas y compliance laboral según la legislación nacional (D.Leg. 728, Ley 29783 SST, Ley 27942 hostigamiento, Ley 29733 datos personales, Ley 30709 igualdad salarial, R.M. 050-2013-TR MOF).

Tu tarea: dado un input simple del usuario (industria, tamaño, ubicación, descripción), proponer un organigrama base coherente con la realidad peruana, respetando umbrales legales (≥20 trabajadores → Comité SST formal en lugar de Supervisor; manejo masivo de datos → DPO; etc.).

DEBES devolver UN SOLO objeto JSON con esta estructura exacta:

{
  "rationale": "string corto explicando por qué esta estructura encaja",
  "units": [
    { "key": "id-corto-unico", "name": "Nombre de la unidad", "kind": "GERENCIA|AREA|DEPARTAMENTO|EQUIPO|COMITE_LEGAL|BRIGADA|PROYECTO", "parentKey": "key-del-padre-o-null", "description": "opcional, máx 200 chars" }
  ],
  "positions": [
    { "key": "id-corto-unico", "title": "Cargo", "unitKey": "key-de-su-unidad", "reportsToKey": "key-jefe-o-null", "isManagerial": true|false, "isCritical": true|false, "seats": 1, "purpose": "opcional, máx 300 chars" }
  ],
  "suggestedComplianceRoles": [
    { "roleType": "PRESIDENTE_COMITE_SST", "reason": "Ley 29783 art. X" }
  ]
}

REGLAS DURAS:
- Una y solo una unidad raíz (parentKey=null), típicamente "Gerencia General".
- Cada position.unitKey DEBE existir en units.
- Cada position.reportsToKey DEBE existir en positions o ser null.
- Cada unit.parentKey DEBE existir en units o ser null.
- Sin ciclos. El organigrama es un árbol.
- Máximo 25 unidades, 60 cargos. Diseña simple y realista.
- Para roles legales, usa solo estos tipos válidos: PRESIDENTE_COMITE_SST, SECRETARIO_COMITE_SST, REPRESENTANTE_TRABAJADORES_SST, REPRESENTANTE_EMPLEADOR_SST, SUPERVISOR_SST, PRESIDENTE_COMITE_HOSTIGAMIENTO, MIEMBRO_COMITE_HOSTIGAMIENTO, JEFE_INMEDIATO_HOSTIGAMIENTO, BRIGADISTA_PRIMEROS_AUXILIOS, BRIGADISTA_EVACUACION, BRIGADISTA_AMAGO_INCENDIO, DPO_LEY_29733, RT_PLANILLA, RESPONSABLE_IGUALDAD_SALARIAL, ENCARGADO_LIBRO_RECLAMACIONES, MEDICO_OCUPACIONAL, ASISTENTA_SOCIAL, RESPONSABLE_LACTARIO, ENCARGADO_NUTRICION.

Idioma: español peruano neutro (NUNCA voseo argentino — "tú tienes" no "vos tenés").

NO incluyas explicaciones fuera del JSON. NO uses markdown. Solo el objeto JSON.`

function buildUserPrompt(input: OnboardingInput): string {
  return [
    `Industria: ${input.industry}`,
    `Tamaño: ${input.sizeRange} (${input.workerCount} trabajadores)`,
    input.city ? `Ubicación: ${input.city}` : null,
    input.description ? `Descripción adicional: ${input.description}` : null,
    '',
    `Genera el organigrama propuesto para esta empresa peruana. Considera el umbral de 20 trabajadores para decidir entre Supervisor SST y Comité SST formal. Si la industria maneja datos personales sensibles (planilla, salud, retail con CRM), incluye DPO.`,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Punto de entrada principal — genera la propuesta de organigrama.
 */
export async function generateOrgProposal(
  input: OnboardingInput,
): Promise<OnboardingGenerationResult> {
  const userPrompt = buildUserPrompt(input)

  let aiOutput: string
  try {
    aiOutput = await callAI(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      {
        // 'doc-generator' es el feature más cercano (genera estructura compliance).
        feature: 'doc-generator',
        temperature: 0.3,
        maxTokens: 3500,
        jsonMode: true,
      },
    )
  } catch (err) {
    return {
      proposal: pickFallbackTemplate(input),
      source: 'fallback',
      warnings: [],
      fallbackReason: err instanceof Error ? err.message : 'AI provider error',
    }
  }

  // Parse + validar estructura
  let parsed: unknown
  try {
    parsed = JSON.parse(aiOutput)
  } catch {
    return {
      proposal: pickFallbackTemplate(input),
      source: 'fallback',
      warnings: [],
      fallbackReason: 'IA devolvió JSON inválido',
    }
  }

  const zResult = onboardingProposalSchema.safeParse(parsed)
  if (!zResult.success) {
    return {
      proposal: pickFallbackTemplate(input),
      source: 'fallback',
      warnings: [],
      fallbackReason: `Schema inválido: ${zResult.error.message.slice(0, 200)}`,
    }
  }

  // Validar reglas de negocio
  const proposal = zResult.data
  const validation = validateProposal(proposal)
  if (!validation.valid) {
    return {
      proposal: pickFallbackTemplate(input),
      source: 'fallback',
      warnings: validation.warnings,
      fallbackReason: `Reglas de negocio: ${validation.errors.slice(0, 2).join('; ')}`,
    }
  }

  return {
    proposal,
    source: 'ai',
    warnings: validation.warnings,
  }
}
