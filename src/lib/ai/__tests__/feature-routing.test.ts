/**
 * Tests de la resolución de modelos DeepSeek.
 *
 * DeepSeek retiró `deepseek-chat` y `deepseek-reasoner` el 2026-07-24. Estos
 * tests fijan que el código use los modelos vigentes, que traduzca nombres
 * viejos que lleguen por env vars y que el tier flash no active el modo
 * pensamiento (lo vuelve lento y caro, y rompe el timeout del streaming).
 */

import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  DEEPSEEK_FLASH_MODEL,
  DEEPSEEK_PRO_MODEL,
  FEATURE_ROUTING,
  deepSeekThinking,
  normalizeDeepSeekModel,
  tierToDeepSeekModel,
} from '../feature-routing'
import { getModelName } from '../provider'

describe('tierToDeepSeekModel', () => {
  test('usa los modelos vigentes', () => {
    expect(tierToDeepSeekModel('flash')).toBe('deepseek-flash')
    expect(tierToDeepSeekModel('pro')).toBe('deepseek-v4-pro')
    expect(tierToDeepSeekModel(null)).toBe('deepseek-flash')
  })
})

describe('normalizeDeepSeekModel', () => {
  test('traduce los nombres retirados', () => {
    expect(normalizeDeepSeekModel('deepseek-chat')).toBe(DEEPSEEK_FLASH_MODEL)
    expect(normalizeDeepSeekModel('deepseek-reasoner')).toBe(DEEPSEEK_PRO_MODEL)
    expect(normalizeDeepSeekModel('deepseek-v4-flash')).toBe(DEEPSEEK_FLASH_MODEL)
    expect(normalizeDeepSeekModel(' DeepSeek-Chat ')).toBe(DEEPSEEK_FLASH_MODEL)
  })

  test('deja intactos los nombres vigentes o desconocidos', () => {
    expect(normalizeDeepSeekModel('deepseek-flash')).toBe('deepseek-flash')
    expect(normalizeDeepSeekModel('deepseek-v4-pro')).toBe('deepseek-v4-pro')
    expect(normalizeDeepSeekModel('deepseek-v5-experimental')).toBe('deepseek-v5-experimental')
  })
})

describe('deepSeekThinking', () => {
  test('solo el modelo pro piensa', () => {
    expect(deepSeekThinking(DEEPSEEK_FLASH_MODEL)).toBe('disabled')
    expect(deepSeekThinking(DEEPSEEK_PRO_MODEL)).toBe('enabled')
    expect(deepSeekThinking('deepseek-reasoner')).toBe('enabled')
    expect(deepSeekThinking('deepseek-chat')).toBe('disabled')
  })

  test('los features con streaming no activan el modo pensamiento', () => {
    for (const [feature, cfg] of Object.entries(FEATURE_ROUTING)) {
      if (cfg.provider === 'deepseek' && cfg.stream) {
        expect(deepSeekThinking(tierToDeepSeekModel(cfg.tier)), feature).toBe('disabled')
      }
    }
  })
})

describe('getModelName con DeepSeek', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('sin overrides usa deepseek-flash', () => {
    vi.stubEnv('DEEPSEEK_MODEL', '')
    expect(getModelName({ provider: 'deepseek' })).toBe('deepseek-flash')
  })

  test('traduce un DEEPSEEK_MODEL viejo configurado en Vercel', () => {
    vi.stubEnv('DEEPSEEK_MODEL', 'deepseek-chat')
    expect(getModelName({ provider: 'deepseek' })).toBe('deepseek-flash')
  })

  test('traduce un override viejo por feature', () => {
    vi.stubEnv('CHAT_DEEPSEEK_MODEL', 'deepseek-reasoner')
    expect(getModelName({ provider: 'deepseek', feature: 'chat' })).toBe('deepseek-v4-pro')
  })

  test('el override de tier usa los modelos vigentes', () => {
    vi.stubEnv('CHAT_TIER', 'pro')
    expect(getModelName({ provider: 'deepseek', feature: 'chat' })).toBe('deepseek-v4-pro')
  })
})
