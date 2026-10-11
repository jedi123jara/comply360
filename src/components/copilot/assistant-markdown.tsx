import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Markdown mínimo y seguro para las respuestas del asistente.
 *
 * Soporta lo que suele devolver el modelo: títulos (#), negritas, cursivas,
 * código en línea, listas (-, *, •, 1.), citas (>), separadores (---),
 * tablas simples (| a | b |) y enlaces. No usa `dangerouslySetInnerHTML`:
 * todo se arma como nodos de React, así que el texto nunca se interpreta
 * como HTML.
 *
 * Enlaces: las rutas internas ("/dashboard/...") usan `next/link` para no
 * perder la conversación; los externos solo si son https y se abren en otra
 * pestaña. Cualquier otro esquema (javascript:, data:, http:) se muestra
 * como texto plano.
 */

const INLINE_PATTERN = /(\*\*[^*\n]+?\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\s][^*\n]*?\*)/g

const LINK_CLASS =
  'font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800'

/** Normaliza un enlace: interno, https externo o `null` (no se enlaza). */
export function safeHref(raw: string): { href: string; external: boolean } | null {
  const href = raw.trim()
  if (href.startsWith('/') && !href.startsWith('//')) return { href, external: false }
  if (/^https:\/\//i.test(href)) return { href, external: true }
  return null
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let index = 0
  // RegExp nueva en cada llamada: la recursión (negritas) no debe pisar `lastIndex`.
  const pattern = new RegExp(INLINE_PATTERN.source, 'g')
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${keyPrefix}-${index++}`
    if (token.startsWith('**')) {
      out.push(<strong key={key} className="font-semibold">{renderInline(token.slice(2, -2), key)}</strong>)
    } else if (token.startsWith('`')) {
      out.push(
        <code key={key} className="rounded bg-[color:var(--neutral-100)] px-1 py-0.5 text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith('[')) {
      const close = token.indexOf('](')
      const label = token.slice(1, close)
      const link = safeHref(token.slice(close + 2, -1))
      if (!link) {
        out.push(label)
      } else if (link.external) {
        out.push(
          <a key={key} href={link.href} target="_blank" rel="noopener noreferrer nofollow" className={LINK_CLASS}>
            {label}
          </a>,
        )
      } else {
        out.push(
          <Link key={key} href={link.href} className={LINK_CLASS}>
            {label}
          </Link>,
        )
      }
    } else {
      out.push(<em key={key}>{token.slice(1, -1)}</em>)
    }
    last = match.index + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const UL_ITEM = /^\s*[-*•]\s+(.*)$/
const OL_ITEM = /^\s*(\d+)[.)]\s+(.*)$/
const HEADING = /^\s*#{1,6}\s+(.*)$/
const QUOTE = /^\s*>\s?(.*)$/
const RULE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/
const TABLE_ROW = /^\s*\|.*\|\s*$/
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

export function AssistantMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const key = `b${i}`

    if (!line.trim()) {
      i++
      continue
    }

    if (RULE.test(line)) {
      blocks.push(<hr key={key} className="border-[color:var(--border-subtle)]" />)
      i++
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      blocks.push(
        <p key={key} className="font-semibold text-[color:var(--text-primary)]">
          {renderInline(heading[1], key)}
        </p>,
      )
      i++
      continue
    }

    if (TABLE_ROW.test(line)) {
      const rows: string[][] = []
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        if (!TABLE_SEPARATOR.test(lines[i])) rows.push(splitRow(lines[i]))
        i++
      }
      const [head, ...body] = rows
      blocks.push(
        <div key={key} className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            {head ? (
              <thead>
                <tr>
                  {head.map((cell, c) => (
                    <th
                      key={c}
                      className="border-b border-[color:var(--border-default)] px-2 py-1 text-left font-semibold"
                    >
                      {renderInline(cell, `${key}h${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {body.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border-b border-[color:var(--border-subtle)] px-2 py-1 align-top">
                      {renderInline(cell, `${key}r${r}c${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    if (UL_ITEM.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && UL_ITEM.test(lines[i])) {
        const m = UL_ITEM.exec(lines[i])
        items.push(<li key={i}>{renderInline(m?.[1] ?? '', `${key}-${i}`)}</li>)
        i++
      }
      blocks.push(
        <ul key={key} className="list-disc space-y-1 pl-5">
          {items}
        </ul>,
      )
      continue
    }

    if (OL_ITEM.test(line)) {
      const items: ReactNode[] = []
      const start = Number(OL_ITEM.exec(line)?.[1] ?? 1)
      while (i < lines.length && OL_ITEM.test(lines[i])) {
        const m = OL_ITEM.exec(lines[i])
        items.push(<li key={i}>{renderInline(m?.[2] ?? '', `${key}-${i}`)}</li>)
        i++
      }
      blocks.push(
        <ol key={key} start={start} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>,
      )
      continue
    }

    if (QUOTE.test(line)) {
      const parts: ReactNode[] = []
      while (i < lines.length && QUOTE.test(lines[i])) {
        const m = QUOTE.exec(lines[i])
        if (parts.length) parts.push(<br key={`br${i}`} />)
        parts.push(...renderInline(m?.[1] ?? '', `${key}-${i}`))
        i++
      }
      blocks.push(
        <blockquote
          key={key}
          className="border-l-2 border-emerald-300 pl-3 text-[color:var(--text-secondary)]"
        >
          {parts}
        </blockquote>,
      )
      continue
    }

    // Párrafo: junta líneas seguidas hasta una línea vacía o un bloque especial.
    const parts: ReactNode[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !RULE.test(lines[i]) &&
      !HEADING.test(lines[i]) &&
      !TABLE_ROW.test(lines[i]) &&
      !UL_ITEM.test(lines[i]) &&
      !OL_ITEM.test(lines[i]) &&
      !QUOTE.test(lines[i])
    ) {
      if (parts.length) parts.push(<br key={`br${i}`} />)
      parts.push(...renderInline(lines[i], `${key}-${i}`))
      i++
    }
    blocks.push(<p key={key}>{parts}</p>)
  }

  return <div className="space-y-2 break-words">{blocks}</div>
}
