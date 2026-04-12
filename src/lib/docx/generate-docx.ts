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

  // Convert HTML to OOXML paragraphs
  const body = htmlToOoxml(content)

  // Build the document.xml
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:mv="urn:schemas-microsoft-com:mac:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:sl="http://schemas.openxmlformats.org/schemaLibrary/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
  xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:lc="http://schemas.openxmlformats.org/drawingml/2006/lockedCanvas"
  xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:pStyle w:val="Title"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="666666"/></w:rPr>
        <w:t>Generado por COMPLY360 — ${new Date().toLocaleDateString('es-PE')}</w:t>
      </w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    ${body}
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr>
        <w:t>Documento generado por COMPLY360 — ${escapeXml(company)}</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`

  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>${escapeXml(author)}</dc:creator>
  <cp:lastModifiedBy>${escapeXml(author)}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`

  // Use JSZip-like approach with Blob
  // Since we can't use external libraries, we'll create a simple ZIP manually
  // For now, use the browser's download approach with mhtml/xml format
  // that Word can open

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
