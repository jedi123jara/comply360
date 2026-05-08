// Datos compartidos para las 5 variaciones del cockpit Comply360
window.cockpitData = {
  org: {
    name: "Constructora Andes SAC",
    ruc: "20512934087",
    plan: "PRO",
    sector: "Construcción civil",
    workers: 47,
  },
  user: { name: "Diana Quispe", role: "Owner" },
  score: { value: 72, delta: 4, prev: 68, target: 85 },
  kpis: {
    workers: 47,
    expiringWeek: 8,
    criticalAlerts: 3,
    multaEvitada: 84200,
    sunafilRisk: "Medio",
  },
  breakdown: [
    { area: "SST", score: 60, weight: 30, status: "warn" },
    { area: "Contratos", score: 85, weight: 20, status: "ok" },
    { area: "Planilla", score: 78, weight: 25, status: "ok" },
    { area: "Capacitación", score: 54, weight: 15, status: "warn" },
    { area: "Documentos", score: 91, weight: 10, status: "ok" },
  ],
  deadlines: [
    { id: 1, days: 2, who: "Carlos Mendoza Ríos", what: "Examen médico ocupacional", area: "SST", urgency: "high" },
    { id: 2, days: 4, who: "12 trabajadores", what: "Capacitación SST trimestral", area: "SST", urgency: "high" },
    { id: 3, days: 6, who: "Planilla Noviembre", what: "Pago a SUNAT (PLAME)", area: "Planilla", urgency: "med" },
    { id: 4, days: 9, who: "Lucía Paredes", what: "Vencimiento contrato modal", area: "Contratos", urgency: "med" },
    { id: 5, days: 13, who: "Comité SST", what: "Reunión mensual obligatoria", area: "SST", urgency: "low" },
  ],
  riskWorkers: [
    { name: "Carlos Mendoza R.", role: "Operario", risk: 92, missing: 4 },
    { name: "Ana Rojas V.", role: "Supervisora", risk: 78, missing: 3 },
    { name: "Pedro Salinas", role: "Capataz", risk: 71, missing: 3 },
    { name: "Lucía Paredes", role: "Admin", risk: 65, missing: 2 },
  ],
  activity: [
    { day: "L", hits: 4 }, { day: "M", hits: 7 }, { day: "X", hits: 3 },
    { day: "J", hits: 9 }, { day: "V", hits: 6 }, { day: "S", hits: 1 }, { day: "D", hits: 0 },
  ],
  copilotSuggestions: [
    "Genera el plan de capacitación trimestral para los 12 operarios pendientes",
    "Revisa contratos modales que vencen en los próximos 30 días",
    "¿Qué multas de SUNAFIL aplican si Carlos no completa su examen médico?",
  ],
};
