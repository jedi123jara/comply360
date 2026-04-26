'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import { ArrowRight, Check, Shield, Sparkles, ChevronRight } from 'lucide-react'
import { track } from '@/lib/analytics'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '51999999999'

/**
 * Landing /contadores — canal partner estratégico.
 *
 * Value prop: el contador peruano atiende 10-30 empresas. Si lo convertimos en
 * "super-admin" con dashboard consolidado multi-empresa + comisión 25% año 1,
 * escala la adquisición 30× vs vender 1-on-1 a MYPEs.
 */
export default function ContadoresLandingPage() {
  const onCtaClick = useCallback((cta: string) => {
    track('landing_cta_clicked', { cta: `contadores_${cta}` })
  }, [])

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    'Hola, soy contador y me interesa el programa de Partners de Comply360 con comisión 25%.',
  )}`

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* ── Navbar minimal ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition-transform group-hover:scale-105"
              style={{
                background: 'linear-gradient(165deg, #059669 0%, #047857 55%, #065f46 100%)',
                boxShadow: '0 1px 2px rgba(4,120,87,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              <Shield className="h-4.5 w-4.5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Comply<span className="text-emerald-700">360</span>
            </span>
          </Link>
          <Link
            href={whatsappHref}
            target="_blank"
            onClick={() => onCtaClick('nav_whatsapp')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
          >
            Postular como partner
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-24"
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.97) 100%), linear-gradient(135deg, #ecfdf5 0%, #f8fafc 55%, #fefce8 100%)',
        }}
      >
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl bg-emerald-200/40" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-7">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Programa Partners · Comisión 25%
            </span>
          </div>

          <h1
            className="text-5xl lg:text-6xl text-gray-900 mb-6"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
            }}
          >
            Eres contador.{' '}
            <em className="text-emerald-700 italic">Multiplicá tu cartera</em>
            <br />
            sin contratar a nadie.
          </h1>

          <p className="text-xl text-gray-600 leading-relaxed mb-8 max-w-2xl mx-auto">
            Atendé 30 empresas en Comply360 con <strong>un solo login</strong>,
            cobrá <strong>25% de comisión</strong> durante el primer año por cada
            empresa que migre, y deja de pelear con planillas en Excel.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center mb-10">
            <Link
              href={whatsappHref}
              target="_blank"
              onClick={() => onCtaClick('hero_whatsapp')}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-600 text-white font-semibold text-base transition-all hover:bg-emerald-700"
              style={{
                boxShadow: '0 10px 30px -8px rgba(4,120,87,0.45), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
            >
              Postular en 2 minutos por WhatsApp
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/diagnostico-gratis"
              onClick={() => onCtaClick('hero_diagnostic')}
              className="group inline-flex items-center gap-2 px-6 py-4 rounded-xl border border-emerald-200 bg-white text-emerald-700 font-semibold text-sm hover:border-emerald-500 hover:bg-emerald-50 transition-all"
            >
              Probar el producto primero
            </Link>
          </div>

          <p className="text-xs text-gray-400">
            Programa exclusivo para contadores titulados colegiados en CCPL · Requiere
            portafolio ≥5 empresas MYPE.
          </p>
        </div>
      </section>

      {/* ── Stats: el tamaño del mercado ──────────────────────────── */}
      <section className="py-16 lg:py-20 bg-emerald-900 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-3">
              El mercado peruano
            </p>
            <h2
              className="text-3xl lg:text-4xl"
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.02em' }}
            >
              12,000 contadores + 99% de las empresas son MYPE
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: '12,000+', label: 'Contadores colegiados CCPL' },
              { value: '99%', label: 'Empresas peruanas son MYPE' },
              { value: '30×', label: 'Promedio de empresas por contador' },
              { value: '+30%', label: 'Fiscalizaciones SUNAFIL en 2026' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className="text-4xl lg:text-5xl mb-2 text-emerald-300"
                  style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
                >
                  {s.value}
                </div>
                <p className="text-sm text-emerald-100/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ─────────────────────────────────────────── */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3">
              Programa de Partners
            </p>
            <h2
              className="text-3xl lg:text-4xl text-gray-900 mb-4"
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.02em' }}
            >
              Cómo funciona en 4 pasos
            </h2>
          </div>
          <ol className="space-y-6">
            {[
              {
                n: '1',
                title: 'Postulas en 2 minutos',
                desc: 'Nos escribes por WhatsApp con tu número de colegiatura CCPL + cantidad aproximada de empresas en cartera. Verificamos en 24h.',
              },
              {
                n: '2',
                title: 'Te damos una cuenta Partner',
                desc: 'Dashboard consolidado multi-empresa. Desde un solo login gestionas el compliance de las 30+ empresas de tu cartera. Tus clientes ven solo su data.',
              },
              {
                n: '3',
                title: 'Migrás tus empresas una por una',
                desc: 'Te acompañamos con un CSM dedicado. Importamos trabajadores desde tu Excel o del sistema actual. Ellos pagan su plan directamente a Comply360.',
              },
              {
                n: '4',
                title: 'Cobras 25% cada mes del primer año',
                desc: 'Pagamos tu comisión el día 5 de cada mes por transferencia bancaria. 25% año 1, 15% años siguientes, mientras la empresa siga activa.',
              },
            ].map((step) => (
              <li
                key={step.n}
                className="flex gap-5 items-start bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white font-bold text-lg"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  }}
                >
                  {step.n}
                </div>
                <div>
                  <h3
                    className="text-xl text-gray-900 mb-1.5"
                    style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Economics ─────────────────────────────────────────────── */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-white to-emerald-50/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3">
              Las cuentas
            </p>
            <h2
              className="text-3xl lg:text-4xl text-gray-900 mb-4"
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.02em' }}
            >
              Con 20 empresas en plan Empresa…
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-emerald-200 bg-white p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">
                Tus ingresos pasivos
              </p>
              <div
                className="text-5xl text-emerald-700 mb-2"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.02em' }}
              >
                S/ 1,495
                <span className="text-lg text-gray-500">/mes</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">20 × S/349 × 25%</p>
              <ul className="space-y-2 text-sm">
                {[
                  'Sin hacer horas extra',
                  'Sin contratar personal',
                  'Sin cambiar de software',
                  'Mientras las empresas sigan activas',
                ].map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-gray-700">{x}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-gray-500 border-t pt-3">
                Anualizado: <strong>S/ 17,940</strong> adicionales sin mover tu actual estructura.
              </p>
            </div>

            <div
              className="rounded-2xl p-8 text-white"
              style={{
                background: 'linear-gradient(135deg, #065f46 0%, #047857 45%, #10b981 100%)',
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-2">
                Lo que tú ganas además
              </p>
              <div
                className="text-3xl mb-3 text-white"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.02em' }}
              >
                Menos horas en planillas
              </div>
              <p className="text-sm text-emerald-100 mb-5 leading-relaxed">
                Calculadoras automáticas, PDFs listos, firma biométrica del trabajador. Lo que te lleva 3 días/mes en Excel, en Comply360 son 20 minutos por empresa.
              </p>
              <ul className="space-y-2 text-sm">
                {[
                  'Tiempo liberado → más clientes',
                  'Menos errores humanos en cálculos',
                  'Audit trail ante SUNAFIL',
                  'Tus clientes ven un estudio moderno',
                ].map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-300 shrink-0" />
                    <span className="text-white/90">{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2
            className="text-3xl text-gray-900 mb-10 text-center"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            Preguntas frecuentes
          </h2>
          <div className="space-y-4">
            {[
              {
                q: '¿Quién factura a mis clientes?',
                a: 'Comply360 factura directo a cada empresa. Tú recibes tu comisión el día 5 de cada mes por transferencia bancaria o Yape/Plin. No tienes que intermediar facturación.',
              },
              {
                q: '¿Mis clientes saben que cobras comisión?',
                a: 'Depende de ti. Por defecto, Comply360 no comparte tu relación de partnership con ellos. Si quieres presentarte como "tu contador asesor técnico Comply360 certificado", te damos materiales.',
              },
              {
                q: '¿Puedo seguir usando mi sistema actual?',
                a: 'Sí. Comply360 es complementario. Nos enfocamos en compliance (SUNAFIL, contratos, legajo, SST, denuncias). Tú sigues haciendo la planilla mensual donde quieras — pero puedes exportarla directo a Comply360 para firma biométrica + audit trail.',
              },
              {
                q: '¿Qué pasa si una empresa cancela?',
                a: 'La comisión se corta el mes siguiente. No hay penalizaciones ni clawbacks.',
              },
              {
                q: '¿Hay cupo limitado?',
                a: 'Sí. Limitamos el programa a 100 contadores partner en la fase inicial para asegurar calidad del onboarding. Al cierre del cupo, pasamos a whitelist.',
              },
            ].map((f) => (
              <details
                key={f.q}
                className="group border border-gray-200 rounded-xl p-5 hover:border-emerald-300 transition-colors bg-white"
              >
                <summary className="cursor-pointer flex items-center justify-between font-semibold text-gray-900 text-base">
                  {f.q}
                  <ChevronRight className="h-5 w-5 text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────────── */}
      <section
        className="py-20 lg:py-28 text-white text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2
            className="text-4xl lg:text-5xl mb-6"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            ¿Empezamos?
          </h2>
          <p className="text-lg text-emerald-100 mb-8 max-w-xl mx-auto">
            Postulate en 2 minutos por WhatsApp. Respondemos en 24 horas hábiles.
          </p>
          <Link
            href={whatsappHref}
            target="_blank"
            onClick={() => onCtaClick('final_whatsapp')}
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-emerald-700 font-semibold text-base hover:bg-emerald-50 transition-all"
          >
            Enviar postulación
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <footer className="py-10 bg-white border-t border-gray-100 text-center text-xs text-gray-500">
        <p>
          © {new Date().getFullYear()} COMPLY360 ·{' '}
          <Link href="/" className="hover:underline">Home</Link> ·{' '}
          <Link href="/terminos" className="hover:underline">Términos</Link> ·{' '}
          <Link href="/privacidad" className="hover:underline">Privacidad</Link>
        </p>
      </footer>
    </main>
  )
}

export const dynamic = 'force-static'
