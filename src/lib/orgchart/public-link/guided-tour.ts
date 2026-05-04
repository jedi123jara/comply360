/**
 * Auditor Link — "Modo Inspector SUNAFIL".
 *
 * Construye un **tour guiado** (secuencia de steps) sobre el snapshot
 * público redactado del organigrama. Es la diferencia entre entregarle al
 * inspector un PDF mudo vs. una experiencia que lo lleva por:
 *
 *   1. Comité SST                     (Ley 29783 art. 29-30)
 *   2. Comité de Hostigamiento Sexual (Ley 27942 art. 23 · D.S. 014-2019-MIMP)
 *   3. DPO / Datos personales         (Ley 29733)
 *   4. Brigada de emergencia          (Ley 29783 D.S. 005-2012-TR art. 76)
 *   5. Otros roles legales            (Representante Empleador, etc.)
 *   6. Cobertura MOF                  (R.M. 050-2013-TR)
 *   7. Cierre / certificado de gobernanza
 *
 * Cada step trae:
 *   - Título institucional + base legal
 *   - Status: ok | atención | pendiente
 *   - Resumen ejecutivo redactado para inspector
 *   - Personas involucradas (nombres, no DNI ni sueldos)
 *   - Unidades destacadas en el árbol (para resaltar visualmente)
 *
 * Diseñada como función pura — recibe el `tree` redactado, devuelve steps.
 * Tests viven en `__tests__/guided-tour.test.ts`.
 */

import type { ComplianceRoleType } from '../types'
import { COMPLIANCE_ROLES } from '../compliance-rules'

export type TourStepStatus = 'ok' | 'attention' | 'pending'

export interface TourStep {
  /** Identificador estable, usado para tracking y deep-link. */
  key: string
  order: number
  title: string
  baseLegal: string
  status: TourStepStatus
  /** Resumen escrito para el inspector — reemplaza explicaciones dispersas. */
  summary: string
  /** Personas a destacar en este step (sin DNI/sueldo). */
  highlightPeople: Array<{
    name: string
    role: string
    isInterim?: boolean
    endsAt?: string | null
  }>
  /** unitIds a resaltar en el árbol durante este step. */
  highlightUnitIds: string[]
  /** Lista de "evidencias" — frases cortas que el inspector puede checar. */
  evidence: string[]
  /** Si hay observación pendiente, plan de acción sugerido. */
  recommendation: string | null
}

export interface GuidedTour {
  generatedAt: string
  totalSteps: number
  /** Score derivado: 100 si todos OK, baja según pending/attention. */
  globalStatus: TourStepStatus
  steps: TourStep[]
}

// Roles que conforman cada committee logic-block.
const SST_ROLES: ComplianceRoleType[] = [
  'PRESIDENTE_COMITE_SST',
  'SECRETARIO_COMITE_SST',
  'REPRESENTANTE_TRABAJADORES_SST',
  'REPRESENTANTE_EMPLEADOR_SST',
  'SUPERVISOR_SST',
]

const HOSTIGAMIENTO_ROLES: ComplianceRoleType[] = [
  'PRESIDENTE_COMITE_HOSTIGAMIENTO',
  'MIEMBRO_COMITE_HOSTIGAMIENTO',
  'JEFE_INMEDIATO_HOSTIGAMIENTO',
]

const BRIGADA_ROLES: ComplianceRoleType[] = [
  'BRIGADISTA_PRIMEROS_AUXILIOS',
  'BRIGADISTA_EVACUACION',
  'BRIGADISTA_AMAGO_INCENDIO',
]

const DPO_ROLES: ComplianceRoleType[] = ['DPO_LEY_29733']

interface PublicTreeShape {
  units: Array<{ id: string; parentId: string | null; name: string; kind: string }>
  positions: Array<{
    id: string
    orgUnitId: string
    title: string
    occupants: Array<{ name: string; isInterim: boolean }>
  }>
  complianceRoles: Array<{
    roleType: ComplianceRoleType
    workerName: string
    unitId: string | null
    endsAt: string | null
  }>
}

/**
 * Construye el tour guiado a partir de un payload público redactado.
 * Pure function — sin I/O, testeable en isolation.
 */
