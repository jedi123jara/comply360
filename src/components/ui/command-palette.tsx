'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Command as CmdkCommand } from 'cmdk'
import {
  Search,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  Users,
  FileText,
  Calculator,
  Calendar,
  Bell,
  Settings,
  FolderOpen,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Bot,
  HardHat,
  GraduationCap,
  Newspaper,
  Plug,
  CreditCard,
  Building2,
  Equal,
  FileStack,
  Radar,
  Siren,
  Inbox,
  Banknote,
  Receipt,
  FileSpreadsheet,
  ScrollText,
  CalendarRange,
  Sun as SunIcon,
  Clock,
  ClipboardList,
  Briefcase,
  Store,
  Award,
  Trophy,
  Code2,
  Laptop2,
  UserCircle,
  Workflow,
  FileSearch,
  Scale,
  Shield,
  Command as CommandIcon,
} from 'lucide-react'
import { NAV_HUBS, CALCULATOR_TYPES } from '@/lib/constants'
import { useCopilot } from '@/providers/copilot-provider'
import { cn } from '@/lib/utils'
import { usePlatformModKey } from '@/hooks/use-platform-mod-key'

/**
 * Command Palette — cmdk-based, Obsidian skin.
 *
 * Capabilities:
 * - Navigate to any of the 7 hubs or their items
 * - Jump to any of the 13 calculators
 * - Dynamic search of workers / contracts / documents (debounced API calls)
 * - Quick actions (new worker, new contract, generate report…)
 * - "Ask copilot" fallback: if query doesn't match anything, offer to send
 *   it to the AI copilot.
 *
 * Opens with Cmd+K / Ctrl+K globally. The dashboard layout also passes
 * `onExternalOpen` to wire up the sidebar and topbar triggers.
 */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  FileText,
  Calculator,
  Calendar,
  Bell,
  Settings,
  FolderOpen,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Bot,
  HardHat,
  GraduationCap,
  Newspaper,
  Plug,
  CreditCard,
  Building2,
  Equal,
  FileStack,
  Radar,
  Siren,
  Inbox,
  Banknote,
  Receipt,
  FileSpreadsheet,
  ScrollText,
  CalendarRange,
  Sun: SunIcon,
  Clock,
  ClipboardList,
  Briefcase,
  Store,
  Award,
  Trophy,
  Code2,
  Laptop2,
  UserCircle,
  Workflow,
  FileSearch,
  Scale,
  Shield,
  Sparkles,
}

function iconFor(name: string | undefined) {
  if (!name) return FileText
  return ICON_MAP[name] ?? FileText
}

/* ── Types ───────────────────────────────────────────────────────────── */

interface QuickAction {
  id: string
  label: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  perform: () => void
  shortcut?: string
}

interface SearchHit {
  id: string
  kind: 'worker' | 'contract' | 'document'
  label: string
  sublabel?: string
  href: string
}

/* ── Hook: debounced dynamic search ─────────────────────────────────── */

