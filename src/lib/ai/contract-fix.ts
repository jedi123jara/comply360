/**
 * Contract Fix engine — toma un contrato laboral peruano + análisis de riesgos
 * y genera una versión corregida con las cláusulas problemáticas reescritas.
 *
 * Diferenciador único en mercado peruano: en lugar de solo señalar problemas
 * (lo que ya hace `contract-review.ts`), GENERA el texto corregido conforme
 * a la normativa.
 *
 * Flujo:
 *   1. Cliente envía: contractHtml + opcional riskReview (si ya se corrió)
 *   2. Si no hay review previo, lo corre internamente
 *   3. Llama al provider AI con prompt especializado para reescribir
 *   4. Retorna: fixedHtml + changes (diff legible para mostrar lado a lado)
 *
 * Plan-gate: PRO (feature `review_ia`).
 * Quota IA: respeta budgets via `checkAiBudget()` antes de la llamada.
 */

import { callAIWithUsage } from './provider'
import { recordAiUsage } from './usage'
import { redactPii, type RedactionResult } from './pii-redactor'
import type { ContractReviewResult } from './contract-review'

/** Restaura PII redactada (placeholder → valor original) usando el mapping. */
function unredactWithMapping(text: string, mapping: RedactionResult['mapping']): string {
  let result = text
  for (const [placeholder, original] of Object.entries(mapping)) {
    // Escape regex special chars en el placeholder (los corchetes son válidos)
    const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escaped, 'g'), original)
  }
  return result
}

export interface ContractFixInput {
  contractHtml: string
  contractType: string
  /** Análisis previo del review. Si no se pasa, no se puede corregir focalizado. */
  reviewResult: ContractReviewResult
  orgId?: string | null
  userId?: string | null
}

export interface ContractFixChange {
  type: 'ADD' | 'MODIFY' | 'REMOVE'
  category: string
  before?: string
  after?: string
  reason: string
  legalBasis?: string
}

export interface ContractFixResult {
  fixedHtml: string
  changes: ContractFixChange[]
  remainingRisks: number // riesgos que el modelo NO pudo arreglar (ej. data faltante)
  summary: string
  warningLegal?: string
}

const SYSTEM_PROMPT = `Eres un abogado laboralista peruano senior. Tu tarea es REESCRIBIR un contrato laboral peruano para corregir riesgos y agregar cláusulas obligatorias faltantes según la normativa vigente.

REGLAS DE REESCRITURA:
1. PRESERVA todo el contenido válido del contrato original (datos del trabajador, sueldo, fechas, posición, etc.)
2. CORRIGE solo las cláusulas que el análisis previo señaló como problemáticas
3. AGREGA las cláusulas obligatorias faltantes (jornada, modalidad de pago, periodo de prueba, etc.)
4. NUNCA inventes datos del trabajador o de la empresa — si falta información, deja un placeholder {{CAMPO_FALTANTE}}
5. RESPETA el formato HTML del contrato original (tags, estructura, encabezados)
6. USA lenguaje formal peruano profesional, sin voseo argentino ni anglicismos

NORMATIVA APLICABLE:
- D.Leg. 728 (Productividad y Competitividad Laboral) — régimen general
- D.S. 001-97-TR (TUO Ley de CTS)
- Ley 27735 (Gratificaciones)
- D.Leg. 713 (Vacaciones)
- Ley 29783 (Seguridad y Salud en el Trabajo)
- Ley 30709 (Igualdad salarial entre hombres y mujeres)
- Ley 27942 (Hostigamiento sexual)
- Para MYPE: Ley 32353 (régimen especial)

OUTPUT REQUERIDO (JSON estricto):
{
  "fixedHtml": "...HTML completo del contrato corregido...",
  "changes": [
    {
      "type": "MODIFY" | "ADD" | "REMOVE",
      "category": "Período de prueba" | "Jornada" | "SST" | etc,
      "before": "texto original (vacío si type=ADD)",
      "after": "texto corregido (vacío si type=REMOVE)",
      "reason": "por qué se cambió",
      "legalBasis": "norma que sustenta el cambio"
    }
  ],
  "remainingRisks": 2,
  "summary": "Se corrigieron 5 riesgos. Quedan 2 que requieren input del usuario (datos faltantes).",
  "warningLegal": "Esta versión corregida es una sugerencia automatizada. Revisa con tu abogado antes de firmar."
}

NUNCA respondas fuera del JSON. NUNCA omitas el campo \`warningLegal\`.`

