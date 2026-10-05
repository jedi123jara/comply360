/**
 * Sistema visual del recorrido público de Comply360 (landing → planes →
 * calculadoras → diagnóstico gratis → registro / inicio de sesión → onboarding).
 *
 * Identidad (referencia del fundador, oct-2026):
 *  - Header, hero, footer y bandas de llamada a la acción en azul marino #0B1B36
 *    (footer #081428) con texto blanco y secundarios #CBD5E1.
 *  - Cuerpo claro: secciones blancas o #F5F7FB, tarjetas blancas con borde
 *    #E5EAF2 y sombra suave; títulos #0B1B36 y texto #475569.
 *  - CTA principal ámbar #F5B301 (hover #E0A100) con texto azul marino y flecha →.
 *    Secundario con borde (blanco/ámbar sobre navy, o navy sobre blanco).
 *  - Azul #2563EB solo como acento: íconos en cuadritos #EFF4FF, gráficos, enlaces.
 *    Enlaces tipo «Saber más →» en ámbar oscuro #B45309 sobre blanco.
 *  - Títulos en sans gruesa (Plus Jakarta Sans, la fuente del body) 700-800,
 *    tracking -0.02em. Sin serif ni itálicas en títulos.
 *
 * Este archivo es la fuente de verdad de la paleta pública: la landing
 * (`src/app/page.tsx`) puede importar `PUBLIC_COLORS`, `pub`, `PUBLIC_NAV`, etc.
 *
 * Por qué clases con hex arbitrario (`text-[#475569]`) y no `text-slate-600`,
 * `bg-white`, `emerald-*`...: `globals.css` tiene una capa de compatibilidad que
 * reasigna esas utilidades con `!important` (bg-white → superficie oscura,
 * text-slate-900 → token, emerald-* → teal). Los valores arbitrarios no pasan
 * por esa capa, así que el tema público no depende de los tokens del dashboard.
 *
 * Todos los pares texto/fondo usados aquí cumplen WCAG AA; ver
 * `__tests__/public-theme.test.ts`.
 */
import type { CSSProperties } from 'react'

/** Paleta (hex). Úsala para estilos inline, SVG, Clerk y tests de contraste. */
export const PUBLIC_COLORS = {
  /** Header, hero, bandas CTA. */
  navy: '#0B1B36',
  /** Footer. */
  navyDeep: '#081428',
  /** Fondo de página claro (secciones alternas). */
  page: '#F5F7FB',
  surface: '#FFFFFF',
  border: '#E5EAF2',
  /** Borde de inputs (≥ 3:1 sobre blanco, WCAG 1.4.11). */
  inputBorder: '#7B8AA0',
  title: '#0B1B36',
  text: '#475569',
  /** Texto tenue: ≥ 4.5:1 sobre #F5F7FB (#64748b no llega a 4.5 sobre ese fondo). */
  textFaint: '#5A6A80',
  onNavy: '#FFFFFF',
  onNavyMuted: '#CBD5E1',
  onNavyFaint: '#94A3B8',
  amber: '#F5B301',
  amberHover: '#E0A100',
  /** Ámbar oscuro para texto/enlaces sobre fondo claro (5:1 sobre blanco). */
  amberDark: '#B45309',
  amberSoft: '#FFF8E6',
  blue: '#2563EB',
  blueHover: '#1D4ED8',
  blueSoft: '#EFF4FF',
  success: '#15803D',
  danger: '#B91C1C',
  warning: '#B45309',
} as const

/** Fondo del hero navy: color plano + halos muy sutiles (azul y ámbar). */
export const PUBLIC_HERO_BACKGROUND =
  'radial-gradient(circle at 85% -10%, rgba(245, 179, 1, 0.10), transparent 40%), ' +
  'radial-gradient(circle at 10% 110%, rgba(37, 99, 235, 0.22), transparent 45%), ' +
  PUBLIC_COLORS.navy

/**
 * Estilo del contenedor público (`PublicShell`). Además del fondo claro,
 * redefine los tokens que usan las reglas globales sin capa de `globals.css`
 * (inputs nativos, foco, utilidades legacy) para que todo lo que quede dentro
 * se pinte con la paleta pública y en modo claro.
 */
