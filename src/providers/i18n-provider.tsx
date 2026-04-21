'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  I18nContext,
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  type Locale,
} from '@/lib/i18n'

const STORAGE_KEY = 'comply360_locale'

// ---------------------------------------------------------------------------
// External store — localStorage sync via useSyncExternalStore (React 19 idiom)
// ---------------------------------------------------------------------------
// Esta es la forma "correcta" en React 19 de sincronizar estado con un sistema
// externo (localStorage). Reemplaza el antipatrón `useEffect → setState` que
// el ESLint plugin react-hooks/set-state-in-effect señala.

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', onStoreChange)
  // Listen to our custom dispatchEvent also
  window.addEventListener('comply360-locale-change', onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener('comply360-locale-change', onStoreChange)
  }
}

function getSnapshot(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && stored in LOCALE_LABELS) return stored
  } catch {
    // localStorage unavailable (privacy mode, etc.)
  }
  return DEFAULT_LOCALE
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE
}

function persistLocale(next: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // ignore
  }
  // Dispatch custom event so other `useSyncExternalStore` subscribers re-read
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('comply360-locale-change'))
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Sync document.documentElement.lang cuando cambia el locale — en useEffect,
  // no inline (para no tocar el DOM durante render).
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    persistLocale(next)
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
  // Consume el mismo external store que el provider — garantiza consistencia
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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
    persistLocale(next)
    setOpen(false)
    // Full reload para aplicar el locale a todos los server components que
    // leen encabezados. TODO: migrar a Server Actions + revalidatePath.
    window.location.reload()
  }

  const current = LOCALE_LABELS[locale]

  return (
    <div ref={containerRef} className={`relative inline-block ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm font-medium text-[color:var(--text-secondary)] shadow-sm transition hover:bg-[color:var(--neutral-50)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-[color:var(--border-default)] bg-white shadow-lg"
        >
          {(Object.entries(LOCALE_LABELS) as [Locale, { flag: string; label: string }][]).map(
            ([key, { flag, label }]) => (
              <li
                key={key}
                role="option"
                aria-selected={key === locale}
                onClick={() => handleSelect(key)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-[color:var(--neutral-50)] ${
                  key === locale
                    ? 'bg-emerald-50 font-semibold text-emerald-700'
                    : 'text-[color:var(--text-primary)]'
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