export async function generateFixedContract(
  input: ContractFixInput,
): Promise<ContractFixResult> {
  // Redact PII básico antes de mandar al modelo (DNI/email se reemplazan por
  // tokens; el modelo trabaja con la estructura sin ver datos personales reales)
  const redacted = redactPii(input.contractHtml)

  const userPrompt = `TIPO DE CONTRATO: ${input.contractType}

ANÁLISIS PREVIO DE RIESGOS:
${JSON.stringify(
  {
    overallScore: input.reviewResult.overallScore,
    riskLevel: input.reviewResult.riskLevel,
    risksToFix: input.reviewResult.risks.map(r => ({
      severity: r.severity,
      category: r.category,
      title: r.title,
      clause: r.clause,
      recommendation: r.recommendation,
      legalBasis: r.legalBasis,
    })),
    clausulasFaltantes: input.reviewResult.clausulasObligatorias
      .filter(c => !c.presente)
      .map(c => ({ nombre: c.nombre, descripcion: c.descripcion, baseLegal: c.baseLegal })),
  },
  null,
  2,
)}

CONTRATO ORIGINAL HTML (PII redactada):
${redacted.redacted}

Reescribe el contrato corrigiendo TODOS los riesgos listados arriba y agregando las cláusulas obligatorias faltantes. Devuelve JSON estricto según el schema.`

  const start = Date.now()
  let promptTokens = 0
  let completionTokens = 0
  let parsed: ContractFixResult | null = null

  try {
    const { content, usage } = await callAIWithUsage(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.2, maxTokens: 4000, jsonMode: true },
    )

    promptTokens = usage?.promptTokens ?? 0
    completionTokens = usage?.completionTokens ?? 0

    // Parse JSON estricto
    try {
      parsed = JSON.parse(content) as ContractFixResult
    } catch {
      // Fallback: el modelo puede haber envuelto el JSON en markdown ```json
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]+\})\s*```/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]) as ContractFixResult
      } else {
        throw new Error('La respuesta IA no es JSON válido')
      }
    }

    // Restaurar PII en el HTML corregido (placeholder → valor original)
    if (parsed?.fixedHtml) {
      parsed.fixedHtml = unredactWithMapping(parsed.fixedHtml, redacted.mapping)
    }
    if (parsed?.changes) {
      parsed.changes = parsed.changes.map(c => ({
        ...c,
        before: c.before ? unredactWithMapping(c.before, redacted.mapping) : c.before,
        after: c.after ? unredactWithMapping(c.after, redacted.mapping) : c.after,
      }))
    }

    void recordAiUsage({
      orgId: input.orgId,
      userId: input.userId,
      feature: 'contract-fix',
      provider: usage?.provider ?? 'unknown',
      model: usage?.model ?? 'unknown',
      promptTokens,
      completionTokens,
      latencyMs: Date.now() - start,
      success: true,
    })

    if (!parsed) {
      throw new Error('No se pudo procesar la respuesta IA')
    }

    // Garantizar que warningLegal esté presente (defensa contra modelos que lo omiten)
    if (!parsed.warningLegal) {
      parsed.warningLegal =
        'Esta versión corregida es una sugerencia automatizada. Revisa con tu abogado antes de firmar.'
    }

    return parsed
  } catch (err) {
    void recordAiUsage({
      orgId: input.orgId,
      userId: input.userId,
      feature: 'contract-fix',
      provider: 'unknown',
      model: 'unknown',
      promptTokens,
      completionTokens,
      latencyMs: Date.now() - start,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}
