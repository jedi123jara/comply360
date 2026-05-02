import { describe, it, expect } from 'vitest'
import { clauseTextToHtml, detectPlaceholders, renderClause } from '../render'

describe('detectPlaceholders', () => {
  it('detecta placeholders únicos ordenados', () => {
    expect(detectPlaceholders('Hola {{nombre}}, hoy {{fecha}} y otra vez {{nombre}}.'))
      .toEqual(['fecha', 'nombre'])
  })

  it('texto sin placeholders → array vacío', () => {
    expect(detectPlaceholders('texto plano')).toEqual([])
  })

  it('ignora espacios alrededor del nombre', () => {
    expect(detectPlaceholders('{{ nombre }}')).toEqual(['nombre'])
  })
})

describe('renderClause', () => {
  it('reemplaza placeholders con values', () => {
    const r = renderClause({
      bodyTemplate: 'Hola {{nombre}}, plazo {{plazo}} meses.',
      variables: [
        { key: 'nombre', label: 'Nombre', type: 'text' },
        { key: 'plazo', label: 'Plazo', type: 'number' },
      ],
      values: { nombre: 'Juan', plazo: 24 },
    })
    expect(r.text).toBe('Hola Juan, plazo 24 meses.')
    expect(r.missing).toEqual([])
    expect(r.used).toEqual(['nombre', 'plazo'])
  })

  it('aplica defaults cuando values no trae el campo', () => {
    const r = renderClause({
      bodyTemplate: 'Plazo {{plazo}} meses.',
      variables: [
        { key: 'plazo', label: 'Plazo', type: 'number', default: 12 },
      ],
      values: {},
    })
    expect(r.text).toBe('Plazo 12 meses.')
    expect(r.missing).toEqual([])
  })

  it('marca variables faltantes', () => {
    const r = renderClause({
      bodyTemplate: 'Plazo {{plazo}} meses, monto {{monto}}.',
      variables: [
        { key: 'plazo', label: 'Plazo', type: 'number' },
        { key: 'monto', label: 'Monto', type: 'number' },
      ],
      values: { plazo: 12 },
    })
    expect(r.text).toBe('Plazo 12 meses, monto [FALTA: monto].')
    expect(r.missing).toEqual(['monto'])
  })

  it('value vacío "" cae a default', () => {
    const r = renderClause({
      bodyTemplate: '{{x}}',
      variables: [{ key: 'x', label: 'X', type: 'text', default: 'D' }],
      values: { x: '' },
    })
    expect(r.text).toBe('D')
  })
})

describe('clauseTextToHtml', () => {
  it('envuelve párrafos en <p>', () => {
    const html = clauseTextToHtml('Línea 1\n\nLínea 2')
    expect(html).toBe('<p>Línea 1</p>\n<p>Línea 2</p>')
  })

  it('saltos simples → <br/>', () => {
    const html = clauseTextToHtml('Línea 1\nLínea 2')
    expect(html).toBe('<p>Línea 1<br/>Línea 2</p>')
  })

  it('escapa < > & para evitar XSS', () => {
    const html = clauseTextToHtml('<script>alert(1)</script> & "ok"')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&amp;')
  })
})
