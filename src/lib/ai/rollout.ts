/**
 * Rollout staged — control de despliegue gradual de DeepSeek.
 *
 * Permite enviar un porcentaje del tráfico a DeepSeek y el resto al fallback
 * (típicamente OpenAI). Útil para validar la migración con tráfico real
 * sin big-bang.
 *
 * Uso desde provider.ts o call sites:
 *   if (shouldUseRollout(orgId, 'chat')) {
 *     return 'deepseek'
 *   }
 *   return 'openai'
 *
 * El porcentaje se controla con env var:
 *   AI_ROLLOUT_PERCENTAGE=0    → 0% DeepSeek (todo al fallback)
 *   AI_ROLLOUT_PERCENTAGE=10   → 10% del tráfico a DeepSeek
 *   AI_ROLLOUT_PERCENTAGE=100  → migración completa (default cuando estable)
 *
 * El bucketing es estable por orgId: una org siempre cae en el mismo bucket
 * mientras el porcentaje no cambie. Esto garantiza que no veas a un cliente
 * alternar entre proveedores en la misma sesión.
 */

import { createHash } from 'node:crypto'

/**
 * Devuelve true si esta org/feature debe usar DeepSeek según el rollout.
 * Si AI_ROLLOUT_PERCENTAGE no está configurada, asume 100% (DeepSeek pleno).
 */
export function shouldUseDeepSeekRollout(params: {
  orgId?: string | null
  feature?: string
}): boolean {
  const raw = process.env.AI_ROLLOUT_PERCENTAGE
  if (raw === undefined || raw === '') return true // default: DeepSeek pleno
  const pct = Number(raw)
  if (!Number.isFinite(pct)) return true
  if (pct >= 100) return true
  if (pct <= 0) return false

  // Bucket estable por orgId+feature. Sin orgId, usar feature como salt.
  const key = `${params.orgId ?? 'anon'}:${params.feature ?? 'default'}`
  const hash = createHash('sha1').update(key).digest('hex')
  // Tomar primeros 8 hex chars → int 0-2^32, mod 100 → 0-99
  const bucket = parseInt(hash.slice(0, 8), 16) % 100
  return bucket < pct
}

/**
 * Helper para call sites: aplica rollout al elegir provider.
 * Si rollout dice usar DeepSeek y la key está, devuelve 'deepseek'.
 * Si dice fallback, devuelve 'openai' (si está) o lo que esté disponible.
 */
export function rolloutProvider(params: {
  orgId?: string | null
  feature?: string
}): 'deepseek' | 'openai' | null {
  const useDeepseek = shouldUseDeepSeekRollout(params)
  if (useDeepseek && process.env.DEEPSEEK_API_KEY) return 'deepseek'
  if (process.env.OPENAI_API_KEY?.startsWith('sk-')) return 'openai'
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek'
  return null
}
