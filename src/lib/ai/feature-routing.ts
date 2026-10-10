/**
 * Feature Routing — mapping declarativo de feature → provider/tier/comportamiento.
 *
 * Esta tabla es la fuente única de verdad de cómo se rutea cada workload de IA.
 * Override final por env var (ver provider.ts).
 *
 * Tiers DeepSeek (modelos vigentes al 2026-10; `deepseek-chat` y
 * `deepseek-reasoner` se retiraron el 2026-07-24):
 *   - flash → deepseek-flash   (V4.1-Flash, sin modo pensamiento)
 *   - pro   → deepseek-v4-pro  (V4-Pro, con modo pensamiento)
 *
 * Excepciones (no migrar a DeepSeek):
 *   - rag-embed       → OpenAI text-embedding-3-small (DeepSeek no tiene embeddings)
 *   - document-vision → OpenAI gpt-4o-mini con vision (DeepSeek no tiene vision)
 */

import type { AIFeature, AIProvider } from './provider'

export type DeepSeekTier = 'flash' | 'pro'

export interface FeatureConfig {
  /** Provider primario para este feature */
  provider: AIProvider
  /** Tier dentro de DeepSeek. null = no aplica (provider != deepseek) */
  tier: DeepSeekTier | null
  /** Si este feature debe usar streaming SSE por defecto */
  stream: boolean
  /** Si este feature pide JSON mode */
  jsonMode: boolean
  /** Si este feature contiene PII y debe pasar por callAIRedacted */
  redactPii: boolean
  /** Etiqueta humana para logs y telemetría */
  label: string
}

/**
 * Routing definitivo de features.
 *
 * Reglas:
 * - Tier flash: alto volumen, clasificación, extracción simple, chat conversacional.
 * - Tier pro: razonamiento legal denso, análisis multi-hop, contratos, agentes.
 * - PII redaction: cualquier feature que reciba input del usuario o contenga datos
 *   de trabajadores (DNI, sueldos, nombres). Las que solo procesan corpus legal
 *   estable o templates no necesitan redaction.
 */
export const FEATURE_ROUTING: Record<AIFeature, FeatureConfig> = {
  // ── Tier Flash (alto volumen, bajo riesgo) ──────────────────────────────
  'chat': {
    provider: 'deepseek',
    tier: 'flash',
    stream: true,
    jsonMode: false,
    redactPii: true,
    label: 'Copilot dashboard',
  },
  'worker-chat': {
    provider: 'deepseek',
    tier: 'flash',
    stream: true,
    jsonMode: false,
    redactPii: true,
    label: 'Chat trabajador (mi-portal)',
  },
  'complaint-triage': {
    provider: 'deepseek',
    tier: 'flash',
    stream: false,
    jsonMode: true,
    redactPii: true,
    label: 'Triaje denuncias',
  },
  'norm-classifier': {
    provider: 'deepseek',
    tier: 'flash',
    stream: false,
    jsonMode: true,
    redactPii: false,
    label: 'Clasificador de normas (crawler)',
  },
  'pdf-extract': {
    provider: 'deepseek',
    tier: 'flash',
    stream: false,
    jsonMode: true,
    redactPii: true,
    label: 'Extracción batch desde PDF',
  },
  'doc-generator': {
    provider: 'deepseek',
    tier: 'flash',
    stream: false,
    jsonMode: false,
    redactPii: false,
    label: 'Generadores de documentos compliance',
  },

  // ── Tier Pro (legal high-stakes) ────────────────────────────────────────
  'contract-review': {
    provider: 'deepseek',
    tier: 'pro',
    stream: false,
    jsonMode: true,
    redactPii: true,
    label: 'Revisión contratos (RAG + análisis)',
  },
  'contract-gen': {
    provider: 'deepseek',
    tier: 'pro',
    stream: false,
    jsonMode: true,
    redactPii: true,
    label: 'Generación de contratos',
  },
  'contract-fix': {
    provider: 'deepseek',
    tier: 'pro',
    stream: false,
    jsonMode: true,
    redactPii: true,
    label: 'Auto-fix de contratos con riesgos',
  },
  'action-plan': {
    provider: 'deepseek',
    tier: 'pro',
    stream: false,
    jsonMode: true,
    redactPii: true,
    label: 'Plan de acción tras diagnóstico',
  },
  'pliego-analysis': {
    provider: 'deepseek',
    tier: 'pro',
    stream: false,
    jsonMode: true,
    redactPii: true,
    label: 'Análisis pliego de reclamos',
  },
  'sunafil-agent': {
    provider: 'deepseek',
    tier: 'pro',
    stream: false,
    jsonMode: true,
    redactPii: true,
    label: 'Agente analista SUNAFIL',
  },
  'payslip-audit': {
    provider: 'deepseek',
    tier: 'pro',
    stream: false,
    jsonMode: true,
    redactPii: true,
    label: 'Auditor de boletas',
  },
  'descargo-writer': {
    provider: 'deepseek',
    tier: 'pro',
    stream: false,
    jsonMode: true,
    redactPii: true,
    label: 'Redactor de descargos SUNAFIL',
  },

  // ── Excepciones quirúrgicas en OpenAI (no migrar) ───────────────────────
  'rag-embed': {
    provider: 'openai',
    tier: null,
    stream: false,
    jsonMode: false,
    redactPii: false,
    label: 'Embeddings RAG (text-embedding-3-small)',
  },
  'document-vision': {
    provider: 'openai',
    tier: null,
    stream: false,
    jsonMode: true,
    redactPii: false,
    label: 'Vision Fase 3.5 (auto-verify legajo)',
  },
}

