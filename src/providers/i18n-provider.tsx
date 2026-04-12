'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  I18nContext,
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  type Locale,
} from '@/lib/i18n'

const STORAGE_KEY = 'comply360_locale'

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const initialized = useRef(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (stored && stored in LOCALE_LABELS) {
        setLocaleState(stored)
      }
    } catch {
      // localStorage unavailable (SSR / privacy mode)
    }
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
    // Update html lang attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next
    }
  }, [])

  return (
    <I18nContext value={{ locale, setLocale }}>
      {children}
    </I18nContext>
  )
}

// ---------------------------------------------------------------------------
// Language Selector Component
// ---------------------------------------------------------------------------

export function LanguageSelector({ className }: { className?: string }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync with context — we read from context indirectly via a mini-provider approach
  // but for simplicity, read localStorage directly
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (stored && stored in LOCALE_LABELS) {
        setLocaleState(stored)
      }
    } catch {
      // ignore
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (next: Locale) => {
    setLocaleState(next)
    setOpen(false)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next
    }
    // Dispatch storage event so the provider can react
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: next }))
    // Reload to apply across the app
    window.location.reload()
  }

  const current = LOCALE_LABELS[locale]

  return (
    <div ref={containerRef} className={`relative inline-block ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#141824] px-3 py-2 text-sm font-medium text-gray-300 shadow-sm transition hover:bg-white/[0.02] focus:outline-none focus:ring-2 focus:ring-blue-500 border-white/[0.08] bg-[#141824] hover:bg-white/[0.04]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
      >
        <span aria-hidden="true">{current.flag}</span>
        <span>{current.label}</span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Available languages"
          className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-white/[0.08] bg-[#141824] shadow-lg border-white/[0.08] bg-[#141824]"
        >
          {(Object.entries(LOCALE_LABELS) as [Locale, { flag: string; label: string }][]).map(
            ([key, { flag, label }]) => (
              <li
                key={key}
                role="option"
                aria-selected={key === locale}
                onClick={() => handleSelect(key)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-white/[0.04] hover:bg-white/[0.04] ${
                  key === locale
                    ? 'bg-blue-50 font-semibold text-blue-700'
                    : 'text-gray-700'
                }`}
              >
                <span aria-hidden="true">{flag}</span>
                <span>{label}</span>
                {key === locale && (
                  <svg className="ml-auto h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}
