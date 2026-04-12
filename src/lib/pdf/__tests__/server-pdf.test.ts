import { describe, it, expect } from 'vitest'
import {
  createPDFDoc,
  addHeader,
  sectionTitle,
  kv,
  addPageNumbers,
  checkPageBreak,
  drawBarChart,
  drawTable,
  pdfResponse,
} from '../server-pdf'

describe('createPDFDoc', () => {
  it('should create a jsPDF document', async () => {
    const doc = await createPDFDoc()
    expect(doc).toBeDefined()
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(0)
    expect(doc.internal.pageSize.getHeight()).toBeGreaterThan(0)
  })

  it('should have A4 dimensions (210mm width)', async () => {
    const doc = await createPDFDoc()
    const width = doc.internal.pageSize.getWidth()
    // A4 is 210mm wide
    expect(Math.round(width)).toBe(210)
  })
})

describe('addHeader', () => {
  it('should not throw with valid inputs', async () => {
    const doc = await createPDFDoc()
    expect(() => {
      addHeader(doc, 'Test Title', { name: 'Test Org', ruc: '12345678901' }, 'Subtitle')
    }).not.toThrow()
  })

  it('should handle missing optional fields', async () => {
    const doc = await createPDFDoc()
    expect(() => {
      addHeader(doc, 'Title', { name: 'Org' })
    }).not.toThrow()
  })
})

describe('sectionTitle', () => {
  it('should return y position greater than input', async () => {
    const doc = await createPDFDoc()
    const newY = sectionTitle(doc, 'Test Section', 50)
    expect(newY).toBeGreaterThan(50)
  })
})

describe('kv', () => {
  it('should return y position greater than input', async () => {
    const doc = await createPDFDoc()
    const newY = kv(doc, 'Label', 'Value', 14, 50)
    expect(newY).toBeGreaterThan(50)
  })
})

describe('addPageNumbers', () => {
  it('should not throw on single page', async () => {
    const doc = await createPDFDoc()
    expect(() => addPageNumbers(doc)).not.toThrow()
  })

  it('should not throw on multi-page doc', async () => {
    const doc = await createPDFDoc()
    doc.addPage()
    doc.addPage()
    expect(() => addPageNumbers(doc)).not.toThrow()
    expect(doc.getNumberOfPages()).toBe(3)
  })
})

describe('checkPageBreak', () => {
  it('should return same y when below margin', async () => {
    const doc = await createPDFDoc()
    const y = checkPageBreak(doc, 100, 270)
    expect(y).toBe(100)
  })

  it('should add page and return 56 when above margin', async () => {
    const doc = await createPDFDoc()
    const initialPages = doc.getNumberOfPages()
    const y = checkPageBreak(doc, 275, 270)
    expect(y).toBe(56)
    expect(doc.getNumberOfPages()).toBe(initialPages + 1)
  })
})

describe('drawBarChart', () => {
  it('should return y position greater than input', async () => {
    const doc = await createPDFDoc()
    const items = [
      { label: 'Contratos', score: 85, weight: 20 },
      { label: 'SST', score: 45, weight: 15 },
      { label: 'Documentos', score: 70, weight: 15 },
    ]
    const newY = drawBarChart(doc, items, 14, 60)
    expect(newY).toBeGreaterThan(60)
  })
})

describe('drawTable', () => {
  it('should draw a table and return y > input', async () => {
    const doc = await createPDFDoc()
    const columns = [
      { header: '#', x: 14 },
      { header: 'Name', x: 30 },
      { header: 'Score', x: 120 },
    ]
    const rows = [
      ['1', 'Item A', '85'],
      ['2', 'Item B', '60'],
      ['3', 'Item C', '30'],
    ]
    const newY = drawTable(doc, columns, rows, 60)
    expect(newY).toBeGreaterThan(60)
  })
})

describe('pdfResponse', () => {
  it('should create a NextResponse with correct headers', () => {
    const buffer = new ArrayBuffer(100)
    const response = pdfResponse(buffer, 'test.pdf')
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="test.pdf"')
  })
})

describe('full PDF generation flow', () => {
  it('should generate a complete PDF buffer', async () => {
    const doc = await createPDFDoc()
    addHeader(doc, 'Informe Test', { name: 'Empresa Test', ruc: '20123456789' })

    let y = 56
    y = sectionTitle(doc, 'Seccion 1', y)
    y = kv(doc, 'Score', '85/100', 14, y)
    y = kv(doc, 'Multa', 'S/ 12,500', 14, y)

    y = sectionTitle(doc, 'Seccion 2', y)
    const items = [
      { label: 'Contratos', score: 90, weight: 20 },
      { label: 'SST', score: 55, weight: 19 },
    ]
    y = drawBarChart(doc, items, 14, y)

    addPageNumbers(doc)
    const buffer = doc.output('arraybuffer')
    expect(buffer.byteLength).toBeGreaterThan(500)
  })
})
