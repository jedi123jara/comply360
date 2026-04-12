import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'code', 'pre', 'br', 'hr', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  })
}
