import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AssistantMarkdown, safeHref } from '../assistant-markdown'

function html(content: string): string {
  return renderToStaticMarkup(<AssistantMarkdown content={content} />)
}

describe('AssistantMarkdown', () => {
  it('convierte negritas, cursivas y código en línea', () => {
    const out = html('La **CTS** se deposita en *mayo* y `noviembre`.')
    expect(out).toContain('<strong class="font-semibold">CTS</strong>')
    expect(out).toContain('<em>mayo</em>')
    expect(out).toContain('noviembre</code>')
  })

  it('arma listas con viñetas y numeradas', () => {
    const out = html('- Contrato\n- Boletas\n\n1. Primero\n2. Segundo')
    expect(out).toMatch(/<ul[^>]*><li>Contrato<\/li><li>Boletas<\/li><\/ul>/)
    expect(out).toMatch(/<ol[^>]*><li>Primero<\/li><li>Segundo<\/li><\/ol>/)
  })

  it('arma tablas simples', () => {
    const out = html('| Concepto | Monto |\n|---|---|\n| Sueldo | S/ 1,500 |')
    expect(out).toContain('<th')
    expect(out).toContain('Concepto')
    expect(out).toContain('S/ 1,500</td>')
  })

  it('no interpreta HTML del texto', () => {
    const out = html('<img src=x onerror="alert(1)"> hola')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;img')
  })

  it('enlaza rutas internas y https, pero no otros esquemas', () => {
    expect(html('[Ver planes](/dashboard/planes)')).toContain('href="/dashboard/planes"')
    const external = html('[Norma](https://www.gob.pe/sunafil)')
    expect(external).toContain('href="https://www.gob.pe/sunafil"')
    expect(external).toContain('rel="noopener noreferrer nofollow"')
    const unsafe = html('[clic](javascript:alert(1))')
    expect(unsafe).not.toContain('href=')
    expect(unsafe).toContain('clic')
  })

  it('safeHref rechaza rutas protocol-relative y http', () => {
    expect(safeHref('//evil.com')).toBeNull()
    expect(safeHref('http://example.com')).toBeNull()
    expect(safeHref('/dashboard')).toEqual({ href: '/dashboard', external: false })
  })
})
