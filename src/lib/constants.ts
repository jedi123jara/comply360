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
 * `src/app/dashboard/planes/page.tsx`. Si modificás aquí, ejecutá el
 * grep de verificación: `grep -rE "S/\s*(129|299|649|1299)" src/`
 *
 * Pricing 2026-04 (post-auditoría): subida deliberada desde S/49/149/399
 * para reflejar valor real (evitar multas SUNAFIL hasta S/289k) y sostener
 * CAC razonable en B2B. Features redistribuidas por tier estratégicamente:
 *
 *  • STARTER → gestor de planilla + calculadoras (valor inmediato sin compliance profundo)
 *  • EMPRESA → + diagnóstico + simulacro + plantillas merge-fields (compliance básico)
 *  • PRO     → + IA copilot + vision + portal worker biométrico + SST (compliance avanzado)
 *  • ENTERPRISE → + SLA + multi-cuenta contadores + API (canal partner + grandes empresas)
 */
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
    features: [
      "Hasta 5 trabajadores (demo)",
      "13 calculadoras laborales peruanas",
      "Diagnóstico gratis 10 preguntas",
      "1 usuario",
    ],
  },
  STARTER: {
    key: "STARTER",
    name: "Starter",
    price: 129,
    priceInCentimos: 12900,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 20,
    maxUsers: 2,
    features: [
      "Hasta 20 trabajadores",
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
    price: 299,
    priceInCentimos: 29900,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 100,
    maxUsers: 5,
    features: [
      "Hasta 100 trabajadores",
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
    price: 649,
    priceInCentimos: 64900,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 300,
    maxUsers: 15,
    features: [
      "Hasta 300 trabajadores",
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
  ENTERPRISE: {
    key: "ENTERPRISE",
    name: "Enterprise",
    price: 1299,
    priceInCentimos: 129900,
    currency: "PEN",
    interval: "month" as const,
    maxWorkers: 999999,
    maxUsers: 999999,
    features: [
      "Trabajadores ilimitados",
      "Todo del plan Pro",
      "SLA 99.5% uptime garantizado",
      "Multi-cuenta para estudios contables (companías secundarias)",
      "API REST v1 + webhooks salientes",
      "Customer Success Manager dedicado",
      "Onboarding guiado + capacitación de equipo",
      "Data Processing Agreement (DPA) personalizado",
      "Integración con planilla externa (Buk, Ofisis, Starsoft)",
      "Usuarios ilimitados",
      "Soporte 24/7 con tiempo de respuesta < 4h",
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
      { label: "Portal Empleado", href: "/portal-empleado", icon: "UserCircle" },
      { label: "Portal Contador", href: "/dashboard/consultor", icon: "Briefcase" },
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
      { label: "Trabajadores", href: "/dashboard/trabajadores", icon: "Users" },
      { label: "Prestadores de servicios", href: "/dashboard/prestadores", icon: "Briefcase" },
      { label: "Terceros y contratistas", href: "/dashboard/terceros", icon: "Building2" },
      { label: "Portal empleado", href: "/portal-empleado", icon: "UserCircle" },
      { label: "Portal contador", href: "/dashboard/consultor", icon: "Briefcase" },
      { label: "Planilla", href: "/dashboard/planilla", icon: "FileSpreadsheet" },
      { label: "Boletas de pago", href: "/dashboard/boletas", icon: "Receipt" },
      { label: "Liquidaciones", href: "/dashboard/liquidaciones", icon: "Banknote" },
      { label: "Honorarios", href: "/dashboard/honorarios", icon: "ScrollText" },
      { label: "Vacaciones", href: "/dashboard/vacaciones", icon: "CalendarRange" },
      { label: "Asistencia", href: "/dashboard/asistencia", icon: "Clock" },
      { label: "Teletrabajo", href: "/dashboard/teletrabajo", icon: "Laptop2" },
      { label: "Solicitudes", href: "/dashboard/solicitudes", icon: "ClipboardList" },
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
