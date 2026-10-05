// =============================================
// App
// =============================================

export const APP_NAME = "COMPLY360" as const;

// =============================================
// Plans & Pricing
// =============================================

/**
 * PLANS — fuente de verdad única de pricing.
 *
 * **PRICING OFICIAL 2026-04-30** (ver `docs/PRICING.md`):
 *
 *  • FREE       → S/0     · hasta 5 trabajadores  (freemium / lead capture)
 *  • STARTER    → S/249   · hasta 20 trabajadores (PYME 10-20 personas)
 *  • PRO ⭐     → S/699   · hasta 75 trabajadores (sweet spot 30-75)
 *  • EMPRESA    → S/1,899 · hasta 250 trabajadores (mediana 100-250)
 *  • ENTERPRISE → custom desde S/4,990 · ilimitado (corporativo 300+)
 *
 * Cambios 2026-04-30 vs versión anterior:
 *  - Reordenado: PRO ahora es intermedio (sweet spot), EMPRESA es alto
 *  - Eliminado BUSINESS (absorbido por EMPRESA)
 *  - Eliminado white-label (defender brand equity)
 *  - T-REGISTRO + PLAME export desde STARTER
 *  - Boletas masivas gratis para todos los planes
 *  - Soporte 24/7 IA + soporte humano escalado por plan
 *  - Founding Members: 50% off por 2 años para primeros 20 (no es LAUNCH_DISCOUNT global)
 *
 * Sincronizado con: `src/lib/payments/culqi.ts`, `src/app/dashboard/planes/page.tsx`,
 * `src/lib/plan-features.ts`, `src/lib/plan-gate.ts`, `docs/PRICING.md`.
 *
 * Política de grandfather: clientes activos con `pricingFrozenUntil > now`
 * conservan el precio anterior. Implementado en `Subscription.pricingFrozenUntil`.
 */

/**
 * Descuento promocional global de lanzamiento.
 * Se mantiene en 0 ahora — el descuento real es Founding Members
 * (50% por 2 años para los primeros 20 clientes) que se aplica per-cliente
 * vía `Subscription.foundingMember = true`, no como descuento global.
 */
export const LAUNCH_DISCOUNT_PERCENT = 0

/**
 * Founding Members Program — primeros 20 clientes obtienen 50% off por 2 años.
 * Ver `docs/PRICING.md` sección "Promos de lanzamiento".
 */
export const FOUNDING_MEMBER_DISCOUNT_PERCENT = 50
export const FOUNDING_MEMBER_DURATION_MONTHS = 24
export const FOUNDING_MEMBER_MAX_SLOTS = 20

/**
 * Pago anual: 2 meses gratis (~17% descuento).
 * priceAnnual = priceMonthly * 10 (en vez de 12).
 */
export const ANNUAL_DISCOUNT_MONTHS = 2

/**
 * Calcula el precio "original" (antes del descuento) a partir del precio actual.
 * Útil cuando hay descuento promocional activo (LAUNCH_DISCOUNT_PERCENT > 0).
 */
export function getOriginalPrice(currentPrice: number, discountPercent = LAUNCH_DISCOUNT_PERCENT): number {
  if (discountPercent === 0 || discountPercent >= 100) return currentPrice
  return Math.round(currentPrice / (1 - discountPercent / 100))
}

/**
 * Calcula el precio anual con descuento (2 meses gratis).
 */
export function getAnnualPrice(monthlyPrice: number): number {
  return monthlyPrice * (12 - ANNUAL_DISCOUNT_MONTHS)
}

