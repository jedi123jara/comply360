import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Info } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { Breadcrumbs } from '@/components/sitio/breadcrumbs'
import { JsonLd } from '@/components/sitio/json-ld'
import { cn } from '@/lib/utils'
import { ARTICLES, getAllSlugs, getArticleBySlug, type BlogBlock } from '@/lib/blog/articles'
import { articuloLd, construirMetadata } from '@/lib/sitio/seo'

// Solo existen los slugs del catálogo: cualquier otro responde 404 real (no soft 404).
export const dynamicParams = false

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return { title: 'Artículo no encontrado' }

  const base = construirMetadata({
    titulo: article.title,
    descripcion: article.metaDescription,
    ruta: `/recursos/${article.slug}`,
    keywords: [article.keyword, 'Perú', 'SUNAFIL'],
    tipo: 'article',
  })
  return {
    ...base,
    // El título del artículo ya es largo: sin el sufijo de la marca.
    title: { absolute: article.title },
    openGraph: {
      ...base.openGraph,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
    },
  }
}

function fecha(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const ruta = `/recursos/${article.slug}`
  const relacionados = [
    ...ARTICLES.filter((a) => a.slug !== article.slug && a.category === article.category),
    ...ARTICLES.filter((a) => a.slug !== article.slug && a.category !== article.category),
  ].slice(0, 3)

  return (
    <>
      <JsonLd
        data={articuloLd({
          titulo: article.title,
          descripcion: article.metaDescription,
          ruta,
          publicado: article.publishedAt,
          actualizado: article.updatedAt,
        })}
      />
      <PublicHero
        align="left"
        eyebrow={article.category}
        title={article.title}
        description={article.metaDescription}
        media={
          <Breadcrumbs
            items={[
              { nombre: 'Recursos', ruta: '/recursos' },
              { nombre: article.title, ruta },
            ]}
            className="mb-0"
          />
        }
      >
        <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#94A3B8]">
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="h-3.5 w-3.5" /> {article.readMinutes} min de lectura
          </span>
          <span aria-hidden>·</span>
          <span>{article.author}</span>
          <span aria-hidden>·</span>
          <span>Actualizado el {fecha(article.updatedAt)}</span>
        </p>
      </PublicHero>

      <article className="bg-[#ffffff]">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
          <div className="space-y-5">
            {article.content.map((block, i) => (
              <RenderBlock key={i} block={block} />
            ))}
          </div>

          {article.cta ? (
            <div className={cn(pub.band, 'mt-12 p-7 sm:p-8')}>
              <div aria-hidden className={pub.heroGrid} />
              <div className="relative">
                <p className={pub.h2OnNavy}>¿Quieres que lo veamos en tu empresa?</p>
                <p className={cn(pub.leadOnNavy, 'mt-2')}>Te ayudamos a cumplirlo y a dejar la evidencia lista para SUNAFIL.</p>
                <Link href={article.cta.href} className={cn(pub.btnPrimaryLg, 'mt-5')}>
                  {article.cta.label} <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : null}

          <p className={cn(pub.note, 'mt-8')}>
            Este artículo es informativo y no reemplaza una asesoría sobre tu caso. Las normas pueden cambiar: revisa la
            fecha de actualización.
          </p>
        </div>
      </article>

      {relacionados.length > 0 ? (
        <section aria-labelledby="relacionados">
          <div className={cn(pub.container, pub.section)}>
            <h2 id="relacionados" className={pub.h2}>
              Sigue leyendo
            </h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {relacionados.map((r) => (
                <Link key={r.slug} href={`/recursos/${r.slug}`} className={cn(pub.card, pub.cardHover, 'flex flex-col p-5')}>
                  <p className={pub.kicker}>{r.category}</p>
                  <h3 className="mt-2 text-base font-extrabold leading-snug text-[#0B1B36]">{r.title}</h3>
                  <span className={cn(pub.linkMore, 'mt-3 text-sm')}>
                    Leer <ArrowRight aria-hidden className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}

function RenderBlock({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case 'p':
      return <p className="text-[1.05rem] leading-8 text-[#334155]">{block.text}</p>
    case 'h2':
      return <h2 className="pt-6 text-2xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">{block.text}</h2>
    case 'h3':
      return <h3 className="pt-3 text-lg font-bold text-[#0B1B36]">{block.text}</h3>
    case 'ul':
      return (
        <ul className="ml-5 list-outside list-disc space-y-2 text-[1.05rem] leading-8 text-[#334155]">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol className="ml-5 list-outside list-decimal space-y-2 text-[1.05rem] leading-8 text-[#334155]">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      )
    case 'quote':
      return (
        <blockquote className="border-l-4 border-[#F5B301] bg-[#FFF8E6] py-3 pl-5 pr-4 text-[#334155]">
          &ldquo;{block.text}&rdquo;
          {block.cite ? <cite className="mt-2 block text-xs not-italic text-[#5A6A80]">— {block.cite}</cite> : null}
        </blockquote>
      )
    case 'callout': {
      const estilos = {
        info: { caja: 'border-[#2563EB]/25 bg-[#EFF4FF]', icono: Info, color: 'text-[#2563EB]' },
        warning: { caja: 'border-[#F5B301]/45 bg-[#FFF8E6]', icono: AlertTriangle, color: 'text-[#B45309]' },
        success: { caja: 'border-[#15803D]/25 bg-[#F0FDF4]', icono: CheckCircle2, color: 'text-[#15803D]' },
      }[block.variant]
      const Icono = estilos.icono
      return (
        <div className={cn('flex items-start gap-3 rounded-xl border p-4', estilos.caja)}>
          <Icono aria-hidden className={cn('mt-0.5 h-5 w-5 shrink-0', estilos.color)} />
          <div className="text-sm leading-6 text-[#0B1B36]">
            {block.title ? <strong className="mb-1 block">{block.title}</strong> : null}
            {block.text}
          </div>
        </div>
      )
    }
    case 'code':
      return (
        <pre className="overflow-x-auto rounded-xl bg-[#0B1B36] p-4 text-sm leading-relaxed text-[#E2E8F0]">
          <code className="font-mono">{block.text}</code>
        </pre>
      )
    default:
      return null
  }
}
