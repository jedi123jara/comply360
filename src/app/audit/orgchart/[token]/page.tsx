import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { ShieldCheck, Building2, FileSignature, Calendar, ScrollText } from 'lucide-react'
import type { PublicOrgChartPayload } from '@/lib/orgchart/types'
import { COMPLIANCE_ROLES } from '@/lib/orgchart/compliance-rules'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
}

interface FetchResponse extends PublicOrgChartPayload {
  roleCatalog: typeof COMPLIANCE_ROLES
}

async function fetchPublicChart(token: string): Promise<FetchResponse | null> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const base = process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : '')
  if (!base) return null
  const res = await fetch(`${base}/api/public/orgchart/${token}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function AuditorOrgChartPage({ params }: PageProps) {
  const { token } = await params
  const data = await fetchPublicChart(token)
  if (!data) notFound()

  // Construir árbol simple
  const childrenByParent = new Map<string | null, typeof data.units>()
  for (const u of data.units) {
    const list = childrenByParent.get(u.parentId) ?? []
    list.push(u)
    childrenByParent.set(u.parentId, list)
  }
  const positionsByUnit = new Map<string, typeof data.positions>()
  for (const p of data.positions) {
    const list = positionsByUnit.get(p.orgUnitId) ?? []
    list.push(p)
    positionsByUnit.set(p.orgUnitId, list)
  }
  const rolesByUnit = new Map<string, typeof data.complianceRoles>()
  for (const r of data.complianceRoles) {
    if (!r.unitId) continue
    const list = rolesByUnit.get(r.unitId) ?? []
    list.push(r)
    rolesByUnit.set(r.unitId, list)
  }

  const roots = childrenByParent.get(null) ?? []

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
              <ShieldCheck className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-emerald-700">Auditor Link · Comply360</div>
              <h1 className="text-xl font-semibold">{data.org.name}</h1>
              {data.org.ruc && <div className="text-xs text-slate-500">RUC {data.org.ruc}</div>}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <FileSignature className="h-3.5 w-3.5" />
              <span>Hash de verificación</span>
            </div>
            <code className="mt-1 block font-mono text-slate-900">{data.hashShort}…</code>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar className="h-3 w-3" />
              {new Date(data.takenAt).toLocaleString('es-PE')}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <strong>Documento oficial firmado.</strong> Este organigrama fue generado por Comply360 y
          firmado criptográficamente con SHA-256. Si el contenido fue alterado, el hash no
          coincidiría y el enlace dejaría de validar. <em>Snapshot: {data.snapshotLabel}</em>.
        </div>

        {/* Comités legales destacados */}
        {data.complianceRoles.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Roles legales designados
            </h2>
            <div className="grid gap-2 md:grid-cols-2">
              {data.complianceRoles.map((r, i) => {
                const def = data.roleCatalog[r.roleType]
                return (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      {def.shortLabel}
                    </div>
                    <div className="mt-1 text-sm font-medium">{r.workerName}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{def.label}</div>
                    {r.endsAt && (
                      <div className="mt-1 text-[11px] text-slate-500">
                        Vigencia hasta {new Date(r.endsAt).toLocaleDateString('es-PE')}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                      <ScrollText className="h-3 w-3" />
                      {def.baseLegal}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Estructura jerárquica */}
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Building2 className="h-4 w-4 text-emerald-600" />
            Estructura organizacional
          </h2>
          <div className="space-y-3">
            {roots.map(root => (
              <UnitNode
                key={root.id}
                unit={root}
                depth={0}
                childrenByParent={childrenByParent}
                positionsByUnit={positionsByUnit}
                rolesByUnit={rolesByUnit}
                roleCatalog={data.roleCatalog}
              />
            ))}
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          Generado por <strong className="text-emerald-700">Comply360</strong> · Plataforma de
          compliance laboral peruano. Para verificar autenticidad, comparte este enlace y el hash
          con el responsable.
        </footer>
      </main>
    </div>
  )
}

interface UnitNodeProps {
  unit: { id: string; name: string; parentId: string | null; kind: string }
  depth: number
  childrenByParent: Map<string | null, Array<{ id: string; name: string; parentId: string | null; kind: string }>>
  positionsByUnit: Map<string, Array<{ id: string; orgUnitId: string; title: string; occupants: Array<{ name: string; isInterim: boolean }> }>>
  rolesByUnit: Map<string, Array<{ roleType: keyof typeof COMPLIANCE_ROLES; workerName: string; unitId: string | null; endsAt: string | null }>>
  roleCatalog: typeof COMPLIANCE_ROLES
}

function UnitNode({ unit, depth, childrenByParent, positionsByUnit, rolesByUnit, roleCatalog }: UnitNodeProps) {
  const positions = positionsByUnit.get(unit.id) ?? []
  const kids = childrenByParent.get(unit.id) ?? []
  const roles = rolesByUnit.get(unit.id) ?? []

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-slate-200 pl-4' : ''}>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-600" />
          <div className="text-sm font-semibold">{unit.name}</div>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] uppercase text-slate-600">
            {unit.kind}
          </span>
        </div>
        {(positions.length > 0 || roles.length > 0) && (
          <div className="mt-2 space-y-1.5 pl-6">
            {positions.map(p => (
              <div key={p.id} className="text-xs">
                <span className="font-medium text-slate-700">{p.title}</span>
                {p.occupants.length > 0 && (
                  <span className="ml-2 text-slate-500">
                    — {p.occupants.map(o => `${o.name}${o.isInterim ? ' (interino)' : ''}`).join(', ')}
                  </span>
                )}
              </div>
            ))}
            {roles.map((r, i) => {
              const def = roleCatalog[r.roleType]
              return (
                <div key={i} className="text-[11px] text-slate-500">
                  ⚖️ {def.label}: <strong>{r.workerName}</strong>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {kids.length > 0 && (
        <div className="mt-2 space-y-2">
          {kids.map(k => (
            <UnitNode
              key={k.id}
              unit={k}
              depth={depth + 1}
              childrenByParent={childrenByParent}
              positionsByUnit={positionsByUnit}
              rolesByUnit={rolesByUnit}
              roleCatalog={roleCatalog}
            />
          ))}
        </div>
      )}
    </div>
  )
}
