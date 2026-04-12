'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  LayoutDashboard,
  FileText,
  Calculator,
  Bell,
  Settings,
  FolderOpen,
  BarChart3,
  Users,
  Calendar,
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
  X,
} from 'lucide-react'
import { NAV_ITEMS, CALCULATOR_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, FileText, Calculator, Calendar, Bell, Settings,
  FolderOpen, BarChart3, ShieldCheck, ShieldAlert, Bot, HardHat,
  GraduationCap, Newspaper, Plug, CreditCard, Building2, Equal,
}

interface PaletteItem {
  id: string
  label: string
  sublabel?: string
  href: string
  icon: string
  group: string
}

const STATIC_ITEMS: PaletteItem[] = [
  ...NAV_ITEMS.map(n => ({
    id: n.href,
    label: n.label,
    href: n.href,
    icon: n.icon,
    group: 'Navegacion',
  })),
  ...CALCULATOR_TYPES.map(c => ({
    id: `/dashboard/calculadoras/${c.key}`,
    label: c.label,
    sublabel: c.description,
    href: `/dashboard/calculadoras/${c.key}`,
    icon: 'Calculator',
    group: 'Calculadoras',
  })),
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim() === ''
    ? STATIC_ITEMS.slice(0, 10)
    : STATIC_ITEMS.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.sublabel?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12)

  const handleOpen = useCallback(() => {
    setOpen(true)
    setQuery('')
    setSelectedIndex(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  const handleSelect = useCallback((item: PaletteItem) => {
    router.push(item.href)
    handleClose()
  }, [router, handleClose])

  // Global keydown: Ctrl+K or Cmd+K opens palette
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => {
          if (!prev) {
            setQuery('')
            setSelectedIndex(0)
            setTimeout(() => inputRef.current?.focus(), 50)
          }
          return !prev
        })
      }
      if (!open) return
      if (e.key === 'Escape') handleClose()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, filtered, selectedIndex, handleClose, handleSelect])

  // Reset selection when query changes
  useEffect(() => { setSelectedIndex(0) }, [query])

  if (!open) return null

  // Group items for display
  const groups: Record<string, PaletteItem[]> = {}
  for (const item of filtered) {
    if (!groups[item.group]) groups[item.group] = []
    groups[item.group].push(item)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/[0.08] border-white/[0.08] bg-[#141824] bg-[#141824] shadow-2xl overflow-hidden animate-fade-in">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] border-white/[0.08]">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            id="command-palette-search"
            name="commandSearch"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar modulos, calculadoras..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-400 outline-none"
          />
          <div className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline-flex items-center rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              ESC
            </kbd>
            <button onClick={handleClose} className="p-1 hover:bg-white/[0.04] rounded-md transition-colors">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              Sin resultados para &quot;{query}&quot;
            </p>
          ) : (
            Object.entries(groups).map(([groupName, items]) => {
              return (
                <div key={groupName}>
                  <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {groupName}
                  </p>
                  {items.map(item => {
                    const Icon = ICON_MAP[item.icon]
                    const globalIndex = filtered.indexOf(item)
                    const isSelected = globalIndex === selectedIndex
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                          isSelected ? 'bg-primary/5' : 'hover:bg-white/[0.02] hover:bg-white/[0.04]',
                        )}
                      >
                        <div className={cn(
                          'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
                          isSelected ? 'bg-primary text-white' : 'bg-white/[0.04] bg-white/[0.04] text-gray-500',
                        )}>
                          {Icon && <Icon className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            'font-medium truncate',
                            isSelected ? 'text-primary' : 'text-gray-900',
                          )}>
                            {item.label}
                          </p>
                          {item.sublabel && (
                            <p className="text-xs text-gray-400 truncate">{item.sublabel}</p>
                          )}
                        </div>
                        {isSelected && (
                          <kbd className="ml-auto text-[10px] text-gray-400 border border-white/[0.08] rounded px-1 py-0.5 bg-white/[0.02]">
                            ↵
                          </kbd>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/[0.06] border-white/[0.08] bg-white/[0.02]">
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <kbd className="border border-white/[0.08] rounded px-1 py-0.5 bg-[#141824]">↑↓</kbd> navegar
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <kbd className="border border-white/[0.08] rounded px-1 py-0.5 bg-[#141824]">↵</kbd> abrir
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <kbd className="border border-white/[0.08] rounded px-1 py-0.5 bg-[#141824]">Ctrl+K</kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  )
}
