/**
 * Catálogo de roles legales peruanos.
 *
 * Cada rol viene con su base legal, vigencia típica y reglas mínimas para que
 * el AI Org Doctor sepa qué buscar (qué falta, qué vence).
 *
 * Fuentes:
 *   - Ley 29783 (SST) y D.S. 005-2012-TR
 *   - Ley 27942 (hostigamiento) y D.S. 014-2019-MIMP
 *   - Ley 29733 (datos personales)
 *   - Ley 30709 (igualdad salarial)
 *   - R.M. 050-2013-TR (formatos SST)
 */

import type { ComplianceRoleType } from '@/generated/prisma/client'

export interface ComplianceRoleDef {
  type: ComplianceRoleType
  label: string
  shortLabel: string
  baseLegal: string
  description: string
  /** Vigencia típica del cargo en meses. */
  defaultDurationMonths: number | null
  /** Color del chip en la UI (Emerald Light tokens). */
  color: 'emerald' | 'sky' | 'amber' | 'violet' | 'rose' | 'slate'
  /** Si el rol pertenece a un comité/órgano colegiado. */
  committeeKind:
    | 'COMITE_SST'
    | 'COMITE_HOSTIGAMIENTO'
    | 'BRIGADA_EMERGENCIA'
    | 'INDIVIDUAL'
}

