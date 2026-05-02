import { describe, it, expect } from 'vitest'
import { htmlToDocxBuffer } from '../html-to-docx'

async function readDocxText(buffer: Buffer): Promise<string> {
  const PizZip = (await import('pizzip')).default
  const zip = new PizZip(buffer)
  const xml = zip.file('word/document.xml')?.asText() ?? ''
  return xml.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
}

describe('htmlToDocxBuffer', () => {
  it('genera un Buffer con magic number ZIP (PK\\x03\\x04)', async () => {
    const buf = await htmlToDocxBuffer({
      title: 'Contrato de Prueba',
      contentHtml: '<h2>Cláusula primera</h2><p>Texto del contrato.</p>',
    })
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf[0]).toBe(0x50) // P
    expect(buf[1]).toBe(0x4b) // K
  })

  it('incluye el título y el contenido', async () => {
    const buf = await htmlToDocxBuffer({
      title: 'Contrato XYZ',
      contentHtml: '<h2>Sección</h2><p>Contenido importante.</p>',
    })
    const text = await readDocxText(buf)
    expect(text).toContain('CONTRATO XYZ')
    expect(text).toContain('Sección')
    expect(text).toContain('Contenido importante')
  })

  it('renderiza tablas básicas', async () => {
    const buf = await htmlToDocxBuffer({
      title: 'T',
      contentHtml: '<table><tr><th>Concepto</th><th>Monto</th></tr><tr><td>RMV</td><td>1130</td></tr></table>',
    })
    const text = await readDocxText(buf)
    expect(text).toContain('Concepto')
    expect(text).toContain('Monto')
    expect(text).toContain('RMV')
    expect(text).toContain('1130')
  })

  it('renderiza listas', async () => {
    const buf = await htmlToDocxBuffer({
      title: 'T',
      contentHtml: '<ul><li>Primero</li><li>Segundo</li></ul>',
    })
    const text = await readDocxText(buf)
    expect(text).toContain('Primero')
    expect(text).toContain('Segundo')
  })

  it('soporta inline bold/italic/underline sin romper', async () => {
    const buf = await htmlToDocxBuffer({
      title: 'T',
      contentHtml: '<p>Texto con <b>negrita</b>, <i>cursiva</i> y <u>subrayado</u>.</p>',
    })
    const text = await readDocxText(buf)
    expect(text).toContain('negrita')
    expect(text).toContain('cursiva')
    expect(text).toContain('subrayado')
  })

  it('agrega footer cuando se provee', async () => {
    const buf = await htmlToDocxBuffer({
      title: 'T',
      contentHtml: '<p>cuerpo</p>',
      footer: 'COMPLY360 — Plataforma Legal',
    })
    const text = await readDocxText(buf)
    expect(text).toContain('COMPLY360 — Plataforma Legal')
  })
})
