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
import { PeopleViewLoader } from './_components/people-view-loader'

export const metadata = {
  title: 'Trombinoscopio · Comply360',
  description: 'Vista grid del equipo con score de compliance individual.',
}

function Loader() {
  return <div className="p-8 text-sm text-slate-500">Cargando trombinoscopio…</div>
}

export default function PeoplePage() {
  return <PeopleViewLoader fallback={<Loader />} />
}
