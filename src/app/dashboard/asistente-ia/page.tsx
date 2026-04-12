'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bot, Send, Loader2, Sparkles, Scale, Calculator, FileText,
  ShieldCheck, Users, Clock, Plus, Copy, Check, Download,
  ChevronRight, MessageSquare, Filter, Building2, ToggleLeft,
  ToggleRight, BookOpen, AlertCircle, X, Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: string[]
}

interface Conversation {
  id: string
  title: string
  preview: string
  timestamp: string
  category: ConversationCategory
  messages: Message[]
}

type ConversationCategory = 'contratos' | 'calculos' | 'compliance' | 'sst' | 'general'
type FilterCategory = 'todo' | ConversationCategory

/* ------------------------------------------------------------------ */
/*  Static data                                                         */
/* ------------------------------------------------------------------ */
const CATEGORY_LABELS: Record<ConversationCategory, string> = {
  contratos: 'Contratos',
  calculos: 'Cálculos',
  compliance: 'Compliance',
  sst: 'SST',
  general: 'General',
}

const CATEGORY_COLORS: Record<ConversationCategory, string> = {
  contratos: 'bg-blue-100 text-blue-700 bg-blue-900/40 text-blue-300',
  calculos: 'bg-amber-100 text-amber-700 bg-amber-900/40 text-amber-300',
  compliance: 'bg-red-100 text-red-700 bg-red-900/40 text-red-300',
  sst: 'bg-green-100 text-green-700 bg-green-900/40 text-green-300',
  general: 'bg-white/[0.04] text-gray-600 bg-gray-700 text-gray-300',
}

const STORAGE_KEY = 'comply360_ai_conversations'

function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Conversation[]
    return parsed.map(c => ({
      ...c,
      messages: c.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
    }))
  } catch { return [] }
}

function saveConversations(convs: Conversation[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs)) } catch { /* quota */ }
}

interface OrgContext {
  razonSocial: string
  workers: number
  regimen: string
  sector: string
  loaded: boolean
}

const FILTER_TABS: { key: FilterCategory; label: string }[] = [
  { key: 'todo', label: 'Todo' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'calculos', label: 'Cálculos' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'sst', label: 'SST' },
]

const QUICK_PROMPTS = [
  { icon: Calculator, text: '¿Cómo calculo la CTS?', color: 'bg-amber-100 text-amber-700 bg-amber-900/40 text-amber-300' },
  { icon: FileText, text: 'Tipos de contratos laborales', color: 'bg-blue-100 text-blue-700 bg-blue-900/40 text-blue-300' },
  { icon: ShieldCheck, text: 'Multas SUNAFIL más comunes', color: 'bg-red-100 text-red-700 bg-red-900/40 text-red-300' },
  { icon: Users, text: 'Derechos en régimen MYPE', color: 'bg-green-100 text-green-700 bg-green-900/40 text-green-300' },
  { icon: Clock, text: '¿Cuándo pagar gratificaciones?', color: 'bg-purple-100 text-purple-700 bg-purple-900/40 text-purple-300' },
  { icon: Scale, text: 'Procedimiento de despido', color: 'bg-orange-100 text-orange-700 bg-orange-900/40 text-orange-300' },
]

/* Heuristic: extract citation-like references from AI response */
function extractCitations(text: string): string[] {
  const patterns = [
    /D\.Leg\.\s*\d+[^,.\n]*/g,
    /Ley\s+N[°º]?\s*\d+[^,.\n]*/g,
    /D\.S\.\s*\d+-\d+-\w+[^,.\n]*/g,
    /Art\.\s*\d+[^,.\n]*/g,
  ]
  const found = new Set<string>()
  for (const p of patterns) {
    const matches = text.match(p) || []
    matches.slice(0, 2).forEach(m => found.add(m.trim().slice(0, 40)))
  }
  return Array.from(found).slice(0, 3)
}