export function buildGuidedTour(
  tree: PublicTreeShape,
  context: { workerCount: number; mofCompletedRatio: number },
): GuidedTour {
  const steps: TourStep[] = []

  // Step 1: Comité SST
  steps.push(buildSstStep(tree, context.workerCount))

  // Step 2: Hostigamiento (obligatorio si ≥20 trabajadores)
  steps.push(buildHostigamientoStep(tree, context.workerCount))

  // Step 3: DPO (Ley 29733)
  steps.push(buildDpoStep(tree))

  // Step 4: Brigada de emergencia
  steps.push(buildBrigadaStep(tree))

  // Step 5: Otros roles legales
  steps.push(buildOtherRolesStep(tree))

  // Step 6: Cobertura MOF
  steps.push(buildMofStep(context.mofCompletedRatio))

  // Reordenar y numerar
  steps.forEach((s, i) => {
    s.order = i + 1
  })

  // Status global = peor de los steps
  const order: TourStepStatus[] = ['ok', 'attention', 'pending']
  const globalStatus = steps.reduce<TourStepStatus>((worst, s) => {
    return order.indexOf(s.status) > order.indexOf(worst) ? s.status : worst
  }, 'ok')

  return {
    generatedAt: new Date().toISOString(),
    totalSteps: steps.length,
    globalStatus,
    steps,
  }
}

// ─── helpers individuales por step ───────────────────────────────────────────

function rolesByType(
  tree: PublicTreeShape,
  types: ComplianceRoleType[],
): PublicTreeShape['complianceRoles'] {
  const set = new Set(types)
  return tree.complianceRoles.filter((r) => set.has(r.roleType))
}

function unitsContainingRoles(
  tree: PublicTreeShape,
  roles: PublicTreeShape['complianceRoles'],
): string[] {
  return Array.from(new Set(roles.map((r) => r.unitId).filter((x): x is string => Boolean(x))))
}

/** Step 1 — Comité SST. */
function buildSstStep(tree: PublicTreeShape, workerCount: number): TourStep {
  const roles = rolesByType(tree, SST_ROLES)
  const presidente = roles.find((r) => r.roleType === 'PRESIDENTE_COMITE_SST')
  const secretario = roles.find((r) => r.roleType === 'SECRETARIO_COMITE_SST')
  const repTrab = roles.filter((r) => r.roleType === 'REPRESENTANTE_TRABAJADORES_SST')
  const repEmpl = roles.filter((r) => r.roleType === 'REPRESENTANTE_EMPLEADOR_SST')
  const supervisor = roles.find((r) => r.roleType === 'SUPERVISOR_SST')

  // Empresas con menos de 20 trabajadores eligen Supervisor; el resto Comité paritario.
  const requiresCommittee = workerCount >= 20
  let status: TourStepStatus = 'ok'
  let summary = ''
  let recommendation: string | null = null

  if (requiresCommittee) {
    const paritario = repTrab.length === repEmpl.length && repTrab.length >= 2
    const hasMesa = Boolean(presidente) && Boolean(secretario)
    if (!hasMesa || !paritario) {
      status = 'pending'
      const missing: string[] = []
      if (!presidente) missing.push('Presidente')
      if (!secretario) missing.push('Secretario')
      if (!paritario) missing.push('paridad de representantes')
      recommendation = `Designar formalmente: ${missing.join(', ')}. Convocar a elecciones internas (Ley 29783 art. 29).`
      summary = `Empresa con ${workerCount} trabajadores: la Ley 29783 exige un Comité paritario formal. Hoy se observan ${roles.length} miembros designados pero faltan elementos clave.`
    } else {
      summary = `Comité SST conformado paritariamente con ${repTrab.length} representantes por cada parte. Mesa directiva instalada (Presidente y Secretario). Vigencia ${presidente?.endsAt ? `hasta ${formatDateShort(presidente.endsAt)}` : 'al día'}.`
    }
  } else {
    if (!supervisor) {
      status = 'pending'
      summary = `Empresa con ${workerCount} trabajadores: en lugar de Comité, la Ley 29783 art. 30 exige designar un Supervisor SST. No se observa designación.`
      recommendation = 'Designar Supervisor SST por escrito y comunicarlo a los trabajadores.'
    } else {
      summary = `Empresa pequeña (≤20 trabajadores): Supervisor SST designado conforme Ley 29783 art. 30.`
    }
  }

  const people = roles.map((r) => ({
    name: r.workerName,
    role: COMPLIANCE_ROLES[r.roleType].label,
    endsAt: r.endsAt,
  }))

  return {
    key: 'sst-committee',
    order: 0,
    title: 'Comité de Seguridad y Salud en el Trabajo',
    baseLegal: 'Ley 29783 art. 29-30 · D.S. 005-2012-TR',
    status,
    summary,
    highlightPeople: people,
    highlightUnitIds: unitsContainingRoles(tree, roles),
    evidence: [
      requiresCommittee
        ? 'Comité paritario instalado con elección secreta de representantes de trabajadores'
        : 'Supervisor SST designado por el empleador',
      'Vigencia del cargo conforme a Reglamento Interno',
      'Acta de instalación firmada y archivada',
    ],
    recommendation,
  }
}

