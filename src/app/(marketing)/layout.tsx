// Toda la sección marketing se sirve dinámicamente (SSR a demanda).
// Razón: en Next.js 16 Turbopack, varios Client Components con onClick
// en páginas marketing fallan en prerender ("Event handlers cannot be
// passed to Client Component props"). force-dynamic salta el prerender
// pero mantiene SSR — Google igual indexa la página, solo agrega ~50ms
// de latencia al first hit (después la edge cache lo cubre).
export const dynamic = 'force-dynamic'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
