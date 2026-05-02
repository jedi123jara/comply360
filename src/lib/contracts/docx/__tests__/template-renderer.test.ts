import { describe, it, expect } from 'vitest'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import {
  renderDocxTemplate,
  listTemplateVariables,
  MissingVariablesError,
} from '../template-renderer'

/** Helper: crea un .docx-Buffer con texto que incluye placeholders. */
async function makeTestTemplate(text: string): Promise<Buffer> {
  // docx empaqueta los runs por separado, lo que rompe los tags.
  // Para tests insertamos cada placeholder como un único run.
  const tokens = text.split(/(\{\{[^}]+\}\})/g).filter(Boolean)
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: tokens.map((t) => new TextRun({ text: t })),
          }),
        ],
      },
    ],
  })
  return Packer.toBuffer(doc)
}

/** Helper: extrae todo el texto de un .docx Buffer (usando PizZip directo). */
async function readDocxText(buffer: Buffer): Promise<string> {
  const PizZip = (await import('pizzip')).default
  const zip = new PizZip(buffer)
  const xml = zip.file('word/document.xml')?.asText() ?? ''
  // Strip de tags XML conserva el texto completo aunque venga partido en
  // múltiples runs. Decoda entidades básicas.
  return xml
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

describe('listTemplateVariables', () => {
  it('detecta tags simples', async () => {
    const buf = await makeTestTemplate('Hola {{nombre}}, hoy es {{fecha}}.')
    const vars = listTemplateVariables(buf)
    expect(vars).toEqual(['fecha', 'nombre'])
  })

  it('detecta tags con dot-notation', async () => {
    const buf = await makeTestTemplate('Trabajador: {{worker.dni}} {{worker.fullName}}')
    const vars = listTemplateVariables(buf)
    expect(vars).toEqual(['worker.dni', 'worker.fullName'])
  })

  it('vacío si no hay placeholders', async () => {
    const buf = await makeTestTemplate('Sin placeholders aquí.')
    const vars = listTemplateVariables(buf)
    expect(vars).toEqual([])
  })
})

describe('renderDocxTemplate', () => {
  it('reemplaza placeholders y retorna buffer DOCX válido', async () => {
    const buf = await makeTestTemplate('Hola {{nombre}}, plazo {{plazo}}.')
    const r = renderDocxTemplate({
      templateBytes: buf,
      data: { nombre: 'Juan', plazo: 24 },
    })
    expect(r.missingVariables).toEqual([])
    expect(r.filledVariables.sort()).toEqual(['nombre', 'plazo'])

    // El buffer rendereado contiene el texto sustituido
    const text = await readDocxText(r.buffer)
    expect(text).toContain('Juan')
    expect(text).toContain('24')
    expect(text).not.toContain('{{nombre}}')
  })

  it('soporta dot-notation con objetos anidados', async () => {
    const buf = await makeTestTemplate('DNI: {{worker.dni}} - {{worker.fullName}}')
    const r = renderDocxTemplate({
      templateBytes: buf,
      data: { worker: { dni: '12345678', fullName: 'María Pérez' } },
    })
    const text = await readDocxText(r.buffer)
    expect(text).toContain('12345678')
    expect(text).toContain('María Pérez')
  })

  it('retorna missingVariables cuando faltan datos (sin lanzar)', async () => {
    const buf = await makeTestTemplate('Hola {{nombre}}, monto {{monto}}.')
    const r = renderDocxTemplate({
      templateBytes: buf,
      data: { nombre: 'Ana' },
    })
    expect(r.missingVariables).toEqual(['monto'])
    expect(r.filledVariables).toEqual(['nombre'])
    const text = await readDocxText(r.buffer)
    expect(text).toContain('Ana')
    // El placeholder faltante se renderizó como string vacío (nullGetter)
    expect(text).not.toContain('{{monto}}')
  })

  it('strict=true lanza MissingVariablesError', async () => {
    const buf = await makeTestTemplate('Hola {{nombre}} {{cargo}}.')
    expect(() =>
      renderDocxTemplate({
        templateBytes: buf,
        data: { nombre: 'Ana' },
        strict: true,
      }),
    ).toThrow(MissingVariablesError)
  })

  it('preserva el buffer original (no muta)', async () => {
    const buf = await makeTestTemplate('{{nombre}}')
    const before = Buffer.from(buf)
    renderDocxTemplate({ templateBytes: buf, data: { nombre: 'X' } })
    expect(Buffer.compare(buf, before)).toBe(0)
  })
})
