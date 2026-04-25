'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

type Item = {
  group: string
  icon: React.ComponentType<{ size?: number | string }>
  label: string
  sub?: string
  href: string
  hint?: string
}

export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean
  onClose: () => void
  items: Item[]
}) {
  if (!open) return null
  // `key` garantiza un mount fresco cada vez que se abre — ergo reseteamos
  // query/activeIdx sin necesidad de useEffect.
  return <CommandPaletteImpl key={String(open)} items={items} onClose={onClose} />
}

function CommandPaletteImpl({
  items,
  onClose,
}: {
  items: Item[]
  onClose: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [activeIdxRaw, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Focus on mount — no setState, solo DOM side-effect.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 40)
    return () => clearTimeout(t)
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        (it.sub ?? '').toLowerCase().includes(q) ||
        it.group.toLowerCase().includes(q),
    )
  }, [items, query])

  // Derivamos el activeIdx en lugar de sincronizarlo con useEffect — evita
  // re-renders encadenados cuando `filtered.length` cambia.
  const activeIdx = Math.min(activeIdxRaw, Math.max(0, filtered.length - 1))

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>()
    filtered.forEach((it) => {
      if (!map.has(it.group)) map.set(it.group, [])
      map.get(it.group)!.push(it)
    })
    return Array.from(map.entries())
  }, [filtered])

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const it = filtered[activeIdx]
      if (it) {
        router.push(it.href)
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="cmdk-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Buscador de comandos"
      onKeyDown={onKey}
    >
      <div className="cmdk-panel" onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="cmdk-input-wrap">
          <Search size={15} style={{ color: 'var(--text-tertiary)' }} />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Buscar empresa, ruta, acción…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIdx(0)
            }}
            aria-label="Buscar"
          />
          <span className="a-kbd">ESC</span>
        </div>

        <div className="cmdk-list">
          {filtered.length === 0 && (
            <div
              style={{
                padding: 20,
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 13,
              }}
            >
              Nada que mostrar. Prueba con otra palabra.
            </div>
          )}
          {groups.map(([group, groupItems]) => (
            <div key={group}>
              <div className="cmdk-group-label">{group}</div>
              {groupItems.map((it) => {
                const globalIdx = filtered.indexOf(it)
                const Icon = it.icon
                const active = globalIdx === activeIdx
                return (
                  <div
                    key={`${it.group}-${it.label}-${it.href}`}
                    className={`cmdk-item ${active ? 'active' : ''}`}
                    onMouseEnter={() => setActiveIdx(globalIdx)}
                    onClick={() => {
                      router.push(it.href)
                      onClose()
                    }}
                  >
                    <div className="cmdk-icon">
                      <Icon size={14} />
                    </div>
                    <div>
                      <div>{it.label}</div>
                      {it.sub && <div className="cmdk-sub">{it.sub}</div>}
                    </div>
                    {it.hint && <span className="cmdk-hint">{it.hint}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="cmdk-foot">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className="a-kbd">↵</span> Abrir
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className="a-kbd">↑↓</span> Navegar
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className="a-kbd">ESC</span> Cerrar
          </span>
        </div>
      </div>
    </div>
  )
}
