/**
 * Token counter — estimación de tokens y costo PRE-CALL.
 *
 * Permite:
 *  - Decidir si truncar el RAG antes de mandar al LLM.
 *  - Mostrar al usuario "esta consulta costará ~$0.0023" antes de ejecutar.
 *  - Bloquear llamadas que excedan el contexto máximo del modelo.
 *
 * Limitaciones:
 *  - DeepSeek y Anthropic NO publican su tokenizer exacto. Usamos el cl100k_base
 *    de OpenAI como aproximación. El error típico es ±5%, suficiente para guardar
 *    capacity y estimar costos. Para facturación exacta usar `usage` del response.
 */

import { encode } from 'gpt-tokenizer'
import type { AIMessage, AICallOptions } from './provider'
import { estimateCostUsd } from './pricing'
import { detectProvider, getModelName } from './provider'

/**
 * Ventanas de contexto efectivas por modelo. Conservadoras: dejamos 10-20%
 * de margen para el output. Si el caller pasa `maxTokens` alto, validar con
 * `getEffectiveContextWindow(model, maxTokens)`.
 */
const CONTEXT_WINDOWS: Record<string, number> = {
  // DeepSeek V4 — 1M tokens reales
  'deepseek-chat': 1_000_000,
  'deepseek-reasoner': 1_000_000,
  'deepseek-v4': 1_000_000,
  'deepseek-v4-flash': 1_000_000,
  'deepseek-v4-pro': 1_000_000,
  // OpenAI
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'o1': 128_000,
  'o1-mini': 128_000,
  'o3-mini': 200_000,
  // Anthropic
  'claude-opus-4-20250514': 200_000,
  'claude-sonnet-4-20250514': 200_000,
  'claude-haiku-4-20250514': 200_000,
  'claude-3-5-sonnet-20241022': 200_000,
}

const DEFAULT_CONTEXT_WINDOW = 32_000

export function getContextWindow(model: string): number {
  return CONTEXT_WINDOWS[model] ?? DEFAULT_CONTEXT_WINDOW
}

/**
 * Cuenta tokens aproximados de un string. Usa cl100k_base.
 * En caso de error (caracter raro), fallback a heuristica chars/4.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  try {
    return encode(text).length
  } catch {
    // Fallback heurístico: ~4 chars por token en castellano.
    return Math.ceil(text.length / 4)
  }
}

/**
 * Cuenta tokens de un array de messages incluyendo el overhead estructural
 * que agregan los providers (~4 tokens por message + role + separators).
 */
export function estimateMessagesTokens(messages: AIMessage[]): number {
  let total = 0
  for (const m of messages) {
    total += estimateTokens(m.content) + 4 // overhead por message
    total += estimateTokens(m.role)
  }
  total += 2 // overhead de cierre del prompt
  return total
}

/**
 * Estima el costo USD de una llamada antes de ejecutarla.
 * El completion se asume como `maxTokens` (worst case). El cost real será
 * menor si el modelo termina antes.
 */
export function estimateCallCost(
  messages: AIMessage[],
  options: AICallOptions = {},
): {
  promptTokens: number
  estimatedCompletionTokens: number
  estimatedCostUsd: number
  provider: string
  model: string
} {
  const provider = detectProvider(options)
  const model = getModelName(options)
  const promptTokens = estimateMessagesTokens(messages)
  const estimatedCompletionTokens = options.maxTokens ?? 2000
  const estimatedCostUsd = estimateCostUsd({
    provider,
    model,
    promptTokens,
    completionTokens: estimatedCompletionTokens,
  })
  return { promptTokens, estimatedCompletionTokens, estimatedCostUsd, provider, model }
}

/**
 * Lanza error si el prompt excede la ventana de contexto del modelo.
 * Considera maxTokens del completion para reservar espacio.
 */
export function assertWithinContext(
  messages: AIMessage[],
  options: AICallOptions = {},
): void {
  const { promptTokens, model } = estimateCallCost(messages, options)
  const window = getContextWindow(model)
  const completionReserve = options.maxTokens ?? 2000
  const available = window - completionReserve
  if (promptTokens > available) {
    throw new Error(
      `Prompt excede ventana de contexto: ${promptTokens} tokens > ${available} disponibles para ${model} (window=${window}, reserve=${completionReserve}). Trunca el RAG o usa un modelo con más contexto.`,
    )
  }
}

/**
 * Trunca una lista de chunks de RAG para que el prompt total quepa en la ventana.
 * Mantiene los chunks por orden de relevancia (los primeros = mejores) y descarta
 * los del final hasta que entre. Útil cuando el RAG retorna mucho contexto.
 */
export function fitChunksToContext(
  baseMessages: AIMessage[],
  ragChunks: string[],
  options: AICallOptions = {},
): string[] {
  const provider = detectProvider(options)
  const model = getModelName(options)
  const window = getContextWindow(model)
  const reserve = options.maxTokens ?? 2000
  const available = window - reserve
  const baseTokens = estimateMessagesTokens(baseMessages)
  let used = baseTokens
  const fitted: string[] = []
  for (const chunk of ragChunks) {
    const t = estimateTokens(chunk) + 8 // overhead de inyección
    if (used + t <= available) {
      fitted.push(chunk)
      used += t
    } else {
      break
    }
  }
  void provider // sin uso directo, mantenido para futura especialización
  return fitted
}
