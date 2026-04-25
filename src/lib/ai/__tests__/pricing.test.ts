/**
 * Tests para src/lib/ai/pricing.ts
 *
 * Cubren:
 *   - Cálculo correcto USD = (prompt/1M)*P + (completion/1M)*C
 *   - Modelos conocidos por provider devuelven precios distintos
 *   - Modelo desconocido cae al `*` del provider
 *   - Provider desconocido devuelve 0 con warning (no rompe)
 *   - Ollama y simulated devuelven 0
 */

import { estimateCostUsd, getKnownModels } from '../pricing'

describe('estimateCostUsd', () => {
  test('gpt-4o-mini: 1M prompt + 1M completion = $0.15 + $0.60 = $0.75', () => {
    const cost = estimateCostUsd({
      provider: 'openai',
      model: 'gpt-4o-mini',
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    })
    expect(cost).toBeCloseTo(0.75, 6)
  })

  test('gpt-4o: tarifa premium', () => {
    const cost = estimateCostUsd({
      provider: 'openai',
      model: 'gpt-4o',
      promptTokens: 1_000_000,
      completionTokens: 0,
    })
    expect(cost).toBeCloseTo(2.5, 6)
  })

  test('uso típico ~5K tokens prompt + 1K completion en gpt-4o-mini', () => {
    const cost = estimateCostUsd({
      provider: 'openai',
      model: 'gpt-4o-mini',
      promptTokens: 5_000,
      completionTokens: 1_000,
    })
    // (5000/1M)*0.15 + (1000/1M)*0.6 = 0.00075 + 0.0006 = 0.00135
    expect(cost).toBeCloseTo(0.00135, 6)
  })

  test('Ollama es siempre 0 (self-hosted)', () => {
    const cost = estimateCostUsd({
      provider: 'ollama',
      model: 'qwen3:14b',
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    })
    expect(cost).toBe(0)
  })

  test('modelo desconocido en openai cae al fallback gpt-4o-mini', () => {
    const cost = estimateCostUsd({
      provider: 'openai',
      model: 'gpt-X-future',
      promptTokens: 1_000_000,
      completionTokens: 0,
    })
    expect(cost).toBeCloseTo(0.15, 6) // tarifa fallback
  })

  test('provider desconocido retorna 0 sin romper', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const cost = estimateCostUsd({
      provider: 'unknownco',
      model: 'mystery',
      promptTokens: 1000,
      completionTokens: 500,
    })
    expect(cost).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  test('embeddings: solo prompt cuesta', () => {
    const cost = estimateCostUsd({
      provider: 'openai',
      model: 'text-embedding-3-small',
      promptTokens: 1_000_000,
      completionTokens: 999_999,
    })
    expect(cost).toBeCloseTo(0.02, 6) // completion es 0
  })
})

describe('getKnownModels', () => {
  test('openai incluye gpt-4o-mini', () => {
    const models = getKnownModels('openai')
    expect(models).toContain('gpt-4o-mini')
    expect(models).not.toContain('*')
  })

  test('provider desconocido devuelve array vacío', () => {
    expect(getKnownModels('mistery')).toEqual([])
  })
})
