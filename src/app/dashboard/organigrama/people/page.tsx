/**
 * Trombinoscopio Compliance — vista grid de fotos del equipo con score
 * individual de riesgo SUNAFIL.
 *
 * Cada cara aparece coloreada según su score:
 *   - Verde: en regla
 *   - Ámbar: atención
 *   - Naranja: en riesgo
 *   - Rojo: crítico
 *
 * Filtros chips arriba: contrato, área, sólo en riesgo, búsqueda.
 *
 * Click en una cara muestra panel lateral con detalle del trabajador.
 */
import { getAuthContext } from '@/lib/auth'
import { isRolloutEnabled } from '@/lib/plan-features'
import { PeopleViewLoader } from './_components/people-view-loader'

export const metadata = {
  title: 'Trombinoscopio · Comply360',
  description: 'Vista grid del equipo con score de compliance individual.',
}

function Loader() {
  return <div className="p-8 text-sm text-slate-500">Cargando trombinoscopio…</div>
}

export default async function PeoplePage() {
  const ctx = await getAuthContext()
  const v2Enabled = isRolloutEnabled('orgchart_v2', ctx?.orgId ?? null)

  if (!v2Enabled) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center text-sm text-slate-500">
        Esta vista requiere el flag orgchart_v2 activo.
      </div>
    )
  }

  return (
    <PeopleViewLoader fallback={<Loader />} />
  )
}
