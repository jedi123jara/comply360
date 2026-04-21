'use client'

import { useState, useEffect } from 'react'
import { Award, Shield, QrCode, Share2, CheckCircle2, Circle, Crown, ExternalLink, Calendar, Clock, Star, BadgeCheck, Copy, Loader2, RefreshCw } from 'lucide-react'

// Real API types (matching /api/certification response)
interface CriterionResult {
  id: string
  label: string
  description: string
  required: boolean
  met: boolean
  value: string | number | null
  threshold: string | number
}

interface CertificateData {
  id: string
  orgId: string
  orgName: string
  issuedAt: string
  validUntil: string
  scoreGlobal: number
  verificationCode: string
  verificationUrl: string
  seal: 'GOLD' | 'SILVER' | 'BRONZE'
}

interface CertApiResponse {
  certified: boolean
  score: number
  criteria: CriterionResult[]
  certificate?: CertificateData
}

const SEAL_LABELS: Record<string, string> = { GOLD: 'Oro', SILVER: 'Plata', BRONZE: 'Bronce' }
const SEAL_COLORS: Record<string, string> = {
  GOLD: 'from-yellow-300 via-amber-400 to-yellow-600',
  SILVER: 'from-slate-300 via-gray-400 to-slate-500',
  BRONZE: 'from-orange-300 via-amber-600 to-orange-800',
}

const benefits = [
  {
    icon: Shield,
    title: 'Reducción de multas SUNAFIL',
    desc: 'Hasta 90% de reducción en multas por subsanación voluntaria acreditada.',
  },
  {
    icon: BadgeCheck,
    title: 'Sello verificable',
    desc: 'Sello digital verificable por clientes, proveedores y entidades públicas.',
  },
  {
    icon: Star,
    title: 'Red de Empresas Cumplidoras',
    desc: 'Acceso exclusivo a la red de empresas con certificación COMPLY 360.',
  },
  {
    icon: Crown,
    title: 'Prioridad en licitaciones',
    desc: 'Ventaja competitiva en procesos de licitación y contratación pública.',
  },
  {
    icon: Award,
    title: 'Benchmark sectorial',
    desc: 'Compara tu desempeño con otras empresas certificadas de tu sector.',
  },
]


