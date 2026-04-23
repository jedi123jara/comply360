/**
 * Skeleton para las páginas de marketing (calculadoras, planes, recursos,
 * diagnóstico, contadores, legal). Mientras se hidrata el cliente, el
 * visitante ve una estructura similar a la final en vez de pantalla
 * en blanco — evita flash y mejora LCP percibido.
 */
export default function MarketingLoading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 py-16 animate-pulse">
      <div className="h-6 w-56 bg-emerald-100 rounded-full" />
      <div className="h-12 w-96 max-w-[90vw] bg-slate-200 rounded-lg" />
      <div className="space-y-2 max-w-xl w-full">
        <div className="h-4 w-full bg-slate-100 rounded" />
        <div className="h-4 w-5/6 mx-auto bg-slate-100 rounded" />
      </div>
      <div className="grid sm:grid-cols-3 gap-4 max-w-4xl w-full mt-8 px-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white ring-1 ring-slate-200 p-6 space-y-3"
          >
            <div className="w-10 h-10 bg-slate-200 rounded-lg" />
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-3 w-5/6 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