export const DEEPSEEK_FLASH_MODEL = 'deepseek-flash'
export const DEEPSEEK_PRO_MODEL = 'deepseek-v4-pro'

/**
 * Nombres retirados que todavía pueden llegar por env vars viejas
 * (DEEPSEEK_MODEL, <FEATURE>_DEEPSEEK_MODEL) y su reemplazo vigente.
 */
const LEGACY_DEEPSEEK_MODELS: Record<string, string> = {
  'deepseek-chat': DEEPSEEK_FLASH_MODEL,
  'deepseek-v4': DEEPSEEK_FLASH_MODEL,
  'deepseek-v4-flash': DEEPSEEK_FLASH_MODEL,
  'deepseek-reasoner': DEEPSEEK_PRO_MODEL,
}

export function normalizeDeepSeekModel(model: string): string {
  const trimmed = model.trim()
  return LEGACY_DEEPSEEK_MODELS[trimmed.toLowerCase()] ?? trimmed
}

/**
 * Los modelos actuales piensan por defecto. El tier flash replica al viejo
 * `deepseek-chat` (sin razonamiento: rápido y barato, necesario para que el
 * streaming no supere el timeout del primer token) y el pro replica a
 * `deepseek-reasoner`.
 */
export function deepSeekThinking(model: string): 'enabled' | 'disabled' {
  return normalizeDeepSeekModel(model) === DEEPSEEK_PRO_MODEL ? 'enabled' : 'disabled'
}

/**
 * Resuelve el modelo de DeepSeek según tier.
 * Override final via env var FEATURE_DEEPSEEK_MODEL en provider.ts.
 */
export function tierToDeepSeekModel(tier: DeepSeekTier | null): string {
  if (tier === 'pro') return DEEPSEEK_PRO_MODEL
  return DEEPSEEK_FLASH_MODEL // flash o null caen al default Flash
}

/**
 * Obtiene la config de un feature. Si no existe, devuelve un default conservador.
 */
export function getFeatureConfig(feature: AIFeature | undefined): FeatureConfig {
  if (feature && feature in FEATURE_ROUTING) {
    return FEATURE_ROUTING[feature]
  }
  // Default: como chat, Flash, sin PII redaction (asume llamada interna).
  return {
    provider: 'deepseek',
    tier: 'flash',
    stream: false,
    jsonMode: false,
    redactPii: false,
    label: 'Default (sin feature)',
  }
}
