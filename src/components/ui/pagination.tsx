'use client'

import { useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize?: number
  totalItems?: number
  onPageSizeChange?: (pageSize: number) => void
  className?: string
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/**
 * Compute visible page numbers with ellipsis placeholders.
 * Shows first 2, last 2, and current +/-1 pages. Uses -1 as ellipsis sentinel.
 */
function getPageNumbers(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages = new Set<number>()

  // Always show first 2 and last 2
  pages.add(1)
  pages.add(2)
  pages.add(total - 1)
  pages.add(total)

  // Current and neighbors
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) {
      pages.add(i)
    }
  }

  const sorted = Array.from(pages).sort((a, b) => a - b)

  // Insert ellipsis sentinels (-1) between gaps
  const result: number[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push(-1)
    }
    result.push(sorted[i])
  }

  return result
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const pages = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages])

  const goTo = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        onPageChange(page)
      }
    },
    [currentPage, totalPages, onPageChange]
  )

  const isFirst = currentPage <= 1
  const isLast = currentPage >= totalPages

  // Compute "Mostrando X-Y de Z resultados"
  const rangeText = useMemo(() => {
    if (totalItems == null || pageSize == null) return null
    const start = Math.min((currentPage - 1) * pageSize + 1, totalItems)
    const end = Math.min(currentPage * pageSize, totalItems)
    return `Mostrando ${start}-${end} de ${totalItems} resultados`
  }, [currentPage, pageSize, totalItems])

  if (totalPages <= 1 && !rangeText) return null

  const navButtonClass =
    'inline-flex items-center justify-center h-9 w-9 rounded-xl border border-white/10 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-40 disabled:cursor-not-allowed bg-[color:var(--bg-inset)] text-gray-300 hover:bg-[color:var(--bg-surface-hover)]'

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      {/* Left side: range text + page size selector */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        {rangeText && <span>{rangeText}</span>}

        {onPageSizeChange && pageSize != null && (
          <div className="flex items-center gap-1.5">
            <label htmlFor="pagination-page-size" className="sr-only">
              Resultados por página
            </label>
            <select
              id="pagination-page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-lg border border-white/10 bg-[color:var(--bg-inset)] px-2 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / pág
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: page navigation */}
      {totalPages > 1 && (
        <nav aria-label="Paginación" className="flex items-center gap-1">
          {/* First page */}
          <button
            type="button"
            onClick={() => goTo(1)}
            disabled={isFirst}
            aria-label="Primera página"
            className={cn(navButtonClass, 'hidden sm:inline-flex')}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Previous */}
          <button
            type="button"
            onClick={() => goTo(currentPage - 1)}
            disabled={isFirst}
            aria-label="Página anterior"
            className={navButtonClass}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers (hidden on very small screens) */}
          <div className="hidden xs:flex items-center gap-1">
            {pages.map((page, idx) =>
              page === -1 ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="inline-flex items-center justify-center h-9 w-9 text-sm text-gray-400 select-none"
                  aria-hidden="true"
                >
                  &hellip;
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => goTo(page)}
                  aria-label={`Página ${page}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center justify-center h-9 w-9 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
                    page === currentPage
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'border border-white/10 text-gray-300 hover:bg-[color:var(--bg-surface-hover)] bg-[color:var(--bg-inset)]'
                  )}
                >
                  {page}
                </button>
              )
            )}
          </div>

          {/* Mobile: simple "page X of Y" */}
          <span className="xs:hidden text-sm text-gray-600 px-2 tabular-nums">
            {currentPage} / {totalPages}
          </span>

          {/* Next */}
          <button
            type="button"
            onClick={() => goTo(currentPage + 1)}
            disabled={isLast}
            aria-label="Página siguiente"
            className={navButtonClass}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last page */}
          <button
            type="button"
            onClick={() => goTo(totalPages)}
            disabled={isLast}
            aria-label="Última página"
            className={cn(navButtonClass, 'hidden sm:inline-flex')}
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  )
}
