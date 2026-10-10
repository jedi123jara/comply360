'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pub } from '@/components/marketing/public-theme'

export const INTERESES = [
  { value: 'diagnostico', label: 'Diagnóstico de cumplimiento' },
  { value: 'implementacion', label: 'Implementación (laboral, SST u hostigamiento)' },
  { value: 'iguala', label: 'Iguala mensual' },
  { value: 'capacitaciones', label: 'Capacitaciones o Plan Anual' },
  { value: 'defensa', label: 'Tengo una inspección de SUNAFIL' },
  { value: 'contadores', label: 'Programa para contadores' },
  { value: 'otro', label: 'Otro' },
] as const

const TAMANOS = ['1 a 10', '11 a 19', '20 a 50', '51 a 100', '101 a 250', 'Más de 250'] as const

type Estado = 'idle' | 'enviando' | 'enviado' | 'error'

/**
 * Formulario de contacto. Envía a /api/leads (mismo endpoint del diagnóstico)
 * con los campos de contacto. Incluye un campo trampa oculto contra bots.
 */
export function ContactForm({
  origen,
  interesInicial,
  source = 'LANDING_PAGE',
  boton = 'Enviar consulta',
}: {
  origen: string
  interesInicial?: string
  source?: 'LANDING_PAGE' | 'REFERRAL'
  boton?: string
}) {
  const inicial = INTERESES.some((i) => i.value === interesInicial) ? interesInicial : 'diagnostico'
  const [estado, setEstado] = useState<Estado>('idle')
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setEstado('enviando')
    setError(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: String(form.get('email') ?? ''),
          name: String(form.get('nombre') ?? ''),
          companyName: String(form.get('empresa') ?? ''),
          phone: String(form.get('telefono') ?? ''),
          companySize: String(form.get('trabajadores') ?? ''),
          interest: String(form.get('interes') ?? ''),
          message: String(form.get('mensaje') ?? ''),
          website: String(form.get('website') ?? ''),
          source,
          origen,
        }),
      })
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No pudimos enviar tu consulta. Inténtalo de nuevo.')
      }
      setNombre(String(form.get('nombre') ?? ''))
      setEstado('enviado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar tu consulta.')
      setEstado('error')
    }
  }

  if (estado === 'enviado') {
    return (
      <div className={cn(pub.card, 'p-6 sm:p-8')} role="status">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#15803D]">
            <CheckCircle2 aria-hidden className="h-5 w-5 text-[#ffffff]" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">
              Gracias{nombre ? `, ${nombre.split(' ')[0]}` : ''}. Recibimos tu consulta.
            </h2>
            <p className={cn(pub.body, 'mt-1')}>
              Te escribiremos pronto al correo que dejaste. Mientras tanto, puedes adelantar el diagnóstico gratis.
            </p>
            <Link href="/diagnostico-gratis" className={cn(pub.btnPrimary, 'mt-4')}>
              Hacer el diagnóstico gratis <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const enviando = estado === 'enviando'

  return (
    <form onSubmit={onSubmit} className={cn(pub.card, 'relative grid gap-4 p-6 sm:grid-cols-2 sm:p-8')}>
      <div className="sm:col-span-1">
        <label htmlFor={`${origen}-nombre`} className={pub.label}>
          Nombre
        </label>
        <input id={`${origen}-nombre`} name="nombre" required maxLength={120} autoComplete="name" className={cn(pub.input, 'px-3')} />
      </div>
      <div className="sm:col-span-1">
        <label htmlFor={`${origen}-email`} className={pub.label}>
          Correo
        </label>
        <input
          id={`${origen}-email`}
          name="email"
          type="email"
          required
          maxLength={160}
          autoComplete="email"
          placeholder="tu@empresa.pe"
          className={cn(pub.input, 'px-3')}
        />
      </div>
      <div>
        <label htmlFor={`${origen}-empresa`} className={pub.label}>
          Empresa
        </label>
        <input id={`${origen}-empresa`} name="empresa" maxLength={160} autoComplete="organization" className={cn(pub.input, 'px-3')} />
      </div>
      <div>
        <label htmlFor={`${origen}-telefono`} className={pub.label}>
          Teléfono o WhatsApp <span className="font-normal text-[#5A6A80]">(opcional)</span>
        </label>
        <input id={`${origen}-telefono`} name="telefono" type="tel" maxLength={30} autoComplete="tel" className={cn(pub.input, 'px-3')} />
      </div>
      <div>
        <label htmlFor={`${origen}-trabajadores`} className={pub.label}>
          Número de trabajadores
        </label>
        <select id={`${origen}-trabajadores`} name="trabajadores" defaultValue="20 a 50" className={cn(pub.input, 'px-3')}>
          {TAMANOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${origen}-interes`} className={pub.label}>
          ¿Qué necesitas?
        </label>
        <select id={`${origen}-interes`} name="interes" defaultValue={inicial} className={cn(pub.input, 'px-3')}>
          {INTERESES.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${origen}-mensaje`} className={pub.label}>
          Cuéntanos tu caso <span className="font-normal text-[#5A6A80]">(opcional)</span>
        </label>
        <textarea id={`${origen}-mensaje`} name="mensaje" rows={4} maxLength={2000} className={cn(pub.input, 'px-3')} />
      </div>
      {/* Campo trampa: invisible para personas; los bots lo llenan. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${origen}-website`}>No llenar</label>
        <input id={`${origen}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="flex items-start gap-2.5 text-sm text-[#475569] sm:col-span-2">
        <input type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-[#2563EB]" />
        <span>
          Acepto la{' '}
          <Link href="/privacidad" className={pub.link}>
            política de privacidad
          </Link>{' '}
          y que Comply360 me contacte para responder esta consulta.
        </span>
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={enviando} className={cn(pub.btnPrimaryLg, 'w-full sm:w-auto')}>
          {enviando ? (
            <>
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Enviando...
            </>
          ) : (
            <>
              {boton} <ArrowRight aria-hidden className="h-4 w-4" />
            </>
          )}
        </button>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-[#B91C1C]">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  )
}
