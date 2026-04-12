'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X, Filter, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterOption {
  value: string
  label: string
}

interface FilterDefinition {
  key: string
  label: string
  options: FilterOption[]
}

interface SearchFilterProps {
  onSearch: (query: string) => void
  filters?: FilterDefinition[]
  activeFilters?: Record<string, string>
  onFilterChange?: (key: string, value: string) => void
  placeholder?: string
  className?: string
  debounceMs?: number
}

export function SearchFilter({
  onSearch,
  filters = [],
  activeFilters = {},
  onFilterChange,
  placeholder = 'Buscar...',
  className,
  debounceMs = 300,
}: SearchFilterProps) {
  const [query, setQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced search
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onSearch(value.trim())
      }, debounceMs)
    },
    [onSearch, debounceMs]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    onSearch('')
    inputRef.current?.focus()
  }, [onSearch])

  const activeFilterEntries = Object.entries(activeFilters).filter(([, v]) => v !== '')

  const clearAllFilters = useCallback(() => {
    if (!onFilterChange) return
    for (const [key] of activeFilterEntries) {
      onFilterChange(key, '')
    }
  }, [activeFilterEntries, onFilterChange])

  const getFilterLabel = useCallback(
    (key: string, value: string): string => {
      const filter = filters.find((f) => f.key === key)
      if (!filter) return value
      const option = filter.options.find((o) => o.value === value)
      return option ? option.label : value
    },
    [filters]
  )

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search bar + filter dropdowns */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            id="search-filter"
            name="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              'w-full rounded-xl border border-white/10 border-white/10 bg-[#141824] bg-[#141824] pl-10 pr-9 py-2.5 text-sm transition-colors',
              'focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none',
              'placeholder:text-gray-400'
            )}
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        {filters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400 hidden sm:block flex-shrink-0" />
            {filters.map((filter) => (
              <div key={filter.key} className="relative">
                <select
                  value={activeFilters[filter.key] || ''}
                  onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                  aria-label={filter.label}
                  className={cn(
                    'appearance-none rounded-xl border border-white/10 border-white/10 bg-[#141824] bg-[#141824] pl-3 pr-8 py-2 text-sm transition-colors',
                    'focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none',
                    activeFilters[filter.key]
                      ? 'border-primary/50 text-primary'
                      : 'text-gray-500'
                  )}
                >
                  <option value="">{filter.label}</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active filter badges */}
      {activeFilterEntries.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilterEntries.map(([key, value]) => {
            const filter = filters.find((f) => f.key === key)
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1"
              >
                {filter?.label}: {getFilterLabel(key, value)}
                <button
                  type="button"
                  onClick={() => onFilterChange?.(key, '')}
                  aria-label={`Quitar filtro ${filter?.label || key}`}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}

          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  )
}
