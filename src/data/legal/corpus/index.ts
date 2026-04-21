/**
 * Corpus legal peruano — índice RAG.
 *
 * Fuente: "08 Informes explicativos" del pack Compensaciones 30°.
 * Los archivos .md viven en este mismo directorio.
 *
 * Generado por scripts/ingest/ingest-corpus.mjs.
 * NO EDITAR — regenerar con: `node scripts/ingest/ingest-corpus.mjs`.
 *
 * Total: 9 documentos · 145 páginas · 432kb.
 */

export interface CorpusDocument {
  slug: string
  title: string
  /** Categoría temática (remuneraciones, cese, sst, inspecciones, ...). */
  topic: string
  /** Base legal principal referenciada. */
  legalRef: string | null
  /** Páginas del PDF original. */
  pages: number
  /** Bytes del archivo .md emitido. */
  bytes: number
  /** Nombre del archivo relativo a este directorio. */
  file: string
}

export const CORPUS_DOCUMENTS: readonly CorpusDocument[] = [
  {
    "slug": "remuneraciones",
    "title": "Las remuneraciones",
    "topic": "remuneraciones",
    "legalRef": "D.Leg. 728, art. 6",
    "pages": 26,
    "bytes": 62944,
    "file": "remuneraciones.md"
  },
  {
    "slug": "ingresos-no-remunerativos",
    "title": "Ingresos no remunerativos",
    "topic": "remuneraciones",
    "legalRef": "D.Leg. 650, art. 19-20",
    "pages": 20,
    "bytes": 48820,
    "file": "ingresos-no-remunerativos.md"
  },
  {
    "slug": "remuneraciones-especiales",
    "title": "Remuneraciones especiales",
    "topic": "remuneraciones",
    "legalRef": null,
    "pages": 15,
    "bytes": 43530,
    "file": "remuneraciones-especiales.md"
  },
  {
    "slug": "prestaciones-alimentarias",
    "title": "Prestaciones alimentarias",
    "topic": "remuneraciones",
    "legalRef": "Ley 28051",
    "pages": 9,
    "bytes": 22254,
    "file": "prestaciones-alimentarias.md"
  },
  {
    "slug": "determinacion-pago-remuneraciones",
    "title": "Determinación y pago de las remuneraciones",
    "topic": "remuneraciones",
    "legalRef": null,
    "pages": 6,
    "bytes": 14506,
    "file": "determinacion-pago-remuneraciones.md"
  },
  {
    "slug": "proteccion-remuneracion",
    "title": "Protección de la remuneración",
    "topic": "remuneraciones",
    "legalRef": "Constitución art. 24",
    "pages": 15,
    "bytes": 41121,
    "file": "proteccion-remuneracion.md"
  },
  {
    "slug": "extincion-relacion-trabajo",
    "title": "Extinción de la relación de trabajo",
    "topic": "cese",
    "legalRef": "D.Leg. 728, art. 16-34",
    "pages": 25,
    "bytes": 80545,
    "file": "extincion-relacion-trabajo.md"
  },
  {
    "slug": "sctr",
    "title": "Seguro Complementario de Trabajo de Riesgo (SCTR)",
    "topic": "sst",
    "legalRef": "Ley 26790, D.S. 009-97-SA",
    "pages": 13,
    "bytes": 37084,
    "file": "sctr.md"
  },
  {
    "slug": "inspecciones-trabajo",
    "title": "Esquema de Inspecciones de trabajo",
    "topic": "inspecciones",
    "legalRef": "Ley 28806, D.S. 019-2006-TR",
    "pages": 16,
    "bytes": 91341,
    "file": "inspecciones-trabajo.md"
  }
] as const

export const CORPUS_BY_SLUG: Readonly<Record<string, CorpusDocument>> = Object.fromEntries(
  CORPUS_DOCUMENTS.map((d) => [d.slug, d])
)

export const CORPUS_BY_TOPIC: Readonly<Record<string, readonly CorpusDocument[]>> = CORPUS_DOCUMENTS.reduce(
  (acc, d) => {
    const list = acc[d.topic] ?? []
    return { ...acc, [d.topic]: [...list, d] }
  },
  {} as Record<string, readonly CorpusDocument[]>
)

/**
 * Lazy-load el contenido markdown de un documento.
 * Usado por el RAG al buscar contexto relevante.
 */
export async function loadCorpusMarkdown(slug: string): Promise<string | null> {
  const doc = CORPUS_BY_SLUG[slug]
  if (!doc) return null
  try {
    // En Node runtime (server components / API routes)
    if (typeof window === 'undefined') {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const file = path.join(process.cwd(), 'src/data/legal/corpus', doc.file)
      return await fs.readFile(file, 'utf8')
    }
  } catch {
    // ignore
  }
  return null
}
