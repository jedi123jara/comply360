'use client'

/**
 * Botón "página anterior" — wrapper Client Component que usa window.history.back().
 * Existe porque los Server Components no pueden tener onClick directo en Next.js 16.
 */
export function BackButton({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined') window.history.back()
      }}
      className={className}
    >
      {children}
    </button>
  )
}
