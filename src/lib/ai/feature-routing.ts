/**
 * Feature Routing — mapping declarativo de feature → provider/tier/comportamiento.
 *
 * Esta tabla es la fuente única de verdad de cómo se rutea cada workload de IA.
 * Override final por env var (ver provider.ts).
 *
 * Tiers DeepSeek:
 *   - flash → deepseek-chat       (V4-Flash, $0.14/M input, $0.28/M output)
 *   - pro   → deepseek-reasoner   (V4-Pro,   $1.74/M input, $3.48/M output)
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

/**
 * Resuelve el modelo de DeepSeek según tier.
 * Override final via env var FEATURE_DEEPSEEK_MODEL en provider.ts.
 */
export function tierToDeepSeekModel(tier: DeepSeekTier | null): string {
  if (tier === 'pro') return 'deepseek-reasoner'
  return 'deepseek-chat' // flash o null caen al default Flash
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
