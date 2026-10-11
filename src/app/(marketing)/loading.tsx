/**
 * Skeleton para las páginas de marketing (calculadoras, planes, recursos,
 * diagnóstico, contadores, legal). Mientras se hidrata el cliente, el
 * visitante ve una estructura similar a la final (header y hero azul marino,
 * cuerpo claro con tarjetas blancas) en vez de pantalla en blanco.
 */
export default function MarketingLoading() {
  return (
    <div className="min-h-[70vh] bg-[#F5F7FB]" aria-busy="true" aria-label="Cargando">
      <div className="h-16 bg-[#0B1B36] sm:h-[72px]" />
      <div className="flex flex-col items-center gap-5 bg-[#0B1B36] px-4 pb-14 pt-10">
        <div className="h-6 w-56 rounded-full bg-[#F5B301]/20" />
        <div className="h-11 w-96 max-w-[90vw] rounded-lg bg-[#ffffff]/10" />
        <div className="w-full max-w-xl space-y-2">
          <div className="h-4 w-full rounded bg-[#ffffff]/[0.07]" />
          <div className="mx-auto h-4 w-5/6 rounded bg-[#ffffff]/[0.07]" />
        </div>
      </div>
      <div className="mx-auto mt-10 grid w-full max-w-4xl gap-4 px-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-[#E5EAF2] bg-[#ffffff] p-6">
            <div className="h-10 w-10 rounded-lg bg-[#EFF4FF]" />
            <div className="h-4 w-3/4 rounded bg-[#E5EAF2]" />
            <div className="h-3 w-full rounded bg-[#EEF2F7]" />
            <div className="h-3 w-5/6 rounded bg-[#EEF2F7]" />
          </div>
        ))}
      </div>
    </div>
  )
}