export const PUBLIC_SHELL_STYLE = {
  colorScheme: 'light',
  backgroundColor: PUBLIC_COLORS.page,
  color: PUBLIC_COLORS.text,
  '--text-primary': PUBLIC_COLORS.title,
  '--text-secondary': PUBLIC_COLORS.text,
  '--text-tertiary': PUBLIC_COLORS.textFaint,
  '--bg-canvas': PUBLIC_COLORS.page,
  '--bg-base': PUBLIC_COLORS.surface,
  '--bg-surface': PUBLIC_COLORS.surface,
  '--bg-surface-hover': PUBLIC_COLORS.page,
  '--bg-elevated': PUBLIC_COLORS.surface,
  '--bg-inset': PUBLIC_COLORS.page,
  '--border-default': PUBLIC_COLORS.border,
  '--border-subtle': '#EEF2F7',
  '--emerald-50': PUBLIC_COLORS.blueSoft,
  '--emerald-100': '#DBE7FE',
  '--emerald-200': '#BFD3FE',
  '--emerald-300': '#93B4FD',
  '--emerald-400': '#60A5FA',
  '--emerald-500': PUBLIC_COLORS.blue,
  '--emerald-600': PUBLIC_COLORS.blueHover,
  '--emerald-700': PUBLIC_COLORS.blueHover,
  '--emerald-800': '#1E40AF',
  '--emerald-900': '#1E3A8A',
} as CSSProperties

/**
 * Clases reutilizables. Son strings literales a propósito: Tailwind solo genera
 * las clases que encuentra escritas completas en el código.
 */
