/**
 * /verify/[code] — Página pública de verificación de certificados.
 *
 * La URL codificada en el QR del certificado de E-Learning apunta acá.
 * Sin auth: cualquiera que escanee el QR ve el estado del certificado.
 *
 * Hace fetch server-side al endpoint público `/api/certificates/verify` y
 * renderiza el resultado como una página simple, imprimible y compartible.
 */

import { notFound } from 'next/navigation'
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'

interface PageParams {
  params: Promise<{ code: string }>
}

const CODE_RE = /^CERT-\d{4}-\d{5}$/

function maskDni(dni: string): string {
  if (dni.length < 4) return '****'
  return dni.slice(0, 2) + '*'.repeat(dni.length - 4) + dni.slice(-2)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export async function generateMetadata({ params }: PageParams) {
  const { code } = await params
  return {
    title: `Verificación de certificado ${code} — COMPLY360`,
    description: 'Verificación pública de un certificado de capacitación emitido por COMPLY360.',
    robots: { index: false, follow: false },
  }
}

export default async function VerifyCertificatePage({ params }: PageParams) {
  const { code } = await params

  if (!CODE_RE.test(code)) {
    notFound()
  }

  const cert = await prisma.certificate.findUnique({
    where: { code },
    select: {
      code: true,
      orgId: true,
      workerName: true,
      workerDni: true,
      courseTitle: true,
      courseCategory: true,
      score: true,
      issuedAt: true,
      expiresAt: true,
    },
  })

  if (!cert) {
    return <InvalidPanel code={code} reason="No encontramos este certificado en nuestros registros." />
  }

  const org = await prisma.organization.findUnique({
    where: { id: cert.orgId },
    select: { name: true },
  })

  const expired = cert.expiresAt !== null && cert.expiresAt < new Date()
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.comply360.pe').replace(/\/$/, '')
  const qrImageUrl = `${baseUrl}/api/certificates/${cert.code}/qr`

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6 text-slate-700">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold">COMPLY360 · Verificación pública</span>
        </div>

        {/* Status banner */}
        <div
          className={`rounded-xl border p-5 mb-6 flex items-start gap-4 ${
            expired
              ? 'bg-amber-50 border-amber-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          {expired ? (
            <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <h1 className={`text-xl font-bold ${expired ? 'text-amber-900' : 'text-emerald-900'}`}>
              {expired ? 'Certificado vencido' : 'Certificado válido y auténtico'}
            </h1>
            <p className={`mt-1 text-sm ${expired ? 'text-amber-800' : 'text-emerald-800'}`}>
              {expired
                ? `Este certificado estuvo vigente pero venció el ${formatDate(cert.expiresAt?.toISOString() ?? null)}. El trabajador debe renovar la capacitación.`
                : 'Este certificado fue emitido por COMPLY360 tras la aprobación del examen correspondiente.'}
            </p>
          </div>
        </div>

        {/* Certificate card */}
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
            <div>
              <p className="text-xs uppercase font-semibold text-indigo-700 tracking-wide mb-1">
                {cert.courseCategory}
              </p>
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                {cert.courseTitle}
              </h2>

              <dl className="mt-6 space-y-3 text-sm">
                <Row label="Trabajador">
                  <span className="font-medium text-slate-900">{cert.workerName}</span>
                  {cert.workerDni && (
                    <span className="ml-2 text-slate-500">DNI {maskDni(cert.workerDni)}</span>
                  )}
                </Row>
                <Row label="Empresa">
                  <span className="text-slate-900">{org?.name ?? '—'}</span>
                </Row>
                <Row label="Nota obtenida">
                  <span className="font-semibold text-slate-900">{cert.score}/100</span>
                </Row>
                <Row label="Fecha de emisión">
                  {formatDate(cert.issuedAt.toISOString())}
                </Row>
                <Row label="Vigencia">
                  {cert.expiresAt ? formatDate(cert.expiresAt.toISOString()) : 'Sin vencimiento'}
                </Row>
                <Row label="Código">
                  <code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                    {cert.code}
                  </code>
                </Row>
              </dl>
            </div>

            {/* QR preview — útil para re-escanear / compartir */}
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt={`QR del certificado ${cert.code}`}
                width={160}
                height={160}
                className="rounded-lg border border-slate-200"
              />
              <p className="text-xs text-slate-500 mt-2 text-center max-w-[160px]">
                Escaneá este QR para re-verificar
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          <p>
            Este sello es auténtico y fue emitido por{' '}
            <strong>COMPLY360 — Plataforma de Compliance Laboral Perú</strong>.
          </p>
          <p className="mt-1">
            Validación automática vía Prisma + certificado único e inmutable.
          </p>
        </div>
      </div>
    </main>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-32 text-slate-500 flex-shrink-0">{label}</dt>
      <dd className="flex-1">{children}</dd>
    </div>
  )
}

function InvalidPanel({ code, reason }: { code: string; reason: string }) {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-6 text-slate-700">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold">COMPLY360 · Verificación pública</span>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex items-start gap-4">
          <XCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-red-900">Certificado no válido</h1>
            <p className="mt-1 text-sm text-red-800">{reason}</p>
            <p className="mt-3 text-xs text-red-700">
              Código consultado:{' '}
              <code className="font-mono bg-white px-2 py-0.5 rounded border border-red-200">
                {code}
              </code>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
