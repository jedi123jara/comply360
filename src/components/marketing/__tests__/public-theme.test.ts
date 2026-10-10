import { describe, expect, it } from 'vitest'
import { PUBLIC_AUTH_LINKS, PUBLIC_COLORS as C, PUBLIC_LEGAL_LINKS, PUBLIC_NAV, PUBLIC_PRIMARY_CTA, pub } from '../public-theme'

/** Luminancia relativa WCAG 2.x de un color #RRGGBB. */
function luminance(hex: string): number {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

// Pares texto/fondo que usa el tema público (texto normal → AA 4.5:1).
const TEXT_PAIRS: Array<[string, string, string]> = [
  ['título sobre blanco', C.title, C.surface],
  ['título sobre página', C.title, C.page],
  ['texto sobre blanco', C.text, C.surface],
  ['texto sobre página', C.text, C.page],
  ['texto tenue sobre blanco', C.textFaint, C.surface],
  ['texto tenue sobre página', C.textFaint, C.page],
  ['enlace azul sobre blanco', C.blue, C.surface],
  ['enlace azul sobre página', C.blue, C.page],
  ['eyebrow azul sobre azul claro', C.blueHover, C.blueSoft],
  ['«Saber más» ámbar oscuro sobre blanco', C.amberDark, C.surface],
  ['«Saber más» ámbar oscuro sobre página', C.amberDark, C.page],
  ['CTA navy sobre ámbar', C.navy, C.amber],
  ['CTA navy sobre ámbar hover', C.navy, C.amberHover],
  ['blanco sobre navy', C.onNavy, C.navy],
  ['secundario sobre navy', C.onNavyMuted, C.navy],
  ['tenue sobre navy', C.onNavyFaint, C.navy],
  ['ámbar sobre navy', C.amber, C.navy],
  ['secundario sobre footer', C.onNavyMuted, C.navyDeep],
  ['tenue sobre footer', C.onNavyFaint, C.navyDeep],
  ['éxito sobre blanco', C.success, C.surface],
  ['peligro sobre blanco', C.danger, C.surface],
  ['advertencia sobre blanco', C.warning, C.surface],
  ['error de formulario sobre navy', '#FCA5A5', C.navy],
  ['aviso ámbar', '#92400E', C.amberSoft],
]

// Elementos no textuales (bordes de input, ícono, foco) → WCAG 1.4.11, 3:1.
const UI_PAIRS: Array<[string, string, string]> = [
  ['borde de input sobre blanco', C.inputBorder, C.surface],
  ['ícono azul en cuadro azul claro', C.blue, C.blueSoft],
  ['contorno de foco azul sobre navy', C.blue, C.navy],
  ['contorno de foco azul sobre blanco', C.blue, C.surface],
]

describe('public-theme · contraste WCAG AA', () => {
  it.each(TEXT_PAIRS)('%s ≥ 4.5:1', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(UI_PAIRS)('%s ≥ 3:1', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3)
  })

  it('el ámbar claro NO se usa como texto sobre blanco (no llega a AA)', () => {
    expect(contrast(C.amber, C.surface)).toBeLessThan(4.5)
    expect(pub.linkMore).toContain(C.amberDark)
    expect(pub.highlight).toContain(C.amberDark)
  })
})

describe('public-theme · clases', () => {
  it('el CTA principal es ámbar con texto azul marino', () => {
    expect(pub.btnPrimary).toContain(`bg-[${C.amber}]`)
    expect(pub.btnPrimary).toContain(`text-[${C.navy}]`)
    expect(pub.btnPrimary).toContain(`hover:bg-[${C.amberHover}]`)
  })

  it('no usa utilidades reasignadas por la capa de compatibilidad oscura de globals.css', () => {
    const all = Object.values(pub).join(' ')
    expect(all).not.toMatch(/\b(?:bg-white|text-white|text-slate-\d+|bg-slate-\d+|emerald-\d+|teal-\d+)\b/)
  })

  it('los títulos son sans gruesa, sin serif ni itálica', () => {
    for (const cls of [pub.h1, pub.h1OnNavy, pub.h2, pub.h2OnNavy]) {
      expect(cls).toContain('font-extrabold')
      expect(cls).toContain('tracking-[-0.02em]')
      expect(cls).not.toMatch(/font-serif|italic/)
    }
  })
})

describe('public-theme · navegación', () => {
  it('mantiene las rutas públicas del sitio del estudio', () => {
    expect(PUBLIC_NAV.map((l) => l.href)).toEqual([
      '/servicios',
      '/capacitaciones',
      '/planes',
      '/obligaciones',
      '/recursos',
    ])
    expect(PUBLIC_PRIMARY_CTA.href).toBe('/diagnostico-gratis')
    expect(PUBLIC_AUTH_LINKS.signIn.href).toBe('/sign-in')
    expect(PUBLIC_AUTH_LINKS.signUp.href).toBe('/sign-up')
    expect(PUBLIC_LEGAL_LINKS.map((l) => l.href)).toEqual(['/terminos', '/privacidad'])
  })

  it('no menciona marcas ajenas a Comply360 en los textos de navegación', () => {
    const labels = [...PUBLIC_NAV, ...Object.values(PUBLIC_AUTH_LINKS), ...PUBLIC_LEGAL_LINKS]
      .map((l) => l.label)
      .join(' ')
    expect(labels.toLowerCase()).not.toContain('legalia')
  })
})