export const pub = {
  /** Contenedores */
  container: 'mx-auto w-full max-w-[1180px] px-4 sm:px-6',
  containerWide: 'mx-auto w-full max-w-[1480px] px-4 sm:px-6',
  section: 'py-12 sm:py-16',

  /** Hero navy a todo el ancho (usar con `style={{ background: PUBLIC_HERO_BACKGROUND }}`). */
  hero: 'relative overflow-hidden bg-[#0B1B36] text-[#ffffff]',
  /** Cuadrícula sutil para el hero / bandas navy. Requiere padre `relative`. */
  heroGrid:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px]',
  /** Banda CTA navy dentro del contenedor. */
  band: 'relative overflow-hidden rounded-2xl bg-[#0B1B36] text-[#ffffff] shadow-[0_24px_60px_rgba(11,27,54,0.22)]',

  /** Tipografía sobre navy */
  eyebrowOnNavy:
    'inline-flex items-center gap-2 rounded-full border border-[#F5B301]/40 bg-[#F5B301]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#F5B301]',
  h1OnNavy:
    'font-extrabold tracking-[-0.02em] text-[#ffffff] text-[2rem] leading-[1.1] sm:text-5xl sm:leading-[1.05] text-balance',
  h2OnNavy: 'font-extrabold tracking-[-0.02em] text-[#ffffff] text-2xl leading-tight sm:text-3xl text-balance',
  leadOnNavy: 'text-base leading-7 text-[#CBD5E1] sm:text-lg',
  bodyOnNavy: 'text-sm leading-6 text-[#CBD5E1]',
  faintOnNavy: 'text-xs text-[#94A3B8]',
  /** Palabra destacada en un título sobre navy. */
  highlightOnNavy: 'text-[#F5B301]',

  /** Tipografía sobre fondo claro */
  eyebrow:
    'inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#EFF4FF] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#1D4ED8]',
  kicker: 'text-xs font-bold uppercase tracking-[0.14em] text-[#2563EB]',
  h1: 'font-extrabold tracking-[-0.02em] text-[#0B1B36] text-[2rem] leading-[1.1] sm:text-5xl sm:leading-[1.05] text-balance',
  h2: 'font-extrabold tracking-[-0.02em] text-[#0B1B36] text-2xl leading-tight sm:text-4xl text-balance',
  h3: 'text-base font-bold tracking-[-0.01em] text-[#0B1B36]',
  lead: 'text-base leading-7 text-[#475569] sm:text-lg',
  body: 'text-sm leading-6 text-[#475569]',
  faint: 'text-xs text-[#5A6A80]',
  strong: 'font-semibold text-[#0B1B36]',
  /** Palabra destacada en un título sobre fondo claro. */
  highlight: 'text-[#B45309]',
  link: 'font-semibold text-[#2563EB] underline-offset-4 transition-colors hover:text-[#1D4ED8] hover:underline',
  /** Enlaces tipo «Saber más →». */
  linkMore:
    'inline-flex items-center gap-1 font-semibold text-[#B45309] transition-all hover:gap-1.5 hover:text-[#92400E]',

  /** Superficies claras */
  card: 'rounded-xl border border-[#E5EAF2] bg-[#ffffff] shadow-[0_1px_2px_rgba(11,27,54,0.04),0_8px_24px_rgba(11,27,54,0.06)]',
  cardHover:
    'transition duration-200 hover:-translate-y-0.5 hover:border-[#2563EB]/35 hover:shadow-[0_14px_34px_rgba(11,27,54,0.10)]',
  inset: 'rounded-lg border border-[#E5EAF2] bg-[#F5F7FB]',
  iconBox: 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#2563EB]',
  iconTile:
    'inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF4FF] text-[#2563EB] shadow-[0_10px_30px_rgba(37,99,235,0.25)] ring-1 ring-[#ffffff]/20',
  divider: 'border-[#E5EAF2]',
  divide: 'divide-y divide-[#E5EAF2]',
  pill: 'inline-flex items-center rounded-full border border-[#E5EAF2] bg-[#F5F7FB] px-3 py-1 text-xs font-semibold text-[#475569]',
  /** Nota neutral (recordatorios, plazos). */
  note: 'rounded-xl border border-[#E5EAF2] bg-[#F5F7FB] p-4 text-xs leading-5 text-[#475569]',
  /** Aviso con acento ámbar (recomendaciones). */
  notice: 'rounded-xl border border-[#F5B301]/45 bg-[#FFF8E6] p-4 text-xs leading-5 text-[#92400E]',

  /** Botones (agrega `<ArrowRight />` al CTA principal). */
  btnPrimary:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#F5B301] px-5 text-sm font-bold text-[#0B1B36] shadow-[0_10px_24px_rgba(245,179,1,0.28)] transition duration-150 hover:-translate-y-px hover:bg-[#E0A100] disabled:pointer-events-none disabled:opacity-50',
  btnPrimaryLg:
    'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-lg bg-[#F5B301] px-6 text-base font-bold text-[#0B1B36] shadow-[0_12px_28px_rgba(245,179,1,0.3)] transition duration-150 hover:-translate-y-px hover:bg-[#E0A100] disabled:pointer-events-none disabled:opacity-50',
  /** Secundario sobre fondo claro: borde navy. */
  btnSecondary:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#0B1B36] bg-[#ffffff] px-5 text-sm font-bold text-[#0B1B36] transition duration-150 hover:bg-[#0B1B36] hover:text-[#ffffff] disabled:pointer-events-none disabled:opacity-50',
  /** Secundario sobre navy: borde blanco, hover ámbar. */
  btnSecondaryOnNavy:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#ffffff]/45 bg-transparent px-5 text-sm font-bold text-[#ffffff] transition duration-150 hover:border-[#F5B301] hover:text-[#F5B301] disabled:pointer-events-none disabled:opacity-50',
  /** Acción alternativa de baja jerarquía (fondo claro). */
  btnTertiary:
    'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#2563EB]/30 bg-[#ffffff] px-4 text-xs font-semibold text-[#1D4ED8] transition-colors hover:bg-[#EFF4FF] disabled:pointer-events-none disabled:opacity-50',

  /** Formularios */
  label: 'mb-1.5 block text-sm font-semibold text-[#0B1B36]',
  hint: 'mt-1 text-xs text-[#5A6A80]',
  /**
   * Inputs y selects claros. Llevan `!` porque `globals.css` pinta todos los
   * inputs con fondo oscuro y `color-scheme: dark` (esa regla ha estado con y
   * sin capa); así el formulario público no depende de ese detalle. Sin padding
   * horizontal: agrega `px-3` o `pl-10 pr-3` (con ícono / prefijo) al usarla.
   */
  input:
    'w-full rounded-lg border py-2.5 text-sm transition-colors scheme-light! border-[#7B8AA0]! bg-[#ffffff]! text-[#0B1B36]! placeholder:text-[#64748B] focus:border-[#2563EB]! focus:shadow-[0_0_0_3px_rgba(37,99,235,0.18)]! focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB] disabled:opacity-60',
} as const

/** Enlaces del header / footer públicos. Las rutas son las mismas de la landing. */
export const PUBLIC_NAV = [
  { label: 'Producto', href: '/#producto' },
  { label: 'Planes', href: '/planes' },
  { label: 'Calculadoras', href: '/calculadoras' },
  { label: 'Diagnóstico gratis', href: '/diagnostico-gratis' },
] as const

export const PUBLIC_AUTH_LINKS = {
  signIn: { label: 'Iniciar sesión', href: '/sign-in' },
  signUp: { label: 'Crear cuenta', href: '/sign-up' },
} as const

export const PUBLIC_LEGAL_LINKS = [
  { label: 'Términos', href: '/terminos' },
  { label: 'Privacidad', href: '/privacidad' },
] as const
