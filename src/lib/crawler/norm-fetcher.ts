/**
 * norm-fetcher.ts
 *
 * Fetches new legal norms from official RSS feeds:
 *   - El Peruano  → EL_PERUANO_RSS_URL  (default: https://busquedas.elperuano.pe/normaslegales/rss)
 *   - SUNAFIL     → SUNAFIL_RSS_URL     (default: https://www.sunafil.gob.pe/noticias.rss)
 *   - MTPE        → MTPE_RSS_URL        (optional — disabled if env var not set)
 *
 * All URLs are overridable via environment variables so ops can swap them if
 * the feeds change without a code deploy.
 *
 * Returns only norms whose externalId is NOT already in the DB (de-duplicated
 * by the caller via `existingIds`).
 */

export interface RawNorm {
  externalId: string   // Stable ID derived from sourceUrl or guid
  title: string
  sourceUrl: string
  publishedAt: Date
  source: 'EL_PERUANO' | 'SUNAFIL' | 'MTPE'
  description: string  // Raw <description> text from feed item
}

interface FeedSource {
  source: RawNorm['source']
  url: string
}

/** Build the list of active feed sources from env vars */
function activeSources(): FeedSource[] {
  const sources: FeedSource[] = [
    {
      source: 'EL_PERUANO',
      url: process.env.EL_PERUANO_RSS_URL ||
           'https://busquedas.elperuano.pe/normaslegales/rss',
    },
    {
      source: 'SUNAFIL',
      url: process.env.SUNAFIL_RSS_URL ||
           'https://www.sunafil.gob.pe/noticias.rss',
    },
  ]

  if (process.env.MTPE_RSS_URL) {
    sources.push({ source: 'MTPE', url: process.env.MTPE_RSS_URL })
  }

  return sources
}

/** Extract text content from a simple XML tag (handles CDATA) */
function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i')
  const m = xml.match(re)
  return m ? m[1].trim() : ''
}

/** Derive a stable externalId from link/guid */
function toExternalId(source: string, link: string): string {
  // Use the URL path as a compact fingerprint
  try {
    const url = new URL(link)
    return `${source}:${url.pathname}${url.search}`.slice(0, 200)
  } catch {
    return `${source}:${link}`.slice(0, 200)
  }
}

/** Parse an RSS 2.0 feed XML string and return items */
function parseRssFeed(xml: string, source: RawNorm['source']): RawNorm[] {
  const items: RawNorm[] = []

  // Split on <item> boundaries
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link') || extractTag(block, 'guid')
    const description = extractTag(block, 'description')
    const pubDateRaw = extractTag(block, 'pubDate')

    if (!title || !link) continue

    const publishedAt = pubDateRaw ? new Date(pubDateRaw) : new Date()
    if (isNaN(publishedAt.getTime())) continue

    items.push({
      externalId: toExternalId(source, link),
      title,
      sourceUrl: link,
      publishedAt,
      source,
      description,
    })
  }

  return items
}

/** Fetch a single RSS feed; returns empty array on network/parse errors */
async function fetchFeed(feedSource: FeedSource): Promise<RawNorm[]> {
  const { source, url } = feedSource
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15_000) // 15 s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'COMPLY360-NormCrawler/1.0 (comply360.pe; legal compliance platform)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    }).finally(() => clearTimeout(timer))

    if (!res.ok) {
      console.warn(`[norm-fetcher] ${source} RSS returned ${res.status} — skipping`)
      return []
    }

    const text = await res.text()
    return parseRssFeed(text, source)
  } catch (err) {
    console.warn(`[norm-fetcher] Failed to fetch ${source} feed:`, err)
    return []
  }
}

/**
 * Fetch all configured RSS sources and return raw norms,
 * excluding any whose externalId is already in `existingIds`.
 */
export async function fetchNewNorms(existingIds: Set<string>): Promise<RawNorm[]> {
  const sources = activeSources()
  const results = await Promise.all(sources.map(fetchFeed))
  const all = results.flat()

  // De-duplicate within this batch (same item from two feeds)
  const seen = new Set<string>()
  const fresh: RawNorm[] = []

  for (const norm of all) {
    if (existingIds.has(norm.externalId)) continue
    if (seen.has(norm.externalId)) continue
    seen.add(norm.externalId)
    fresh.push(norm)
  }

  return fresh
}