/** Step 2 — Comité de Hostigamiento Sexual. */
function buildHostigamientoStep(tree: PublicTreeShape, workerCount: number): TourStep {
  const roles = rolesByType(tree, HOSTIGAMIENTO_ROLES)
  const required = workerCount >= 20

  let status: TourStepStatus = 'ok'
  let summary = ''
  let recommendation: string | null = null

  if (required && roles.length === 0) {
    status = 'pending'
    summary = `Empresa con ${workerCount} trabajadores: la Ley 27942 (D.S. 014-2019-MIMP art. 23) exige Comité de Intervención frente al Hostigamiento Sexual. No se observan miembros designados.`
    recommendation = 'Conformar el Comité con representantes paritarios; capacitar y publicar el procedimiento de queja.'
  } else if (required && roles.length < 4) {
    status = 'attention'
    summary = `Hay ${roles.length} miembros designados, pero el Comité estándar requiere mínimo 4 (2 por la empresa y 2 por las trabajadoras y trabajadores).`
    recommendation = 'Completar la conformación del Comité hasta cubrir 4 miembros con paridad de género.'
  } else if (!required) {
    summary = `Empresa con ${workerCount} trabajadores: bajo el umbral, basta con un protocolo escrito y un canal de denuncias confidencial. No se requiere Comité formal.`
  } else {
    summary = `Comité de Hostigamiento Sexual conformado con ${roles.length} miembros. Procedimiento de queja vigente (D.S. 014-2019-MIMP).`
  }

  return {
    key: 'hostigamiento-committee',
    order: 0,
    title: 'Comité de Intervención frente al Hostigamiento Sexual',
    baseLegal: 'Ley 27942 · D.S. 014-2019-MIMP art. 23',
    status,
    summary,
    highlightPeople: roles.map((r) => ({
      name: r.workerName,
      role: COMPLIANCE_ROLES[r.roleType].label,
      endsAt: r.endsAt,
    })),
    highlightUnitIds: unitsContainingRoles(tree, roles),
    evidence: [
      'Comité paritario en género (mín. 50% mujeres)',
      'Protocolo de queja publicado y accesible a trabajadores',
      'Canal de denuncias activo y confidencial',
      'Capacitación anual obligatoria registrada',
    ],
    recommendation,
  }
}

/** Step 3 — DPO (Ley 29733). */
function buildDpoStep(tree: PublicTreeShape): TourStep {
  const roles = rolesByType(tree, DPO_ROLES)
  const dpo = roles.find((r) => r.roleType === 'DPO_LEY_29733')

  let status: TourStepStatus = 'ok'
  let summary = ''
  let recommendation: string | null = null

  if (!dpo) {
    status = 'attention'
    summary =
      'No se observa Oficial de Datos Personales (DPO) designado. La Ley 29733 lo exige cuando la empresa trate datos personales sensibles a gran escala (planilla, salud, biométricos).'
    recommendation =
      'Designar al Oficial de Datos Personales por escrito. Inscribir el banco de datos ante la Autoridad Nacional de Protección de Datos Personales (ANPDP).'
  } else {
    summary = `Oficial de Datos Personales (DPO) designado conforme Ley 29733. Encargado del registro del banco de datos ante ANPDP y atención de derechos ARCO de los trabajadores.`
  }

  return {
    key: 'dpo',
    order: 0,
    title: 'Oficial de Protección de Datos Personales',
    baseLegal: 'Ley 29733 · D.S. 003-2013-JUS',
    status,
    summary,
    highlightPeople: roles.map((r) => ({
      name: r.workerName,
      role: COMPLIANCE_ROLES[r.roleType].label,
      endsAt: r.endsAt,
    })),
    highlightUnitIds: unitsContainingRoles(tree, roles),
    evidence: [
      'DPO designado por escrito',
      'Banco de datos personales inscrito en ANPDP',
      'Procedimiento de derechos ARCO documentado',
      'Política de privacidad publicada',
    ],
    recommendation,
  }
}

