import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Clock, ArrowRight, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { ARTICLES, getArticleBySlug, getAllSlugs, type BlogBlock } from '@/lib/blog/articles'

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return { title: 'Artículo no encontrado' }

  return {
    title: `${article.title} · COMPLY360`,
    description: article.metaDescription,
    keywords: [article.keyword, 'Perú', 'laboral', 'SUNAFIL'],
    openGraph: {
      title: article.title,
      description: article.metaDescription,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
    },
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  // Related articles (misma categoría, max 3)
  const related = ARTICLES.filter(
    (a) => a.slug !== article.slug && a.category === article.category,
  ).slice(0, 3)

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div
        className="border-b border-gray-100"
        style={{
          background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
        }}
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
          <Link
            href="/recursos"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Todos los recursos
          </Link>

          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-700 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {article.category}
          </div>

          <h1
            className="text-4xl lg:text-5xl text-gray-900"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.1 }}
          >
            {article.title}
          </h1>

          <p className="mt-4 text-base text-gray-600 leading-relaxed">
            {article.metaDescription}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readMinutes} min de lectura
            </span>
            <span>·</span>
            <span>{article.author}</span>
            <span>·</span>
            <span>
              Publicado {new Date(article.publishedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-5 text-gray-800 leading-relaxed">
          {article.content.map((block, i) => (
            <RenderBlock key={i} block={block} />
          ))}
        </div>

        {article.cta ? (
          <div
            className="mt-12 rounded-2xl p-6 lg:p-8 text-center text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #172554 0%, #1e40af 50%, #2563eb 100%)',
            }}
          >
            <Link
              href={article.cta.href}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-all"
            >
              {article.cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </article>

      {/* Related */}
      {related.length > 0 ? (
        <section className="border-t border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
            <h2
              className="text-2xl text-gray-900 mb-6"
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
            >
              Más sobre {article.category}
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/recursos/${r.slug}`}
                  className="group rounded-xl border border-gray-200 bg-white p-5 hover:border-emerald-300 transition-all"
                >
                  <h3
                    className="text-base text-gray-900 mb-2 group-hover:text-emerald-800 transition-colors"
                    style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, lineHeight: 1.3 }}
                  >
                    {r.title}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{r.metaDescription}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="py-10 bg-white border-t border-gray-100 text-center text-xs text-gray-500">
        <p>
          © {new Date().getFullYear()} COMPLY360 ·{' '}
          <Link href="/" className="hover:underline">Home</Link> ·{' '}
          <Link href="/recursos" className="hover:underline">Más recursos</Link>
        </p>
      </footer>
    </main>
  )
}

function RenderBlock({ block }: { block: BlogBlock }) {
  if (block.type === 'p') {
    return <p className="text-base leading-[1.75] text-gray-700">{block.text}</p>
  }
  if (block.type === 'h2') {
    return (
      <h2
        className="text-2xl text-gray-900 mt-8 mb-2"
        style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, letterSpacing: '-0.01em' }}
      >
        {block.text}
      </h2>
    )
  }
  if (block.type === 'h3') {
    return (
      <h3
        className="text-lg text-gray-900 mt-5 mb-1"
        style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
      >
        {block.text}
      </h3>
    )
  }
  if (block.type === 'ul') {
    return (
      <ul className="list-disc list-outside ml-5 space-y-2 text-gray-700 leading-relaxed">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    )
  }
  if (block.type === 'ol') {
    return (
      <ol className="list-decimal list-outside ml-5 space-y-2 text-gray-700 leading-relaxed">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    )
  }
  if (block.type === 'quote') {
    return (
      <blockquote className="border-l-4 border-emerald-500 bg-emerald-50/40 pl-5 py-3 italic text-gray-700">
        &ldquo;{block.text}&rdquo;
        {block.cite ? <cite className="block mt-2 text-xs not-italic text-gray-500">— {block.cite}</cite> : null}
      </blockquote>
    )
  }
  if (block.type === 'callout') {
    const palette = {
      info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Info, iconColor: 'text-blue-600', textColor: 'text-blue-900' },
      warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600', textColor: 'text-amber-900' },
      success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, iconColor: 'text-emerald-600', textColor: 'text-emerald-900' },
    }[block.variant]
    const Icon = palette.icon
    return (
      <div className={`rounded-xl border ${palette.border} ${palette.bg} p-4 flex items-start gap-3`}>
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${palette.iconColor}`} />
        <div className={`text-sm ${palette.textColor} leading-relaxed`}>
          {block.title ? <strong className="block mb-1">{block.title}</strong> : null}
          {block.text}
        </div>
      </div>
    )
  }
  if (block.type === 'code') {
    return (
      <pre className="rounded-xl bg-gray-900 text-gray-100 p-4 text-sm leading-relaxed overflow-x-auto">
        <code className="font-mono">{block.text}</code>
      </pre>
    )
  }
  return null
}
