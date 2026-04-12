/**
 * norm-classifier.ts
 *
 * Uses the project's LLM (OpenAI / Ollama via callAI) to classify a raw norm
 * fetched from an RSS feed into the fields required by the NormUpdate model:
 *   - normCode, category, impactLevel, affectedModules, affectedRegimens,
 *     summary, impactAnalysis, actionRequired, actionDeadline
 *
 * Falls back to safe defaults if the LLM call fails so the cron job never
 * silently drops norms.
 */

import { callAI, extractJson } from '@/lib/ai/provider'
import type { RawNorm } from './norm-fetcher'

export interface ClassifiedNorm extends RawNorm {
  normCode: string
  summary: string
  category: NormCategory
  impactLevel: ImpactLevel
  affectedModules: string[]
  affectedRegimens: string[]
  actionRequired: string
  actionDeadline: string | null   // ISO date string or null
  impactAnalysis: string
}

// Mirror enums from Prisma (string literals, no import needed at runtime)
type NormCategory =
  | 'LABORAL'
  | 'SEGURIDAD_SALUD'
  | 'TRIBUTARIO'
  | 'PREVISIONAL'
  | 'SUNAFIL'
  | 'GENERAL'

type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

const VALID_CATEGORIES: NormCategory[] = [
  'LABORAL', 'SEGURIDAD_SALUD', 'TRIBUTARIO', 'PREVISIONAL', 'SUNAFIL', 'GENERAL',
]

const VALID_IMPACT_LEVELS: ImpactLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const VALID_MODULES = [
  'contratos', 'trabajadores', 'documentos', 'alertas', 'calculadoras',
  'sst', 'beneficios', 'capacitaciones', 'denuncias', 'calendario',
  'diagnostico', 'legajo', 'teletrabajo', 'sindicatos',
]

const VALID_REGIMENS = [
  'GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA', 'AGRARIO', 'EXPORTACION',
  'CONSTRUCCION_CIVIL', 'MINERO', 'PESQUERO', 'CAS', 'MODALIDAD_FORMATIVA',
  'TELETRABAJO', 'PORTUARIO',
]

const SYSTEM_PROMPT = `Eres un experto en derecho laboral peruano. Se te dará el título y descripción de una norma legal publicada en El Peruano, SUNAFIL o MTPE.

Debes responder SOLO con un objeto JSON válido (sin markdown, sin explicaciones) con estos campos exactos:

{
  "normCode": "código oficial de la norma (ej: D.S. 014-2025-TR, Ley 32350, R.S. 045-SUNAFIL). Si no se identifica, usa 'NORMA-PENDIENTE'",
  "summary": "resumen en 2-3 oraciones claras para el empresario peruano",
  "category": "una de: LABORAL | SEGURIDAD_SALUD | TRIBUTARIO | PREVISIONAL | SUNAFIL | GENERAL",
  "impactLevel": "una de: LOW | MEDIUM | HIGH | CRITICAL (CRITICAL=multas muy graves o cambios urgentes, HIGH=impacto importante en operaciones, MEDIUM=cambio que requiere accion, LOW=informativo)",
  "affectedModules": ["array de módulos de la plataforma afectados: contratos, trabajadores, documentos, alertas, calculadoras, sst, beneficios, capacitaciones, denuncias, calendario, diagnostico, legajo, teletrabajo, sindicatos"],
  "affectedRegimens": ["array de regímenes laborales afectados: GENERAL, MYPE_MICRO, MYPE_PEQUENA, AGRARIO, EXPORTACION, CONSTRUCCION_CIVIL, MINERO, PESQUERO, CAS, MODALIDAD_FORMATIVA, TELETRABAJO, PORTUARIO"],
  "actionRequired": "acción concreta que debe tomar una empresa (máx 2 oraciones)",
  "actionDeadline": "fecha ISO YYYY-MM-DD si la norma tiene plazo de cumplimiento, null si no",
  "impactAnalysis": "análisis de 3-4 oraciones del impacto en cumplimiento laboral, costos y riesgos"
}`

/** Default classification when LLM fails — marked as MEDIUM/GENERAL to ensure human review */
function defaultClassification(raw: RawNorm): ClassifiedNorm {
  return {
    ...raw,
    normCode: 'NORMA-PENDIENTE',
    summary: raw.description.slice(0, 300) || raw.title,
    category: 'GENERAL',
    impactLevel: 'MEDIUM',
    affectedModules: [],
    affectedRegimens: ['GENERAL'],
    actionRequired: 'Revisar norma manualmente y determinar impacto.',
    actionDeadline: null,
    impactAnalysis: 'Clasificación automática no disponible. Requiere revisión manual.',
  }
}

/** Validate and coerce LLM output to ensure no invalid enum values */
function sanitizeOutput(raw: RawNorm, parsed: Record<string, unknown>): ClassifiedNorm {
  const category = VALID_CATEGORIES.includes(parsed.category as NormCategory)
    ? (parsed.category as NormCategory)
    : 'GENERAL'

  const impactLevel = VALID_IMPACT_LEVELS.includes(parsed.impactLevel as ImpactLevel)
    ? (parsed.impactLevel as ImpactLevel)
    : 'MEDIUM'

  const affectedModules = Array.isArray(parsed.affectedModules)
    ? (parsed.affectedModules as string[]).filter(m => VALID_MODULES.includes(m))
    : []

  const affectedRegimens = Array.isArray(parsed.affectedRegimens)
    ? (parsed.affectedRegimens as string[]).filter(r => VALID_REGIMENS.includes(r))
    : ['GENERAL']

  // Validate actionDeadline as a real date
  let actionDeadline: string | null = null
  if (typeof parsed.actionDeadline === 'string' && parsed.actionDeadline) {
    const d = new Date(parsed.actionDeadline)
    if (!isNaN(d.getTime())) actionDeadline = d.toISOString().slice(0, 10)
  }

  return {
    ...raw,
    normCode: typeof parsed.normCode === 'string' && parsed.normCode.trim()
      ? parsed.normCode.trim()
      : 'NORMA-PENDIENTE',
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 500) : raw.title,
    category,
    impactLevel,
    affectedModules,
    affectedRegimens,
    actionRequired: typeof parsed.actionRequired === 'string'
      ? parsed.actionRequired.slice(0, 300)
      : 'Revisar norma y determinar impacto.',
    actionDeadline,
    impactAnalysis: typeof parsed.impactAnalysis === 'string'
      ? parsed.impactAnalysis.slice(0, 800)
      : '',
  }
}

/**
 * Classify a raw norm using the configured LLM.
 * Never throws — returns a default classification on failure.
 */
export async function classifyNorm(raw: RawNorm): Promise<ClassifiedNorm> {
  try {
    const userContent = `Título: ${raw.title}\n\nDescripción: ${raw.description || '(sin descripción)'}\n\nFuente: ${raw.source}\nURL: ${raw.sourceUrl}`

    const content = await callAI(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      {
        feature: 'contract-review', // Reuse contract-review AI provider setting
        temperature: 0.1,
        maxTokens: 600,
        jsonMode: true,
      }
    )

    const parsed = extractJson<Record<string, unknown>>(content)
    return sanitizeOutput(raw, parsed)
  } catch (err) {
    console.warn(`[norm-classifier] LLM classification failed for "${raw.title}":`, err)
    return defaultClassification(raw)
  }
}