/** Step 4 — Brigada de emergencia. */
function buildBrigadaStep(tree: PublicTreeShape): TourStep {
  const roles = rolesByType(tree, BRIGADA_ROLES)
  let status: TourStepStatus = 'ok'
  let summary = ''
  let recommendation: string | null = null

  if (roles.length === 0) {
    status = 'pending'
    summary =
      'No se observan brigadistas designados. El D.S. 005-2012-TR art. 76 exige Plan de Emergencia con brigadas de primeros auxilios, evacuación e incendios.'
    recommendation =
      'Designar al menos un brigadista por cada función (primeros auxilios, evacuación, incendio). Realizar simulacros documentados al menos una vez al año.'
  } else {
    const funcionesCubiertas = new Set(roles.map((r) => r.roleType))
    const todasLasFunciones: ComplianceRoleType[] = [
      'BRIGADISTA_PRIMEROS_AUXILIOS',
      'BRIGADISTA_EVACUACION',
      'BRIGADISTA_AMAGO_INCENDIO',
    ]
    const faltantes = todasLasFunciones.filter((f) => !funcionesCubiertas.has(f))
    if (faltantes.length > 0) {
      status = 'attention'
      summary = `Hay ${roles.length} brigadistas designados pero faltan funciones: ${faltantes
        .map((f) => COMPLIANCE_ROLES[f].label)
        .join(', ')}.`
      recommendation = 'Completar las brigadas pendientes para cubrir todas las funciones del Plan de Emergencia.'
    } else {
      summary = `Plan de Emergencia con ${roles.length} brigadistas activos. Funciones cubiertas: primeros auxilios, evacuación e incendios.`
    }
  }

  return {
    key: 'brigada-emergencia',
    order: 0,
    title: 'Brigadas de Emergencia',
    baseLegal: 'Ley 29783 · D.S. 005-2012-TR art. 76',
    status,
    summary,
    highlightPeople: roles.map((r) => ({
      name: r.workerName,
      role: COMPLIANCE_ROLES[r.roleType].label,
      endsAt: r.endsAt,
    })),
    highlightUnitIds: unitsContainingRoles(tree, roles),
    evidence: [
      'Jefe de Brigada designado por escrito',
      'Brigadistas capacitados y registrados',
      'Simulacro anual documentado',
      'Plan de Emergencia actualizado',
    ],
    recommendation,
  }
}

/** Step 5 — Otros roles legales (no enmarcados en comités específicos). */
function buildOtherRolesStep(tree: PublicTreeShape): TourStep {
  const otherTypes = (Object.keys(COMPLIANCE_ROLES) as ComplianceRoleType[]).filter(
    (t) =>
      ![...SST_ROLES, ...HOSTIGAMIENTO_ROLES, ...BRIGADA_ROLES, ...DPO_ROLES].includes(t),
  )
  const roles = rolesByType(tree, otherTypes)

  const status: TourStepStatus = roles.length > 0 ? 'ok' : 'attention'
  const summary =
    roles.length > 0
      ? `Otros roles legales designados: ${roles.length} cargos vigentes (Representante Legal, Responsable de Capacitación, etc.).`
      : 'No se observan otros roles legales designados (Representante Legal, Responsable de Capacitación, etc.). Recomendable formalizarlos.'

  const recommendation =
    roles.length > 0
      ? null
      : 'Designar formalmente los roles transversales: Representante Legal, Responsable de Igualdad Salarial (Ley 30709) y Responsable de Capacitación.'

  return {
    key: 'other-legal-roles',
    order: 0,
    title: 'Otros Responsables Legales',
    baseLegal: 'Ley 30709 · Ley 29381 · normativa conexa',
    status,
    summary,
    highlightPeople: roles.map((r) => ({
      name: r.workerName,
      role: COMPLIANCE_ROLES[r.roleType].label,
      endsAt: r.endsAt,
    })),
    highlightUnitIds: unitsContainingRoles(tree, roles),
    evidence: [
      'Representante Legal vigente en SUNARP',
      'Responsable de Capacitación designado',
      'Cuadro de Categorías por Igualdad Salarial publicado (Ley 30709)',
    ],
    recommendation,
  }
}

/** Step 6 — Cobertura del MOF. */
function buildMofStep(mofCompletedRatio: number): TourStep {
  const ratio = Math.max(0, Math.min(1, mofCompletedRatio))
  const pct = Math.round(ratio * 100)

  let status: TourStepStatus = 'ok'
  let summary = ''
  let recommendation: string | null = null

  if (pct < 60) {
    status = 'pending'
    summary = `Solo el ${pct}% de los cargos tiene MOF (Manual de Organización y Funciones) documentado. La R.M. 050-2013-TR exige propósito, funciones, responsabilidades y requisitos por cada cargo.`
    recommendation =
      'Documentar el MOF de los cargos pendientes. Comply360 permite generar el MOF automáticamente desde el organigrama.'
  } else if (pct < 90) {
    status = 'attention'
    summary = `${pct}% de los cargos con MOF documentado. Hay margen de mejora — completar antes de la próxima auditoría interna.`
  } else {
    summary = `${pct}% de los cargos cuenta con MOF documentado conforme R.M. 050-2013-TR. Excelente nivel de formalización.`
  }

  return {
    key: 'mof-coverage',
    order: 0,
    title: 'Manual de Organización y Funciones (MOF)',
    baseLegal: 'R.M. 050-2013-TR · D.S. 003-97-TR',
    status,
    summary,
    highlightPeople: [],
    highlightUnitIds: [],
    evidence: [
      'Cada cargo con propósito documentado',
      'Funciones, responsabilidades y requisitos por cargo',
      'Aprobación formal por Gerencia General',
      'Versión vigente disponible para los trabajadores',
    ],
    recommendation,
  }
}

function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}
