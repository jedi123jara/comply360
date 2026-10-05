'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  Send,
  RotateCcw,
  PanelRightClose,
  MessageCircleQuestion,
  Scale,
} from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/tooltip'
import { SkeletonText } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useCopilot } from '@/providers/copilot-provider'
import { usePageContext, type AssistantSuggestion } from '@/hooks/use-page-context'
import { AssistantMarkdown } from './assistant-markdown'
import { useIsNewAccount } from './use-is-new-account'

/** Nombre único del asistente en toda la app. */
export const ASSISTANT_NAME = 'Asistente'

/**
 * CopilotDrawer: panel lateral del Asistente, el único chat del dashboard.
 *
 * Se monta una vez en el layout del dashboard y se abre con:
 *  - Ctrl+I / Cmd+I (atajo global en dashboard-shell)
 *  - el botón del asistente en la barra superior
 *  - `useCopilot().open(pregunta?)` desde cualquier pantalla
 *  - el buscador (Ctrl+K), opción "preguntar al asistente"
 *
 * Funciona como tutor: al abrirse sin conversación saluda, aclara que orienta
 * pero no reemplaza a un abogado y sugiere 3-4 preguntas de la pantalla
 * actual (`usePageContext`). En cuentas sin trabajadores prioriza preguntas
 * de arranque.
 */
export function CopilotDrawer() {
  const copilot = useCopilot()
  const isNewAccount = useIsNewAccount(copilot.isOpen)
  const context = usePageContext({ isNewAccount })
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Baja al último mensaje cuando llega texto nuevo
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [copilot.messages])

  // Si alguien abrió el panel con una pregunta (buscador, botones), se envía
  useEffect(() => {
    if (!copilot.isOpen) return
    const pending = copilot.consumePendingPrompt()
    if (pending) {
      copilot.send(pending)
    } else {
      // Foco en el campo de texto al abrir
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
  const isStreaming = copilot.messages.some((m) => m.streaming)

  return (
    <Sheet open={copilot.isOpen} onOpenChange={(v) => (v ? copilot.open() : copilot.close())}>
      <SheetContent
        side="right"
        size="md"
        hideClose
        className="!p-0 !flex !flex-col max-w-full"
      >
        {/* ── ENCABEZADO ──────────────────────────────────────────── */}
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-[color:var(--border-subtle)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              </span>
              <SheetTitle className="text-base font-semibold tracking-tight text-[color:var(--text-primary)]">
                {ASSISTANT_NAME}
              </SheetTitle>
            </div>
            <SheetDescription className="mt-1.5 text-xs text-[color:var(--text-tertiary)] truncate">
              Estás en: <span className="text-[color:var(--text-secondary)]">{context.humanLabel}</span>
            </SheetDescription>
          </div>
          <div className="flex items-center gap-1">
            {hasMessages ? (
              <Tooltip content="Nueva conversación">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={copilot.reset}
                  aria-label="Empezar una nueva conversación"
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
                aria-label="Cerrar el asistente"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </header>

        {/* ── CONVERSACIÓN ────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          role="log"
          aria-live="polite"
          aria-busy={isStreaming}
          aria-label="Conversación con el asistente"
        >
          {!hasMessages ? (
            <Welcome
              suggestions={context.suggestions}
              isNewAccount={isNewAccount}
              onPick={(prompt) => {
                setDraft('')
                copilot.send(prompt)
              }}
            />
          ) : (
            copilot.messages.map((msg) => <Message key={msg.id} msg={msg} />)
          )}
        </div>

        {/* ── CAMPO DE PREGUNTA ───────────────────────────────────── */}
        <footer className="border-t border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)] p-3">
          <div className="flex items-end gap-2 rounded-xl border border-[color:var(--border-default)] bg-white p-2 focus-within:border-emerald-500 focus-within:shadow-[0_0_0_4px_rgba(16,185,129,0.10)] transition-all">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              aria-label="Escribe tu pregunta para el asistente"
              placeholder="Escribe tu pregunta…"
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] outline-none max-h-32"
              style={{ minHeight: '2rem' }}
            />
            <Button
              size="icon-sm"
              onClick={submit}
              disabled={!draft.trim()}
              aria-label="Enviar pregunta"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5 px-1 text-[10px] text-[color:var(--text-tertiary)]">
            <span>Enter para enviar · Shift + Enter para otra línea</span>
            <span className="hidden sm:inline">Te digo en qué norma me baso</span>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  )
}

/* ── Subcomponentes ─────────────────────────────────────────────── */

function Welcome({
  suggestions,
  isNewAccount,
  onPick,
}: {
  suggestions: readonly AssistantSuggestion[]
  isNewAccount: boolean
  onPick: (prompt: string) => void
}) {
  return (
    <div className="py-4 space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200">
          <Sparkles className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
            Hola, soy tu asistente laboral
          </h3>
          <p className="mt-1 text-xs text-[color:var(--text-secondary)] max-w-[34ch] mx-auto">
            Pregúntame lo que no tengas claro sobre tu personal, los pagos o
            SUNAFIL. Te lo explico en palabras simples y con ejemplos.
          </p>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Te oriento según la ley peruana, pero no reemplazo a un abogado: en
          casos delicados, como un despido o un juicio, consulta con uno.
        </span>
      </p>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-[color:var(--text-tertiary)] px-1">
          {isNewAccount ? 'Para empezar, puedes preguntarme:' : 'Puedes preguntarme, por ejemplo:'}
        </p>
        {suggestions.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="w-full text-left rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2.5 transition-all duration-150 hover:border-emerald-300 hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <span className="flex items-start gap-2">
              <MessageCircleQuestion className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-[color:var(--text-primary)]">{s.label}</span>
            </span>
          </button>
        ))}
        <p className="px-1 pt-1 text-[11px] text-[color:var(--text-tertiary)]">
          O escribe tu propia pregunta abajo.
        </p>
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
        className={cn(
          'min-w-0 max-w-[85%] text-sm leading-relaxed text-[color:var(--text-primary)]',
          isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
        )}
      >
        <span className="sr-only">{isUser ? 'Tú:' : 'Asistente:'}</span>
        {msg.streaming && !msg.content ? (
          <SkeletonText lines={2} />
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <>
            <AssistantMarkdown content={msg.content} />
            {msg.streaming ? (
              <span className="ml-1 inline-block h-3 w-[2px] bg-emerald-600 align-middle animate-pulse" aria-hidden="true" />
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}
