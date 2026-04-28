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
 * Sincronizado con `src/lib/payments/culqi.ts` (CULQI_PLANS) y
 * `src/app/dashboard/planes/page.tsx`. Si modificas aquí, ejecuta el
 * grep de verificación: `grep -rE "S/\s*(149|349|799|1299)" src/`
 *
 * Pricing 2026-04-26 (Sprint 2 — tier-up): subida deliberada vs benchmark
 * (Buk Starter ~S/199, Worki360 ~S/499). Plan Maestro V2 lo justificó:
 * el ticket promedio del cliente B2B peruano de compliance soporta este nivel
 * cuando la propuesta de valor es "evita multas SUNAFIL hasta S/289k".
 *
 *  • STARTER → gestor de planilla + calculadoras (valor inmediato sin compliance profundo)
 *  • EMPRESA → + diagnóstico + simulacro + plantillas merge-fields (compliance básico)
 *  • PRO     → + IA copilot + vision + portal worker biométrico + SST (compliance avanzado)
 *  • ENTERPRISE → + SLA + multi-cuenta contadores + API (canal partner + grandes empresas)
 *
 * Política de grandfather: clientes activos con `pricingFrozenUntil > now`
 * conservan el precio anterior hasta esa fecha. Implementado en
 * `Subscription.pricingFrozenUntil` (campo nullable Prisma).
 */
/**
 * Estructura de planes 2026 con per-seat overflow.
 *
 * Modelo híbrido: cada tier tiene precio base con N workers incluidos.
 * Cuando el cliente excede maxWorkers debería pagar overflow per-seat
 * (extraPerWorkerSoles) — la facturación de overflow se implementa en
 * Sprint 8+ vía cron mensual que recomputa el monto.
 *
 * ENTERPRISE NO tiene precio fijo: es contact-sales (`isCustomQuote: true`).
 * Esto evita regalar valor a empresas grandes (ej. 5,000 workers no pueden
 * pagar el mismo flat de S/3,499 que paga uno con 1,000 workers).
 *
 * Política de grandfather: clientes activos con `pricingFrozenUntil > now`
 * conservan precio anterior 12 meses. Implementado en Subscription.
 */

/**
 * Descuento promocional de lanzamiento.
 * El precio "real" en PLANS es el precio FINAL que paga el cliente.
 * El "precio original" mostrado tachado se calcula como
 * `price / (1 - LAUNCH_DISCOUNT_PERCENT/100)`.
 *
 * Cambiar a 0 cuando termine la promoción de lanzamiento.
 */
export const LAUNCH_DISCOUNT_PERCENT = 50

/**
 * Calcula el precio "original" (antes del descuento) a partir del precio actual.
 * Ej. precio actual S/199 + 50% descuento → precio original S/398.
 */
export function getOriginalPrice(currentPrice: number, discountPercent = LAUNCH_DISCOUNT_PERCENT): number {
  if (discountPercent === 0 || discountPercent >= 100) return currentPrice
  return Math.round(currentPrice / (1 - discountPercent / 100))
}

