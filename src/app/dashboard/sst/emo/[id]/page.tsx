'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Calendar,
  Stethoscope,
  User,
  FileText,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

type Aptitud = 'APTO' | 'APTO_CON_RESTRICCIONES' | 'NO_APTO' | 'OBSERVADO'

interface EmoDetail {
  id: string
  workerId: string
  tipoExamen: string
  fechaExamen: string
  centroMedicoNombre: string
  centroMedicoRuc: string | null
  aptitud: Aptitud
  consentimientoLey29733: boolean
  fechaConsentimiento: string | null
  proximoExamenAntes: string | null
  certificadoUrl: string | null
  tieneRestricciones: boolean
  restricciones?: string
  restriccionesError?: string
  worker: {
    id: string
    firstName: string
    lastName: string
    dni: string
    position: string | null
    fechaIngreso: string
  }
}

const APTITUD_LABEL: Record<Aptitud, string> = {
  APTO: 'Apto',
  APTO_CON_RESTRICCIONES: 'Apto con restricciones',
  NO_APTO: 'No apto',
  OBSERVADO: 'Observado',
}

const APTITUD_VARIANT: Record<Aptitud, 'success' | 'warning' | 'danger' | 'info'> = {
  APTO: 'success',
  APTO_CON_RESTRICCIONES: 'warning',
  NO_APTO: 'danger',
  OBSERVADO: 'info',
}

const TIPO_LABEL: Record<string, string> = {
  PRE_EMPLEO: 'Pre-empleo',
  PERIODICO: 'Periódico',
  RETIRO: 'Retiro',
  REINTEGRO_LARGA_AUSENCIA: 'Reintegro tras larga ausencia',
}

export default function EmoDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [emo, setEmo] = useState<EmoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revelando, setRevelando] = useState(false)

  async function load(descifrar = false) {
    setLoading(true)
    setError(null)
    try {
      const url = descifrar ? `/api/sst/emo/${id}?descifrar=1` : `/api/sst/emo/${id}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'No se pudo cargar el EMO')
      }
      const json = await res.json()
      setEmo(json.emo)
      if (descifrar) {
        toast.success('Restricciones reveladas — se registró en el audit log')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function revelarRestricciones() {
    if (revelando) return
    setRevelando(true)
    try {
      await load(true)
    } finally {
      setRevelando(false)
    }
  }

  if (loading && !emo) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando EMO...
      </div>
    )
  }

  if (error || !emo) {
    return (
      <Card className="border-rose-200 bg-rose-50/60">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error ?? 'Error desconocido'}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/sst/emo"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a EMO
      </Link>

      <PageHeader
        eyebrow={`SST · EMO ${TIPO_LABEL[emo.tipoExamen] ?? emo.tipoExamen}`}
        title={`${emo.worker.firstName} ${emo.worker.lastName}`}
        subtitle={`DNI ${emo.worker.dni} · Examen del ${new Date(emo.fechaExamen).toLocaleDateString('es-PE')}`}
        actions={<Badge variant={APTITUD_VARIANT[emo.aptitud]}>{APTITUD_LABEL[emo.aptitud]}</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Datos del trabajador */}
        <Card>
          <CardContent className="py-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <User className="h-4 w-4 text-emerald-600" />
              Trabajador
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Nombre">
                {emo.worker.firstName} {emo.worker.lastName}
              </Row>
              <Row label="DNI">{emo.worker.dni}</Row>
              {emo.worker.position && <Row label="Puesto">{emo.worker.position}</Row>}
              <Row label="Ingreso">
                {new Date(emo.worker.fechaIngreso).toLocaleDateString('es-PE')}
              </Row>
            </dl>
          </CardContent>
        </Card>

        {/* Datos del examen */}
        <Card>
          <CardContent className="py-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Stethoscope className="h-4 w-4 text-emerald-600" />
              Examen
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Tipo">
                <Badge variant="info" size="xs">
                  {TIPO_LABEL[emo.tipoExamen] ?? emo.tipoExamen}
                </Badge>
              </Row>
              <Row label="Fecha">{new Date(emo.fechaExamen).toLocaleDateString('es-PE')}</Row>
              <Row label="Centro médico">{emo.centroMedicoNombre}</Row>
              {emo.centroMedicoRuc && <Row label="RUC centro">{emo.centroMedicoRuc}</Row>}
              <Row label="Aptitud">
                <Badge variant={APTITUD_VARIANT[emo.aptitud]} size="xs">
                  {APTITUD_LABEL[emo.aptitud]}
                </Badge>
              </Row>
              {emo.proximoExamenAntes && (
                <Row label="Próximo examen">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(emo.proximoExamenAntes).toLocaleDateString('es-PE')}
                  </span>
                </Row>
              )}
              {emo.certificadoUrl && (
                <Row label="Certificado">
                  <a
                    href={emo.certificadoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"
                  >
                    <FileText className="h-3 w-3" />
                    Abrir documento
                  </a>
                </Row>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Restricciones (cifradas) */}
      <Card>
        <CardContent className="py-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Restricciones laborales
              </h2>
              <p className="text-xs text-slate-600">
                {emo.tieneRestricciones
                  ? 'Texto cifrado con pgcrypto. Cada acceso queda en el audit log (Ley 29733).'
                  : 'No se registraron restricciones para este examen.'}
              </p>
            </div>
            {emo.tieneRestricciones && !emo.restricciones && (
              <Button size="sm" variant="secondary" onClick={revelarRestricciones} disabled={revelando}>
                {revelando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Revelar
              </Button>
            )}
            {emo.restricciones && (
              <Button size="sm" variant="secondary" onClick={() => load(false)}>
                <EyeOff className="mr-2 h-4 w-4" />
                Ocultar
              </Button>
            )}
          </div>

          {emo.restricciones ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-amber-700" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-amber-900">
                    Acceso registrado en audit log
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm text-amber-900">
                    {emo.restricciones}
                  </p>
                </div>
              </div>
            </div>
          ) : emo.restriccionesError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-700">
              {emo.restriccionesError}
            </div>
          ) : !emo.tieneRestricciones ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/40 px-4 py-6 text-center text-xs text-slate-500">
              Sin restricciones registradas
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50/40 px-4 py-6 text-center text-xs text-slate-500">
              <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-emerald-600" />
              Restricciones cifradas. Click en <strong>Revelar</strong> para descifrarlas (queda
              registro en el audit log).
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consentimiento */}
      {emo.consentimientoLey29733 && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex items-start gap-3 py-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Consentimiento Ley 29733 registrado
              </p>
              <p className="text-xs text-emerald-800">
                {emo.fechaConsentimiento
                  ? `Firmado el ${new Date(emo.fechaConsentimiento).toLocaleDateString('es-PE')}`
                  : 'Sin fecha registrada'}{' '}
                · El certificado original con diagnóstico permanece en el centro médico, no en
                COMPLY360.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-32 shrink-0 text-xs text-slate-500">{label}</dt>
      <dd className="flex-1 text-sm text-slate-800">{children}</dd>
    </div>
  )
}