/* ------------------------------------------------------------------ */
/*  Markdown renderer (basic)                                           */
/* ------------------------------------------------------------------ */
function RenderMarkdown({ content }: { content: string }) {
  const lines = content.split('\n')

  function parseBold(text: string) {
    const parts = text.split(/\*\*(.*?)\*\*/g)
    return parts.map((part, i) =>
      i % 2 === 1
        ? <strong key={i} className="font-semibold text-white text-gray-100">{part}</strong>
        : part
    )
  }

  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (line.startsWith('## '))
          return <h3 key={i} className="mt-3 mb-1 text-sm font-bold text-white text-gray-100">{line.slice(3)}</h3>
        if (line.startsWith('### '))
          return <h4 key={i} className="mt-2 mb-1 text-sm font-semibold text-gray-200">{line.slice(4)}</h4>
        if (line.startsWith('- ') || line.startsWith('• '))
          return (
            <div key={i} className="flex items-start gap-1.5 text-sm text-gray-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>{parseBold(line.slice(2))}</span>
            </div>
          )
        if (/^\d+\./.test(line))
          return <p key={i} className="text-sm text-gray-300 pl-1">{parseBold(line)}</p>
        if (line.startsWith('|'))
          return <p key={i} className="text-xs font-mono text-gray-400 bg-white/[0.02] bg-[#141824] px-2 py-0.5 rounded">{line}</p>
        if (line.trim() === '')
          return <div key={i} className="h-1.5" />
        return <p key={i} className="text-sm text-gray-300 leading-relaxed">{parseBold(line)}</p>
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page component                                                      */
/* ------------------------------------------------------------------ */
export default function AsistenteIAPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState<string>('')
  const [filter, setFilter] = useState<FilterCategory>('todo')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [includeContext, setIncludeContext] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [orgCtx, setOrgCtx] = useState<OrgContext>({ razonSocial: '', workers: 0, regimen: '', sector: '', loaded: false })

  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load conversations from localStorage on mount
  useEffect(() => { setConversations(loadConversations()) }, [])

  // Persist conversations to localStorage on change
  useEffect(() => { if (conversations.length > 0) saveConversations(conversations) }, [conversations])

  // Fetch real org context
  useEffect(() => {
    Promise.all([
      fetch('/api/org/profile').then(r => r.json()),
      fetch('/api/workers?limit=1').then(r => r.json()),
    ])
      .then(([orgData, workersData]) => {
        const org = orgData.data ?? orgData
        setOrgCtx({
          razonSocial: org?.razonSocial || org?.name || '',
          workers: workersData?.pagination?.total ?? 0,
          regimen: org?.regimenPrincipal || 'GENERAL',
          sector: org?.sector || '',
          loaded: true,
        })
      })
      .catch(() => setOrgCtx(prev => ({ ...prev, loaded: true })))
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  const filteredConversations = conversations.filter(c =>
    filter === 'todo' ? true : c.category === filter
  )

  function startNewConversation() {
    setActiveConvId(null)
    setMessages([])
    setInput('')
    setSidebarOpen(false)
    inputRef.current?.focus()
  }

  function openConversation(conv: Conversation) {
    setActiveConvId(conv.id)
    setMessages(conv.messages)
    setSidebarOpen(false)
  }

  async function sendMessage(text?: string) {
    const msgText = (text || input).trim()
    if (!msgText || loading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msgText,
      timestamp: new Date(),
    }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const systemContext = includeContext && orgCtx.loaded
        ? `\n\n[Contexto empresa: ${orgCtx.razonSocial || 'Mi empresa'}, ${orgCtx.workers} trabajadores, régimen ${orgCtx.regimen || 'GENERAL'}${orgCtx.sector ? `, sector ${orgCtx.sector}` : ''}]`
        : ''

      const chatHistory = updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      // Inject context into last user message if enabled
      if (includeContext && chatHistory.length > 0) {
        chatHistory[chatHistory.length - 1].content += systemContext
      }

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory }),
      })

      const data = await res.json()

      if (data.message) {
        const aiContent: string = data.message.content
        // Prefer server-side RAG citations; fall back to client-side extraction
        const citations: string[] = (data.citations && data.citations.length > 0)
          ? data.citations
          : extractCitations(aiContent)
        const aiMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: aiContent,
          timestamp: new Date(),
          citations,
        }
        const finalMessages = [...updatedMessages, aiMsg]
        setMessages(finalMessages)
        if (data.context?.model) setModel(data.simulated ? 'Modo demo (sin API key)' : data.context.model)

        // Persist / update conversation in sidebar
        if (activeConvId) {
          setConversations(prev =>
            prev.map(c => c.id === activeConvId ? { ...c, messages: finalMessages } : c)
          )
        } else {
          // Auto-create entry for this new conversation
          const newConv: Conversation = {
            id: crypto.randomUUID(),
            title: msgText.length > 40 ? msgText.slice(0, 40) + '...' : msgText,
            preview: msgText,
            timestamp: 'Ahora',
            category: 'general',
            messages: finalMessages,
          }
          setConversations(prev => [newConv, ...prev])
          setActiveConvId(newConv.id)
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor intenta nuevamente.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyMessage = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])

  function exportConversation() {
    if (messages.length === 0) return
    const lines: string[] = [
      'CONSULTA LEGAL — COMPLY360',
      `Exportado: ${new Date().toLocaleDateString('es-PE', { dateStyle: 'long' })}`,
      '='.repeat(60),
      '',
    ]
    messages.forEach(m => {
      const role = m.role === 'user' ? 'CONSULTA' : 'ASISTENTE IA'
      const time = m.timestamp.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
      lines.push(`[${role} — ${time}]`)
      lines.push(m.content)
      if (m.citations?.length) {
        lines.push(`Fuentes: ${m.citations.join(' | ')}`)
      }
      lines.push('')
    })
    lines.push('='.repeat(60))
    lines.push('Consultas orientativas. No reemplaza asesoría legal profesional.')

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consulta-legal-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    /* Full-bleed container: break out of the default p-6 padding by negative margin */
    <div className="-m-6 flex h-[calc(100vh-4rem)] overflow-hidden bg-white/[0.02] bg-slate-900">

      {/* ============================================================ */}
      {/*  LEFT SIDEBAR                                                 */}
      {/* ============================================================ */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        'flex w-72 shrink-0 flex-col border-r border-white/[0.08] bg-[#141824] border-white/[0.08] bg-[#141824]',
        'fixed inset-y-0 left-0 z-30 transition-transform duration-200 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        // account for the dashboard's own sidebar (lg:pl-64 on outer wrapper)
        'top-16 lg:top-0',
      )}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white text-gray-100">Consultas</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1 text-gray-400 hover:bg-white/[0.04] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nueva consulta button */}
        <div className="p-3">
          <button
            onClick={startNewConversation}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Nueva consulta
          </button>
        </div>

        {/* Category filter tabs */}
        <div className="border-b border-white/[0.06] px-3 pb-2 border-white/[0.08]">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <Filter className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                  filter === tab.key
                    ? 'bg-amber-500 text-white'
                    : 'text-gray-500 hover:bg-white/[0.04] text-gray-400 hover:bg-white/[0.04]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2">
          {filteredConversations.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-gray-400">Sin conversaciones en esta categoría</p>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={cn(
                  'group flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors',
                  activeConvId === conv.id
                    ? 'bg-amber-50 bg-amber-900/20'
                    : 'hover:bg-white/[0.02] hover:bg-white/[0.04]/50'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-gray-200">
                    {conv.title}
                  </span>
                  <span className={cn(
                    'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                    CATEGORY_COLORS[conv.category]
                  )}>
                    {CATEGORY_LABELS[conv.category]}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-gray-400">{conv.preview}</span>
                  <span className="shrink-0 text-[10px] text-gray-400">{conv.timestamp}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Context toggle at sidebar bottom */}
        <div className="border-t border-white/[0.06] p-3 border-white/[0.08]">
          <button
            onClick={() => setIncludeContext(v => !v)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition-colors',
              includeContext
                ? 'border-amber-200 bg-amber-50 border-amber-800 bg-amber-900/20'
                : 'border-white/[0.08] bg-[#141824] border-slate-600 bg-white/[0.04]/50'
            )}
          >
            <Building2 className={cn('h-4 w-4 shrink-0', includeContext ? 'text-amber-600' : 'text-gray-400')} />
            <div className="flex-1 min-w-0">
              <p className={cn('font-medium', includeContext ? 'text-amber-700 text-amber-400' : 'text-gray-500 text-gray-400')}>
                Contexto empresa
              </p>
              <p className="truncate text-[10px] text-gray-400">
                {orgCtx.loaded
                  ? `${orgCtx.workers} trabajadores · Régimen ${orgCtx.regimen || 'GENERAL'}`
                  : 'Cargando datos...'}
              </p>
            </div>
            {includeContext
              ? <ToggleRight className="h-5 w-5 shrink-0 text-amber-500" />
              : <ToggleLeft className="h-5 w-5 shrink-0 text-gray-400" />
            }
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/*  MAIN CHAT AREA                                               */}
      {/* ============================================================ */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Chat topbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#141824] px-4 py-2.5 border-white/[0.08] bg-[#141824]">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-white/[0.04] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white text-gray-100">
                Asistente Legal COMPLY360
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <p className="text-xs text-gray-500 text-gray-400">
                  Especializado en legislación laboral peruana
                  {model && (
                    <span className="ml-1.5 rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] bg-white/[0.04] text-gray-300">
                      {model}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={exportConversation}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-white/[0.02] border-slate-600 text-gray-300 hover:bg-white/[0.04]"
                title="Descargar conversación"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div ref={chatRef} className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            /* ---- Welcome / Empty state ---- */
            <div className="flex h-full flex-col items-center justify-center px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 from-amber-900/40 to-orange-900/40">
                <Scale className="h-8 w-8 text-amber-600 text-amber-400" />
              </div>

              <h2 className="mt-4 text-xl font-bold text-white text-gray-100">
                Asistente Legal COMPLY360
              </h2>
              <p className="mt-1 text-sm text-gray-500 text-gray-400">
                Especializado en legislación laboral peruana
              </p>

              <div className="mt-5 w-full max-w-lg rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 border-amber-800/50 bg-amber-900/20">
                <p className="mb-2 text-sm font-medium text-amber-800 text-amber-300">
                  Soy tu consultor legal 24/7. Puedo ayudarte con:
                </p>
                <ul className="space-y-1.5 text-sm text-amber-700 text-amber-400">
                  {[
                    'Cálculos laborales (CTS, gratificaciones, liquidaciones)',
                    'Interpretación de normas laborales',
                    'Preparación para inspecciones SUNAFIL',
                    'Contratos y tipos de régimen',
                    'SST y Ley 29783',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick prompt chips */}
              <div className="mt-5 grid w-full max-w-lg gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {QUICK_PROMPTS.map((prompt, i) => {
                  const Icon = prompt.icon
                  return (
                    <button
                      key={i}
                      onClick={() => sendMessage(prompt.text)}
                      className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141824] px-3 py-2.5 text-left text-sm text-gray-300 transition-all hover:border-amber-300 hover:shadow-sm border-slate-600 bg-[#141824] text-gray-300 hover:border-amber-700"
                    >
                      <Icon className={cn('h-4 w-4 shrink-0 rounded-md p-0.5', prompt.color)} />
                      <span className="line-clamp-2 text-xs">{prompt.text}</span>
                    </button>
                  )
                })}
              </div>

              {/* Context indicator */}
              {includeContext && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 border-blue-800/50 bg-blue-900/20">
                  <Building2 className="h-4 w-4 shrink-0 text-blue-600 text-blue-400" />
                  <p className="text-xs text-blue-700 text-blue-300">
                    <strong>Contexto activo:</strong> Tu empresa tiene 45 trabajadores, régimen GENERAL · Lima
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ---- Message list ---- */
            <div className="mx-auto max-w-3xl space-y-5">
              {/* Context indicator (compact, above messages) */}
              {includeContext && (
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 border-blue-800/50 bg-blue-900/20">
                    <Building2 className="h-3 w-3 text-blue-600 text-blue-400" />
                    <p className="text-[10px] text-blue-600 text-blue-400">
                      Contexto: Tu empresa tiene 45 trabajadores, régimen GENERAL
                    </p>
                    <button
                      onClick={() => setIncludeContext(false)}
                      className="ml-1 text-blue-400 hover:text-blue-600 hover:text-blue-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {/* Bot avatar */}
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div className={cn(
                    'group max-w-[80%] rounded-2xl px-4 py-3',
                    msg.role === 'user'
                      ? 'rounded-tr-sm bg-amber-500 text-white shadow-sm'
                      : 'rounded-tl-sm border border-white/[0.08] bg-[#141824] shadow-sm border-slate-600 bg-[#141824]'
                  )}>
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <>
                        <RenderMarkdown content={msg.content} />

                        {/* Citation badges */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {msg.citations.map((cite, ci) => (
                              <span
                                key={ci}
                                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border-blue-800/50 bg-blue-900/30 text-blue-400"
                              >
                                <BookOpen className="h-2.5 w-2.5" />
                                {cite}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Copy button */}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">
                            {msg.timestamp.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => copyMessage(msg.id, msg.content)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-gray-400 opacity-0 transition-all hover:bg-white/[0.04] hover:text-gray-600 group-hover:opacity-100 hover:bg-white/[0.04] hover:text-gray-300"
                          >
                            {copiedId === msg.id
                              ? <><Check className="h-3 w-3 text-green-500" /> Copiado</>
                              : <><Copy className="h-3 w-3" /> Copiar</>
                            }
                          </button>
                        </div>
                      </>
                    )}

                    {/* Timestamp for user messages */}
                    {msg.role === 'user' && (
                      <p className="mt-1 text-right text-[10px] text-white/60">
                        {msg.timestamp.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-white/[0.08] bg-[#141824] px-4 py-3 shadow-sm border-slate-600 bg-[#141824]">
                    <div className="flex items-center gap-2 text-sm text-gray-500 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                      <span>Analizando legislación peruana...</span>
                    </div>
                    {/* Typing dots animation */}
                    <div className="mt-1.5 flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/*  INPUT AREA                                                   */}
        {/* ============================================================ */}
        <div className="shrink-0 border-t border-white/[0.08] bg-[#141824] px-4 pb-4 pt-3 border-white/[0.08] bg-[#141824]">
          <div className="mx-auto max-w-3xl">
            {/* Context indicator inline */}
            {!includeContext && messages.length > 0 && (
              <div className="mb-2 flex items-center gap-2 text-[11px] text-gray-400">
                <AlertCircle className="h-3.5 w-3.5" />
                Contexto empresa desactivado —
                <button
                  onClick={() => setIncludeContext(true)}
                  className="text-amber-600 hover:underline text-amber-400"
                >
                  activar
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-[#141824] px-3 py-2.5 shadow-sm transition-colors focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400 border-slate-600 bg-white/[0.04]">
              <MessageSquare className="mb-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta laboral… (Enter para enviar, Shift+Enter nueva línea)"
                rows={1}
                maxLength={2000}
                className="flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-gray-400 text-gray-100 placeholder:text-gray-500"
                style={{ maxHeight: '120px' }}
              />
              <div className="flex shrink-0 flex-col items-end gap-1">
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Footer row */}
            <div className="mt-2 flex items-center justify-between">
              <p className="flex items-center gap-1 text-[10px] text-gray-400">
                <Sparkles className="h-3 w-3 text-amber-400" />
                Consultas orientativas. No reemplaza asesoría legal profesional.
              </p>
              <span className={cn(
                'text-[10px]',
                input.length > 1800 ? 'text-red-500' : input.length > 1500 ? 'text-amber-500' : 'text-gray-400'
              )}>
                {input.length}/2000
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
