/**
 * Catálogo de artículos del blog /recursos — SEO long-tail Perú laboral.
 *
 * Los artículos de servicios del estudio viven en ./articles-cumplimiento.ts y
 * se publican primero. Cuando escalemos, migrar a MDX + filesystem-based
 * content (o a un CMS headless tipo Sanity).
 *
 * Convención de slugs:
 *   - kebab-case
 *   - keyword principal al inicio
 *   - incluir "peru" o año si ayuda a diferenciación (ej: "cts-2026-peru")
 */

import { ARTICLES_CUMPLIMIENTO } from './articles-cumplimiento'

export interface BlogArticle {
  slug: string
  title: string
  metaDescription: string
  /** Keyword principal para SEO (h1 + URL + title match) */
  keyword: string
  /** Categoría visible en el listado */
  category:
    | 'Calculadoras'
    | 'Compliance'
    | 'MYPE'
    | 'SUNAFIL'
    | 'Contratos'
    | 'SST'
    | 'Capacitaciones'
    | 'Hostigamiento'
  /** Tiempo estimado de lectura en minutos */
  readMinutes: number
  /** Fecha publicación (ISO) */
  publishedAt: string
  /** Última actualización */
  updatedAt: string
  /** Autor */
  author: string
  /** Contenido en formato JSX-ready (array de bloques) */
  content: BlogBlock[]
  /** CTAs embebidos al final */
  cta?: { label: string; href: string }
}

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'quote'; text: string; cite?: string }
  | { type: 'callout'; variant: 'info' | 'warning' | 'success'; title?: string; text: string }
  | { type: 'code'; text: string }