export const PLANS = {
  FREE: {
    key: "FREE",
    name: "Gratuito",
    price: 0,
    priceInCentimos: 0,
    priceAnnual: 0,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 5,
    maxUsers: 1,
    extraPerWorkerSoles: 0,
    isCustomQuote: false,
    features: [
      "Hasta 5 trabajadores",
      "13 calculadoras laborales peruanas",
      "Calendario de obligaciones (CTS, grati, AFP)",
      "Boletas individuales y masivas (ilimitadas)",
      "1 contrato/mes con plantilla Comply360",
      "Diagnóstico SUNAFIL Express (1/mes)",
      "Alertas básicas por email (semanales)",
      "🤖 Asistente de soporte 24/7",
      "Branding 'Powered by Comply360' en PDFs",
      "Sin tarjeta de crédito",
    ],
  },
  STARTER: {
    key: "STARTER",
    name: "Starter",
    price: 249,
    priceInCentimos: 24900,
    priceAnnual: 2490, // 10 meses (2 gratis)
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 20,
    maxUsers: 2,
    extraPerWorkerSoles: 12,
    isCustomQuote: false,
    features: [
      "Hasta 20 trabajadores (S/12 por trabajador adicional)",
      "Todo del plan Free",
      "Legajo digital (manual)",
      "5 contratos/mes con plantillas",
      "1 plantilla propia (zero-liability)",
      "Export PLAME + T-REGISTRO",
      "Diagnóstico SUNAFIL Express (ilimitado)",
      "Alertas diarias por email",
      "Asistente laboral (50 consultas al mes)",
      "💬 Chat humano lun-sáb 8am-8pm",
      "2 usuarios admin",
    ],
  },
  PRO: {
    key: "PRO",
    name: "Pro",
    price: 699,
    priceInCentimos: 69900,
    priceAnnual: 6990, // 10 meses (2 gratis)
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 75,
    maxUsers: 5,
    extraPerWorkerSoles: 15,
    isCustomQuote: false,
    features: [
      "Hasta 75 trabajadores (S/15 por trabajador adicional)",
      "Todo del plan Starter",
      "Contratos ilimitados",
      "5 plantillas propias (zero-liability)",
      "Legajo digital con IA Vision (auto-verifica DNI, CV, exámenes)",
      "Diagnóstico SUNAFIL completo (135 preguntas)",
      "Simulacro SUNAFIL completo + Acta de Requerimiento",
      "AI Review de contratos",
      "Asistente laboral (500 consultas al mes)",
      "15 generadores SST (Ley 29783)",
      "Canal de denuncias público (Ley 27942)",
      "Push notifications + Alertas diarias",
      "📱 WhatsApp Business (respuesta <2h hábiles)",
      "5 usuarios admin",
    ],
  },
  EMPRESA: {
    key: "EMPRESA",
    name: "Empresa",
    price: 1899,
    priceInCentimos: 189900,
    priceAnnual: 18990, // 10 meses (2 gratis)
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 250,
    maxUsers: 15,
    extraPerWorkerSoles: 12,
    isCustomQuote: false,
    features: [
      "Hasta 250 trabajadores (S/12 por trabajador adicional)",
      "Todo del plan Pro",
      "Plantillas propias ilimitadas",
      "Portal del trabajador (PWA + firma biométrica Ley 27269)",
      "E-Learning + certificados QR",
      "Multi-empresa (1 cuenta, varias orgs)",
      "Cascada de onboarding automatizada",
      "Asistente laboral (2,000 consultas al mes)",
      "🚨 SLA 4h 24/7 (incluyendo domingos)",
      "15 usuarios admin",
      "Reportes ejecutivos PDF",
    ],
  },
  // BUSINESS — plan legacy. Mantenido por compatibilidad con schema Prisma
  // (enum SubscriptionPlan) y código histórico. NO se muestra en UI nueva.
  // Las features que tenía BUSINESS (multi-empresa, reportes consolidados)
  // ahora vienen incluidas en EMPRESA según pricing oficial 2026-04-30.
  BUSINESS: {
    key: "BUSINESS",
    name: "Business (Legacy)",
    price: 1899,
    priceInCentimos: 189900,
    priceAnnual: 18990,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 250,
    maxUsers: 15,
    extraPerWorkerSoles: 12,
    isCustomQuote: false,
    features: [
      "Plan legacy — equivale a EMPRESA en pricing 2026-04-30",
    ],
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    name: "Enterprise",
    // price=0 + isCustomQuote=true → UI muestra "Cotizar" en lugar de S/0.
    // El precio real se acuerda en sales call. Desde S/4,990/mes según
    // workers + features + SLA.
    price: 0,
    priceInCentimos: 0,
    priceAnnual: 0,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 999999,
    maxUsers: 999999,
    extraPerWorkerSoles: 0,
    isCustomQuote: true,
    features: [
      "Para empresas 300+ trabajadores · desde S/4,990/mes",
      "Todo del plan Empresa",
      "Trabajadores ilimitados",
      "API REST v1 + webhooks salientes",
      "Integración API SUNAT / T-REGISTRO (cuando esté disponible)",
      "Multi-empresa ilimitada (holdings)",
      "Asistente laboral sin límite de consultas",
      "👤 Customer Success Manager dedicado",
      "📞 Línea telefónica directa",
      "Data Processing Agreement (DPA) personalizado",
      "Integración con planilla externa (Buk, Ofisis, Starsoft)",
      "Usuarios admin ilimitados",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// =============================================
// Navigation
// =============================================
//
// El menú lateral se organiza por TAREAS del cliente (gerente, RRHH, contador),
// no por módulos técnicos. 7 grupos (`NAV_HUBS`), cada uno con sus páginas.
//
// Tres niveles de visibilidad:
//  1. Ítem visible        → menú lateral + buscador (Cmd+K) + migas de pan.
//  2. Ítem `hidden`       → buscador + migas + URL (no ocupa espacio en el menú).
//  3. `NAV_URL_ONLY_ROUTES` → solo URL + migas (duplicadas, experimentales o que
//                             aún no guardan datos). No salen ni en el buscador.
//
// Ninguna ruta se borra: sacar algo del menú es solo dejar de listarlo.
// El candado por plan NO vive aquí: se resuelve por `href` en
// `ROUTE_FEATURE_MAP` (src/lib/plan-features.ts), así que cada ítem conserva
// su candado mientras su `href` no cambie.

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: string;
  /**
   * Explicación corta en lenguaje simple: qué hay ahí y qué significa la
   * sigla, si tiene. El menú lateral la muestra como ayuda emergente.
   */
  readonly hint?: string;
  /**
   * Página fuera del menú lateral: sigue accesible por URL, en el buscador
   * (Cmd+K) y con su nombre en las migas de pan.
   */
  readonly hidden?: boolean;
  /** Complemento del ítem anterior: el menú lo muestra más chico y sangrado. */
  readonly secondary?: boolean;
  /**
   * Solo para páginas ocultas: ítem VISIBLE desde el que se llega a esta
   * página. Se ilumina en el menú y aparece como paso previo en las migas.
   */
  readonly parentHref?: string;
}

export interface NavHub {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  readonly rootHref: string;
  /** Qué contiene el grupo, en una línea. El menú lo muestra bajo el título. */
  readonly description: string;
  readonly items: readonly NavItem[];
}

// Las llaves (`key`) se conservan de la versión anterior porque otras partes
// las usan (sugerencias del copiloto en use-page-context, contadores del menú).
export const NAV_HUBS: readonly NavHub[] = [
  {
    key: "cockpit",
    label: "Inicio",
    icon: "LayoutDashboard",
    rootHref: "/dashboard",
    description: "Tu resumen, lo pendiente y las fechas clave",
    items: [
      { label: "Resumen", href: "/dashboard", icon: "LayoutDashboard", hint: "Cómo está tu empresa hoy, en una sola vista" },
      { label: "Pendientes", href: "/dashboard/plan-accion", icon: "ListChecks", hint: "Lo que debes resolver, ordenado por urgencia" },
      { label: "Calendario", href: "/dashboard/calendario", icon: "Calendar", hint: "Fechas de pago de CTS, gratificaciones, AFP y otras obligaciones" },
      // Fuera del menú: Pendientes ya junta alertas y tareas; la campana del
      // topbar lleva a Alertas.
      { label: "Alertas", href: "/dashboard/alertas", icon: "Bell", hidden: true, parentHref: "/dashboard/plan-accion" },
      { label: "Tareas de cumplimiento", href: "/dashboard/tareas", icon: "ListChecks", hidden: true, parentHref: "/dashboard/plan-accion" },
      { label: "Reportes", href: "/dashboard/reportes", icon: "BarChart3", hidden: true, hint: "Informes en PDF del cumplimiento de tu empresa" },
      { label: "Notificaciones", href: "/dashboard/notificaciones", icon: "Bell", hidden: true },
    ],
  },
  {
    key: "equipo",
    label: "Mi personal",
    icon: "Users",
    rootHref: "/dashboard/trabajadores",
    description: "Trabajadores, asistencia, vacaciones y más",
    items: [
      { label: "Trabajadores", href: "/dashboard/trabajadores", icon: "Users", hint: "Fichas y legajos de tu personal en planilla" },
      { label: "Organigrama", href: "/dashboard/organigrama", icon: "Network", hint: "Quién reporta a quién y los comités de tu empresa" },
      { label: "Asistencia", href: "/dashboard/asistencia", icon: "Clock", hint: "Marcaciones de entrada y salida, tardanzas y horas extra" },
      { label: "Vacaciones", href: "/dashboard/vacaciones", icon: "CalendarRange", hint: "Días ganados, tomados y pendientes de cada trabajador" },
      { label: "Solicitudes", href: "/dashboard/solicitudes", icon: "ClipboardList", hint: "Permisos y pedidos que te envían tus trabajadores" },
      { label: "Locadores y contratistas", href: "/dashboard/prestadores", icon: "Briefcase", hint: "Personas que te dan servicios sin estar en planilla" },
      { label: "Recibos por honorarios", href: "/dashboard/honorarios", icon: "ScrollText", secondary: true, hint: "Recibos que te emiten tus locadores y si debes retenerles impuesto" },
      { label: "Empresas contratistas", href: "/dashboard/terceros", icon: "Building2", secondary: true, hint: "Empresas que te prestan servicios o envían personal a tu local (tercerización)" },
      { label: "Capacitaciones", href: "/dashboard/capacitaciones", icon: "GraduationCap", hint: "Cursos obligatorios y certificados de tu personal" },
      { label: "Denuncias", href: "/dashboard/denuncias", icon: "ShieldAlert", hint: "Canal para reportar hostigamiento sexual y otros casos (Ley 27942)" },
      { label: "Igualdad salarial", href: "/dashboard/igualdad-salarial", icon: "Equal", hint: "Sueldos por categoría, sin diferencias injustificadas (Ley 30709)" },
      { label: "Sindicato y negociación colectiva", href: "/dashboard/relaciones-colectivas", icon: "Scale", hint: "Sindicatos, convenios colectivos y pliegos de reclamos" },
      { label: "Zonas para marcar asistencia", href: "/dashboard/configuracion/asistencia", icon: "Clock", hidden: true, parentHref: "/dashboard/asistencia", hint: "Lugares desde donde tu personal puede marcar su asistencia" },
    ],
  },
  {
    key: "planilla",
    label: "Planilla y pagos",
    icon: "Wallet",
    rootHref: "/dashboard/planilla",
    description: "Planilla, boletas, liquidaciones y cálculos",
    items: [
      { label: "Planilla", href: "/dashboard/planilla", icon: "FileSpreadsheet", hint: "Sueldos del mes, descuentos y aportes de cada trabajador" },
      { label: "Boletas", href: "/dashboard/boletas", icon: "Receipt", hint: "Boletas de pago: emítelas y revisa quién ya las firmó" },
      { label: "Liquidaciones", href: "/dashboard/liquidaciones", icon: "Banknote", hint: "Lo que debes pagar cuando un trabajador deja la empresa" },
      { label: "Calculadoras", href: "/dashboard/calculadoras", icon: "Calculator", hint: "Calcula CTS, gratificación, vacaciones, horas extra y más" },
    ],
  },
  {
    key: "contratos-docs",
    label: "Contratos y documentos",
    icon: "FileText",
    rootHref: "/dashboard/contratos",
    description: "Contratos, plantillas, firmas y normas",
    items: [
      { label: "Contratos", href: "/dashboard/contratos", icon: "FileText", hint: "Crea, renueva y controla el vencimiento de tus contratos" },
      { label: "Plantillas", href: "/dashboard/configuracion/empresa/plantillas", icon: "Files", hint: "Tus modelos de contrato, revisados por tu abogado, listos para llenar" },
      { label: "Revisar un contrato con IA", href: "/dashboard/analizar-contrato", icon: "FileSearch", hint: "Sube un contrato y la inteligencia artificial (IA) te marca las cláusulas riesgosas" },
      { label: "Documentos y firmas", href: "/dashboard/documentos", icon: "FileStack", hint: "Políticas, reglamentos y documentos obligatorios, con la firma de tu personal" },
      { label: "Crear documentos", href: "/dashboard/generadores", icon: "Sparkles", hint: "Genera políticas, reglamentos y formatos obligatorios con los datos de tu empresa" },
      { label: "Cambios en la ley", href: "/dashboard/normas", icon: "Newspaper", hint: "Normas laborales nuevas y cómo afectan a tu empresa" },
      { label: "Documentos por firmar", href: "/dashboard/documentos-firma", icon: "FileText", hidden: true, parentHref: "/dashboard/documentos", hint: "Avance de las firmas de tus trabajadores en políticas y reglamentos" },
    ],
  },
  {
    key: "riesgo",
    label: "Inspección SUNAFIL",
    icon: "ShieldCheck",
    rootHref: "/dashboard/centro-sunafil",
    description: "Prepárate para la visita del inspector de trabajo",
    items: [
      { label: "¿Estoy listo?", href: "/dashboard/diagnostico", icon: "ClipboardList", hint: "Diagnóstico: responde unas preguntas y descubre qué te falta y cuánto arriesgas en multas" },
      { label: "Simulacro de inspección", href: "/dashboard/simulacro", icon: "ShieldAlert", hint: "Ensaya una visita de SUNAFIL sin riesgo y recibe un acta con lo que te observarían" },
      { label: "Documentos que te pedirán", href: "/dashboard/sunafil-ready", icon: "CheckSquare", hint: "Los documentos que el inspector suele pedir: cuáles tienes y cuáles te faltan" },
      { label: "Riesgo laboral", href: "/dashboard/riesgo-laboral", icon: "Radar", hint: "Multas que puedes evitar y qué hacer primero" },
      { label: "Inspección en curso", href: "/dashboard/inspeccion-en-vivo", icon: "Siren", hint: "¿Ya llegó el inspector? Te guiamos paso a paso durante la visita" },
      { label: "Centro SUNAFIL", href: "/dashboard/centro-sunafil", icon: "ShieldCheck", hidden: true, hint: "Diagnóstico, brechas, plan de acción e inspecciones en una sola pantalla" },
      { label: "Constancias obligatorias", href: "/dashboard/cumplimiento-documental", icon: "Files", hidden: true, parentHref: "/dashboard/sunafil-ready", hint: "Constancias de tu empresa que SUNAFIL puede pedirte y su vigencia" },
    ],
  },
  {
    key: "sst",
    label: "Seguridad y salud (SST)",
    icon: "HardHat",
    rootHref: "/dashboard/sst",
    description: "Riesgos, accidentes, exámenes médicos y comité",
    items: [
      { label: "Resumen", href: "/dashboard/sst", icon: "HardHat", hint: "Cómo va tu sistema de seguridad y salud en el trabajo (SST, Ley 29783)" },
      { label: "Riesgos por puesto (IPERC)", href: "/dashboard/sst/iperc", icon: "ClipboardList", hint: "IPERC: los peligros y riesgos de cada puesto y cómo controlarlos. Aquí también están los procedimientos de trabajo seguro" },
      { label: "Accidentes", href: "/dashboard/sst/accidentes", icon: "Siren", hint: "Registra accidentes e incidentes y avisa a tiempo al Ministerio de Trabajo" },
      { label: "Exámenes médicos (EMO)", href: "/dashboard/sst/emo", icon: "Stethoscope", hint: "EMO: exámenes médicos ocupacionales al ingresar, cada cierto tiempo y al salir" },
      { label: "Equipos de protección (EPP)", href: "/dashboard/sst/epp", icon: "HardHat", hint: "EPP: casco, guantes, lentes y otros equipos que entregas a cada trabajador" },
      { label: "Comité de SST", href: "/dashboard/sst/comite", icon: "Users", hint: "Comité o supervisor de seguridad y salud: miembros, reuniones y actas" },
      { label: "Plan anual", href: "/dashboard/sst/plan-anual", icon: "Calendar", hint: "Actividades de seguridad y salud programadas para el año" },
      // Fuera del menú: se llega desde el Resumen o desde su página padre.
      { label: "Procedimientos de trabajo seguro (PETS, PETAR, ATS)", href: "/dashboard/sst/pets-petar-ats", icon: "FileText", hidden: true, parentHref: "/dashboard/sst/iperc", hint: "PETS: procedimiento escrito de trabajo seguro. PETAR: permiso para trabajos de alto riesgo. ATS: análisis de trabajo seguro" },
      { label: "Sedes de trabajo", href: "/dashboard/sst/sedes", icon: "Building2", hidden: true, parentHref: "/dashboard/sst", hint: "Tus locales, sus puestos y su mapa de riesgos" },
      { label: "Visitas de verificación", href: "/dashboard/sst/visitas", icon: "ClipboardList", hidden: true, parentHref: "/dashboard/sst", hint: "Visitas a tus sedes para revisar las condiciones de seguridad" },
      { label: "Elecciones del comité", href: "/dashboard/sst/comite/elecciones", icon: "Award", hidden: true, parentHref: "/dashboard/sst/comite" },
      { label: "Primeros pasos en SST", href: "/dashboard/sst/onboarding", icon: "Sparkles", hidden: true, parentHref: "/dashboard/sst", hint: "Guía para configurar seguridad y salud (SST) desde cero" },
      { label: "Puntaje de SST", href: "/dashboard/sst/score", icon: "ShieldCheck", hidden: true, parentHref: "/dashboard/sst", hint: "Qué tan completa está tu seguridad y salud en el trabajo (SST) y cuánto arriesgas en multas" },
      { label: "Memoria anual", href: "/dashboard/sst/memoria-anual", icon: "ScrollText", hidden: true, parentHref: "/dashboard/sst/plan-anual", hint: "Informe de lo que se hizo en el año en seguridad y salud" },
    ],
  },
  {
    key: "config",
    label: "Ajustes y ayuda",
    icon: "Settings",
    rootHref: "/dashboard/configuracion",
    description: "Tu empresa, usuarios, plan y soporte",
    items: [
      { label: "Mi empresa", href: "/dashboard/configuracion/empresa", icon: "Building2", hint: "RUC, razón social, logo y datos de tu empresa" },
      { label: "Usuarios y equipo", href: "/dashboard/configuracion/equipo", icon: "Users", hint: "Invita a tu equipo y define qué puede ver o hacer cada uno" },
      { label: "Plan y pago", href: "/dashboard/planes", icon: "CreditCard", hint: "Tu plan actual, cambiar de plan y pagos" },
      { label: "Integraciones", href: "/dashboard/integraciones", icon: "Plug", hint: "Archivos para el registro de trabajadores (T-REGISTRO) y la planilla electrónica (PLAME) de SUNAT" },
      { label: "Avisos automáticos", href: "/dashboard/configuracion/notificaciones", icon: "Bell", hint: "Elige a qué correo llegan las alertas y revisa qué te enviamos" },
      // La página vive bajo /sst, pero es un tema de datos personales, no de seguridad.
      { label: "Privacidad de datos (ARCO)", href: "/dashboard/sst/arco", icon: "Shield", hint: "ARCO: pedidos de tus trabajadores para ver, corregir, borrar u oponerse al uso de sus datos personales (Ley 29733)" },
      { label: "Ayuda", href: "/dashboard/ayuda", icon: "LifeBuoy", hint: "Guías y preguntas frecuentes" },
      { label: "Todos los ajustes", href: "/dashboard/configuracion", icon: "Settings", hidden: true },
      { label: "Seguridad de la cuenta", href: "/dashboard/configuracion/seguridad", icon: "Shield", hidden: true, hint: "Contraseña, verificación en dos pasos y sesiones abiertas" },
      { label: "Soporte", href: "/dashboard/configuracion/soporte", icon: "LifeBuoy", hidden: true, parentHref: "/dashboard/ayuda" },
      { label: "Historial del asistente", href: "/dashboard/asistente-ia", icon: "Bot", hidden: true, parentHref: "/dashboard/ayuda", hint: "Tus conversaciones anteriores con el asistente de inteligencia artificial (IA)" },
    ],
  },
] as const;

/**
 * Rutas que existen pero no van en el menú NI en el buscador: duplicadas,
 * experimentales o que aún no guardan los datos. Solo sirven para abrir el
 * grupo correcto del menú y nombrarlas en las migas de pan.
 *
 * `/dashboard/expedientes` y `/dashboard/ia-laboral` no están aquí: next.config
 * las redirige antes de llegar al dashboard.
 */
export interface NavUrlOnlyRoute {
  readonly href: string;
  readonly hubKey: string;
  readonly label: string;
  /** `false` si la ruta no tiene página propia (solo subpáginas): su miga no es enlace. */
  readonly hasPage?: boolean;
  readonly parentHref?: string;
}

export const NAV_URL_ONLY_ROUTES: readonly NavUrlOnlyRoute[] = [
  // Asistentes guiados de "¿Qué quieres hacer?" (cada uno pone su título en la miga).
  { href: "/dashboard/decisiones", hubKey: "cockpit", label: "¿Qué quieres hacer?", hasPage: false },
  { href: "/dashboard/onboarding", hubKey: "cockpit", label: "Configuración inicial" },
  { href: "/dashboard/gamificacion", hubKey: "cockpit", label: "Logros" },
  // Teletrabajo todavía no guarda los datos.
  { href: "/dashboard/teletrabajo", hubKey: "equipo", label: "Teletrabajo" },
  // Duplicado de "Sindicato y negociación colectiva".
  { href: "/dashboard/terceros/sindical", hubKey: "equipo", label: "Registro sindical", parentHref: "/dashboard/relaciones-colectivas" },
  // Casilla SUNAFIL todavía no guarda los datos.
  { href: "/dashboard/casilla-sunafil", hubKey: "riesgo", label: "Casilla SUNAFIL" },
  // Las matrices IPERC se abren desde "Riesgos por puesto".
  { href: "/dashboard/sst/iperc-bases", hubKey: "sst", label: "Matriz IPERC", hasPage: false, parentHref: "/dashboard/sst/iperc" },
  // Duplicados de "Integraciones" y "Plan y pago".
  { href: "/dashboard/configuracion/integraciones", hubKey: "config", label: "Integraciones", parentHref: "/dashboard/integraciones" },
  { href: "/dashboard/configuracion/facturacion", hubKey: "config", label: "Facturación", parentHref: "/dashboard/planes" },
  { href: "/dashboard/configuracion/marca-blanca", hubKey: "config", label: "Marca blanca" },
  { href: "/dashboard/configuracion/webhooks", hubKey: "config", label: "Avisos a otros sistemas" },
  { href: "/dashboard/configuracion/diagnostico", hubKey: "config", label: "Diagnóstico técnico" },
  { href: "/dashboard/configuracion/automatizaciones", hubKey: "config", label: "Automatizaciones", hasPage: false },
  { href: "/dashboard/marketplace", hubKey: "config", label: "Catálogo de integraciones" },
  { href: "/dashboard/certificacion", hubKey: "config", label: "Certificación" },
  { href: "/dashboard/api-docs", hubKey: "config", label: "Documentación de la API" },
] as const;

/**
 * Nombres legibles de subpáginas para las migas de pan (último tramo de la
 * ruta). Lo que no esté aquí se muestra "humanizado" (`horas-extras` →
 * "Horas extras") o como "Detalle" si parece un identificador.
 */
export const NAV_SEGMENT_LABELS: Readonly<Record<string, string>> = {
  nuevo: "Nuevo",
  nueva: "Nueva",
  editar: "Editar",
  resultado: "Resultado",
  analisis: "Análisis",
  bulk: "Carga masiva",
  operaciones: "Operaciones",
  cese: "Cese",
  "registrar-boleta": "Registrar boleta",
  extranjeros: "Trabajadores extranjeros",
  "importar-pdf": "Importar desde PDF",
  kiosko: "Modo kiosko",
  seguridad: "Seguridad",
  people: "Personas",
  analytics: "Análisis y predicción",
  "drill-down": "Detalle por área",
  import: "Importar",
  "captura-offline": "Captura sin conexión",
  "asignar-puestos": "Asignar puestos",
  "mapa-riesgos": "Mapa de riesgos",
  agentes: "Agentes de IA",
  workflows: "Flujos automáticos",
  sunafil: "SUNAFIL",
  "api-docs": "Documentación de la API",
  // Calculadoras
  aportes: "Aportes",
  "costo-empleador": "Costo del empleador",
  cts: "CTS",
  gratificacion: "Gratificación",
  "horas-extras": "Horas extras",
  indemnizacion: "Indemnización",
  "intereses-legales": "Intereses legales",
  liquidacion: "Liquidación",
  "multa-sunafil": "Multa SUNAFIL",
  utilidades: "Utilidades",
  vacaciones: "Vacaciones",
  // Generadores de documentos
  "acta-comite-sst": "Acta del comité de SST",
  "capacitacion-sst": "Capacitación en SST",
  "cuadro-categorias": "Cuadro de categorías",
  "declaracion-jurada": "Declaración jurada",
  "entrega-epp": "Entrega de EPP",
  "horario-trabajo-cartel": "Cartel de horario",
  "induccion-sst": "Inducción en SST",
  iperc: "Matriz IPERC",
  "plan-anual-sst": "Plan anual de SST",
  "politica-hostigamiento": "Política contra el hostigamiento",
  "politica-sst": "Política de SST",
  "registro-accidentes": "Registro de accidentes",
  "reglamento-interno": "Reglamento interno",
  "sintesis-legislacion": "Síntesis de la legislación",
};

/** Quita query, hash y barra final para comparar rutas. */
function normalizeNavPath(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] || "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * ¿`pathname` está dentro de `href`? `/a/b` coincide con `/a/b` y `/a/b/...`,
 * pero NO con `/a/bc`. `/dashboard` solo coincide consigo misma (si no, todo
 * el dashboard sería "Resumen").
 */
export function navHrefMatches(pathname: string, href: string): boolean {
  const path = normalizeNavPath(pathname);
  if (href === "/dashboard") return path === "/dashboard";
  return path === href || path.startsWith(`${href}/`);
}

/** Una página conocida: ítem del menú (visible u oculto) o ruta solo-URL. */
export interface NavEntry {
  readonly hub: NavHub;
  readonly label: string;
  readonly href: string;
  /** No aparece en el menú lateral. */
  readonly hidden: boolean;
  /** Tiene página propia (su miga puede ser enlace). */
  readonly linkable: boolean;
  readonly parentHref?: string;
}

const NAV_ENTRIES: readonly NavEntry[] = [
  ...NAV_HUBS.flatMap((hub) =>
    hub.items.map((item) => ({
      hub,
      label: item.label,
      href: item.href,
      hidden: Boolean(item.hidden),
      linkable: true,
      parentHref: item.parentHref,
    })),
  ),
  ...NAV_URL_ONLY_ROUTES.map((route) => ({
    hub: NAV_HUBS.find((hub) => hub.key === route.hubKey) ?? NAV_HUBS[0],
    label: route.label,
    href: route.href,
    hidden: true,
    linkable: route.hasPage !== false,
    parentHref: route.parentHref,
  })),
];

export interface NavLocation {
  /** Grupo al que pertenece la página (el que se despliega en el menú). */
  readonly hub: NavHub;
  /** Página conocida que mejor coincide con la ruta, o `null` si no hay. */
  readonly entry: NavEntry | null;
  /** El ÚNICO ítem visible del menú que debe iluminarse, o `null`. */
  readonly activeHref: string | null;
}

/**
 * Ubica una ruta del dashboard en el menú. Gana la coincidencia más
 * específica (la más larga), así `/dashboard/sst/emo` ilumina solo "Exámenes
 * médicos" y no también el "Resumen" de SST.
 */
export function resolveNavLocation(pathname: string): NavLocation {
  const path = normalizeNavPath(pathname);
  let best: NavEntry | null = null;
  for (const entry of NAV_ENTRIES) {
    if (navHrefMatches(path, entry.href) && (!best || entry.href.length > best.href.length)) {
      best = entry;
    }
  }
  if (!best) return { hub: NAV_HUBS[0], entry: null, activeHref: null };
  return {
    hub: best.hub,
    entry: best,
    activeHref: best.hidden ? (best.parentHref ?? null) : best.href,
  };
}

/**
 * Dado un pathname del dashboard, devuelve el grupo al que pertenece.
 * Usado por la sidebar (grupo abierto), el topbar y el contexto del copiloto.
 */
export function resolveActiveHub(pathname: string): NavHub {
  return resolveNavLocation(pathname).hub;
}

export interface NavCrumb {
  readonly label: string;
  /** `null` cuando ese nivel no tiene página propia (no es enlace). */
  readonly href: string | null;
}

function isIdSegment(segment: string): boolean {
  if (/^\d+$/.test(segment)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
  // cuid / ids generados: largos, sin guiones y con algún dígito.
  return segment.length >= 10 && /^[A-Za-z0-9_]+$/.test(segment) && /\d/.test(segment);
}

function humanizeSegment(segment: string): string {
  const text = decodeURIComponent(segment).replace(/[-_]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : segment;
}

/**
 * Migas de pan generadas desde `NAV_HUBS`: grupo › (página padre) › página ›
 * subpáginas. `segmentLabel` permite nombrar subpáginas con datos que no viven
 * aquí (p. ej. el título de un asistente guiado).
 */
export function buildNavBreadcrumbs(
  pathname: string,
  segmentLabel?: (segment: string, href: string) => string | undefined,
): NavCrumb[] {
  const path = normalizeNavPath(pathname);
  const { hub, entry } = resolveNavLocation(path);
  const crumbs: NavCrumb[] = [{ label: hub.label, href: hub.rootHref }];

  let consumed = "/dashboard";
  if (entry) {
    const parent = entry.parentHref ? NAV_ENTRIES.find((e) => e.href === entry.parentHref) : undefined;
    if (parent) crumbs.push({ label: parent.label, href: parent.href });
    crumbs.push({ label: entry.label, href: entry.linkable ? entry.href : null });
    consumed = entry.href;
  } else if (!(path === "/dashboard" || path.startsWith("/dashboard/"))) {
    return crumbs;
  }

  let acc = consumed;
  for (const segment of path.slice(consumed.length).split("/").filter(Boolean)) {
    acc = `${acc}/${segment}`;
    const label =
      segmentLabel?.(segment, acc) ??
      NAV_SEGMENT_LABELS[segment] ??
      (isIdSegment(segment) ? "Detalle" : humanizeSegment(segment));
    crumbs.push({ label, href: acc });
  }

  // Sin niveles repetidos seguidos (p. ej. un grupo y su página con el mismo nombre).
  return crumbs.filter((crumb, i) => i === 0 || crumb.label !== crumbs[i - 1].label);
}

// =============================================
// Calculator Types
// =============================================

export const CALCULATOR_TYPES = [
  {
    key: "liquidacion",
    label: "Liquidación de beneficios sociales",
    description: "Calcula CTS, gratificaciones, vacaciones truncas y los demás beneficios que se pagan al cese.",
  },
  {
    key: "cts",
    label: "CTS",
    description: "Compensación por tiempo de servicios que se deposita en mayo y noviembre.",
  },
  {
    key: "gratificacion",
    label: "Gratificación",
    description: "Gratificaciones de julio y diciembre con la bonificación extraordinaria.",
  },
  {
    key: "indemnizacion",
    label: "Indemnización por despido",
    description: "Indemnización por despido arbitrario según el tipo de contrato.",
  },
  {
    key: "horas_extras",
    label: "Horas extras",
    description: "Cálculo de horas extras (sobretiempo) con recargos del 25% y 35%.",
  },
  {
    key: "vacaciones",
    label: "Vacaciones",
    description: "Vacaciones truncas, indemnización vacacional y récord vacacional.",
  },
  {
    key: "multa_sunafil",
    label: "Multa SUNAFIL",
    description: "Estimación de multas por infracciones laborales según su gravedad y el tamaño de tu empresa.",
  },
] as const;

export type CalculatorTypeKey = (typeof CALCULATOR_TYPES)[number]["key"];

// =============================================
// Contract Types (aligned with Prisma schema)
// =============================================

export const CONTRACT_TYPES = [
  {
    key: "LABORAL_INDEFINIDO",
    label: "Contrato a Plazo Indeterminado",
    description: "Contrato laboral sin fecha de termino.",
  },
  {
    key: "LABORAL_PLAZO_FIJO",
    label: "Contrato a Plazo Fijo",
    description: "Contrato laboral con fecha de inicio y termino definidos.",
  },
  {
    key: "LABORAL_TIEMPO_PARCIAL",
    label: "Contrato a Tiempo Parcial",
    description: "Jornada inferior a 4 horas diarias.",
  },
  {
    key: "LOCACION_SERVICIOS",
    label: "Locacion de Servicios",
    description: "Contrato civil de prestacion de servicios independientes.",
  },
  {
    key: "CONFIDENCIALIDAD",
    label: "Acuerdo de Confidencialidad",
    description: "NDA para proteccion de informacion reservada.",
  },
  {
    key: "NO_COMPETENCIA",
    label: "Pacto de No Competencia",
    description: "Restriccion post-contractual de actividades competitivas.",
  },
  {
    key: "POLITICA_HOSTIGAMIENTO",
    label: "Politica contra el Hostigamiento Sexual",
    description: "Documento obligatorio segun Ley 27942.",
  },
  {
    key: "POLITICA_SST",
    label: "Politica de Seguridad y Salud en el Trabajo",
    description: "Politica obligatoria segun Ley 29783.",
  },
  {
    key: "REGLAMENTO_INTERNO",
    label: "Reglamento Interno de Trabajo",
    description: "Obligatorio para empresas con mas de 100 trabajadores.",
  },
  {
    key: "ADDENDUM",
    label: "Addendum Contractual",
    description: "Modificacion o extension de contrato existente.",
  },
  {
    key: "CONVENIO_PRACTICAS",
    label: "Convenio de Practicas",
    description: "Convenio de practicas pre-profesionales o profesionales.",
  },
  {
    key: "CUSTOM",
    label: "Documento Personalizado",
    description: "Documento legal a medida.",
  },
] as const;

export type ContractTypeKey = (typeof CONTRACT_TYPES)[number]["key"];
