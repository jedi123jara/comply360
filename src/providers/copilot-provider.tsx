'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Copilot global state.
 *
 * - Mounted once in the dashboard layout so the state persists across route
 *   changes (open/closed, current message draft).
 * - `pendingPrompt` is how other parts of the UI can "send" a prompt to the
 *   copilot (e.g. from the command palette or a quick-action button).
 * - `open()` / `close()` / `toggle()` drive the drawer visibility.
 */

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Timestamp ISO — for grouping + ordering. */
  createdAt: string
  /** Optional: which page context was active when sent. */
  pageContextLabel?: string
  /** True while streaming partial content. */
  streaming?: boolean
}

interface CopilotContextValue {
  isOpen: boolean
  open: (seedPrompt?: string) => void
  close: () => void
  toggle: () => void

  messages: CopilotMessage[]
  /** Append a user message + start an assistant streaming response. */
  send: (content: string) => void
  /** Clear the conversation (new session). */
  reset: () => void

  /** Set by callers (command palette) to seed the next open. */
  pendingPrompt: string | null
  consumePendingPrompt: () => string | null
}

const CopilotContext = createContext<CopilotContextValue | null>(null)

/**
 * Key in localStorage for persisting "drawer was open before reload" preference.
 * We don't persist full history here — the backend handles that.
 */
const OPEN_STATE_KEY = 'comply360.copilot.open'

/**
 * Generate a monotonically-unique id without Math.random collisions in tests.
 */
let msgCounter = 0
function nextId(): string {
  msgCounter += 1
  return `msg_${Date.now().toString(36)}_${msgCounter}`
}

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)

  // Restore persisted open state (non-critical — fails silently on SSR)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(OPEN_STATE_KEY)
      if (stored === '1') setIsOpen(true)
    } catch {
      // ignore
    }
  }, [])

  // Persist open/close
  useEffect(() => {
    try {
      localStorage.setItem(OPEN_STATE_KEY, isOpen ? '1' : '0')
    } catch {
      // ignore
    }
  }, [isOpen])

  const open = useCallback((seedPrompt?: string) => {
    if (seedPrompt) setPendingPrompt(seedPrompt)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  const consumePendingPrompt = useCallback(() => {
    const p = pendingPrompt
    setPendingPrompt(null)
    return p
  }, [pendingPrompt])

  /**
   * Push a user message and start streaming an assistant response.
   * Calls `/api/ai-chat` which is expected to support SSE streaming; the
   * response is accumulated into the last message's `content`.
   *
   * Best-effort: if the backend doesn't stream, we fall back to reading
   * the JSON response into a single message chunk.
   */
  const send = useCallback(
    async (content: string) => {
      if (!content.trim()) return

      const userMsg: CopilotMessage = {
        id: nextId(),
        role: 'user',
        content: content.trim(),
        createdAt: new Date().toISOString(),
      }
      const assistantId = nextId()
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString(),
          streaming: true,
        },
      ])

      try {
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: userMsg.content }],
            stream: true,
          }),
        })

        if (!res.ok) throw new Error(`Chat API returned ${res.status}`)

        const contentType = res.headers.get('content-type') ?? ''
        const appendToLast = (chunk: string) => {
          if (!chunk) return
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m
            )
          )
        }

        if (contentType.includes('text/event-stream') && res.body) {
          // SSE-like reader
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const text = decoder.decode(value, { stream: true })
            // Parse "data: {...}\n\n" lines; fall back to raw text
            for (const line of text.split(/\r?\n/)) {
              if (!line.trim()) continue
              const payload = line.startsWith('data:') ? line.slice(5).trim() : line
              if (payload === '[DONE]') continue
              try {
                const json = JSON.parse(payload) as {
                  content?: string
                  delta?: string
                }
                appendToLast(json.content ?? json.delta ?? '')
              } catch {
                appendToLast(payload)
              }
            }
          }
        } else {
          // Non-streaming fallback
          const data = (await res.json()) as { content?: string; reply?: string }
          appendToLast(data.content ?? data.reply ?? '')
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        )
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  streaming: false,
                  content:
                    m.content ||
                    'No pude responder ahora mismo. Verifica que el servicio de IA esté configurado e intenta otra vez.',
                }
              : m
          )
        )
      }
    },
    []
  )

  const reset = useCallback(() => setMessages([]), [])

  const value = useMemo<CopilotContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      messages,
      send,
      reset,
      pendingPrompt,
      consumePendingPrompt,
    }),
    [isOpen, open, close, toggle, messages, send, reset, pendingPrompt, consumePendingPrompt]
  )

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>
}

export function useCopilot(): CopilotContextValue {
  const ctx = useContext(CopilotContext)
  if (!ctx) {
    throw new Error('useCopilot must be used inside <CopilotProvider>')
  }
  return ctx
}
