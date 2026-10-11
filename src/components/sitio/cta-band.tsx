import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pub } from '@/components/marketing/public-theme'
import { CTA, whatsappHref } from '@/lib/sitio/site'
import { EtiquetaSeccion, tituloSeccion } from './editorial'

/**
 * Banda final azul marino a todo el ancho: llamado principal (diagnóstico
 * gratis) y uno secundario (WhatsApp si está configurado; si no, contacto).
 */
export function CtaBand({
  titulo = '¿Tu empresa está lista para una inspección?',
  texto = 'Haz el diagnóstico gratis y en minutos sabrás qué te falta y cuánto arriesgas. Si quieres, lo revisamos contigo en una llamada de 30 minutos.',
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
    <section className={cn('bg-[#0B1B36] text-[#ffffff]', className)} aria-label="Siguiente paso">
      <div className={cn(pub.container, 'grid gap-10 py-20 sm:py-24 lg:grid-cols-12 lg:items-end lg:gap-x-10')}>
        <div className="lg:col-span-8">
          <EtiquetaSeccion oscuro className="mb-6">
            Siguiente paso
          </EtiquetaSeccion>
          <h2 className={cn(tituloSeccion, 'text-[#ffffff]')}>{titulo}</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#CBD5E1]">{texto}</p>
        </div>
        <div className="flex flex-col gap-3 lg:col-span-4 lg:items-stretch">
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
    </section>
  )
}