export const COMPLIANCE_ROLES: Record<ComplianceRoleType, ComplianceRoleDef> = {
  PRESIDENTE_COMITE_SST: {
    type: 'PRESIDENTE_COMITE_SST',
    label: 'Presidente Comité SST',
    shortLabel: 'Pres. SST',
    baseLegal: 'Ley 29783 art. 29 · D.S. 005-2012-TR',
    description: 'Preside el Comité de Seguridad y Salud en el Trabajo. Elegido por los miembros.',
    defaultDurationMonths: 24,
    color: 'emerald',
    committeeKind: 'COMITE_SST',
  },
  SECRETARIO_COMITE_SST: {
    type: 'SECRETARIO_COMITE_SST',
    label: 'Secretario Comité SST',
    shortLabel: 'Sec. SST',
    baseLegal: 'Ley 29783 art. 29',
    description: 'Lleva las actas y convoca las sesiones del Comité SST.',
    defaultDurationMonths: 24,
    color: 'emerald',
    committeeKind: 'COMITE_SST',
  },
  REPRESENTANTE_TRABAJADORES_SST: {
    type: 'REPRESENTANTE_TRABAJADORES_SST',
    label: 'Representante de Trabajadores en SST',
    shortLabel: 'Rep. Trab. SST',
    baseLegal: 'Ley 29783 art. 29 (mín. 50% del comité)',
    description: 'Elegido por votación entre los trabajadores. Voto secreto.',
    defaultDurationMonths: 24,
    color: 'emerald',
    committeeKind: 'COMITE_SST',
  },
  REPRESENTANTE_EMPLEADOR_SST: {
    type: 'REPRESENTANTE_EMPLEADOR_SST',
    label: 'Representante del Empleador en SST',
    shortLabel: 'Rep. Empl. SST',
    baseLegal: 'Ley 29783 art. 29',
    description: 'Designado por el empleador. Misma cantidad que representantes de trabajadores.',
    defaultDurationMonths: 24,
    color: 'emerald',
    committeeKind: 'COMITE_SST',
  },
  SUPERVISOR_SST: {
    type: 'SUPERVISOR_SST',
    label: 'Supervisor SST',
    shortLabel: 'Supervisor SST',
    baseLegal: 'Ley 29783 art. 30 (empresas ≤20 trabajadores)',
    description: 'Reemplaza al Comité en empresas con 20 o menos trabajadores.',
    defaultDurationMonths: 24,
    color: 'emerald',
    committeeKind: 'INDIVIDUAL',
  },
  PRESIDENTE_COMITE_HOSTIGAMIENTO: {
    type: 'PRESIDENTE_COMITE_HOSTIGAMIENTO',
    label: 'Presidente Comité Intervención Hostigamiento',
    shortLabel: 'Pres. Hostig.',
    baseLegal: 'Ley 27942 · D.S. 014-2019-MIMP',
    description: 'Preside el comité que recibe denuncias de hostigamiento sexual.',
    defaultDurationMonths: 24,
    color: 'violet',
    committeeKind: 'COMITE_HOSTIGAMIENTO',
  },
  MIEMBRO_COMITE_HOSTIGAMIENTO: {
    type: 'MIEMBRO_COMITE_HOSTIGAMIENTO',
    label: 'Miembro Comité Hostigamiento',
    shortLabel: 'Comité Hostig.',
    baseLegal: 'Ley 27942',
    description: 'Integrante del comité de intervención frente a hostigamiento sexual.',
    defaultDurationMonths: 24,
    color: 'violet',
    committeeKind: 'COMITE_HOSTIGAMIENTO',
  },
  JEFE_INMEDIATO_HOSTIGAMIENTO: {
    type: 'JEFE_INMEDIATO_HOSTIGAMIENTO',
    label: 'Jefe Receptor de Denuncias (Hostigamiento)',
    shortLabel: 'Receptor denuncias',
    baseLegal: 'Ley 27942 art. 7',
    description: 'Recibe denuncias verbales o escritas sin trámite previo.',
    defaultDurationMonths: null,
    color: 'violet',
    committeeKind: 'INDIVIDUAL',
  },
  BRIGADISTA_PRIMEROS_AUXILIOS: {
    type: 'BRIGADISTA_PRIMEROS_AUXILIOS',
    label: 'Brigadista Primeros Auxilios',
    shortLabel: 'Brigadista PA',
    baseLegal: 'Ley 29783 · R.M. 050-2013-TR',
    description: 'Trabajador capacitado para primeros auxilios en emergencias.',
    defaultDurationMonths: 12,
    color: 'amber',
    committeeKind: 'BRIGADA_EMERGENCIA',
  },
  BRIGADISTA_EVACUACION: {
    type: 'BRIGADISTA_EVACUACION',
    label: 'Brigadista Evacuación',
    shortLabel: 'Brig. Evac.',
    baseLegal: 'Ley 29783',
    description: 'Lidera la evacuación segura del personal en emergencias.',
    defaultDurationMonths: 12,
    color: 'amber',
    committeeKind: 'BRIGADA_EMERGENCIA',
  },
  BRIGADISTA_AMAGO_INCENDIO: {
    type: 'BRIGADISTA_AMAGO_INCENDIO',
    label: 'Brigadista Amago de Incendio',
    shortLabel: 'Brig. Incendio',
    baseLegal: 'Ley 29783',
    description: 'Brigadista para control inicial de amagos de incendio.',
    defaultDurationMonths: 12,
    color: 'amber',
    committeeKind: 'BRIGADA_EMERGENCIA',
  },
  DPO_LEY_29733: {
    type: 'DPO_LEY_29733',
    label: 'Oficial de Protección de Datos (DPO)',
    shortLabel: 'DPO',
    baseLegal: 'Ley 29733 art. 42 · D.S. 003-2013-JUS',
    description:
      'Responsable del cumplimiento de la Ley de Protección de Datos Personales. Obligatorio cuando el banco de datos lo requiera.',
    defaultDurationMonths: null,
    color: 'sky',
    committeeKind: 'INDIVIDUAL',
  },
  RT_PLANILLA: {
    type: 'RT_PLANILLA',
    label: 'Responsable T-REGISTRO / PLAME',
    shortLabel: 'RT Planilla',
    baseLegal: 'D.S. 018-2007-TR · R.M. 121-2011-TR',
    description: 'Encargado de mantener actualizada la planilla electrónica y altas/bajas en T-REGISTRO.',
    defaultDurationMonths: null,
    color: 'slate',
    committeeKind: 'INDIVIDUAL',
  },
  RESPONSABLE_IGUALDAD_SALARIAL: {
    type: 'RESPONSABLE_IGUALDAD_SALARIAL',
    label: 'Responsable Igualdad Salarial',
    shortLabel: 'Igualdad Salarial',
    baseLegal: 'Ley 30709 · D.S. 002-2018-TR',
    description: 'Vela por el cumplimiento del cuadro de categorías y la no discriminación remunerativa.',
    defaultDurationMonths: null,
    color: 'rose',
    committeeKind: 'INDIVIDUAL',
  },
  ENCARGADO_LIBRO_RECLAMACIONES: {
    type: 'ENCARGADO_LIBRO_RECLAMACIONES',
    label: 'Encargado Libro de Reclamaciones',
    shortLabel: 'Libro Reclamac.',
    baseLegal: 'Código de Protección y Defensa del Consumidor',
    description: 'Atiende reclamos de consumidores en establecimientos abiertos al público.',
    defaultDurationMonths: null,
    color: 'slate',
    committeeKind: 'INDIVIDUAL',
  },
  MEDICO_OCUPACIONAL: {
    type: 'MEDICO_OCUPACIONAL',
    label: 'Médico Ocupacional',
    shortLabel: 'Méd. Ocup.',
    baseLegal: 'Ley 29783 · D.S. 005-2012-TR (empresas >200 trabajadores)',
    description:
      'Profesional médico responsable de exámenes médicos ocupacionales y vigilancia de la salud.',
    defaultDurationMonths: null,
    color: 'sky',
    committeeKind: 'INDIVIDUAL',
  },
  ASISTENTA_SOCIAL: {
    type: 'ASISTENTA_SOCIAL',
    label: 'Asistenta Social',
    shortLabel: 'Trab. Social',
    baseLegal: 'D.S. 009-2016-MIMP (empresas con >100 trabajadoras mujeres)',
    description: 'Brinda apoyo psicosocial a las trabajadoras y atiende casos de hostigamiento.',
    defaultDurationMonths: null,
    color: 'rose',
    committeeKind: 'INDIVIDUAL',
  },
  RESPONSABLE_LACTARIO: {
    type: 'RESPONSABLE_LACTARIO',
    label: 'Responsable de Lactario Institucional',
    shortLabel: 'Lactario',
    baseLegal: 'Ley 29896 · D.S. 001-2016-MIMP (≥20 trabajadoras en edad fértil)',
    description:
      'Responsable de la implementación y mantenimiento del lactario institucional.',
    defaultDurationMonths: null,
    color: 'rose',
    committeeKind: 'INDIVIDUAL',
  },
  ENCARGADO_NUTRICION: {
    type: 'ENCARGADO_NUTRICION',
    label: 'Encargado de Nutrición / BPM',
    shortLabel: 'Nutrición',
    baseLegal: 'D.S. 007-98-SA · DIGESA (sector alimentario)',
    description:
      'Garantiza buenas prácticas de manipulación y nutrición en establecimientos de alimentos.',
    defaultDurationMonths: null,
    color: 'emerald',
    committeeKind: 'INDIVIDUAL',
  },
}

export function getRoleDef(type: ComplianceRoleType): ComplianceRoleDef {
  return COMPLIANCE_ROLES[type]
}

/** Roles agrupados por comité/órgano para vista "Comités legales" del organigrama. */
export const COMMITTEE_GROUPS = {
  COMITE_SST: [
    'PRESIDENTE_COMITE_SST',
    'SECRETARIO_COMITE_SST',
    'REPRESENTANTE_TRABAJADORES_SST',
    'REPRESENTANTE_EMPLEADOR_SST',
  ] as ComplianceRoleType[],
  COMITE_HOSTIGAMIENTO: [
    'PRESIDENTE_COMITE_HOSTIGAMIENTO',
    'MIEMBRO_COMITE_HOSTIGAMIENTO',
  ] as ComplianceRoleType[],
  BRIGADA_EMERGENCIA: [
    'BRIGADISTA_PRIMEROS_AUXILIOS',
    'BRIGADISTA_EVACUACION',
    'BRIGADISTA_AMAGO_INCENDIO',
  ] as ComplianceRoleType[],
}
