/**
 * /mi-portal/capacitaciones/[enrollmentId]/certificado
 *
 * Vista del certificado ganado por el trabajador tras aprobar una capacitación.
 * Muestra:
 *  - Datos del certificado con QR de verificación pública
 *  - Botón imprimir (print stylesheet friendly)
 *  - Botón compartir por WhatsApp con el link de verificación
 *
 * El QR apunta a `/verify/[code]` (página pública construida en sprints anteriores).
 * El PNG del QR se genera on-demand en `/api/certificates/[code]/qr`.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Award, CalendarDays, ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { formatLongDate } from '@/lib/format/peruvian'
import { PrintShareButtons } from './print-share-buttons'

interface PageParams {
  params: Promise<{ enrollmentId: string }>
}

export default async function CertificadoPage({ params }: PageParams) {
  const { enrollmentId } = await params

  const ctx = await getAuthContext()
  if (!ctx) notFound()

  // Resolver worker del user logueado (1-1 cuando activa portal)
  const worker = await prisma.worker.findFirst({
    where: { userId: ctx.userId },
    select: { id: true, orgId: true },
  })
  if (!worker) notFound()

  // Verificar que la enrollment pertenece al worker + está PASSED
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      workerId: worker.id,
      orgId: worker.orgId,
      status: 'PASSED',
    },
    include: {
      certificate: true,
      course: { select: { title: true, category: true } },
    },
  })

  if (!enrollment || !enrollment.certificate) {
    notFound()
  }

  const cert = enrollment.certificate
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.comply360.pe').replace(/\/$/, '')
  const verifyUrl = `${baseUrl}/verify/${cert.code}`
  const qrUrl = `${baseUrl}/api/certificates/${cert.code}/qr`

  return (
    <div className="space-y-5">
      <Link
        href="/mi-portal/capacitaciones"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 print:hidden"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a capacitaciones
      </Link>

      {/* Certificado visual — pensado para imprimir en A4 horizontal */}
      <div
        className="bg-white border-[6px] border-emerald-700 rounded-lg p-8 sm:p-12 shadow-sm print:shadow-none print:border-black"
        id="certificate-card"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="w-6 h-6" />
            <span className="font-bold text-sm tracking-wider uppercase">COMPLY360</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">{cert.code}</span>
        </div>

        <div className="text-center mt-6 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
            <Award className="w-8 h-8 text-emerald-700" />
          </div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Certificado de Aprovechamiento</p>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-slate-900 leading-tight mb-4">
            {cert.workerName}
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            ha completado y aprobado satisfactoriamente la capacitación de
          </p>
          <p className="text-lg sm:text-xl font-semibold text-emerald-900 mt-3">
            {cert.courseTitle}
          </p>
          <p className="text-xs uppercase tracking-wider text-emerald-700 mt-1">
            {cert.courseCategory}
          </p>
          <p className="text-base text-slate-700 mt-4">
            con una nota de <strong className="text-emerald-800">{cert.score}/100</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 items-end border-t border-slate-200 pt-6 mt-6">
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <span>Emitido el <strong>{formatLongDate(cert.issuedAt)}</strong></span>
            </div>
            {cert.expiresAt && (
              <div className="flex items-center gap-2 text-slate-700">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                <span>Vence el <strong>{formatLongDate(cert.expiresAt)}</strong></span>
              </div>
            )}
            <p className="text-[11px] text-slate-500 pt-2 leading-relaxed max-w-sm">
              Escanea el QR o entra a <br className="sm:hidden" />
              <span className="font-mono text-[10px]">{verifyUrl}</span> para verificar la autenticidad.
            </p>
          </div>

          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt={`QR del certificado ${cert.code}`}
              width={140}
              height={140}
              className="rounded-lg border border-slate-200"
            />
            <p className="text-[10px] text-slate-500 mt-1.5">Verificación pública</p>
          </div>
        </div>
      </div>

      {/* Acciones (ocultas al imprimir) */}
      <div className="print:hidden">
        <PrintShareButtons
          verifyUrl={verifyUrl}
          workerName={cert.workerName}
          courseTitle={cert.courseTitle}
        />
      </div>
    </div>
  )
}
