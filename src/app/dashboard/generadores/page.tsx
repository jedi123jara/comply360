'use client'

import Link from 'next/link'
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  Scale,
  HardHat,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  GENERATOR_REGISTRY,
  type GeneratorMetadata,
} from '@/lib/generators/types'

/**
 * /dashboard/generadores — Hub de los 15 generadores de documentos compliance.
 * Cada uno produce un documento estructurado conforme a normativa peruana,
 * lo persiste en OrgDocument y ofrece descarga PDF.
 */

const CATEGORY_ICON: Record<GeneratorMetadata['category'], React.ComponentType<{ className?: string }>> = {
  SST: HardHat,
  POLITICAS: Scale,
  DOCUMENTOS: FileText,
  JORNADA: Clock,
}

const CATEGORY_LABEL: Record<GeneratorMetadata['category'], string> = {
  SST: 'Seguridad y Salud',
  POLITICAS: 'Políticas Obligatorias',
  DOCUMENTOS: 'Documentos Corporativos',
  JORNADA: 'Jornada y Exhibidos',
}

const CATEGORIES: Array<GeneratorMetadata['category']> = ['POLITICAS', 'SST', 'DOCUMENTOS', 'JORNADA']

export default function GeneradoresHubPage() {
  const available = GENERATOR_REGISTRY.filter((g) => g.available)
  const pending = GENERATOR_REGISTRY.filter((g) => !g.available)

  return (
    <main className="min-h-[calc(100vh-var(--topbar-height))] text-[color:var(--text-primary)] relative px-4 py-8 sm:px-6 lg:px-12">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200">
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </span>
            <Badge variant="emerald" size="sm" dot>
              Generadores IA
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Generador automático de documentos compliance
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)] max-w-2xl leading-relaxed">
            Elegí el documento, respondé unas preguntas rápidas y COMPLY360 genera la versión
            oficial estructurada según normativa peruana. Todo se guarda en tu legajo.
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <strong>{available.length}</strong> disponibles ahora
            </span>
            <span className="inline-flex items-center gap-1.5 text-[color:var(--text-tertiary)]">
              <Clock className="h-3.5 w-3.5" />
              <strong>{pending.length}</strong> próximamente
            </span>
          </div>
        </div>

        {CATEGORIES.map((cat) => {
          const CatIcon = CATEGORY_ICON[cat]
          const items = GENERATOR_REGISTRY.filter((g) => g.category === cat)
          if (items.length === 0) return null
          return (
            <section key={cat}>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <CatIcon className="h-4 w-4 text-emerald-600" />
                {CATEGORY_LABEL[cat]}
                <span className="text-xs font-normal text-[color:var(--text-tertiary)]">
                  · {items.filter((i) => i.available).length}/{items.length} disponibles
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((gen) => (
                  <GeneratorCard key={gen.slug} gen={gen} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}

/* ── Generator card ───────────────────────────────────────────────── */

function GeneratorCard({ gen }: { gen: GeneratorMetadata }) {
  const gravityClass =
    gen.gravity === 'MUY_GRAVE'
      ? 'bg-crimson-50 text-crimson-700 border-crimson-200'
      : gen.gravity === 'GRAVE'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  const href = gen.available ? `/dashboard/generadores/${gen.slug}` : undefined

  const inner = (
    <Card
      padding="md"
      className={cn(
        'transition-all h-full',
        gen.available
          ? 'hover:border-emerald-300 hover:shadow-md cursor-pointer'
          : 'opacity-60',
      )}
    >
      <CardHeader className="!p-0 !pb-3 !border-none">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0 text-[10px] font-bold uppercase tracking-widest',
                gravityClass,
              )}
            >
              {gen.gravity.replace('_', ' ')}
            </span>
            {gen.available ? (
              <Badge variant="emerald" size="sm">
                Disponible
              </Badge>
            ) : (
              <span className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
                Próximamente
              </span>
            )}
            <span className="text-[10px] text-[color:var(--text-tertiary)] ml-auto">
              ~{gen.estimatedMinutes} min
            </span>
          </div>
          <CardTitle className="text-base">{gen.title}</CardTitle>
          <CardDescription className="mt-1 text-xs leading-relaxed">
            {gen.description}
          </CardDescription>
          <p className="mt-2 text-[10px] font-mono text-[color:var(--text-tertiary)]">
            {gen.baseLegal}
          </p>
        </div>
      </CardHeader>
      <CardContent className="!p-0">
        {gen.available ? (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            Generar con IA
            <ArrowRight className="h-3 w-3" />
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--text-tertiary)]">
            <AlertTriangle className="h-3 w-3" />
            En backlog · próxima sesión
          </span>
        )}
      </CardContent>
    </Card>
  )

  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>
}

// Re-export icons used inline to satisfy eslint no-unused
export { ShieldCheck }