export const PLANS = {
  FREE: {
    key: "FREE",
    name: "Gratuito",
    price: 0,
    priceInCentimos: 0,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 5,
    maxUsers: 1,
    extraPerWorkerSoles: 0,
    isCustomQuote: false,
    features: [
      "Hasta 5 trabajadores (demo)",
      "13 calculadoras laborales peruanas",
      "Diagnóstico gratis 10 preguntas",
      "1 usuario admin",
      "Sin tarjeta de crédito",
    ],
  },
  STARTER: {
    key: "STARTER",
    name: "Starter",
    price: 199,
    priceInCentimos: 19900,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 20,
    maxUsers: 2,
    extraPerWorkerSoles: 12,
    isCustomQuote: false,
    features: [
      "Hasta 20 trabajadores (S/12 por trabajador adicional)",
      "Gestor de planilla + legajo digital",
      "13 calculadoras completas (CTS, gratificación, vacaciones, liquidación)",
      "Alertas normativas y de vencimientos",
      "Calendario de compliance",
      "2 usuarios admin",
      "Soporte por email",
    ],
  },
  EMPRESA: {
    key: "EMPRESA",
    name: "Empresa",
    price: 599,
    priceInCentimos: 59900,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 100,
    maxUsers: 5,
    extraPerWorkerSoles: 8,
    isCustomQuote: false,
    features: [
      "Hasta 100 trabajadores (S/8 por trabajador adicional)",
      "Todo del plan Starter",
      "Diagnóstico SUNAFIL completo (135 preguntas)",
      "Simulacro de inspección básico",
      "Biblioteca de plantillas con merge fields",
      "Generación de contratos desde plantilla",
      "Reportes ejecutivos PDF",
      "5 usuarios admin",
      "Soporte prioritario",
    ],
  },
  PRO: {
    key: "PRO",
    name: "Pro",
    price: 1499,
    priceInCentimos: 149900,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 300,
    maxUsers: 15,
    extraPerWorkerSoles: 5,
    isCustomQuote: false,
    features: [
      "Hasta 300 trabajadores (S/5 por trabajador adicional)",
      "Todo del plan Empresa",
      "Asistente IA laboral peruano (copilot)",
      "Auto-verificación de documentos con IA Vision",
      "Revisión IA de contratos",
      "Simulacro SUNAFIL completo + Acta de Requerimiento",
      "Portal del trabajador con firma biométrica (Ley 27269)",
      "Cascada de onboarding automatizada",
      "Canal de denuncias (Ley 27942)",
      "SST integral (Ley 29783)",
      "15 usuarios admin",
      "Soporte dedicado en horario laboral",
    ],
  },
  BUSINESS: {
    key: "BUSINESS",
    name: "Business",
    price: 3999,
    priceInCentimos: 399900,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 750,
    maxUsers: 30,
    extraPerWorkerSoles: 4,
    isCustomQuote: false,
    features: [
      "Hasta 750 trabajadores (S/4 por trabajador adicional)",
      "Todo del plan Pro",
      "Multi-empresa básico (hasta 3 sucursales o RUCs hermanos)",
      "Cuota IA ampliada (5,000 consultas/mes)",
      "Onboarding asistido (1 sesión guiada con tu equipo)",
      "Soporte prioritario respuesta < 8h horario laboral",
      "30 usuarios admin",
      "Reportes consolidados multi-empresa",
    ],
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    name: "Enterprise",
    // price=0 + isCustomQuote=true → UI muestra "Cotizar" en lugar de S/0.
    // El precio real se acuerda en sales call. Negociación típica:
    // S/15,000–60,000/mes según workers + features + SLA.
    price: 0,
    priceInCentimos: 0,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 999999,
    maxUsers: 999999,
    extraPerWorkerSoles: 0,
    isCustomQuote: true,
    features: [
      "Para empresas con +1,000 trabajadores u holdings",
      "Todo del plan Business",
      "Multi-tenant ilimitado (holdings con N empresas hermanas)",
      "API REST v1 + webhooks salientes",
      "SLA 99.9% uptime con créditos por incumplimiento",
      "Customer Success Manager dedicado",
      "Cuota IA ilimitada",
      "Data Processing Agreement (DPA) personalizado",
      "Integración con planilla externa (Buk, Ofisis, Starsoft)",
      "Branding white-label opcional",
      "Soporte 24/7 con tiempo de respuesta < 4h",
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
    label: "Riesgo",
    icon: "ShieldAlert",
    rootHref: "/dashboard/alertas",
    description: "Compliance, diagnóstico, simulacro y denuncias",
    items: [
      { label: "SUNAFIL-Ready · 28 docs", href: "/dashboard/sunafil-ready", icon: "CheckSquare" },
      { label: "Generadores IA", href: "/dashboard/generadores", icon: "Sparkles" },
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
    key: "calendario",
    label: "Calendario",
    icon: "Calendar",
    rootHref: "/dashboard/calendario",
    description: "Obligaciones y vencimientos del mes",
    items: [
      { label: "Calendario compliance", href: "/dashboard/calendario", icon: "Calendar" },
    ],
  },
  {
    key: "contratos-docs",
    label: "Contratos & Docs",
    icon: "FileText",
    rootHref: "/dashboard/contratos",
    description: "Contratos, legajos y SST",
    items: [
      { label: "Contratos", href: "/dashboard/contratos", icon: "FileText" },
      { label: "Plantillas de contratos", href: "/dashboard/configuracion/empresa/plantillas", icon: "Files" },
      { label: "Analizar contrato (IA)", href: "/dashboard/analizar-contrato", icon: "FileSearch" },
      { label: "Documentos", href: "/dashboard/documentos", icon: "FileStack" },
      { label: "Expedientes", href: "/dashboard/expedientes", icon: "FolderOpen" },
      { label: "SST", href: "/dashboard/sst", icon: "HardHat" },
      { label: "Normas", href: "/dashboard/normas", icon: "Newspaper" },
    ],
  },
  {
    key: "ia-laboral",
    label: "IA Laboral",
    icon: "Sparkles",
    rootHref: "/dashboard/ia-laboral",
    description: "Asistente, agentes y calculadoras",
    items: [
      { label: "Hub IA", href: "/dashboard/ia-laboral", icon: "Sparkles" },
      { label: "Calculadoras laborales", href: "/dashboard/calculadoras", icon: "Calculator" },
      { label: "Workflows", href: "/dashboard/workflows", icon: "Workflow" },
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
