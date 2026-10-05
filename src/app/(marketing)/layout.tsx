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
  // Las páginas de marketing son claras: forzamos color-scheme light en su
  // subárbol para que los controles nativos (date/number/select) no hereden el
  // "dark only" global del RootLayout y queden ilegibles. `display: contents`
  // evita crear una caja que altere el layout.
  return <div style={{ colorScheme: 'light', display: 'contents' }}>{children}</div>
}
