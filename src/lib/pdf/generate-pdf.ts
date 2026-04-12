// =============================================
// PDF GENERATION UTILITY
// Uses browser print API for client-side PDF
// In production, use a server-side library like @react-pdf/renderer or puppeteer
// =============================================

export interface PDFOptions {
  title: string
  filename: string
  content: string
  watermark?: string
}

/**
 * Generate a PDF from HTML content using the browser print dialog.
 * Returns false if the popup was blocked (caller should show a toast/notice).
 * Returns true if the print window was opened successfully.
 */
export function generatePDFFromHTML(options: PDFOptions): boolean {
  const { title, filename, content, watermark } = options

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    // Popup blocked — caller is responsible for displaying a user-friendly message
    console.warn('[PDF] Popup blocked. Ask the user to allow popups for this site.')
    return false
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4;
          margin: 2cm;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #1a1a1a;
        }
        .header {
          text-align: center;
          margin-bottom: 24pt;
          padding-bottom: 12pt;
          border-bottom: 2px solid #1e3a6e;
        }
        .header h1 {
          font-size: 16pt;
          color: #1e3a6e;
          margin-bottom: 4pt;
        }
        .header p {
          font-size: 9pt;
          color: #666;
        }
        .content {
          margin-bottom: 24pt;
        }
        .content h2 {
          font-size: 13pt;
          color: #1e3a6e;
          margin: 16pt 0 8pt;
          padding-bottom: 4pt;
          border-bottom: 1px solid #e5e7eb;
        }
        .content h3 {
          font-size: 11pt;
          margin: 12pt 0 6pt;
        }
        .content p {
          margin-bottom: 8pt;
          text-align: justify;
        }
        .content table {
          width: 100%;
          border-collapse: collapse;
          margin: 12pt 0;
        }
        .content th, .content td {
          border: 1px solid #d1d5db;
          padding: 6pt 8pt;
          text-align: left;
          font-size: 10pt;
        }
        .content th {
          background: #f3f4f6;
          font-weight: bold;
        }
        .total-row {
          background: #eff6ff;
          font-weight: bold;
        }
        .amount {
          text-align: right;
          font-family: 'Courier New', monospace;
        }
        .legal-ref {
          font-size: 8pt;
          color: #6b7280;
          font-style: italic;
        }
        .footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 7pt;
          color: #9ca3af;
          padding: 8pt 2cm;
          border-top: 1px solid #e5e7eb;
        }
        ${watermark ? `
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 60pt;
          color: rgba(30, 58, 110, 0.06);
          font-weight: bold;
          white-space: nowrap;
          pointer-events: none;
          z-index: -1;
        }
        ` : ''}
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      ${watermark ? `<div class="watermark">${watermark}</div>` : ''}
      <div class="header">
        <h1>${title}</h1>
        <p>Generado por COMPLY360 — ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        COMPLY360 — Plataforma Legal Inteligente | Este documento es referencial y no constituye asesoría legal.
        | Generado el ${new Date().toLocaleString('es-PE')}
      </div>
    </body>
    </html>
  `)

  printWindow.document.close()

  // Wait for content to render, then trigger print
  printWindow.onload = () => {
    printWindow.print()
  }
  // Fallback for browsers that don't fire onload for document.write
  setTimeout(() => {
    printWindow.print()
  }, 500)

  return true
}

/**
 * Generate calculation breakdown as HTML table for PDF
 */
export function calculationToHTML(data: {
  title: string
  items: Array<{ label: string; amount: number; formula?: string; baseLegal?: string }>
  total: number
  warnings?: Array<{ message: string }>
  legalRefs?: Array<{ norm: string; description: string }>
  metadata?: Record<string, string>
}): string {
  const { title, items, total, warnings, legalRefs, metadata } = data

  let html = ''

  // Metadata
  if (metadata) {
    html += '<h2>Datos del Cálculo</h2>'
    html += '<table>'
    Object.entries(metadata).forEach(([key, value]) => {
      html += `<tr><td style="width:40%;font-weight:bold">${key}</td><td>${value}</td></tr>`
    })
    html += '</table>'
  }

  // Breakdown
  html += `<h2>${title}</h2>`
  html += '<table>'
  html += '<tr><th>Concepto</th><th>Fórmula</th><th class="amount">Monto (S/)</th></tr>'

  items.forEach(item => {
    html += `<tr>
      <td>${item.label}</td>
      <td class="legal-ref">${item.formula || '-'}</td>
      <td class="amount">${item.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
    </tr>`
  })

  html += `<tr class="total-row">
    <td colspan="2">TOTAL</td>
    <td class="amount">S/ ${total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
  </tr>`
  html += '</table>'

  // Warnings
  if (warnings && warnings.length > 0) {
    html += '<h2>Alertas Legales</h2>'
    warnings.forEach(w => {
      html += `<p style="color:#b45309;background:#fef3c7;padding:6pt 8pt;border-radius:4pt;font-size:9pt;">⚠ ${w.message}</p>`
    })
  }

  // Legal References
  if (legalRefs && legalRefs.length > 0) {
    html += '<h2>Base Legal</h2>'
    html += '<table>'
    html += '<tr><th>Norma</th><th>Descripción</th></tr>'
    legalRefs.forEach(ref => {
      html += `<tr><td>${ref.norm}</td><td>${ref.description}</td></tr>`
    })
    html += '</table>'
  }

  return html
}

/**
 * Generate a contract document as HTML for PDF
 */
export function contractToHTML(data: {
  title: string
  clauses: Array<{ title: string; content: string }>
  signatures: Array<{ role: string; name: string }>
}): string {
  let html = ''

  data.clauses.forEach((clause, idx) => {
    html += `<h2>CLÁUSULA ${numberToRoman(idx + 1)}: ${clause.title.toUpperCase()}</h2>`
    html += `<p>${clause.content}</p>`
  })

  // Signature block
  html += '<div style="margin-top:48pt;display:flex;justify-content:space-between;">'
  data.signatures.forEach(sig => {
    html += `<div style="text-align:center;width:45%;">
      <div style="border-top:1px solid #000;padding-top:8pt;margin-top:60pt;">
        <p style="font-weight:bold;">${sig.name}</p>
        <p class="legal-ref">${sig.role}</p>
      </div>
    </div>`
  })
  html += '</div>'

  return html
}

function numberToRoman(num: number): string {
  const romanMap: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let result = ''
  let remaining = num
  for (const [value, symbol] of romanMap) {
    while (remaining >= value) {
      result += symbol
      remaining -= value
    }
  }
  return result
}
