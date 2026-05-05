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
      "🤖 Asistente IA de soporte 24/7",
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
      "IA Copilot (50 consultas/mes)",
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
      "IA Copilot (500 consultas/mes)",
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
      "IA Copilot (2,000 consultas/mes)",
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
      "IA Copilot ilimitado",
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

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: string;
}

export interface NavGroup {
  readonly key: string;
  readonly label: string;
  readonly items: readonly NavItem[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    key: "principal",
    label: "Principal",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    ],
  },
  {
    key: "gestion",
    label: "Gestion",
    items: [
      { label: "Trabajadores", href: "/dashboard/trabajadores", icon: "Users" },
      { label: "Prestadores Servicios", href: "/dashboard/prestadores", icon: "Briefcase" },
      { label: "Terceros", href: "/dashboard/terceros", icon: "Building2" },
      { label: "Igualdad Salarial", href: "/dashboard/igualdad-salarial", icon: "Equal" },
      { label: "Relaciones Colectivas", href: "/dashboard/relaciones-colectivas", icon: "Scale" },
      { label: "Contratos", href: "/dashboard/contratos", icon: "FileText" },
    ],
  },
  {
    key: "herramientas",
    label: "Herramientas",
    items: [
      { label: "Calculadoras", href: "/dashboard/calculadoras", icon: "Calculator" },
      { label: "Liquidaciones", href: "/dashboard/liquidaciones", icon: "Banknote" },
      { label: "Boletas de Pago", href: "/dashboard/boletas", icon: "Receipt" },
      { label: "Planilla", href: "/dashboard/planilla", icon: "FileSpreadsheet" },
      { label: "Honorarios", href: "/dashboard/honorarios", icon: "ScrollText" },
      { label: "Documentos", href: "/dashboard/documentos", icon: "FileStack" },
      { label: "Expedientes", href: "/dashboard/expedientes", icon: "FolderOpen" },
      { label: "Reportes", href: "/dashboard/reportes", icon: "BarChart3" },
      { label: "Calendario", href: "/dashboard/calendario", icon: "Calendar" },
    ],
  },
  {
    key: "compliance",
    label: "Compliance",
    items: [
      { label: "SUNAFIL-Ready · 28 docs", href: "/dashboard/sunafil-ready", icon: "CheckSquare" },
      { label: "Tareas de compliance", href: "/dashboard/tareas", icon: "ListChecks" },
      { label: "Casilla SUNAFIL", href: "/dashboard/casilla-sunafil", icon: "Inbox" },
      { label: "Radar SUNAFIL", href: "/dashboard/radar", icon: "Radar" },
      { label: "Diagnostico", href: "/dashboard/diagnostico", icon: "ShieldCheck" },
      { label: "Riesgo SUNAFIL", href: "/dashboard/riesgo-sunafil", icon: "ShieldAlert" },
      { label: "Analizar Contrato", href: "/dashboard/analizar-contrato", icon: "FileSearch" },
      { label: "Simulacro", href: "/dashboard/simulacro", icon: "ShieldAlert" },
      { label: "Modo Inspeccion", href: "/dashboard/inspeccion-en-vivo", icon: "Siren" },
      { label: "SST", href: "/dashboard/sst", icon: "HardHat" },
      { label: "Sedes SST", href: "/dashboard/sst/sedes", icon: "Building2" },
      { label: "Accidentes SAT", href: "/dashboard/sst/accidentes", icon: "Activity" },
      { label: "EMO", href: "/dashboard/sst/emo", icon: "Stethoscope" },
      { label: "Derechos ARCO", href: "/dashboard/sst/arco", icon: "ShieldCheck" },
      { label: "Comité SST", href: "/dashboard/sst/comite", icon: "Users2" },
      { label: "Plan Anual SST", href: "/dashboard/sst/plan-anual", icon: "Calendar" },
      { label: "Field Audit", href: "/dashboard/sst/visitas", icon: "ClipboardCheck" },
      { label: "Score SST", href: "/dashboard/sst/score", icon: "TrendingUp" },
      { label: "Onboarding SST", href: "/dashboard/sst/onboarding", icon: "Rocket" },
      { label: "Denuncias", href: "/dashboard/denuncias", icon: "ShieldAlert" },
      { label: "Capacitaciones", href: "/dashboard/capacitaciones", icon: "GraduationCap" },
      { label: "Normas", href: "/dashboard/normas", icon: "Newspaper" },
      { label: "Alertas", href: "/dashboard/alertas", icon: "Bell" },
      { label: "Gamificacion", href: "/dashboard/gamificacion", icon: "Trophy" },
    ],
  },
  {
    key: "ia-admin",
    label: "IA & Admin",
    items: [
      { label: "Agentes IA", href: "/dashboard/agentes", icon: "Sparkles" },
      { label: "Asistente IA", href: "/dashboard/asistente-ia", icon: "Bot" },
      { label: "Workflows", href: "/dashboard/workflows", icon: "Workflow" },
      { label: "Certificacion", href: "/dashboard/certificacion", icon: "Award" },
      { label: "Marketplace", href: "/dashboard/marketplace", icon: "Store" },
      { label: "Integraciones", href: "/dashboard/integraciones", icon: "Plug" },
      { label: "API Docs", href: "/dashboard/api-docs", icon: "Code2" },
      { label: "Planes", href: "/dashboard/planes", icon: "CreditCard" },
      { label: "Configuracion", href: "/dashboard/configuracion", icon: "Settings" },
    ],
  },
  {
    key: "rrhh",
    label: "RRHH",
    items: [
      { label: "Vacaciones", href: "/dashboard/vacaciones", icon: "CalendarRange" },
      { label: "Asistencia", href: "/dashboard/asistencia", icon: "Clock" },
      { label: "Teletrabajo", href: "/dashboard/teletrabajo", icon: "Laptop2" },
      { label: "Solicitudes", href: "/dashboard/solicitudes", icon: "ClipboardList" },
      // NOTA: "Portal Empleado" se removió a propósito del menú del EMPLEADOR.
      // Cada trabajador accede a su propio portal vía email de invitación
      // (cascada de onboarding) y abre /mi-portal con su propio login.
      // El admin no tiene por qué entrar al portal del trabajador.
    ],
  },
] as const;

