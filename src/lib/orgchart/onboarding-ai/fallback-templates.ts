/**
 * Plantillas determinísticas de fallback para el Onboarding.
 *
 * Si el LLM falla (sin API key, alucina, devuelve estructura inválida), el
 * cliente igual recibe una propuesta razonable basada en industria + tamaño.
 *
 * Esto cumple la regla "zero-liability" del producto: nunca dejamos al
 * usuario sin propuesta funcional.
 */
import type { OnboardingInput, OnboardingProposal } from './schema'

interface FallbackTemplate {
  industries: string[]
  sizeRanges: Array<'MICRO' | 'PEQUEÑA' | 'MEDIANA' | 'GRANDE'>
  proposal: OnboardingProposal
}

const RETAIL_PYME: FallbackTemplate = {
  industries: ['retail', 'comercio', 'tienda', 'distribución', 'venta'],
  sizeRanges: ['PEQUEÑA', 'MEDIANA'],
  proposal: {
    rationale:
      'Estructura típica de retail PYME peruano: gerencia general con áreas comercial, operaciones, administración y finanzas, RRHH y un Comité SST conforme Ley 29783.',
    units: [
      { key: 'gg', name: 'Gerencia General', kind: 'GERENCIA', parentKey: null },
      { key: 'comercial', name: 'Comercial y Ventas', kind: 'AREA', parentKey: 'gg' },
      { key: 'operaciones', name: 'Operaciones', kind: 'AREA', parentKey: 'gg' },
      { key: 'admin', name: 'Administración y Finanzas', kind: 'AREA', parentKey: 'gg' },
      { key: 'rrhh', name: 'Recursos Humanos', kind: 'AREA', parentKey: 'gg' },
      { key: 'csst', name: 'Comité SST', kind: 'COMITE_LEGAL', parentKey: 'gg' },
    ],
    positions: [
      { key: 'p_gg', title: 'Gerente General', unitKey: 'gg', reportsToKey: null, isManagerial: true, isCritical: true, seats: 1 },
      { key: 'p_comercial', title: 'Jefe Comercial', unitKey: 'comercial', reportsToKey: 'p_gg', isManagerial: true, isCritical: false, seats: 1 },
      { key: 'p_vendedor', title: 'Vendedor', unitKey: 'comercial', reportsToKey: 'p_comercial', isManagerial: false, isCritical: false, seats: 4 },
      { key: 'p_operaciones', title: 'Jefe de Operaciones', unitKey: 'operaciones', reportsToKey: 'p_gg', isManagerial: true, isCritical: false, seats: 1 },
      { key: 'p_almacen', title: 'Almacenero', unitKey: 'operaciones', reportsToKey: 'p_operaciones', isManagerial: false, isCritical: false, seats: 2 },
      { key: 'p_admin', title: 'Administrador', unitKey: 'admin', reportsToKey: 'p_gg', isManagerial: true, isCritical: false, seats: 1 },
      { key: 'p_contador', title: 'Contador', unitKey: 'admin', reportsToKey: 'p_admin', isManagerial: false, isCritical: true, seats: 1 },
      { key: 'p_rrhh', title: 'Jefe de RRHH', unitKey: 'rrhh', reportsToKey: 'p_gg', isManagerial: true, isCritical: true, seats: 1 },
    ],
    suggestedComplianceRoles: [
      { roleType: 'PRESIDENTE_COMITE_SST', reason: 'Ley 29783 art. 29 — empresa con ≥20 trabajadores requiere Comité SST' },
      { roleType: 'SECRETARIO_COMITE_SST', reason: 'Ley 29783 art. 29' },
      { roleType: 'REPRESENTANTE_TRABAJADORES_SST', reason: 'Ley 29783 art. 29 — paridad' },
      { roleType: 'REPRESENTANTE_EMPLEADOR_SST', reason: 'Ley 29783 art. 29 — paridad' },
      { roleType: 'PRESIDENTE_COMITE_HOSTIGAMIENTO', reason: 'Ley 27942 / D.S. 014-2019-MIMP' },
      { roleType: 'DPO_LEY_29733', reason: 'Ley 29733 art. 42 — empresa que trata datos personales' },
      { roleType: 'RT_PLANILLA', reason: 'Responsable de T-REGISTRO/PLAME ante SUNAT' },
    ],
  },
}

