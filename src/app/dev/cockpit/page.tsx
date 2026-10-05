import Link from 'next/link'
import CockpitPage from '@/app/dashboard/_cockpit-page'
import {
  COCKPIT_SCENARIOS,
  buildCockpitMock,
  parseCockpitScenario,
} from '../_preview/cockpit-mock-data'
import { PreviewNotice, scenarioChipClass } from '../_preview/preview-notice'

/**
 * /dev/cockpit — panel principal REAL del dashboard (`_cockpit-page.tsx`)
 * dentro del shell real, con datos de ejemplo.
 *
 * Igual que `src/app/dashboard/page.tsx`, este Server Component arma el
 * payload y se lo pasa al componente cliente; la diferencia es que el
 * payload sale de `buildCockpitMock()` en vez de Prisma.
 *
 * Escenarios: `?escenario=normal|alerta|vacio`.
 */
export default async function DevCockpitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const rawScenario = Array.isArray(params.escenario) ? params.escenario[0] : params.escenario
  const scenario = parseCockpitScenario(rawScenario)
  const data = buildCockpitMock(scenario)

  return (
    <>
      <PreviewNotice
        title="Panel principal del dashboard"
        actions={COCKPIT_SCENARIOS.map((item) => (
          <Link
            key={item.id}
            href={item.id === 'normal' ? '/dev/cockpit' : `/dev/cockpit?escenario=${item.id}`}
            scroll={false}
            title={item.hint}
            aria-current={item.id === scenario ? 'page' : undefined}
            className={scenarioChipClass(item.id === scenario)}
          >
            {item.label}
          </Link>
        ))}
      >
        Es el panel real que ve la empresa al entrar a <code className="font-mono text-xs">/dashboard</code>,
        alimentado con datos ficticios de <strong>{data.stats.orgName}</strong>. No se usa sesión ni base de
        datos. Cambia de escenario para revisar cada estado del panel.
      </PreviewNotice>

      <CockpitPage initialData={data} initialScore={data.scoreSnapshot} />
    </>
  )
}