// Flat array kept for backward compatibility (topbar breadcrumbs, command palette, etc.)
export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap(g => g.items);

// =============================================
// NAV_HUBS — Revolución UX Fase B
// =============================================
//
// 7 hubs top-level que consolidan las 85 páginas. El trabajador es la gravedad;
// por eso "Equipo" agrupa prestadores, terceros, y absorbe las vistas que eran
// hermanas (vacaciones, boletas, solicitudes → tabs del perfil).
//
// Cada hub tiene `rootHref` (landing) + `items` (sub-navegación). La sidebar
// muestra hubs colapsables; el command palette puede saltar a cualquier item.

export interface NavHub {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  readonly rootHref: string;
  readonly description: string;
  readonly items: readonly NavItem[];
}

export const NAV_HUBS: readonly NavHub[] = [
  {
    key: "cockpit",
    label: "Panel",
    icon: "LayoutDashboard",
    rootHref: "/dashboard",
    description: "Panorama general de compliance",
    items: [
      { label: "Vista general", href: "/dashboard", icon: "LayoutDashboard" },
      // Calendario absorbido aquí: una sola página no merece hub propio,
      // pero sigue accesible y visible como sub-item del Panel.
      { label: "Calendario compliance", href: "/dashboard/calendario", icon: "Calendar" },
    ],
  },
  {
    key: "equipo",
    label: "Equipo",
    icon: "Users",
    rootHref: "/dashboard/trabajadores",
    description: "Trabajadores, prestadores y terceros",
    items: [
      // Asistencia y Vacaciones suben a las primeras posiciones porque son
      // las acciones de uso DIARIO. Los demás (planilla, boletas, prestadores)
      // son uso semanal/mensual y van debajo.
      { label: "Trabajadores", href: "/dashboard/trabajadores", icon: "Users" },
      { label: "Organigrama", href: "/dashboard/organigrama", icon: "Network" },
      { label: "Asistencia", href: "/dashboard/asistencia", icon: "Clock" },
      { label: "Vacaciones", href: "/dashboard/vacaciones", icon: "CalendarRange" },
      { label: "Solicitudes", href: "/dashboard/solicitudes", icon: "ClipboardList" },
      { label: "Teletrabajo", href: "/dashboard/teletrabajo", icon: "Laptop2" },
      { label: "Planilla", href: "/dashboard/planilla", icon: "FileSpreadsheet" },
      { label: "Boletas de pago", href: "/dashboard/boletas", icon: "Receipt" },
      { label: "Liquidaciones", href: "/dashboard/liquidaciones", icon: "Banknote" },
      { label: "Honorarios", href: "/dashboard/honorarios", icon: "ScrollText" },
      { label: "Prestadores de servicios", href: "/dashboard/prestadores", icon: "Briefcase" },
      { label: "Terceros y contratistas", href: "/dashboard/terceros", icon: "Building2" },
      // "Portal empleado" se removió: el trabajador accede a su PROPIO portal
      // (/mi-portal) con su login. El empleador no tiene por qué ver/usar ese
      // portal, son experiencias separadas. La invitación se manda por email
      // automáticamente cuando se crea el trabajador (ver onboarding cascade).
      //
      // "Portal contador" también removido del hub Equipo: pertenece al perfil
      // CONSULTANT (estudios contables), no al empleador estándar. Si en el
      // futuro se reactiva, debe ser visible solo si role==CONSULTANT.
    ],
  },
  {
    key: "riesgo",
    label: "Riesgo Laboral",
    icon: "ShieldAlert",
    rootHref: "/dashboard/alertas",
    description: "Compliance, diagnóstico, simulacro y denuncias",
    items: [
      { label: "Alertas", href: "/dashboard/alertas", icon: "Bell" },
      { label: "Tareas de compliance", href: "/dashboard/tareas", icon: "ListChecks" },
      { label: "Diagnóstico SUNAFIL", href: "/dashboard/diagnostico", icon: "ShieldCheck" },
      { label: "Simulacro", href: "/dashboard/simulacro", icon: "ShieldAlert" },
      { label: "Radar", href: "/dashboard/radar", icon: "Radar" },
      { label: "Riesgo SUNAFIL", href: "/dashboard/riesgo-sunafil", icon: "ShieldAlert" },
      { label: "Modo inspección", href: "/dashboard/inspeccion-en-vivo", icon: "Siren" },
      { label: "Casilla SUNAFIL", href: "/dashboard/casilla-sunafil", icon: "Inbox" },
      { label: "Denuncias", href: "/dashboard/denuncias", icon: "ShieldAlert" },
      { label: "Relaciones colectivas", href: "/dashboard/relaciones-colectivas", icon: "Scale" },
      { label: "Igualdad salarial", href: "/dashboard/igualdad-salarial", icon: "Equal" },
    ],
  },
  {
    key: "sst",
    label: "SST",
    icon: "HardHat",
    rootHref: "/dashboard/sst",
    description: "Seguridad y Salud en el Trabajo (Ley 29783)",
    // Orden por flujo: panorama → preventivo → incidentes → comité → docs → auditorías → privacidad.
    items: [
      { label: "SST (resumen)", href: "/dashboard/sst", icon: "HardHat" },
      { label: "Score SST", href: "/dashboard/sst/score", icon: "ShieldCheck" },
      { label: "Onboarding SST", href: "/dashboard/sst/onboarding", icon: "Sparkles" },
      { label: "Sedes SST", href: "/dashboard/sst/sedes", icon: "Building2" },
      { label: "IPERC", href: "/dashboard/sst/iperc", icon: "ClipboardList" },
      // /dashboard/sst/iperc-bases NO se incluye: solo tiene [id]/page.tsx
      // (sin page raíz). Las bases IPERC se acceden desde el listado IPERC.
      { label: "PETS / PETAR / ATS", href: "/dashboard/sst/pets-petar-ats", icon: "FileText" },
      { label: "Plan anual", href: "/dashboard/sst/plan-anual", icon: "Calendar" },
      { label: "Memoria anual", href: "/dashboard/sst/memoria-anual", icon: "ScrollText" },
      { label: "Accidentes (SAT)", href: "/dashboard/sst/accidentes", icon: "Siren" },
      { label: "Exámenes médicos (EMO)", href: "/dashboard/sst/emo", icon: "ClipboardList" },
      { label: "Comité SST", href: "/dashboard/sst/comite", icon: "Users" },
      { label: "Elecciones del comité", href: "/dashboard/sst/comite/elecciones", icon: "Award" },
      { label: "Field audit (visitas)", href: "/dashboard/sst/visitas", icon: "ClipboardList" },
      { label: "Derechos ARCO", href: "/dashboard/sst/arco", icon: "Shield" },
    ],
  },
  {
    key: "contratos-docs",
    label: "Contratos & Docs",
    icon: "FileText",
    rootHref: "/dashboard/contratos",
    description: "Contratos, legajos, generadores y normativa",
    items: [
      { label: "Contratos", href: "/dashboard/contratos", icon: "FileText" },
      { label: "Plantillas de contratos", href: "/dashboard/configuracion/empresa/plantillas", icon: "Files" },
      { label: "Analizar contrato (IA)", href: "/dashboard/analizar-contrato", icon: "FileSearch" },
      { label: "Documentos", href: "/dashboard/documentos", icon: "FileStack" },
      { label: "Documentos para firma", href: "/dashboard/documentos-firma", icon: "FileText" },
      { label: "Expedientes", href: "/dashboard/expedientes", icon: "FolderOpen" },
      { label: "SUNAFIL-Ready · 28 docs", href: "/dashboard/sunafil-ready", icon: "CheckSquare" },
      { label: "Generadores IA", href: "/dashboard/generadores", icon: "Sparkles" },
      { label: "Normas", href: "/dashboard/normas", icon: "Newspaper" },
    ],
  },
  {
    key: "ia-laboral",
    label: "IA Laboral",
    icon: "Sparkles",
    rootHref: "/dashboard/ia-laboral",
    description: "Asistente, agentes, workflows y calculadoras",
    items: [
      { label: "Hub IA", href: "/dashboard/ia-laboral", icon: "Sparkles" },
      { label: "Asistente IA", href: "/dashboard/asistente-ia", icon: "Bot" },
      { label: "Agentes IA", href: "/dashboard/agentes", icon: "Sparkles" },
      { label: "Workflows", href: "/dashboard/workflows", icon: "Workflow" },
      { label: "Calculadoras laborales", href: "/dashboard/calculadoras", icon: "Calculator" },
      { label: "Capacitaciones", href: "/dashboard/capacitaciones", icon: "GraduationCap" },
    ],
  },
  {
    key: "config",
    label: "Config",
    icon: "Settings",
    rootHref: "/dashboard/configuracion",
    description: "Organización, plan, reportes e integraciones",
    items: [
      { label: "Configuración", href: "/dashboard/configuracion", icon: "Settings" },
      { label: "Reportes", href: "/dashboard/reportes", icon: "BarChart3" },
      { label: "Planes y facturación", href: "/dashboard/planes", icon: "CreditCard" },
      { label: "Integraciones", href: "/dashboard/integraciones", icon: "Plug" },
      { label: "Marketplace", href: "/dashboard/marketplace", icon: "Store" },
      { label: "Certificación", href: "/dashboard/certificacion", icon: "Award" },
      { label: "Gamificación", href: "/dashboard/gamificacion", icon: "Trophy" },
      { label: "API Docs", href: "/dashboard/api-docs", icon: "Code2" },
    ],
  },
] as const;

