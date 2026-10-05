'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { PLANS, type PlanKey } from '@/lib/constants'

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
  /** Aviso de error (plan, límite del mes, falla): no se reenvía como historial. */
  isError?: boolean
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

/**
 * Historial que se reenvía al asistente para que entienda preguntas de
 * seguimiento ("¿y si gana S/ 2,000?"). Acotado para no disparar el consumo:
 * últimos 6 mensajes, cada uno recortado a 1,500 caracteres.
 */
const HISTORY_MAX_MESSAGES = 6
const HISTORY_MAX_CHARS = 1500

/** Aviso esperado (plan, límite, permisos): se muestra tal cual al usuario. */
class AssistantNotice extends Error {}

const ALTERNATIVES_TEXT =
  '**Mientras tanto puedes** usar las calculadoras (CTS, gratificación, vacaciones y más), revisar las normas laborales y crear tus documentos.'

const GENERIC_ERROR_TEXT = [
  '**No pude responder en este momento**',
  'Intenta de nuevo en unos minutos. Si el problema sigue, puede que tu plan no incluya el asistente o que ya se haya alcanzado el límite de uso del mes.',
  ALTERNATIVES_TEXT,
  '[Escríbenos a soporte →](/dashboard/configuracion/soporte)',
].join('\n\n')

interface ErrorBody {
  error?: string
  message?: string
  code?: string
  upgradeUrl?: string
  requiredPlan?: string
}

/** Lee el cuerpo de un error, venga como JSON o como evento SSE (`data: {...}`). */
async function readErrorBody(res: Response): Promise<ErrorBody | null> {
  const raw = await res.text().catch(() => '')
  if (!raw) return null
  try {
    return JSON.parse(raw) as ErrorBody
  } catch {
    const dataLine = raw.split(/\r?\n/).find((l) => l.startsWith('data:'))
    if (!dataLine) return null
    try {
      return JSON.parse(dataLine.slice(5).trim()) as ErrorBody
    } catch {
      return null
    }
  }
}

function safeUpgradeUrl(url?: string): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/dashboard/planes'
}

function quotaNotice(upgradeUrl?: string): AssistantNotice {
  return new AssistantNotice(
    [
      '**Ya se usó el límite del asistente de este mes**',
      'Tu plan incluye un límite mensual de uso del asistente. Se renueva al empezar el próximo mes.',
      ALTERNATIVES_TEXT,
      `[Ver planes y precios →](${safeUpgradeUrl(upgradeUrl)})`,
    ].join('\n\n'),
  )
}

/** Convierte una respuesta de error del servidor en un aviso claro, si aplica. */
function noticeFromError(status: number, body: ErrorBody | null): AssistantNotice | null {
  if (body?.error === 'AI_QUOTA_EXCEEDED' || body?.code === 'AI_QUOTA_EXCEEDED') {
    return quotaNotice(body.upgradeUrl)
  }
  if (body?.code === 'READ_ONLY_ROLE') {
    return new AssistantNotice(
      '**Tu usuario es de solo lectura**\n\nPor eso no puede hacer preguntas al asistente. Pide a un administrador de tu empresa que cambie tu permiso en Ajustes › Usuarios y equipo.',
    )
  }
  if (status === 402 || status === 403 || body?.requiredPlan) {
    const planName = body?.requiredPlan
      ? (PLANS[body.requiredPlan as PlanKey]?.name ?? body.requiredPlan)
      : 'Pro'
    return new AssistantNotice(
      [
        `**El asistente está disponible desde el plan ${planName}**`,
        'Tu plan actual no incluye preguntas al asistente.',
        ALTERNATIVES_TEXT,
        `[Ver planes y precios →](${safeUpgradeUrl(body?.upgradeUrl)})`,
      ].join('\n\n'),
    )
  }
  return null
}

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  // Copia de los mensajes para armar el historial sin recrear `send`.
  const messagesRef = useRef<CopilotMessage[]>([])
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Restore persisted open state (non-critical — fails silently on SSR)
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      try {
        const stored = localStorage.getItem(OPEN_STATE_KEY)
        if (stored === '1') setIsOpen(true)
      } catch {
        // ignore
      }
    })
    return () => {
      cancelled = true
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
      // Solo roles user/assistant, sin avisos de error ni respuestas a medias.
      // Una pregunta que terminó en error tampoco se reenvía.
      const prior = messagesRef.current
      const history = prior
        .filter((m, i) => {
          if (m.streaming || m.isError || !m.content.trim()) return false
          const reply = prior[i + 1]
          if (m.role === 'user' && reply?.role === 'assistant' && (reply.isError || reply.streaming)) return false
          return true
        })
        .slice(-HISTORY_MAX_MESSAGES)
        .map((m) => ({ role: m.role, content: m.content.slice(0, HISTORY_MAX_CHARS) }))
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
        const res = await fetch('/api/ai-chat/stream', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            messages: [...history, { role: 'user', content: userMsg.content }],
            stream: true,
          }),
        })

        // Si el servidor responde con error (plan, límite del mes, permisos),
        // se muestra un aviso específico en lugar del mensaje genérico.
        if (!res.ok) {
          const errBody = await readErrorBody(res)
          const notice = noticeFromError(res.status, errBody)
          if (notice) throw notice
          const detail = errBody?.message ?? errBody?.error ?? ''
          throw new Error(`HTTP ${res.status}${detail ? ` — ${detail}` : ''}`)
        }

        const contentType = res.headers.get('content-type') ?? ''
        let receivedText = false
        const appendToLast = (chunk: string) => {
          if (!chunk) return
          receivedText = true
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
          let buffer = ''
          let currentEvent = 'message'
          let streamError: Error | null = null
          while (!streamError) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split(/\r?\n/)
            buffer = lines.pop() ?? '' // El último elemento puede estar incompleto

            for (const line of lines) {
              if (!line.trim()) {
                currentEvent = 'message' // fin del evento SSE
                continue
              }
              if (line.startsWith('event:')) {
                currentEvent = line.slice(6).trim()
                continue
              }
              if (line.startsWith(':')) continue // heartbeat
              if (!line.startsWith('data:')) continue

              const payload = line.slice(5).trim()
              if (payload === '[DONE]') continue
              try {
                const json = JSON.parse(payload) as ErrorBody & {
                  content?: string
                  delta?: string
                }
                if (currentEvent === 'error') {
                  streamError =
                    noticeFromError(200, json) ??
                    new Error(json.message ?? json.error ?? 'Error del asistente')
                  break
                }
                appendToLast(json.content ?? json.delta ?? '')
              } catch {
                // ignorar json inválido
              }
            }
          }
          if (streamError) {
            void reader.cancel().catch(() => {})
            throw streamError
          }
        } else {
          // Non-streaming fallback
          const data = (await res.json()) as { content?: string; reply?: string; message?: { content: string } }
          appendToLast(data.message?.content ?? data.content ?? data.reply ?? '')
        }

        // Sin texto no hay respuesta útil: se muestra el aviso genérico.
        if (!receivedText) throw new Error('Respuesta vacía del asistente')

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        )
      } catch (err) {
        // Avisos esperados (plan, límite, permisos): se muestran tal cual.
        // Si ya llegó parte de la respuesta, se conserva.
        const text = err instanceof AssistantNotice ? err.message : GENERIC_ERROR_TEXT

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? m.content
                ? { ...m, streaming: false }
                : { ...m, streaming: false, isError: true, content: text }
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
