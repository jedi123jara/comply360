'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * InstallPrompt — PWA install CTA.
 *
 * Listens to `beforeinstallprompt`, waits for 3 sessions (or explicit dismiss)
 * before showing a small floating card. Stores state in localStorage.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const KEY_SESSIONS = 'comply360.pwa.sessions'
const KEY_DISMISSED = 'comply360.pwa.dismissed'
const KEY_INSTALLED = 'comply360.pwa.installed'

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (localStorage.getItem(KEY_INSTALLED) === '1') return
      if (localStorage.getItem(KEY_DISMISSED) === '1') return

      // Increment session count
      const count = Number(localStorage.getItem(KEY_SESSIONS) ?? '0') + 1
      localStorage.setItem(KEY_SESSIONS, String(count))

      function onBefore(e: Event) {
        e.preventDefault()
        setEvt(e as BeforeInstallPromptEvent)
        // Show CTA after ≥ 3 sessions
        if (count >= 3) setVisible(true)
      }
      function onInstalled() {
        localStorage.setItem(KEY_INSTALLED, '1')
        setVisible(false)
      }
      window.addEventListener('beforeinstallprompt', onBefore)
      window.addEventListener('appinstalled', onInstalled)
      return () => {
        window.removeEventListener('beforeinstallprompt', onBefore)
        window.removeEventListener('appinstalled', onInstalled)
      }
    } catch {
      // ignore
    }
  }, [])

  async function accept() {
    if (!evt) return
    await evt.prompt()
    const { outcome } = await evt.userChoice
    if (outcome === 'dismissed') {
      try {
        localStorage.setItem(KEY_DISMISSED, '1')
      } catch {
        /* ignore */
      }
    }
    setVisible(false)
    setEvt(null)
  }

  function dismiss() {
    try {
      localStorage.setItem(KEY_DISMISSED, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible || !evt) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-[var(--z-toast)] max-w-sm motion-fade-in-up"
      role="dialog"
      aria-live="polite"
    >
      <Card padding="md" variant="emerald">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 border border-emerald-300">
            <Download className="h-4 w-4 text-emerald-700" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Instalar COMPLY360</p>
            <p className="mt-0.5 text-xs text-[color:var(--text-secondary)] leading-relaxed">
              Acceso rápido desde tu escritorio/celular, alertas críticas push
              y shell offline.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" onClick={accept}>
                Instalar
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Ahora no
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar"
            className="shrink-0 rounded-md p-1 text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </Card>
    </div>
  )
}