/**
 * Dado un pathname del dashboard, devuelve el hub al que pertenece.
 * Usado por la sidebar para marcar el hub activo y por el topbar para breadcrumbs.
 */
export function resolveActiveHub(pathname: string): NavHub {
  // Exact dashboard root → cockpit
  if (pathname === "/dashboard") return NAV_HUBS[0];
  // Find best match by longest rootHref prefix or item prefix
  let best: NavHub = NAV_HUBS[0];
  let bestLen = 0;
  for (const hub of NAV_HUBS) {
    const hrefsToCheck = [hub.rootHref, ...hub.items.map((i) => i.href)];
    for (const href of hrefsToCheck) {
      if (href !== "/dashboard" && pathname.startsWith(href) && href.length > bestLen) {
        best = hub;
        bestLen = href.length;
      }
    }
  }
  return best;
}

// =============================================
// Calculator Types
// =============================================

export const CALCULATOR_TYPES = [
  {
    key: "liquidacion",
    label: "Liquidacion de Beneficios Sociales",
    description: "Calcula CTS, gratificaciones, vacaciones truncas y otros beneficios al cese.",
  },
  {
    key: "cts",
    label: "CTS",
    description: "Compensacion por Tiempo de Servicios semestral.",
  },
  {
    key: "gratificacion",
    label: "Gratificacion",
    description: "Gratificaciones de julio y diciembre con bonificacion extraordinaria.",
  },
  {
    key: "indemnizacion",
    label: "Indemnizacion por Despido",
    description: "Indemnizacion por despido arbitrario segun el tipo de contrato.",
  },
  {
    key: "horas_extras",
    label: "Horas Extras",
    description: "Calculo de sobretiempo con tasas del 25% y 35%.",
  },
  {
    key: "vacaciones",
    label: "Vacaciones",
    description: "Vacaciones truncas, indemnizacion vacacional y record.",
  },
  {
    key: "multa_sunafil",
    label: "Multa SUNAFIL",
    description: "Estimacion de multas por infracciones laborales segun gravedad y tamano de empresa.",
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
