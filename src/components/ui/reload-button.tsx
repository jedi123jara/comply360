'use client'

/**
 * Botón "reintentar" — wrapper Client Component que recarga la página.
 * Existe porque los Server Components no pueden tener onClick directo en Next.js 16.
 */
export function ReloadButton({
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
        if (typeof window !== 'undefined') window.location.reload()
      }}
      className={className}
    >
      {children}
    </button>
  )
}
