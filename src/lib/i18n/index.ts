'use client'

import { createContext, useContext } from 'react'
import { es, type TranslationKey } from './locales/es'
import { en } from './locales/en'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Locale = 'es' | 'en' | 'pt'

export interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
}

// ---------------------------------------------------------------------------
// Translation dictionaries
// ---------------------------------------------------------------------------

const dictionaries: Record<Locale, Record<string, string>> = {
  es: es as unknown as Record<string, string>,
  en: en as unknown as Record<string, string>,
  pt: es as unknown as Record<string, string>, // fallback to Spanish until PT translations are added
}

export const DEFAULT_LOCALE: Locale = 'es'

export const LOCALE_LABELS: Record<Locale, { flag: string; label: string }> = {
  es: { flag: '\uD83C\uDDF5\uD83C\uDDEA', label: 'Espanol' },
  en: { flag: '\uD83C\uDDFA\uD83C\uDDF8', label: 'English' },
  pt: { flag: '\uD83C\uDDE7\uD83C\uDDF7', label: 'Portugues' },
}

// ---------------------------------------------------------------------------
// Standalone translation function
// ---------------------------------------------------------------------------

/**
 * Translate a key for a given locale with optional interpolation params.
 *
 * @example
 *   t('dashboard.welcome', 'es', { name: 'Ana' })
 *   // => "Bienvenido, Ana"
 */
export function t(
  key: TranslationKey | string,
  locale: Locale = DEFAULT_LOCALE,
  params?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
  let value = dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue))
    }
  }

  return value
}

// ---------------------------------------------------------------------------
// React Context
// ---------------------------------------------------------------------------

export const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
})

/**
 * Hook that reads the current locale from context and returns
 * a bound translation function.
 *
 * @example
 *   const { t, locale, setLocale } = useTranslation()
 *   t('btn.save') // => "Guardar"
 */
export function useTranslation() {
  const { locale, setLocale } = useContext(I18nContext)

  const translate = (
    key: TranslationKey | string,
    params?: Record<string, string | number>,
  ) => t(key, locale, params)

  return { t: translate, locale, setLocale }
}

export type { TranslationKey }
