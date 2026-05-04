import Link from 'next/link'
import { CheckCircle2, XCircle, ShieldCheck, Building2, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface VerifyResponse {
  valid: boolean
  kind?: 'IPERC' | 'ACCIDENTE' | 'EMO' | 'VISITA'
  fingerprint?: string
  issuedAt?: string | null
  summary?: Record<string, string | number | null | undefined>
  error?: string
}

const KIND_LABEL: Record<string, string> = {
  IPERC: 'Matriz IPERC',
  ACCIDENTE: 'Notificación de Accidente',
  EMO: 'Examen Médico Ocupacional',
  VISITA: 'Visita Field Audit',
}

export default async function VerifySstSlugPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000'

  let data: VerifyResponse | null = null
  try {
    const res = await fetch(`${baseUrl}/api/verify/sst/${slug}`, { cache: 'no-store' })
    data = await res.json()
  } catch {
    data = { valid: false, error: 'No se pudo conectar al servicio de verificación' }
  }

  const valid = data?.valid === true
  const summary = data?.summary ?? null

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/40 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <ShieldCheck className="h-4 w-4" />
            COMPLY360
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Verificación pública SST</h1>
          <p className="text-sm text-slate-600">
            Sello criptográfico de un registro de Seguridad y Salud en el Trabajo
          </p>
        </div>

        {/* Resultado */}
        {valid && data ? (
          <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-lg">
            <div className="bg-emerald-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-7 w-7" />
                <div>
                  <p className="text-lg font-bold">Sello válido</p>
                  <p className="text-sm text-emerald-50">
                    Registro auténtico verificado contra la base de datos
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {KIND_LABEL[data.kind ?? ''] ?? data.kind}
                </span>
              </div>

              {summary && (
                <dl className="space-y-2">
                  {Object.entries(summary).map(([key, value]) =>
                    value != null && value !== '' ? (
                      <div
                        key={key}
                        className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 py-2"
                      >
                        <dt className="text-xs uppercase tracking-wider text-slate-500">
                          {humanize(key)}
                        </dt>
                        <dd className="text-sm font-medium text-slate-900">{String(value)}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              )}

              <div className="mt-5 rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Hash SHA-256 del registro
                </div>
                <code className="mt-1 block break-all font-mono text-[10px] text-slate-700">
                  {data.fingerprint}
                </code>
              </div>

              {data.issuedAt && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  Emitido el {new Date(data.issuedAt).toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 text-center text-xs text-slate-600">
              <p>
                Este sello prueba la integridad del registro contra el audit log inmutable de
                COMPLY360. Cualquier modificación posterior cambiaría el hash y el sello sería
                rechazado.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-lg">
            <div className="bg-rose-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <XCircle className="h-7 w-7" />
                <div>
                  <p className="text-lg font-bold">Sello no válido</p>
                  <p className="text-sm text-rose-50">
                    Este sello no corresponde a un registro real
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {data?.error ??
                    'El identificador es desconocido o el registro fue eliminado del sistema.'}
                </p>
              </div>
              <p className="mt-4 text-xs text-slate-600">
                Si crees que esto es un error, contacta a la empresa que te entregó el documento
                o escribe a soporte@comply360.pe.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-slate-500">
          Slug consultado: <code className="font-mono">{slug}</code>
        </p>
      </div>
    </main>
  )
}

function humanize(key: string): string {
  const map: Record<string, string> = {
    tipo: 'Tipo',
    tipoEvento: 'Evento',
    tipoExamen: 'Tipo de examen',
    version: 'Versión',
    estado: 'Estado',
    sede: 'Sede',
    tipoSede: 'Tipo de sede',
    distrito: 'Distrito',
    empresa: 'Empresa',
    ruc: 'RUC',
    filasCount: 'Filas IPERC',
    aptitud: 'Aptitud',
    centroMedico: 'Centro médico',
    inspector: 'Inspector',
    hallazgosCount: 'Hallazgos',
    satEstado: 'Estado SAT',
    satNumeroManual: 'Número SAT',
  }
  return map[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}
