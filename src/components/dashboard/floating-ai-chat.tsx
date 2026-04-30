'use client'

import { useState, useRef, useEffect, FormEvent, type ReactNode } from 'react'
import { MessageSquare, X, Send, Sparkles, Bot, Loader2 } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  '¿Qué es CTS?',
  'Calcular gratificación',
  'Inspección SUNAFIL',
  'Derechos vacaciones',
]

function parseInlineMarkdown(text: string): ReactNode[] {
  const result: ReactNode[] = []
  // Match **bold** and *italic* patterns
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      // Bold: **text**
      result.push(<strong key={match.index}>{match[2]}</strong>)
    } else if (match[3]) {
      // Italic: *text*
      result.push(<em key={match.index}>{match[3]}</em>)
    }
    lastIndex = regex.lastIndex
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result.length > 0 ? result : [text]
}

function SafeMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Empty line → spacer
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />)
      i++
      continue
    }

    // ## Heading
    if (line.startsWith('## ') && !line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="font-bold text-base mt-2 mb-1">
          {parseInlineMarkdown(line.slice(3))}
        </h3>
      )
      i++
      continue
    }

    // ### Subheading
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="font-semibold text-sm mt-2 mb-1">
          {parseInlineMarkdown(line.slice(4))}
        </h4>
      )
      i++
      continue
    }

    // List items: collect consecutive lines starting with "- "
    if (line.startsWith('- ')) {
      const listItems: ReactNode[] = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        listItems.push(
          <li key={i} className="ml-4 list-disc">
            {parseInlineMarkdown(lines[i].slice(2))}
          </li>
        )
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-1">
          {listItems}
        </ul>
      )
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="my-0.5">
        {parseInlineMarkdown(line)}
      </p>
    )
    i++
  }

  return <>{elements}</>
}

export default function FloatingAiChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isOpen])

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: content.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    // Placeholder del assistant que se va llenando con tokens.
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`Error ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantContent = ''
      let currentEvent = 'message'

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
            continue
          }
          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim()
            if (!payload) continue
            try {
              const parsed = JSON.parse(payload) as { delta?: string; error?: string }
              if (currentEvent === 'delta' && parsed.delta) {
                assistantContent += parsed.delta
                // Update solo el último message (el placeholder del assistant)
                setMessages((prev) => {
                  const next = [...prev]
                  next[next.length - 1] = { role: 'assistant', content: assistantContent }
                  return next
                })
              } else if (currentEvent === 'error' && parsed.error) {
                throw new Error(parsed.error)
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                throw e
              }
            }
          }
        }
      }

      if (!assistantContent) {
        throw new Error('Respuesta vacía del servidor')
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'desconocido'
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = {
          role: 'assistant',
          content: `Lo siento, ocurrió un error: ${errMsg}. Intenta nuevamente.`,
        }
        return next
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleQuickPrompt(prompt: string) {
    sendMessage(prompt)
  }

  function handleClose() {
    setIsOpen(false)
  }

  return (
    // IMPORTANTE: pointer-events-none en el contenedor padre para que el panel invisible
    // (cuando isOpen=false) NO bloquee clicks en el resto de la pantalla (ej: botones del dashboard)
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
      {/* Chat Panel — solo se renderiza cuando está abierto para no bloquear clicks */}
      {isOpen && (
      <div
        className="pointer-events-auto origin-bottom-right transition-all duration-300 ease-in-out scale-100 opacity-100"
      >
        <div
          className="
            flex flex-col
            w-[calc(100vw-2rem)] sm:w-[400px]
            h-[500px] max-h-[80vh]
            rounded-2xl
            bg-white
            border border-white/[0.08] border-white/[0.08]
            shadow-2xl
            overflow-hidden
          "
        >
          {/* Header */}
          <div
            className="
              flex items-center justify-between
              px-4 py-3
              bg-gradient-to-r from-amber-500 to-amber-600

            "
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Asistente Legal IA</h3>
                <p className="text-[10px] text-amber-100">Comply 360 - Consultas laborales</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="
                flex h-8 w-8 items-center justify-center rounded-full
                text-white/80 hover:text-white hover:bg-white/20
                transition-colors
              "
              aria-label="Cerrar chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* Welcome message when empty */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-4">
                <div
                  className="
                    flex h-14 w-14 items-center justify-center rounded-full
                    bg-amber-50
                  "
                >
                  <Sparkles className="h-7 w-7 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">
                    ¡Hola! Soy tu asistente legal
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pregúntame sobre legislación laboral peruana, cálculos y cumplimiento normativo.
                  </p>
                </div>

                {/* Quick Prompt Chips */}
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="
                        px-3 py-1.5 text-xs font-medium
                        rounded-full border
                        border-amber-200
                        bg-amber-50
                        text-amber-700
                        hover:bg-amber-100
                        transition-colors
                      "
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Bubbles */}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="
                      flex-shrink-0 flex h-7 w-7 items-center justify-center
                      rounded-full bg-amber-100 mr-2 mt-1
                    "
                  >
                    <Bot className="h-4 w-4 text-amber-600" />
                  </div>
                )}
                <div
                  className={`
                    max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                    ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-white rounded-br-md'
                        : 'bg-[color:var(--neutral-100)] bg-[#141824] text-gray-200 rounded-bl-md'
                    }
                  `}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose-sm prose-gray [&_ul]:list-disc [&_li]:ml-4">
                      <SafeMarkdown text={msg.content} />
                    </div>
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="
                    flex-shrink-0 flex h-7 w-7 items-center justify-center
                    rounded-full bg-amber-100 mr-2 mt-1
                  "
                >
                  <Bot className="h-4 w-4 text-amber-600" />
                </div>
                <div
                  className="
                    flex items-center gap-1.5
                    rounded-2xl rounded-bl-md
                    bg-[color:var(--neutral-100)] bg-[#141824]
                    px-4 py-3
                  "
                >
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  <span className="text-xs text-gray-500">Pensando...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSubmit}
            className="
              flex items-center gap-2
              px-3 py-3
              border-t border-white/[0.08] border-white/[0.08]
              bg-white
            "
          >
            <input
              ref={inputRef}
              type="text"
              id="ai-chat-input"
              name="chatMessage"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta legal..."
              disabled={isLoading}
              className="
                flex-1 rounded-xl
                bg-[color:var(--neutral-100)] bg-[#141824]
                border border-white/[0.08] border-white/[0.08]
                px-4 py-2.5 text-sm
                text-gray-800
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-amber-400
                disabled:opacity-50
                transition-shadow
              "
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="
                flex h-10 w-10 flex-shrink-0 items-center justify-center
                rounded-xl
                bg-amber-500 hover:bg-amber-600

                text-white
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors
              "
              aria-label="Enviar mensaje"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
      )}

      {/* Floating Toggle Button — pointer-events-auto explícito porque el padre es none */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          pointer-events-auto group flex h-14 w-14 items-center justify-center
          rounded-full shadow-lg
          transition-all duration-300
          ${
            isOpen
              ? 'bg-gray-600 hover:bg-gray-700 bg-[color:var(--neutral-100)] hover:bg-[color:var(--neutral-100)] rotate-0'
              : 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
          }
        `}
        aria-label={isOpen ? 'Cerrar asistente IA' : 'Abrir asistente IA'}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white transition-transform duration-300" />
        ) : (
          <MessageSquare className="h-6 w-6 text-white transition-transform duration-300 group-hover:scale-110" />
        )}
      </button>
    </div>
  )
}