function useDebouncedSearch(query: string): { results: SearchHit[]; loading: boolean } {
  const [results, setResults] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      // Schedule state resets in a microtask so we aren't calling setState
      // synchronously in the effect body.
      const id = requestAnimationFrame(() => {
        setResults([])
        setLoading(false)
      })
      return () => cancelAnimationFrame(id)
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const startId = requestAnimationFrame(() => setLoading(true))
    const handle = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=12`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d) => {
          const hits: SearchHit[] = Array.isArray(d?.results) ? d.results : []
          setResults(hits)
          setLoading(false)
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') setLoading(false)
        })
    }, 200)
    return () => {
      cancelAnimationFrame(startId)
      clearTimeout(handle)
      ctrl.abort()
    }
  }, [query])

  return { results, loading }
}

/* ── Component ──────────────────────────────────────────────────────── */

export interface CommandPaletteHandle {
  open: () => void
  close: () => void
  toggle: () => void
}

export function CommandPalette({
  openState,
  setOpenState,
}: {
  openState: boolean
  setOpenState: (v: boolean) => void
}) {
  const router = useRouter()
  const copilot = useCopilot()
  const modKey = usePlatformModKey()
  const [query, setQuery] = useState('')
  const { results: searchHits, loading: searching } = useDebouncedSearch(query)

  const navItems = useMemo(
    () => NAV_HUBS.flatMap((hub) => hub.items.map((item) => ({ ...item, hubLabel: hub.label }))),
    []
  )

  const close = useCallback(() => {
    setOpenState(false)
    setQuery('')
  }, [setOpenState])

  const go = useCallback(
    (href: string) => {
      close()
      router.push(href)
    },
    [router, close]
  )

  const askCopilot = useCallback(() => {
    const q = query.trim()
    close()
    copilot.open(q || undefined)
  }, [query, copilot, close])

  // Quick actions (static)
  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'qa-new-worker',
        label: 'Nuevo trabajador',
        hint: 'Agregar a /dashboard/trabajadores',
        icon: Users,
        perform: () => go('/dashboard/trabajadores/nuevo'),
      },
      {
        id: 'qa-new-contract',
        label: 'Generar contrato',
        hint: 'Plantilla · régimen · IA',
        icon: FileText,
        perform: () => go('/dashboard/contratos/nuevo'),
      },
      {
        id: 'qa-diagnostic',
        label: 'Iniciar diagnóstico SUNAFIL',
        hint: '120 preguntas · score automático',
        icon: ShieldCheck,
        perform: () => go('/dashboard/diagnostico'),
      },
      {
        id: 'qa-simulacro',
        label: 'Iniciar simulacro SUNAFIL',
        hint: 'Inspector virtual',
        icon: ShieldAlert,
        perform: () => go('/dashboard/simulacro'),
      },
      {
        id: 'qa-open-copilot',
        label: 'Abrir Asistente IA',
        hint: 'Ctrl+I',
        icon: Sparkles,
        perform: () => {
          close()
          copilot.open()
        },
        shortcut: '⌃I',
      },
      {
        id: 'qa-reports',
        label: 'Descargar reporte ejecutivo',
        hint: 'PDF compliance mensual',
        icon: BarChart3,
        perform: () => go('/dashboard/reportes'),
      },
    ],
    [go, close, copilot]
  )

  // Reset query when dialog closes (deferred to next frame so we don't setState
  // synchronously inside the effect body).
  useEffect(() => {
    if (openState) return
    const id = requestAnimationFrame(() => setQuery(''))
    return () => cancelAnimationFrame(id)
  }, [openState])

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpenState(!openState)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openState, setOpenState])

  const filteredNav = query.trim()
    ? navItems.filter(
        (n) =>
          n.label.toLowerCase().includes(query.toLowerCase()) ||
          n.hubLabel.toLowerCase().includes(query.toLowerCase())
      )
    : navItems.slice(0, 8)

  const filteredCalcs = query.trim()
    ? CALCULATOR_TYPES.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase())
      )
    : CALCULATOR_TYPES.slice(0, 4)

  const hasQuery = query.trim().length > 0
  const noResults =
    hasQuery &&
    !searching &&
    searchHits.length === 0 &&
    filteredNav.length === 0 &&
    filteredCalcs.length === 0

  return (
    <Dialog.Root open={openState} onOpenChange={setOpenState}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-command)] bg-neutral-900/40 backdrop-blur-sm data-[state=open]:motion-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-[12vh] -translate-x-1/2 z-[var(--z-command)] w-[calc(100vw-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--bg-elevated)] shadow-[var(--elevation-4)] data-[state=open]:motion-scale-in focus:outline-none"
          aria-label="Paleta de comandos"
        >
          <Dialog.Title className="sr-only">Buscar y ejecutar comandos</Dialog.Title>
          <Dialog.Description className="sr-only">
            Escribe para buscar trabajadores, contratos, módulos o acciones. Presiona Enter para abrir el seleccionado.
          </Dialog.Description>
          <CmdkCommand
            loop
            shouldFilter={false}
            className="flex flex-col"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[color:var(--border-subtle)]">
              <Search className="h-4 w-4 text-[color:var(--text-tertiary)] shrink-0" />
              <CmdkCommand.Input
                value={query}
                onValueChange={setQuery}
                autoFocus
                placeholder="Buscar trabajadores, contratos, módulos o acciones…"
                className="flex-1 bg-transparent text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] outline-none"
              />
              <kbd className="hidden sm:inline-flex items-center rounded border border-[color:var(--border-subtle)] bg-[color:var(--neutral-100)] px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                ESC
              </kbd>
            </div>

            <CmdkCommand.List className="max-h-[60vh] overflow-y-auto py-2">
              {noResults ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    Sin coincidencias para
                    <span className="ml-1 font-semibold text-[color:var(--text-primary)]">&quot;{query}&quot;</span>
                  </p>
                  <button
                    type="button"
                    onClick={askCopilot}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500/12 border border-emerald-400/30 px-3 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/18 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Preguntar al Asistente IA
                  </button>
                </div>
              ) : null}

              {/* Ask copilot — always at top when there's a query */}
              {hasQuery ? (
                <CmdkCommand.Group heading={<GroupHeading>Asistente IA</GroupHeading>}>
                  <PaletteRow
                    icon={Sparkles}
                    label={`Preguntar al Asistente IA: "${query}"`}
                    hint="Respuesta con base legal peruana"
                    accent
                    onSelect={askCopilot}
                  />
                </CmdkCommand.Group>
              ) : null}

              {/* Dynamic search hits */}
              {searchHits.length > 0 ? (
                <CmdkCommand.Group heading={<GroupHeading>Resultados</GroupHeading>}>
                  {searchHits.map((hit) => (
                    <PaletteRow
                      key={`${hit.kind}-${hit.id}`}
                      icon={hit.kind === 'worker' ? Users : hit.kind === 'contract' ? FileText : FileStack}
                      label={hit.label}
                      hint={hit.sublabel}
                      tag={hit.kind === 'worker' ? 'Trabajador' : hit.kind === 'contract' ? 'Contrato' : 'Documento'}
                      onSelect={() => go(hit.href)}
                    />
                  ))}
                </CmdkCommand.Group>
              ) : null}

              {/* Quick actions */}
              {!hasQuery ? (
                <CmdkCommand.Group heading={<GroupHeading>Acciones rápidas</GroupHeading>}>
                  {quickActions.map((a) => (
                    <PaletteRow
                      key={a.id}
                      icon={a.icon}
                      label={a.label}
                      hint={a.hint}
                      shortcut={a.shortcut}
                      onSelect={a.perform}
                    />
                  ))}
                </CmdkCommand.Group>
              ) : null}

              {/* Navigation */}
              {filteredNav.length > 0 ? (
                <CmdkCommand.Group heading={<GroupHeading>Navegación</GroupHeading>}>
                  {filteredNav.slice(0, 14).map((n) => (
                    <PaletteRow
                      key={n.href}
                      icon={iconFor(n.icon)}
                      label={n.label}
                      hint={n.hubLabel}
                      onSelect={() => go(n.href)}
                    />
                  ))}
                </CmdkCommand.Group>
              ) : null}

              {/* Calculators */}
              {filteredCalcs.length > 0 ? (
                <CmdkCommand.Group heading={<GroupHeading>Calculadoras</GroupHeading>}>
                  {filteredCalcs.map((c) => (
                    <PaletteRow
                      key={c.key}
                      icon={Calculator}
                      label={c.label}
                      hint={c.description}
                      onSelect={() => go(`/dashboard/calculadoras/${c.key}`)}
                    />
                  ))}
                </CmdkCommand.Group>
              ) : null}

              {searching ? (
                <div className="px-4 py-3 text-xs text-[color:var(--text-tertiary)]">
                  Buscando…
                </div>
              ) : null}
            </CmdkCommand.List>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-inset)] text-[10px] text-[color:var(--text-tertiary)]">
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center rounded border border-[color:var(--border-subtle)] bg-[color:var(--neutral-100)] px-1 py-0.5 font-mono">
                  ↑↓
                </kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center rounded border border-[color:var(--border-subtle)] bg-[color:var(--neutral-100)] px-1 py-0.5 font-mono">
                  ↵
                </kbd>
                abrir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center gap-0.5 rounded border border-[color:var(--border-subtle)] bg-[color:var(--neutral-100)] px-1 py-0.5 font-mono">
                  {modKey === '⌘' ? <CommandIcon className="h-2.5 w-2.5" /> : <span>{modKey}</span>}
                  <span>{modKey === '⌘' ? 'K' : '+K'}</span>
                </kbd>
                cerrar
              </span>
              <span className="ml-auto flex items-center gap-1">
                <kbd className="inline-flex items-center rounded border border-[color:var(--border-subtle)] bg-[color:var(--neutral-100)] px-1 py-0.5 font-mono">
                  ⇧↵
                </kbd>
                preguntar al Asistente IA
              </span>
            </div>
          </CmdkCommand>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ── Row component ──────────────────────────────────────────────────── */

function PaletteRow({
  icon: Icon,
  label,
  hint,
  tag,
  shortcut,
  accent,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint?: string
  tag?: string
  shortcut?: string
  accent?: boolean
  onSelect: () => void
}) {
  return (
    <CmdkCommand.Item
      onSelect={onSelect}
      className={cn(
        'flex items-center gap-3 mx-1 my-0.5 rounded-lg px-2.5 py-2 text-sm cursor-default select-none',
        'transition-colors duration-100',
        'data-[selected=true]:bg-[color:var(--bg-surface-hover)]',
        accent && 'data-[selected=true]:bg-emerald-500/14'
      )}
    >
      <span
        className={cn(
          'shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg',
          accent
            ? 'bg-emerald-500/12 border border-emerald-400/30 text-emerald-200'
            : 'bg-[color:var(--bg-inset)] border border-[color:var(--border-subtle)] text-[color:var(--text-tertiary)]'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-medium', accent ? 'text-emerald-200' : 'text-[color:var(--text-primary)]')}>
          {label}
        </p>
        {hint ? (
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">{hint}</p>
        ) : null}
      </div>
      {tag ? (
        <span className="shrink-0 rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          {tag}
        </span>
      ) : null}
      {shortcut ? (
        <kbd className="shrink-0 rounded border border-[color:var(--border-subtle)] bg-[color:var(--neutral-100)] px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
          {shortcut}
        </kbd>
      ) : null}
      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity duration-100 data-[selected=true]:opacity-100 text-[color:var(--text-tertiary)]" />
    </CmdkCommand.Item>
  )
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <span className="block px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)]">
      {children}
    </span>
  )
}
