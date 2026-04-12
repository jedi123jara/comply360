'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, Scale } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const SUGGESTED_QUESTIONS = [
  '¿Cómo se calcula mi CTS?',
  '¿Cuánto me corresponde de gratificación?',
  '¿Cuántos días de vacaciones tengo derecho?',
  '¿Pueden despedirme sin indemnización?',
  '¿Cómo denuncio hostigamiento laboral?',
  '¿Cuánto debo ganar por trabajar los domingos?',
]

export default function ChatLegalPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const message = (text ?? input).trim()
    if (!message || loading) return

    const userMsg: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/portal-empleado/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response || data.fallback || 'No pude procesar la pregunta.',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Disculpa, hubo un error: ${e instanceof Error ? e.message : 'desconocido'}`,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-gold-500/10 p-3">
          <Scale className="h-7 w-7 text-gold-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Chat Legal Personal</h1>
            <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-xs font-semibold text-gold-400">
              IA
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Pregúntame sobre tus derechos laborales peruanos. Respuestas con citas a leyes.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex h-[450px] flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
      >
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Sparkles className="h-10 w-10 text-gold-500" />
            <p className="mt-3 text-sm text-slate-300">
              Hazme una pregunta sobre tus derechos laborales
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-xs text-slate-300 hover:border-gold-500 hover:text-gold-400"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-gold-500 text-slate-950'
                  : 'border border-slate-700 bg-slate-950/50 text-slate-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-gold-500" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Escribe tu pregunta..."
          className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-gold-500 focus:outline-none"
          maxLength={2000}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-gold-400 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      <p className="text-center text-xs text-slate-500">
        ⚖️ Las respuestas son informativas. Para casos complejos consulta un abogado o SUNAFIL al
        0800-16872.
      </p>
    </div>
  )
}
