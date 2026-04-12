// =============================================
// App
// =============================================

export const APP_NAME = "COMPLY360" as const;

// =============================================
// Plans & Pricing
// =============================================

export const PLANS = {
  STARTER: {
    key: "STARTER",
    name: "Starter",
    price: 99,
    priceInCentimos: 9900,
    currency: "PEN",
    interval: "month" as const,
    features: [
      "Hasta 10 contratos/mes",
      "Calculadoras laborales basicas",
      "Alertas normativas",
      "1 usuario",
      "Soporte por email",
    ],
  },
  EMPRESA: {
    key: "EMPRESA",
    name: "Empresa",
    price: 249,
    priceInCentimos: 24900,
    currency: "PEN",
    interval: "month" as const,
    features: [
      "Hasta 50 contratos/mes",
      "Calculadoras laborales avanzadas",
      "Alertas con impacto personalizado",
      "Hasta 5 usuarios",
      "Exportar a PDF y DOCX",
      "Diagnostico de cumplimiento",
      "Soporte prioritario",
    ],
  },
  PRO: {
    key: "PRO",
    name: "Pro",
    price: 499,
    priceInCentimos: 49900,
    currency: "PEN",
    interval: "month" as const,
    features: [
      "Contratos ilimitados",
      "IA: revision de riesgos contractuales",
      "Alertas con analisis de impacto",
      "Usuarios ilimitados",
      "API access",
      "Simulacro SUNAFIL completo",
      "Soporte dedicado 24/7",
      "Integraciones avanzadas",
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
