/**
 * Catálogo de artículos del blog /recursos — SEO long-tail Perú laboral.
 *
 * Para bootstrap tenemos 3 artículos seed. Cuando escalemos, migrar a MDX +
 * filesystem-based content (o a un CMS headless tipo Sanity).
 *
 * Convención de slugs:
 *   - kebab-case
 *   - keyword principal al inicio
 *   - incluir "peru" o año si ayuda a diferenciación (ej: "cts-2026-peru")
 */

export interface BlogArticle {
  slug: string
  title: string
  metaDescription: string
  /** Keyword principal para SEO (h1 + URL + title match) */
  keyword: string
  /** Categoría visible en el listado */
  category: 'Calculadoras' | 'Compliance' | 'MYPE' | 'SUNAFIL' | 'Contratos' | 'SST'
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

export const ARTICLES: BlogArticle[] = [
  {
    slug: 'como-calcular-cts-2026-peru',
    keyword: 'cálculo CTS 2026',
    title: 'Cómo calcular la CTS 2026 en Perú: guía completa paso a paso',
    metaDescription:
      'Aprendé a calcular la CTS 2026 de tus trabajadores. Fórmula oficial D.S. 001-97-TR, casos con y sin asignación familiar, plazos de depósito (15 may / 15 nov) y errores frecuentes.',
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
          'Multa SUNAFIL por no depositar a tiempo: hasta 0.77 UIT por trabajador afectado (infracción grave)',
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
        title: 'Calculadora gratis',
        text: 'Probá la calculadora CTS de Comply360 sin registrarte. Ingresás los datos del trabajador y te da el monto exacto + la memoria de cálculo para auditoría. Link abajo.',
      },
    ],
    cta: { label: 'Calcular mi CTS gratis', href: '/dashboard/calculadoras' },
  },

  {
    slug: 'multas-sunafil-2026-cuadro-completo',
    keyword: 'multas SUNAFIL 2026',
    title: 'Multas SUNAFIL 2026: cuadro completo actualizado por infracción',
    metaDescription:
      'Cuadro oficial de multas SUNAFIL 2026 con UIT vigente (S/5,500). Rangos por tipo de infracción (leve, grave, muy grave) y cantidad de trabajadores. Descuentos por subsanación.',
    category: 'SUNAFIL',
    readMinutes: 9,
    publishedAt: '2026-04-20',
    updatedAt: '2026-04-20',
    author: 'Equipo Comply360',
    content: [
      {
        type: 'p',
        text: 'SUNAFIL aumentó las fiscalizaciones 30% en 2026 respecto al año anterior. Conocer los montos exactos de multas, el factor de corrección por cantidad de trabajadores y los descuentos por subsanación voluntaria es la diferencia entre sobrevivir una inspección o cerrar la empresa.',
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
      { type: 'h2', text: '3. Cuadro de multas por cantidad de trabajadores' },
      {
        type: 'p',
        text: 'Las multas se multiplican según cuántos trabajadores estén afectados por la infracción. El cuadro oficial (por tipo × cantidad):',
      },
      { type: 'h3', text: '3.1. Leves (por trabajador afectado)' },
      {
        type: 'ul',
        items: [
          '1 a 10 trabajadores: 0.045 UIT (~S/248)',
          '11 a 25: 0.110 UIT (~S/605)',
          '26 a 50: 0.220 UIT (~S/1,210)',
          '51 a 100: 0.440 UIT (~S/2,420)',
          '101 a 200: 0.770 UIT (~S/4,235)',
          '201 a 300: 1.100 UIT (~S/6,050)',
          '301 a 400: 1.540 UIT (~S/8,470)',
          '401 a 500: 2.420 UIT (~S/13,310)',
          '501 a 999: 3.520 UIT (~S/19,360)',
          '1000 o más: 5.280 UIT (~S/29,040)',
        ],
      },
      { type: 'h3', text: '3.2. Graves' },
      {
        type: 'ul',
        items: [
          '1 a 10 trabajadores: 0.225 UIT (~S/1,238)',
          '11 a 25: 0.550 UIT (~S/3,025)',
          '26 a 50: 1.100 UIT (~S/6,050)',
          '51 a 100: 2.200 UIT (~S/12,100)',
          '101 a 200: 3.850 UIT (~S/21,175)',
          '201 a 300: 5.500 UIT (~S/30,250)',
          '301 a 400: 7.700 UIT (~S/42,350)',
          '401 a 500: 12.100 UIT (~S/66,550)',
          '501 a 999: 17.600 UIT (~S/96,800)',
          '1000 o más: 26.400 UIT (~S/145,200)',
        ],
      },
      { type: 'h3', text: '3.3. Muy graves' },
      {
        type: 'ul',
        items: [
          '1 a 10 trabajadores: 0.450 UIT (~S/2,475)',
          '11 a 25: 1.100 UIT (~S/6,050)',
          '26 a 50: 2.200 UIT (~S/12,100)',
          '51 a 100: 4.400 UIT (~S/24,200)',
          '101 a 200: 7.700 UIT (~S/42,350)',
          '201 a 300: 11.000 UIT (~S/60,500)',
          '301 a 400: 15.400 UIT (~S/84,700)',
          '401 a 500: 24.200 UIT (~S/133,100)',
          '501 a 999: 35.200 UIT (~S/193,600)',
          '1000 o más: 52.530 UIT (~S/288,915)',
        ],
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
      { type: 'h2', text: '5. Casos reales comunes' },
      { type: 'h3', text: '5.1. No pago de CTS (1 trabajador)' },
      {
        type: 'p',
        text: 'Infracción grave (1-10 trabajadores) = 0.225 UIT = S/ 1,238. Si afecta 10 trabajadores, sigue en el mismo rango = mismo monto. Si afecta 15 trabajadores, sube al rango 11-25 = 0.55 UIT = S/ 3,025.',
      },
      { type: 'h3', text: '5.2. No tener RIT publicado' },
      {
        type: 'p',
        text: 'Infracción leve (incumplimiento formal). 1-10 trabajadores = S/248. Empresas con 101-200 trabajadores = S/4,235.',
      },
      { type: 'h3', text: '5.3. Hostigamiento sexual sin canal de denuncia (Ley 27942)' },
      {
        type: 'p',
        text: 'Infracción muy grave. 51-100 trabajadores = 4.4 UIT = S/ 24,200. Empresas grandes pueden pagar hasta S/288k.',
      },
      {
        type: 'callout',
        variant: 'success',
        title: 'Simulador gratuito',
        text: 'Con el simulacro SUNAFIL de Comply360 corrés la inspección virtual, detectás tus hallazgos y calculás tu multa potencial exacta en 15 minutos. Incluye Acta de Requerimiento formato R.M. 199-2016-TR.',
      },
    ],
    cta: { label: 'Probar simulacro SUNAFIL gratis', href: '/diagnostico-gratis' },
  },

  {
    slug: 'regimen-mype-peru-guia-completa-2026',
    keyword: 'régimen MYPE Perú',
    title: 'Régimen MYPE en Perú 2026: beneficios, límites y cómo acogerte',
    metaDescription:
      'Guía completa del régimen MYPE Micro y Pequeña Empresa en Perú. Límites de ventas, cantidad de trabajadores, beneficios laborales simplificados (CTS, gratificaciones, vacaciones) y cómo inscribirte en REMYPE.',
    category: 'MYPE',
    readMinutes: 8,
    publishedAt: '2026-04-20',
    updatedAt: '2026-04-20',
    author: 'Equipo Comply360',
    content: [
      {
        type: 'p',
        text: 'El 99% de las empresas peruanas son MYPE. Saber si tu empresa califica como microempresa o pequeña empresa puede ahorrarte 40-70% en costos laborales anuales vs el régimen general. Guía rápida de los límites, beneficios y trámites en 2026.',
      },
      { type: 'h2', text: '1. Base legal vigente' },
      {
        type: 'p',
        text: 'La Ley 32353 (publicada en 2025, vigente 2026) reemplazó a la Ley 28015. Mantiene la filosofía pero actualizó algunos límites y simplificó la inscripción en REMYPE.',
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
      { type: 'h2', text: '4. Cómo inscribirte en REMYPE 2026' },
      {
        type: 'ol',
        items: [
          'Revisá que tu empresa cumpla los límites de trabajadores + ventas',
          'Ingresá a www.sunat.gob.pe con tu Clave SOL',
          'Sección "Operaciones en línea" → "REMYPE"',
          'Llená el formulario con datos de la empresa + trabajadores actuales',
          'La SUNAFIL valida en 5 días hábiles',
          'Al aprobarse, recibís constancia digital que debés conservar',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        title: 'Importante',
        text: 'La inscripción NO es automática — si no te inscribís, la SUNAFIL te tratará como régimen general y te exigirá CTS + gratificaciones completas. Si superás los límites y no migrás a régimen general, acumulás contingencias.',
      },
      { type: 'h2', text: '5. Cuando SÍ te conviene estar en régimen general' },
      {
        type: 'p',
        text: 'No siempre la MYPE es lo más conveniente. Si:',
      },
      {
        type: 'ul',
        items: [
          'Querés contratar personal senior (S/ 5k+/mes): valoran CTS + gratificaciones',
          'Tu empresa crece rápido y vas a superar los límites en <12 meses',
          'Trabajás con grandes empresas que auditan a sus proveedores (compliance general es más sólido)',
          'Licitás al Estado (ventaja competitiva tener régimen robusto)',
        ],
      },
      {
        type: 'p',
        text: 'En esos casos, el costo extra del régimen general se compensa con mejor talent retention y acceso a mercados.',
      },
      {
        type: 'callout',
        variant: 'success',
        title: 'Calculá tu régimen óptimo',
        text: 'Comply360 tiene una calculadora que compara el costo total anual de tener tu planilla en MYPE Micro, MYPE Pequeña o Régimen General. Te dice qué régimen te conviene y por qué.',
      },
    ],
    cta: { label: 'Comparar regímenes gratis', href: '/dashboard/calculadoras' },
  },
]

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return ARTICLES.find((a) => a.slug === slug)
}

export function getAllSlugs(): string[] {
  return ARTICLES.map((a) => a.slug)
}
