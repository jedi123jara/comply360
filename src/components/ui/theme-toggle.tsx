'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

/**
 * ThemeToggle — switcher dark/light de Vault Pro.
 *
 * Persiste en localStorage. El bootstrap inicial está en layout.tsx
 * (script beforeInteractive) para evitar flash. Este componente solo
 * cambia y persiste.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as Theme | null) ?? 'dark'
    setTheme(current === 'light' ? 'light' : 'dark')
    setMounted(true)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    document.documentElement.style.colorScheme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      /* localStorage no disponible — OK, sigue funcionando in-memory */
    }
  }

  // Pre-mount: render placeholder con dimensiones para evitar layout shift
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Cambiar tema"
        className={
          'inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-2)] ' +
          (className ?? '')
        }
      >
        <span className="block h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      className={
        'inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--border-default)] ' +
        'bg-[color:var(--bg-2)] text-[color:var(--text-secondary)] hover:text-[color:var(--accent)] ' +
        'hover:border-[color:var(--border-strong)] transition-all duration-[var(--t-fast)] ease-[var(--ease-vp)] ' +
        'cursor-pointer ' +
        (className ?? '')
      }
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
