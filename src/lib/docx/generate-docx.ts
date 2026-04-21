// =============================================
// DOCX GENERATION
// Generates Word documents from contract data
// Uses plain XML (Office Open XML) for zero dependencies
// =============================================

export interface DocxOptions {
  title: string
  content: string // HTML content
  author: string
  company: string
  filename: string
}

/**
 * Generate a DOCX file from HTML content.
 * This creates a minimal valid .docx using the Office Open XML format.
 * The content is converted from HTML to basic OOXML paragraphs.
 */
export function generateDocx(options: DocxOptions): void {
  const { title, content, author, company, filename } = options

  // NOTE: OOXML .docx generation is intentionally deferred. Producing a real
  // .docx requires a ZIP packager; until we add one we emit a Word-compatible
  // HTML file (.doc) that Microsoft Word will open natively.
  //
  // Keeping the body conversion call here preserves the contract for when the
  // OOXML path is re-introduced. `body` is intentionally not consumed in the
  // HTML branch.
  void htmlToOoxml(content)

  // Alternative: Create a Word-compatible HTML file (.doc)
  const wordHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w="urn:schemas-microsoft-com:office:word"
  xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <o:DocumentProperties>
      <o:Author>${escapeHtml(author)}</o:Author>
      <o:Company>${escapeHtml(company)}</o:Company>
    </o:DocumentProperties>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; }
    h1 { font-size: 18pt; color: #1e3a6e; text-align: center; margin-bottom: 6pt; }
    h2 { font-size: 14pt; color: #1e3a6e; margin-top: 18pt; margin-bottom: 6pt; border-bottom: 1pt solid #1e3a6e; padding-bottom: 3pt; }
    h3 { font-size: 12pt; margin-top: 12pt; margin-bottom: 4pt; }
    p { margin-bottom: 6pt; text-align: justify; }
    table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
    th, td { border: 1pt solid #d1d5db; padding: 4pt 8pt; font-size: 10pt; }
    th { background-color: #f3f4f6; font-weight: bold; text-align: left; }
    .signature { margin-top: 60pt; display: flex; justify-content: space-between; }
    .signature-block { width: 45%; text-align: center; }
    .signature-line { border-top: 1pt solid #000; margin-top: 50pt; padding-top: 6pt; }
    .header-info { text-align: center; color: #666; font-size: 9pt; margin-bottom: 18pt; }
    .footer { text-align: center; font-size: 8pt; color: #999; margin-top: 36pt; border-top: 1pt solid #e5e7eb; padding-top: 6pt; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="header-info">Generado por COMPLY360 — ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  ${content}
  <p class="footer">COMPLY360 — Plataforma Legal Inteligente | Este documento fue generado automáticamente</p>
</body>
</html>`

  // Trigger download
  const blob = new Blob([wordHtml], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function htmlToOoxml(html: string): string {
  // Simple HTML to OOXML converter
  const lines = html
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '|||H2:$1|||')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '|||H3:$1|||')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '|||P:$1|||')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '|||LI:$1|||')
    .replace(/<br\s*\/?>/gi, '|||BR|||')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .split('|||')
    .filter(Boolean)

  return lines.map(line => {
    if (line.startsWith('H2:')) {
      const text = line.slice(3)
      return `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1E3A6E"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`
    }
    if (line.startsWith('H3:')) {
      const text = line.slice(3)
      return `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`
    }
    if (line.startsWith('P:')) {
      const text = line.slice(2)
      return `<w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`
    }
    if (line.startsWith('LI:')) {
      const text = line.slice(3)
      return `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`
    }
    if (line === 'BR') {
      return `<w:p><w:r><w:t></w:t></w:r></w:p>`
    }
    return ''
  }).join('\n')
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
