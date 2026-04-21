'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  Send,
  RotateCcw,
  PanelRightClose,
  MessageSquare,
  Zap,
  CornerDownLeft,
} from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { SkeletonText } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useCopilot } from '@/providers/copilot-provider'
import { usePageContext } from '@/hooks/use-page-context'

/**
 * CopilotDrawer — persistent right-side AI panel.
 *
 * Rendered by the dashboard layout so it's available on every page. Opens
 * via:
 *  - Cmd+I / Ctrl+I (keyboard shortcut, handled in layout)
 *  - Sparkles button in topbar
 *  - `useCopilot().open()` from any component
 *  - Command palette "ask AI" fallback
 *
 * Auto-contextualiza with `usePageContext()` so the first message shows
 * what the AI "knows" about the current page.
 */
export function CopilotDrawer() {
  const copilot = useCopilot()
  const context = usePageContext()
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [copilot.messages])

  // Consume pending prompt (from command palette etc.) when drawer opens
  useEffect(() => {
    if (!copilot.isOpen) return
    const pending = copilot.consumePendingPrompt()
    if (pending) {
      copilot.send(pending)
    } else {
      // Focus the input on open
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [copilot.isOpen, copilot])

  function submit() {
    const text = draft.trim()
    if (!text) return
    copilot.send(text)
    setDraft('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const hasMessages = copilot.messages.length > 0

  return (
    <Sheet open={copilot.isOpen} onOpenChange={(v) => (v ? copilot.open() : copilot.close())}>
      <SheetContent
        side="right"
        size="md"
        hideClose
        className="!p-0 !flex !flex-col"
      >
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-[color:var(--border-subtle)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              </span>
              <h2 className="text-base font-semibold tracking-tight text-[color:var(--text-primary)]">
                Copilot laboral
              </h2>
              <Badge variant="emerald" size="xs" dot>
                IA Perú
              </Badge>
            </div>
            <p className="mt-1.5 text-xs text-[color:var(--text-tertiary)] truncate">
              Contexto: <span className="text-[color:var(--text-secondary)]">{context.humanLabel}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            {hasMessages ? (
              <Tooltip content="Nueva conversación">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={copilot.reset}
                  aria-label="Reiniciar conversación"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
            ) : null}
            <Tooltip content="Cerrar (Esc)">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={copilot.close}
                aria-label="Cerrar copilot"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </header>

        {/* ── BODY ────────────────────────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!hasMessages ? (
            <EmptyState
              suggestions={context.suggestions}
              onPick={(prompt) => {
                setDraft('')
                copilot.send(prompt)
              }}
            />
          ) : (
            copilot.messages.map((msg) => <Message key={msg.id} msg={msg} />)
          )}
        </div>

        {/* ── COMPOSER ────────────────────────────────────────────── */}
        <footer className="border-t border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)] p-3">
          <div className="flex items-end gap-2 rounded-xl border border-[color:var(--border-default)] bg-white p-2 focus-within:border-emerald-500 focus-within:shadow-[0_0_0_4px_rgba(16,185,129,0.10)] transition-all">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Pregúntame sobre compliance, CTS, SUNAFIL…"
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] outline-none max-h-32"
              style={{ minHeight: '2rem' }}
            />
            <Button
              size="icon-sm"
              onClick={submit}
              disabled={!draft.trim()}
              aria-label="Enviar"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-[color:var(--text-tertiary)]">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" /> enviar · Shift+↵ nueva línea
            </span>
            <span className="hidden sm:inline">Respuestas citan base legal</span>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  )
}

/* ── Subcomponents ──────────────────────────────────────────────── */

function EmptyState({
  suggestions,
  onPick,
}: {
  suggestions: readonly { label: string; prompt: string }[]
  onPick: (prompt: string) => void
}) {
  return (
    <div className="py-6 space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200">
          <MessageSquare className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
            ¿En qué te ayudo?
          </h3>
          <p className="mt-1 text-xs text-[color:var(--text-secondary)] max-w-[28ch] mx-auto">
            Conozco el contexto de esta pantalla. Elegí una sugerencia o
            escribí lo que necesites.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)] px-1">
          Sugerencias rápidas
        </p>
        {suggestions.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="w-full text-left rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2.5 transition-all duration-150 hover:border-emerald-300 hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-sm font-medium text-[color:var(--text-primary)]">
                {s.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)] line-clamp-2 pl-5">
              {s.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

function Message({
  msg,
}: {
  msg: {
    id: string
    role: 'user' | 'assistant'
    content: string
    streaming?: boolean
  }
}) {
  const isUser = msg.role === 'user'
  return (
    <div
      className={cn('flex gap-2.5 motion-fade-in-up', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div
        className={cn(
          'shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg',
          isUser
            ? 'bg-[color:var(--neutral-100)] border border-[color:var(--border-default)]'
            : 'bg-emerald-50 border border-emerald-200'
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <span className="text-[10px] font-semibold text-[color:var(--text-secondary)]">TÚ</span>
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
        )}
      </div>
      <Card
        padding="md"
        variant={isUser ? 'outline' : 'default'}
        className={cn('max-w-[85%] text-sm leading-relaxed', isUser ? 'rounded-br-sm' : 'rounded-bl-sm')}
      >
        {msg.streaming && !msg.content ? (
          <SkeletonText lines={2} />
        ) : (
          <p className="whitespace-pre-wrap text-[color:var(--text-primary)]">
            {msg.content}
            {msg.streaming ? <span className="ml-1 inline-block h-3 w-[2px] bg-emerald-600 align-middle animate-pulse" /> : null}
          </p>
        )}
      </Card>
    </div>
  )
}