export default function CertificacionPage() {
  const [certData, setCertData] = useState<CertApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)

  const loadCertStatus = () => {
    setLoading(true)
    fetch('/api/certification')
      .then(res => res.json())
      .then((data: CertApiResponse) => setCertData(data))
      .catch(() => {/* silent */})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCertStatus() }, [])

  const handleSolicitarCertificacion = async () => {
    setIssuing(true)
    try {
      const res = await fetch('/api/certification', { method: 'POST' })
      const data = await res.json() as CertApiResponse
      setCertData(data)
    } catch { /* silent */ }
    finally { setIssuing(false) }
  }

  const isCertified = certData?.certified ?? false
  const criteria = certData?.criteria ?? []
  const certificate = certData?.certificate
  const metCount = criteria.filter(c => c.met).length
  const verifyUrl = certificate?.verificationUrl ?? ''
  const certNumber = certificate?.verificationCode ?? ''
  const sealLevel = certificate?.seal ?? 'BRONZE'

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(verifyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyEmbed = () => {
    const embed = `<a href="${verifyUrl}" target="_blank"><img src="https://comply360.pe/sello/${certNumber}.svg" alt="COMPLY360 Certificado" width="180" /></a>`
    navigator.clipboard.writeText(embed)
    setCopiedEmbed(true)
    setTimeout(() => setCopiedEmbed(false), 2000)
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Award className="h-7 w-7 text-yellow-500" />
          Certificación COMPLY 360
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Sello verificable de cumplimiento laboral para tu empresa.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verificando estado de certificación...
        </div>
      )}

      {/* Hero Section */}
      {!loading && isCertified && certificate ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 p-px">
          <div className="rounded-[15px] bg-white bg-gray-900 p-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Badge */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className={`relative w-48 h-48 rounded-full bg-gradient-to-br ${SEAL_COLORS[sealLevel]} flex items-center justify-center shadow-xl shadow-amber-200/40 shadow-amber-900/30`}>
                  <div className="w-40 h-40 rounded-full bg-white bg-gray-900 flex flex-col items-center justify-center">
                    <Crown className="h-10 w-10 text-amber-500 mb-1" />
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Nivel {SEAL_LABELS[sealLevel]}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      COMPLY 360
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm font-mono font-semibold text-[color:var(--text-secondary)]">
                  {certNumber}
                </p>
              </div>

              {/* Info */}
              <div className="flex-1 text-center lg:text-left space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Empresa Certificada — {certificate.orgName}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Score de compliance: <strong>{certificate.scoreGlobal}%</strong> — Tu empresa cumple con los estándares COMPLY360.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-[color:var(--text-secondary)]">
                    <Calendar className="h-4 w-4" />
                    Emitida: {new Date(certificate.issuedAt).toLocaleDateString('es-PE')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[color:var(--text-secondary)]">
                    <Clock className="h-4 w-4" />
                    Válida hasta: {new Date(certificate.validUntil).toLocaleDateString('es-PE')}
                  </span>
                </div>

                <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                  <button
                    onClick={handleSolicitarCertificacion}
                    disabled={issuing}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Renovar Certificado
                  </button>
                  <button
                    onClick={handleCopyEmbed}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 border-gray-600 bg-white bg-gray-800 text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] hover:bg-gray-700 px-4 py-2 text-sm font-medium transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    {copiedEmbed ? 'Copiado!' : 'Compartir Sello'}
                  </button>
                </div>
              </div>

              {/* QR placeholder */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-white/10 border-gray-600 flex items-center justify-center bg-[color:var(--neutral-50)] bg-gray-800">
                  <QrCode className="h-16 w-16 text-gray-500" />
                </div>
                <span className="text-xs text-gray-500">QR de verificación</span>
              </div>
            </div>
          </div>
        </div>
      ) : !loading ? (
        <div className="rounded-2xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-8 text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-[color:var(--neutral-100)] bg-gray-800 flex items-center justify-center">
            <Shield className="h-10 w-10 text-gray-500" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Aún no estás certificado
          </h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Completa todos los requisitos para obtener tu sello COMPLY360.
            Llevas {metCount}/{criteria.length} requisitos cumplidos.
          </p>
          <div className="w-full max-w-xs mx-auto bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-amber-500 h-2.5 rounded-full transition-all"
              style={{ width: `${criteria.length ? (metCount / criteria.length) * 100 : 0}%` }}
            />
          </div>
          {criteria.length > 0 && metCount === criteria.length && (
            <button
              onClick={handleSolicitarCertificacion}
              disabled={issuing}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 mx-auto"
            >
              {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
              Solicitar Certificación
            </button>
          )}
        </div>
      ) : null}

      {/* Certification Requirements */}
      {criteria.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Requisitos de Certificación
            </h3>
            <button
              onClick={loadCertStatus}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Actualizar
            </button>
          </div>
          <p className="text-sm text-gray-400 mb-5">
            Estado: <span className="font-semibold text-[color:var(--text-secondary)]">{metCount}/{criteria.length} requisitos cumplidos</span>
          </p>

          <ul className="space-y-3">
            {criteria.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-3 rounded-lg border border-white/[0.06] border-gray-800 bg-[color:var(--neutral-50)] bg-gray-800/50 p-3"
              >
                {c.met ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <span className={`text-sm font-medium ${c.met ? 'text-[color:var(--text-secondary)]' : 'text-gray-400'}`}>
                    {c.label}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    {c.value !== null ? `(actual: ${c.value}` : '('}umbral: {c.threshold})
                  </span>
                  {!c.met && (
                    <p className="mt-0.5 text-xs text-amber-400">{c.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {!isCertified && metCount === criteria.length && (
            <div className="mt-4 text-center">
              <button
                onClick={handleSolicitarCertificacion}
                disabled={issuing}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 text-sm font-medium transition-colors disabled:opacity-60"
              >
                {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                Emitir Certificado
              </button>
            </div>
          )}
        </div>
      )}

      {/* Certification Details */}
      {isCertified && certificate && (
        <div className="rounded-2xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-amber-500" />
            Detalles del Certificado
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Código de Verificación', value: certificate.verificationCode },
              { label: 'Emitida', value: new Date(certificate.issuedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) },
              { label: 'Válida hasta', value: new Date(certificate.validUntil).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) },
              { label: 'Nivel', value: SEAL_LABELS[certificate.seal] },
              { label: 'Score de Compliance', value: `${certificate.scoreGlobal}%` },
              { label: 'Estado', value: new Date(certificate.validUntil) > new Date() ? 'Vigente' : 'Vencido' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-white/[0.06] border-gray-800 bg-[color:var(--neutral-50)] bg-gray-800/50 p-4"
              >
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-[color:var(--text-secondary)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Public Verification */}
      {isCertified && certificate && (
        <div className="rounded-2xl border border-amber-800/50 bg-amber-950/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-amber-500" />
            Verificación Pública
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Cualquier persona puede verificar tu certificación escaneando el QR o visitando este enlace.
            El enlace también está disponible en <code className="text-xs bg-amber-900/40 px-1 rounded">/api/certification/verify?code={certificate.verificationCode}</code>
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 rounded-lg border border-amber-800 bg-white bg-gray-900 px-4 py-2.5 font-mono text-sm text-[color:var(--text-secondary)] truncate">
              {verifyUrl}
            </div>
            <button
              onClick={handleCopyUrl}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 text-sm font-medium transition-colors flex-shrink-0"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copiado!' : 'Copiar URL'}
            </button>
          </div>
        </div>
      )}

      {/* Benefits */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          Beneficios de la Certificación
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-5 hover:shadow-md hover:shadow-gray-800/40 transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center mb-3">
                <b.icon className="h-5 w-5 text-amber-400" />
              </div>
              <h4 className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">
                {b.title}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Certification History */}
      <div className="rounded-2xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          Historial de Certificaciones
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] border-gray-700">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Número
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Nivel
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Período
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 divide-gray-800">
              {certificate ? (
                <tr className="hover:bg-[color:var(--neutral-50)] hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-[color:var(--text-secondary)]">
                    {certificate.verificationCode}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400">
                      <Crown className="h-3 w-3" />
                      {SEAL_LABELS[certificate.seal]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {new Date(certificate.issuedAt).toLocaleDateString('es-PE')} — {new Date(certificate.validUntil).toLocaleDateString('es-PE')}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                      new Date(certificate.validUntil) > new Date()
                        ? 'bg-emerald-100 text-emerald-700 bg-emerald-900/30 text-emerald-600'
                        : 'bg-red-100 text-red-600 bg-red-900/30 text-red-400'
                    }`}>
                      {new Date(certificate.validUntil) > new Date() ? 'Vigente' : 'Vencido'}
                    </span>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-gray-500">
                    Sin certificaciones emitidas aún. Cumple todos los requisitos y solicita tu sello.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