const SERVICIOS_PYME: FallbackTemplate = {
  industries: ['servicios', 'consultoría', 'consultoria', 'asesoría', 'asesoria', 'estudio', 'agencia'],
  sizeRanges: ['MICRO', 'PEQUEÑA', 'MEDIANA'],
  proposal: {
    rationale:
      'Estructura típica de empresa de servicios profesionales PYME: gerencia, áreas operativas (servicios al cliente y proyectos), administración, y comité SST simplificado.',
    units: [
      { key: 'gg', name: 'Gerencia General', kind: 'GERENCIA', parentKey: null },
      { key: 'servicios', name: 'Servicios al Cliente', kind: 'AREA', parentKey: 'gg' },
      { key: 'proyectos', name: 'Proyectos', kind: 'AREA', parentKey: 'gg' },
      { key: 'admin', name: 'Administración', kind: 'AREA', parentKey: 'gg' },
      { key: 'csst', name: 'Comité SST', kind: 'COMITE_LEGAL', parentKey: 'gg' },
    ],
    positions: [
      { key: 'p_gg', title: 'Gerente General', unitKey: 'gg', reportsToKey: null, isManagerial: true, isCritical: true, seats: 1 },
      { key: 'p_servicios', title: 'Jefe de Servicios', unitKey: 'servicios', reportsToKey: 'p_gg', isManagerial: true, isCritical: false, seats: 1 },
      { key: 'p_consultor', title: 'Consultor', unitKey: 'servicios', reportsToKey: 'p_servicios', isManagerial: false, isCritical: false, seats: 4 },
      { key: 'p_pm', title: 'Project Manager', unitKey: 'proyectos', reportsToKey: 'p_gg', isManagerial: true, isCritical: false, seats: 2 },
      { key: 'p_admin', title: 'Administrador', unitKey: 'admin', reportsToKey: 'p_gg', isManagerial: true, isCritical: false, seats: 1 },
      { key: 'p_contador', title: 'Contador', unitKey: 'admin', reportsToKey: 'p_admin', isManagerial: false, isCritical: true, seats: 1 },
    ],
    suggestedComplianceRoles: [
      { roleType: 'PRESIDENTE_COMITE_SST', reason: 'Ley 29783 art. 29' },
      { roleType: 'DPO_LEY_29733', reason: 'Ley 29733 — manejo de datos de clientes' },
      { roleType: 'RT_PLANILLA', reason: 'T-REGISTRO/PLAME' },
    ],
  },
}

const MICRO_GENERICA: FallbackTemplate = {
  industries: [],
  sizeRanges: ['MICRO'],
  proposal: {
    rationale:
      'Estructura mínima para microempresa peruana (≤10 trabajadores): gerencia, operaciones y administración. Supervisor SST en lugar de Comité (Ley 29783 art. 30).',
    units: [
      { key: 'gg', name: 'Gerencia', kind: 'GERENCIA', parentKey: null },
      { key: 'operaciones', name: 'Operaciones', kind: 'AREA', parentKey: 'gg' },
      { key: 'admin', name: 'Administración', kind: 'AREA', parentKey: 'gg' },
    ],
    positions: [
      { key: 'p_gg', title: 'Gerente', unitKey: 'gg', reportsToKey: null, isManagerial: true, isCritical: true, seats: 1 },
      { key: 'p_op', title: 'Operario', unitKey: 'operaciones', reportsToKey: 'p_gg', isManagerial: false, isCritical: false, seats: 3 },
      { key: 'p_admin', title: 'Asistente Administrativo', unitKey: 'admin', reportsToKey: 'p_gg', isManagerial: false, isCritical: false, seats: 1 },
    ],
    suggestedComplianceRoles: [
      { roleType: 'SUPERVISOR_SST', reason: 'Ley 29783 art. 30 — empresas ≤20 trabajadores designan Supervisor en lugar de Comité' },
      { roleType: 'RT_PLANILLA', reason: 'T-REGISTRO/PLAME' },
    ],
  },
}

// Orden importa: el primero que matchee se usa. Templates más específicos primero.
const TEMPLATES = [RETAIL_PYME, SERVICIOS_PYME, MICRO_GENERICA]

/**
 * Encuentra un template fallback por tamaño con preferencia por el más
 * específico (que tenga industries definidas y matcheen el input). Si nada
 * matchea, usa MICRO_GENERICA como red de seguridad universal.
 */
function pickBySize(
  sizeRange: 'MICRO' | 'PEQUEÑA' | 'MEDIANA' | 'GRANDE',
): OnboardingProposal {
  // MICRO siempre prefiere MICRO_GENERICA — es la más segura.
  if (sizeRange === 'MICRO') return MICRO_GENERICA.proposal
  // Para otros tamaños, el primer template que incluya el sizeRange.
  const found = TEMPLATES.find((t) => t.sizeRanges.includes(sizeRange))
  return found?.proposal ?? MICRO_GENERICA.proposal
}

function normalizeIndustry(industry: string): string {
  return industry
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Encuentra el template fallback más apropiado para los inputs dados.
 * Siempre devuelve uno (incluso si no hay match exacto) — fallback al
 * último (microempresa) si no calza con ningún industry.
 */
export function pickFallbackTemplate(input: OnboardingInput): OnboardingProposal {
  const industry = normalizeIndustry(input.industry)

  // 1) Match exacto por industria + tamaño
  const matched = TEMPLATES.find(
    (t) =>
      t.industries.length > 0 &&
      t.sizeRanges.includes(input.sizeRange) &&
      t.industries.some((i) => industry.includes(i)),
  )
  if (matched) return matched.proposal

  // 2) Sin match por industria — caer al más seguro por tamaño
  return pickBySize(input.sizeRange)
}
