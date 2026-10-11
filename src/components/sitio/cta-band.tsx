import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pub } from '@/components/marketing/public-theme'
import { CTA, whatsappHref } from '@/lib/sitio/site'

/**
 * Banda final azul marino con el llamado principal (diagnóstico gratis) y uno
 * secundario (WhatsApp si está configurado; si no, contacto).
 */
export function CtaBand({
  titulo = '¿Tu empresa está lista para una inspección?',
  texto = 'Haz el diagnóstico gratis: en minutos sabes qué te falta y cuánto arriesgas. Si quieres, lo revisamos contigo en una llamada de 30 minutos.',
  mensajeWhatsapp = 'Hola, quiero información sobre los servicios de Comply360.',
  className,
}: {
  titulo?: string
  texto?: string
  mensajeWhatsapp?: string
  className?: string
}) {
  const wa = whatsappHref(mensajeWhatsapp)
  return (
    <section className={cn(pub.container, 'py-12 sm:py-16', className)}>
      <div className={cn(pub.band, 'p-7 sm:p-10')}>
        <div aria-hidden className={pub.heroGrid} />
        <div className="relative max-w-2xl">
          <h2 className={pub.h2OnNavy}>{titulo}</h2>
          <p className={cn(pub.leadOnNavy, 'mt-3')}>{texto}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={CTA.diagnostico.href} className={pub.btnPrimaryLg}>
              {CTA.diagnostico.label} <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
                <MessageCircle aria-hidden className="h-4 w-4" />
                Escríbenos por WhatsApp
              </a>
            ) : (
              <Link href={CTA.contacto.href} className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
                {CTA.contacto.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