const ARTICLES_BASE: BlogArticle[] = [
  {
    slug: 'como-calcular-cts-2026-peru',
    keyword: 'cálculo CTS 2026',
    title: 'Cómo calcular la CTS 2026 en Perú: guía completa paso a paso',
    metaDescription:
      'Cálculo CTS 2026 paso a paso: fórmula del D.S. 001-97-TR, casos con y sin asignación familiar, plazos de depósito (15 de mayo y 15 de noviembre) y errores.',
    category: 'Calculadoras',
    readMinutes: 7,
    publishedAt: '2026-04-20',
    updatedAt: '2026-04-20',
    author: 'Equipo Comply360',
    content: [
      {
        type: 'p',
        text: 'La Compensación por Tiempo de Servicios (CTS) es uno de los beneficios sociales más importantes del régimen laboral general peruano. Cada 15 de mayo y 15 de noviembre, los empleadores deben depositar medio sueldo de cada trabajador en su cuenta CTS. Calcularla mal resulta en multa SUNAFIL o peor, en reclamo laboral del trabajador.',
      },
      {
        type: 'p',
        text: 'En esta guía vemos la fórmula oficial, los casos especiales (asignación familiar, comisiones, horas extras), los plazos y los errores más frecuentes.',
      },
      { type: 'h2', text: '1. Qué es la CTS' },
      {
        type: 'p',
        text: 'La CTS es un ahorro forzoso que el empleador deposita semestralmente a nombre del trabajador en una entidad financiera de su elección. Funciona como un seguro de desempleo: el trabajador puede retirarla cuando cesa su relación laboral o usar el 100% del exceso sobre 4 sueldos brutos mensuales.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Base legal',
        text: 'D.S. 001-97-TR (TUO de la Ley de CTS) + D.S. 004-97-TR (Reglamento). Aplica al régimen laboral general (D.Leg. 728).',
      },
      { type: 'h2', text: '2. La fórmula oficial' },
      {
        type: 'p',
        text: 'La CTS de cada semestre se calcula así:',
      },
      {
        type: 'code',
        text: 'CTS del semestre = (Remuneración computable ÷ 12) × meses + (Remuneración computable ÷ 360) × días\n\nDonde:\n- Remuneración computable = Sueldo bruto + 1/6 de la gratificación del semestre anterior + Asignación familiar (si aplica)',
      },
      { type: 'h3', text: 'Ejemplo práctico' },
      {
        type: 'p',
        text: 'Trabajador con sueldo S/2,500 bruto, con asignación familiar (S/113), que trabajó desde el 1 de enero 2026. Al 30 de abril (cierre del semestre mayo):',
      },
      {
        type: 'ol',
        items: [
          'Remuneración computable = 2,500 + 113 + (1,431.5 / 6) = 2,852.58',
          '4 meses × (2,852.58 / 12) = 4 × 237.72 = 950.86',
          '0 días adicionales',
          'CTS a depositar: S/ 950.86 antes del 15 de mayo 2026',
        ],
      },
      { type: 'h2', text: '3. Casos especiales' },
      { type: 'h3', text: '3.1. Comisiones y remuneración variable' },
      {
        type: 'p',
        text: 'Si el trabajador recibe comisiones o remuneración variable, se promedia lo percibido en los últimos 6 meses. Si trabajó menos de 6 meses, se promedia lo que haya.',
      },
      { type: 'h3', text: '3.2. Horas extras regulares' },
      {
        type: 'p',
        text: 'Solo se consideran si se pagaron al menos 3 de los 6 meses del semestre (son "regulares"). Caso contrario, no entran al cálculo.',
      },
      { type: 'h3', text: '3.3. Régimen MYPE' },
      {
        type: 'p',
        text: 'Los trabajadores en régimen MYPE Micro NO tienen CTS. En MYPE Pequeña, reciben el 50% de lo que correspondería en régimen general.',
      },
      { type: 'h2', text: '4. Plazos y sanciones' },
      {
        type: 'ul',
        items: [
          'Primer depósito: hasta el 15 de mayo (cubre noviembre-abril)',
          'Segundo depósito: hasta el 15 de noviembre (cubre mayo-octubre)',
          'No depositar a tiempo expone a la empresa a una multa de SUNAFIL',
          'Reajuste con intereses legales desde el día siguiente al vencimiento',
        ],
      },
      { type: 'h2', text: '5. Errores frecuentes' },
      {
        type: 'ol',
        items: [
          'Olvidar sumar 1/6 de la gratificación al cálculo',
          'No incluir la asignación familiar cuando corresponde',
          'Confundir el régimen del trabajador (general vs MYPE)',
          'Depositar en una cuenta común en vez de cuenta CTS específica',
          'No emitir la constancia de depósito al trabajador (obligatorio)',
        ],
      },
      {
        type: 'callout',
        variant: 'success',
        title: 'Revisamos que tu CTS cumpla la ley',
        text: 'No hacemos planillas: eso lo ve tu contador. Lo que sí hacemos en Comply360 es revisar que la CTS, las gratificaciones y el resto de beneficios cumplan la ley, y que tengas la evidencia lista para SUNAFIL.',
      },
    ],
    cta: { label: 'Ver servicio de cumplimiento laboral', href: '/servicios/laboral' },
  },

  {
    slug: 'multas-sunafil-2026-cuadro-completo',
    keyword: 'multas SUNAFIL 2026',
    title: 'Multas SUNAFIL 2026: cómo se calculan y qué las hace subir',
    metaDescription:
      'Multas SUNAFIL 2026: cómo se calculan según la gravedad, los trabajadores afectados y si eres MYPE. UIT de S/ 5,500, un ejemplo y descuentos por subsanación.',
    category: 'SUNAFIL',
    readMinutes: 4,
    publishedAt: '2026-04-20',
    updatedAt: '2026-04-20',
    author: 'Equipo Comply360',
    content: [
      {
        type: 'p',
        text: 'El 74% de las inspecciones de SUNAFIL nace de una denuncia. Entender cómo se calcula una multa, qué la hace subir y qué descuentos existen te ayuda a decidir qué corregir primero.',
      },
      { type: 'h2', text: '1. UIT 2026 y base de cálculo' },
      {
        type: 'p',
        text: 'La UIT (Unidad Impositiva Tributaria) para 2026 es S/ 5,500. Todas las multas laborales se expresan en fracciones o múltiplos de UIT conforme al D.S. 019-2006-TR.',
      },
      { type: 'h2', text: '2. Clasificación de infracciones' },
      {
        type: 'ul',
        items: [
          'Leves: violaciones menores sin afectación directa a derechos fundamentales (ej: omisiones formales).',
          'Graves: afectan derechos individuales (ej: no pago oportuno de beneficios, contratos simulados).',
          'Muy graves: afectan derechos colectivos, hostigamiento, trabajo forzoso, discriminación.',
        ],
      },
      { type: 'h2', text: '3. Qué determina el monto de la multa' },
      {
        type: 'p',
        text: 'No hay un monto único. La multa depende de tres factores: la gravedad de la infracción, el número de trabajadores afectados y si tu empresa es MYPE.',
      },
      {
        type: 'ul',
        items: [
          'Gravedad: una falta muy grave cuesta más que una grave, y una grave más que una leve.',
          'Trabajadores afectados: mientras más personas afecta la infracción, más alta es la multa.',
          'Tamaño de la empresa: si eres MYPE inscrita en el REMYPE, la multa baja 50% y tiene un tope del 1% de tus ingresos netos (RLGIT, art. 48.1-A).',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Un ejemplo',
        text: 'Una infracción muy grave que afecta a 1 trabajador en una empresa no MYPE cuesta 2.63 UIT = S/ 14,465.',
      },
      {
        type: 'p',
        text: 'Para estimar tu propio caso, usa nuestra calculadora de multas SUNAFIL. El resultado es referencial.',
      },
      { type: 'h2', text: '4. Descuentos por subsanación voluntaria (Art. 40 Ley 28806)' },
      {
        type: 'ul',
        items: [
          'Subsanación ANTES de inspección: -90% de la multa',
          'Subsanación DURANTE la inspección (antes del acta): hasta -70%',
          'Subsanación POST-acta pero antes de resolución: hasta -50%',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        title: 'Reincidencia',
        text: 'Si la misma infracción se repite dentro de 12 meses, la multa aumenta 50% y pierde todos los descuentos. Por eso es crítico subsanar y DOCUMENTAR la subsanación.',
      },
      {
        type: 'callout',
        variant: 'success',
        title: 'Diagnóstico de cumplimiento',
        text: 'En el diagnóstico de Comply360 revisamos tus documentos como lo haría un inspector y te decimos cuánto arriesgas en multas, en soles, por cada hallazgo. La versión express es gratis.',
      },
    ],
    cta: { label: 'Calcular mi multa SUNAFIL', href: '/calculadoras/multa-sunafil' },
  },

  {
    slug: 'regimen-mype-peru-guia-completa-2026',
    keyword: 'régimen MYPE Perú',
    title: 'Régimen MYPE en Perú 2026: beneficios, límites y cómo acogerte',
    metaDescription:
      'Guía del régimen MYPE en Perú 2026: límites de ventas y trabajadores, beneficios de micro y pequeña empresa (CTS, gratificaciones, vacaciones) y REMYPE.',
    category: 'MYPE',
    readMinutes: 8,
    publishedAt: '2026-04-20',
    updatedAt: '2026-04-20',
    author: 'Equipo Comply360',
    content: [
      {
        type: 'p',
        text: 'Saber si tu empresa califica como microempresa o pequeña empresa cambia los beneficios laborales que debes pagar frente al régimen general. Esta es una guía rápida de los límites, beneficios y trámites en 2026.',
      },
      { type: 'h2', text: '1. Base legal vigente' },
      {
        type: 'p',
        text: 'La Ley 32353 (publicada en 2025, vigente 2026) reemplazó a la Ley 28015. Mantiene la filosofía, pero actualizó algunos límites.',
      },
      { type: 'h2', text: '2. Límites actualizados 2026' },
      { type: 'h3', text: '2.1. Microempresa' },
      {
        type: 'ul',
        items: [
          'Hasta 10 trabajadores',
          'Ventas anuales ≤ 150 UIT (≤ S/ 825,000 en 2026)',
          'No hay distinción de sector (rural, urbano, servicios, manufactura)',
        ],
      },
      { type: 'h3', text: '2.2. Pequeña empresa' },
      {
        type: 'ul',
        items: [
          'Hasta 100 trabajadores',
          'Ventas anuales entre 150 y 1700 UIT (entre S/ 825k y S/ 9.35M)',
        ],
      },
      { type: 'h2', text: '3. Beneficios laborales por régimen' },
      { type: 'h3', text: '3.1. Microempresa (MYPE Micro)' },
      {
        type: 'ul',
        items: [
          'Remuneración mínima: RMV (S/ 1,130 en 2026)',
          'Jornada: 8h/día o 48h/semana',
          'Descanso semanal: 24h',
          'Vacaciones: 15 días calendario (mitad del general)',
          'NO tiene CTS',
          'NO tiene gratificaciones de julio y diciembre',
          'NO tiene asignación familiar',
          'Indemnización por despido: 10 remuneraciones diarias por año (tope 90 rem)',
          'SIS como seguro (~S/ 15/mes) en lugar de EsSalud',
        ],
      },
      { type: 'h3', text: '3.2. Pequeña empresa (MYPE Pequeña)' },
      {
        type: 'ul',
        items: [
          'Remuneración mínima: RMV',
          'Vacaciones: 15 días (mitad)',
          'CTS: al 50% del régimen general (medio sueldo anual en lugar de 1)',
          'Gratificaciones: al 50% (medio sueldo en julio y diciembre)',
          'Indemnización: 20 remuneraciones diarias por año (tope 120 rem)',
          'EsSalud o EPS, igual que régimen general',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Comparación rápida',
        text: 'Un trabajador con sueldo S/1,500 en régimen general cuesta al empleador aproximadamente S/23,400/año. El mismo trabajador en MYPE Micro cuesta ~S/19,200 (-18%) y en MYPE Pequeña ~S/21,000 (-10%). El ahorro escala con la cantidad de trabajadores.',
      },
      { type: 'h2', text: '4. La inscripción en el REMYPE' },
      {
        type: 'p',
        text: 'La inscripción en el REMYPE es un trámite aparte, que conviene tener al día. Antes de hacerlo, revisa que tu empresa cumpla los límites de trabajadores y de ventas.',
      },
      {
        type: 'p',
        text: 'Estar inscrito también importa en una inspección. Con REMYPE, las multas de una MYPE bajan 50% y tienen un tope del 1% de sus ingresos netos (RLGIT, art. 48.1-A).',
      },
      {
        type: 'callout',
        variant: 'warning',
        title: 'Importante',
        text: 'La inscripción no es automática. Y si tu empresa supera los límites y no migra al régimen general, acumula contingencias laborales.',
      },
      { type: 'h2', text: '5. Cuando SÍ te conviene estar en régimen general' },
      {
        type: 'p',
        text: 'No siempre la MYPE es lo más conveniente. Si:',
      },
      {
        type: 'ul',
        items: [
          'Quieres contratar personal senior (S/ 5k+/mes): valoran CTS + gratificaciones',
          'Tu empresa crece rápido y vas a superar los límites en <12 meses',
          'Trabajas con grandes empresas que auditan a sus proveedores (compliance general es más sólido)',
          'Licitas al Estado (ventaja competitiva tener régimen robusto)',
        ],
      },
      {
        type: 'p',
        text: 'En esos casos, el costo extra del régimen general se compensa con mejor retención de talento y acceso a mercados.',
      },
      {
        type: 'callout',
        variant: 'success',
        title: '¿Estás en el régimen correcto?',
        text: 'En el diagnóstico de cumplimiento de Comply360 revisamos si tus trabajadores están en el régimen laboral que corresponde y si pagas los beneficios que exige la ley. La versión express es gratis.',
      },
    ],
    cta: { label: 'Pedir diagnóstico gratis', href: '/diagnostico-gratis' },
  },
]

/** Catálogo publicado: artículos de servicios del estudio primero, luego los anteriores. */
export const ARTICLES: BlogArticle[] = [...ARTICLES_CUMPLIMIENTO, ...ARTICLES_BASE]

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return ARTICLES.find((a) => a.slug === slug)
}

export function getAllSlugs(): string[] {
  return ARTICLES.map((a) => a.slug)
}
