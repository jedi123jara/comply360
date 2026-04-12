// =============================================
// PLAN ANUAL DE SEGURIDAD Y SALUD EN EL TRABAJO (PASST)
//
// Base legal:
//   Ley N° 29783 — Ley de Seguridad y Salud en el Trabajo
//   D.S. N° 005-2012-TR — Reglamento de la Ley N° 29783
//   D.S. N° 006-2014-TR — Modifica Reglamento
//   R.M. N° 050-2013-TR — Formatos referenciales SST
//   R.M. N° 085-2013-TR — Registros obligatorios SST
//   Ley N° 30222 — Modifica Ley 29783 (2014)
//
// Obligatorio:
//   Todo empleador con 1 o más trabajadores (Art. 17° y 32° Ley 29783)
//   El Plan debe ser aprobado por el CSST o Supervisor SST
//   Debe estar disponible para inspección de SUNAFIL en cualquier momento
//
// Sanción por no contar con Plan SST: Muy Grave
// (hasta 100 UIT según número de trabajadores afectados)
// UIT 2026 = S/ 5,500
// =============================================

import type { DocumentTemplateDefinition } from './types'

export const PLAN_SST_TEMPLATE: DocumentTemplateDefinition = {
  id: 'plan-anual-sst',
  type: 'PLAN_SST',
  name: 'Plan Anual de Seguridad y Salud en el Trabajo (PASST)',
  description:
    'Documento obligatorio conforme a la Ley N° 29783 y D.S. N° 005-2012-TR. Establece los objetivos, metas, indicadores, responsabilidades y cronograma anual de actividades en materia de seguridad y salud en el trabajo. Debe ser aprobado por el Comité o Supervisor SST y estar disponible para SUNAFIL.',
  legalBasis:
    'Ley N° 29783 | D.S. N° 005-2012-TR | R.M. N° 050-2013-TR | R.M. N° 085-2013-TR',
  mandatoryFrom: 'Obligatorio para todo empleador con al menos 1 trabajador',
  workerThreshold: 1,
  approvalAuthority:
    'Comité de Seguridad y Salud en el Trabajo (20+ trabajadores) o Supervisor SST (menos de 20)',
  sections: [
    {
      id: 'empresa',
      title: 'Datos Generales de la Empresa',
      fields: [
        {
          id: 'empresa_razon_social',
          label: 'Razón Social',
          type: 'text',
          required: true,
        },
        {
          id: 'empresa_ruc',
          label: 'RUC',
          type: 'text',
          required: true,
        },
        {
          id: 'empresa_direccion',
          label: 'Dirección del centro de trabajo',
          type: 'text',
          required: true,
        },
        {
          id: 'empresa_actividad',
          label: 'Actividad económica (CIIU)',
          type: 'text',
          required: true,
          placeholder: 'Ej: Servicios de consultoría (CIIU 7022) / Construcción (CIIU 4100)',
        },
        {
          id: 'empresa_num_trabajadores',
          label: 'Número total de trabajadores',
          type: 'number',
          required: true,
        },
        {
          id: 'empresa_gerente',
          label: 'Representante legal / Gerente General',
          type: 'text',
          required: true,
        },
        {
          id: 'responsable_sst',
          label: 'Responsable del área SST',
          type: 'text',
          required: true,
          placeholder: 'Nombre del Jefe SST, Supervisor SST o Prevencionista',
        },
        {
          id: 'anio_plan',
          label: 'Año del Plan',
          type: 'number',
          required: true,
          placeholder: '2026',
        },
        {
          id: 'fecha_aprobacion',
          label: 'Fecha de aprobación por CSST/Supervisor',
          type: 'date',
          required: true,
        },
        {
          id: 'ciudad',
          label: 'Ciudad',
          type: 'text',
          required: true,
          placeholder: 'Lima',
        },
      ],
    },
    {
      id: 'diagnostico',
      title: 'Diagnóstico de la Situación SST',
      fields: [
        {
          id: 'accidentes_anio_anterior',
          label: 'Número de accidentes de trabajo en el año anterior',
          type: 'number',
        },
        {
          id: 'incidentes_anio_anterior',
          label: 'Número de incidentes peligrosos en el año anterior',
          type: 'number',
        },
        {
          id: 'enfermedades_ocupacionales',
          label: 'Enfermedades ocupacionales detectadas (descripción)',
          type: 'textarea',
          placeholder: 'Ninguna / Describir si existen casos diagnosticados',
        },
        {
          id: 'peligros_principales',
          label: 'Principales peligros identificados en el IPERC',
          type: 'textarea',
          required: true,
          placeholder:
            '1. Ergonómicos: Trabajo en postura sentada prolongada (oficinas)\n2. Eléctricos: Contacto con equipos eléctricos sin mantenimiento\n3. Locativos: Pisos irregulares o mojados\n4. Psicosociales: Sobrecarga laboral\n5. ...',
          helpText: 'Basarse en la última matriz IPERC actualizada de la empresa.',
        },
        {
          id: 'cumplimiento_anio_anterior',
          label: '% de cumplimiento del Plan SST del año anterior',
          type: 'select',
          options: [
            { value: 'no_tenia', label: 'No se contaba con Plan SST anterior' },
            { value: 'menos_50', label: 'Menos del 50%' },
            { value: '50_75', label: '50% - 75%' },
            { value: '75_90', label: '75% - 90%' },
            { value: 'mas_90', label: 'Más del 90%' },
          ],
        },
      ],
    },
    {
      id: 'objetivos',
      title: 'Objetivos y Metas del Plan',
      description:
        'Los objetivos deben ser SMART: Específicos, Medibles, Alcanzables, Relevantes y con Tiempo definido.',
      fields: [
        {
          id: 'objetivo_accidentes',
          label: 'Meta de accidentabilidad',
          type: 'text',
          required: true,
          placeholder: 'Reducir el índice de frecuencia de accidentes en un 50% respecto al año anterior',
        },
        {
          id: 'objetivo_capacitacion',
          label: 'Meta de capacitación SST',
          type: 'text',
          required: true,
          placeholder:
            'Capacitar al 100% de los trabajadores en SST (mínimo 4 capacitaciones al año)',
        },
        {
          id: 'objetivo_iperc',
          label: 'Meta de gestión de riesgos (IPERC)',
          type: 'text',
          required: true,
          placeholder:
            'Actualizar el IPERC en el primer trimestre y controlar el 80% de los riesgos identificados como significativos',
        },
        {
          id: 'objetivo_inspecciones',
          label: 'Meta de inspecciones internas',
          type: 'text',
          required: true,
          placeholder:
            'Realizar al menos 1 inspección mensual de condiciones de trabajo en todas las áreas',
        },
        {
          id: 'objetivo_epp',
          label: 'Meta de dotación de EPP',
          type: 'text',
          placeholder:
            'Dotar al 100% de los trabajadores expuestos con EPP adecuado y en buen estado',
        },
        {
          id: 'objetivo_examenes',
          label: 'Meta de exámenes médicos ocupacionales',
          type: 'text',
          placeholder:
            'Realizar exámenes médicos ocupacionales periódicos al 100% de los trabajadores',
        },
      ],
    },
  ],
  blocks: [
    {
      id: 'caratula',
      blockType: 'header',
      text:
        'PLAN ANUAL DE SEGURIDAD Y SALUD EN EL TRABAJO\nAÑO {{anio_plan}}\n\n' +
        'EMPRESA: {{empresa_razon_social}}\n' +
        'RUC: {{empresa_ruc}}\n' +
        'ACTIVIDAD: {{empresa_actividad}}\n' +
        'DIRECCIÓN: {{empresa_direccion}}\n' +
        'N° TRABAJADORES: {{empresa_num_trabajadores}}\n' +
        'RESPONSABLE SST: {{responsable_sst}}\n\n' +
        'Elaborado conforme a:\n' +
        '• Ley N° 29783 — Ley de SST\n' +
        '• D.S. N° 005-2012-TR — Reglamento\n' +
        '• R.M. N° 050-2013-TR — Formatos referenciales\n\n' +
        'APROBADO POR EL COMITÉ/SUPERVISOR SST\n' +
        'Fecha: {{fecha_aprobacion}}',
    },
    {
      id: 'base_legal',
      blockType: 'clause',
      title: '1. BASE LEGAL',
      text:
        'El presente Plan Anual de Seguridad y Salud en el Trabajo es elaborado en cumplimiento de:\n\n' +
        '• Ley N° 29783 — Ley de Seguridad y Salud en el Trabajo (20.08.2011)\n' +
        '• Ley N° 30222 — Ley que modifica la Ley N° 29783 (11.07.2014)\n' +
        '• D.S. N° 005-2012-TR — Reglamento de la Ley N° 29783\n' +
        '• D.S. N° 006-2014-TR — Modifica el Reglamento de la Ley N° 29783\n' +
        '• R.M. N° 050-2013-TR — Formatos referenciales del SGSST\n' +
        '• R.M. N° 085-2013-TR — Registros obligatorios del SGSST\n\n' +
        'Conforme al artículo 32° del D.S. N° 005-2012-TR, toda documentación relativa al SGSST, incluyendo el presente Plan, debe estar disponible para los trabajadores y para las autoridades competentes (SUNAFIL/MTPE) en cualquier momento.',
    },
    {
      id: 'alcance',
      blockType: 'clause',
      title: '2. ALCANCE',
      text:
        'El presente Plan aplica a:\n\n' +
        '• Todos los trabajadores de {{empresa_razon_social}}, en modalidad indefinida, plazo fijo, tiempo parcial, modalidad formativa y CAS;\n' +
        '• Contratistas, subcontratistas y empresas especiales de servicios que operen en las instalaciones de {{empresa_razon_social}};\n' +
        '• Visitas y terceros que ingresen a las instalaciones de {{empresa_razon_social}}.\n\n' +
        'Centros de trabajo incluidos: {{empresa_direccion}} y demás sedes/instalaciones donde opere {{empresa_razon_social}}.',
    },
    {
      id: 'diagnostico_bloque',
      blockType: 'clause',
      title: '3. DIAGNÓSTICO DE LA SITUACIÓN SST — LÍNEA BASE',
      text:
        'El presente Plan se elabora sobre la base del diagnóstico de la situación actual en SST de {{empresa_razon_social}}:\n\n' +
        '3.1. ESTADÍSTICAS DE ACCIDENTABILIDAD (AÑO ANTERIOR)\n' +
        '• Número de accidentes de trabajo: {{accidentes_anio_anterior}}\n' +
        '• Número de incidentes peligrosos: {{incidentes_anio_anterior}}\n' +
        '• Enfermedades ocupacionales reportadas: {{enfermedades_ocupacionales}}\n\n' +
        '3.2. PRINCIPALES PELIGROS Y RIESGOS IDENTIFICADOS (IPERC)\n\n' +
        '{{peligros_principales}}\n\n' +
        '3.3. EVALUACIÓN DEL PLAN ANTERIOR\n' +
        '• Cumplimiento del Plan SST del año anterior: {{cumplimiento_anio_anterior}}\n\n' +
        '3.4. BRECHAS IDENTIFICADAS\n' +
        'Con base en el diagnóstico anterior y la evaluación de la línea base conforme al Anexo 3 del D.S. N° 005-2012-TR, se han identificado las siguientes brechas principales a abordar en el Plan {{anio_plan}}:\n' +
        '[Completar con las brechas específicas identificadas en la empresa]',
    },
    {
      id: 'politica_sst',
      blockType: 'clause',
      title: '4. POLÍTICA DE SEGURIDAD Y SALUD EN EL TRABAJO',
      text:
        '{{empresa_razon_social}} asume el compromiso de:\n\n' +
        '(a) Proteger la seguridad y salud de todos sus trabajadores, previniendo los accidentes de trabajo, enfermedades ocupacionales e incidentes peligrosos;\n' +
        '(b) Cumplir con la legislación vigente en materia de SST (Ley N° 29783 y reglamentos);\n' +
        '(c) Garantizar que todos los trabajadores participen activamente en la gestión del SST, a través del Comité de Seguridad y Salud en el Trabajo;\n' +
        '(d) Mejorar continuamente el desempeño del Sistema de Gestión de SST;\n' +
        '(e) Consultar y comunicar a los trabajadores todos los asuntos relacionados con la seguridad y salud en el trabajo.\n\n' +
        'La Política SST es aplicable a todas las actividades y personas que operen en {{empresa_razon_social}}, incluyendo contratistas y proveedores.',
    },
    {
      id: 'objetivos_bloque',
      blockType: 'clause',
      title: '5. OBJETIVOS Y METAS {{anio_plan}}',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '┌───┬──────────────────────────────────┬──────────────────────────────────┬──────────────┬──────────────┐\n' +
        '│ N°│ Objetivo                         │ Meta                             │ Indicador    │ Plazo        │\n' +
        '├───┼──────────────────────────────────┼──────────────────────────────────┼──────────────┼──────────────┤\n' +
        '│ 1 │ Reducir accidentabilidad         │ {{objetivo_accidentes}}          │ IF (Índice   │ Dic. {{anio_plan}} │\n' +
        '│   │                                  │                                  │ Frecuencia)  │              │\n' +
        '├───┼──────────────────────────────────┼──────────────────────────────────┼──────────────┼──────────────┤\n' +
        '│ 2 │ Capacitación SST                 │ {{objetivo_capacitacion}}        │ % trabajad.  │ Dic. {{anio_plan}} │\n' +
        '│   │                                  │                                  │ capacitados  │              │\n' +
        '├───┼──────────────────────────────────┼──────────────────────────────────┼──────────────┼──────────────┤\n' +
        '│ 3 │ Gestión de riesgos (IPERC)       │ {{objetivo_iperc}}               │ % riesgos    │ Mar. {{anio_plan}} │\n' +
        '│   │                                  │                                  │ controlados  │              │\n' +
        '├───┼──────────────────────────────────┼──────────────────────────────────┼──────────────┼──────────────┤\n' +
        '│ 4 │ Inspecciones internas            │ {{objetivo_inspecciones}}        │ N° inspecc.  │ Mensual      │\n' +
        '│   │                                  │                                  │ realizadas   │              │\n' +
        '├───┼──────────────────────────────────┼──────────────────────────────────┼──────────────┼──────────────┤\n' +
        '│ 5 │ Dotación de EPP                  │ {{objetivo_epp}}                 │ % trab. con  │ Ene. {{anio_plan}} │\n' +
        '│   │                                  │                                  │ EPP vigente  │              │\n' +
        '├───┼──────────────────────────────────┼──────────────────────────────────┼──────────────┼──────────────┤\n' +
        '│ 6 │ Exámenes médicos ocupacionales   │ {{objetivo_examenes}}            │ % trab. con  │ Jun. {{anio_plan}} │\n' +
        '│   │                                  │                                  │ EMO vigente  │              │\n' +
        '└───┴──────────────────────────────────┴──────────────────────────────────┴──────────────┴──────────────┘',
    },
    {
      id: 'cronograma',
      blockType: 'clause',
      title: '6. PROGRAMA DE ACTIVIDADES — CRONOGRAMA {{anio_plan}}',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '┌───┬────────────────────────────────────┬────────────────────────────────────────┬─────────────────────┐\n' +
        '│ N°│ Actividad                          │ Responsable                            │ Ene Feb Mar Abr May│\n' +
        '│   │                                    │                                        │ Jun Jul Ago Set Oct │\n' +
        '│   │                                    │                                        │ Nov Dic             │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│ 1 │ Actualizar Política SST            │ Gerencia + Responsable SST             │ ███                 │\n' +
        '│   │ (Art. 22° Ley 29783)               │                                        │                     │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│ 2 │ Actualizar IPERC                   │ Responsable SST + Jefes de Área        │ ████                │\n' +
        '│   │ (R.M. 050-2013-TR)                 │                                        │                     │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│ 3 │ Elección del CSST                  │ RRHH                                   │ ██ (bienal)         │\n' +
        '│   │ (Art. 31° Ley 29783)               │                                        │                     │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│ 4 │ Capacitación SST (mín. 4/año)      │ Responsable SST                        │ ██ ██ ██ ██         │\n' +
        '│   │ Art. 35°(b) Ley 29783              │                                        │ (trimestral)        │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│ 5 │ Exámenes médicos ocupacionales     │ Responsable SST + RRHH                 │ ████████████        │\n' +
        '│   │ (ingreso, periódico, retiro)        │                                        │ (programar por área) │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│ 6 │ Inspecciones internas de SST       │ Responsable SST + CSST                 │ ████████████        │\n' +
        '│   │ (mínimo mensual)                   │                                        │ (mensual)           │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│ 7 │ Simulacro de evacuación            │ Responsable SST + Brigadas             │ ██ ██ ██            │\n' +
        '│   │ (mínimo 2/año, Ley 29783)          │                                        │ (may, ago, nov)     │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│ 8 │ Dotación / renovación de EPP       │ Responsable SST + Almacén              │ ██ ████ ████        │\n' +
        '│   │ por área de riesgo                 │                                        │ (semestral)         │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│ 9 │ Auditoría interna SGSST            │ CSST / Auditor interno                 │ ████████████        │\n' +
        '│   │ (Art. 43° Ley 29783)               │                                        │ (jun + dic)         │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│10 │ Actualizar Mapa de Riesgos         │ Responsable SST                        │ ████                │\n' +
        '│   │ y publicar en áreas de trabajo     │                                        │ (mar)               │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│11 │ Reunión mensual CSST               │ CSST                                   │ ████████████        │\n' +
        '│   │ (Art. 68° D.S. 005-2012-TR)        │                                        │ (mensual)           │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│12 │ Elaborar Estadísticas de           │ Responsable SST                        │ ████████████        │\n' +
        '│   │ Seguridad (IF, IG, IA)             │                                        │ (mensual)           │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│13 │ Actualizar Procedimientos de       │ Responsable SST + Jefes de Área        │ ████████████        │\n' +
        '│   │ trabajo seguro (PTS)               │                                        │ (según IPERC)       │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│14 │ Investigación de accidentes e      │ Responsable SST + Supervisor área      │ Ante cada evento    │\n' +
        '│   │ incidentes (notif. MTPE 24h)       │                                        │ (24 horas)          │\n' +
        '├───┼────────────────────────────────────┼────────────────────────────────────────┼─────────────────────┤\n' +
        '│15 │ Revisión del Plan por la           │ Gerencia General + CSST                │ ████ ████           │\n' +
        '│   │ Dirección (Art. 90° D.S.)          │                                        │ (jun + dic)         │\n' +
        '└───┴────────────────────────────────────┴────────────────────────────────────────┴─────────────────────┘\n\n' +
        'LEYENDA: ██ = Período de ejecución / Las celdas sin marca se completan según programa de la empresa.',
    },
    {
      id: 'presupuesto',
      blockType: 'clause',
      title: '7. PRESUPUESTO ESTIMADO PARA IMPLEMENTACIÓN DEL PLAN SST {{anio_plan}}',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '┌───┬─────────────────────────────────────────┬──────────────┬───────────────┐\n' +
        '│ N°│ Rubro                                   │ Monto S/     │ Observación   │\n' +
        '├───┼─────────────────────────────────────────┼──────────────┼───────────────┤\n' +
        '│ 1 │ Capacitaciones SST (mín. 4 sesiones)    │              │               │\n' +
        '│ 2 │ Exámenes médicos ocupacionales          │              │               │\n' +
        '│ 3 │ Equipos de Protección Personal (EPP)    │              │               │\n' +
        '│ 4 │ Señalización de seguridad               │              │               │\n' +
        '│ 5 │ Botiquín de primeros auxilios           │              │               │\n' +
        '│ 6 │ Equipos de emergencia (extintores, etc) │              │               │\n' +
        '│ 7 │ Consultores / auditorías externas       │              │               │\n' +
        '│ 8 │ Materiales de difusión (afiches, etc.)  │              │               │\n' +
        '│ 9 │ Simulacros de evacuación                │              │               │\n' +
        '│10 │ Otros (especificar)                     │              │               │\n' +
        '├───┼─────────────────────────────────────────┼──────────────┼───────────────┤\n' +
        '│   │ TOTAL PRESUPUESTADO                     │ S/           │               │\n' +
        '└───┴─────────────────────────────────────────┴──────────────┴───────────────┘\n\n' +
        'NOTA: El empleador debe proveer los recursos económicos necesarios para la implementación del SGSST. El incumplimiento de esta obligación constituye infracción grave conforme al Art. 26° del D.S. N° 019-2006-TR.',
    },
    {
      id: 'responsabilidades',
      blockType: 'clause',
      title: '8. RESPONSABILIDADES EN LA GESTIÓN DEL SST',
      text:
        '8.1. GERENCIA GENERAL — {{empresa_gerente}}\n' +
        '• Aprobar el presente Plan Anual de SST;\n' +
        '• Asegurar los recursos económicos, humanos y técnicos para su implementación;\n' +
        '• Asumir el liderazgo visible en materia de SST;\n' +
        '• Revisar el desempeño del SGSST con periodicidad semestral.\n\n' +
        '8.2. RESPONSABLE SST — {{responsable_sst}}\n' +
        '• Coordinar la implementación de las actividades del Plan;\n' +
        '• Mantener actualizados los documentos del SGSST (IPERC, Plan, registros);\n' +
        '• Investigar accidentes e incidentes y reportar al MTPE dentro de las 24 horas;\n' +
        '• Presentar informes mensuales de avance al CSST y a la Gerencia;\n' +
        '• Gestionar las inspecciones internas y de SUNAFIL.\n\n' +
        '8.3. COMITÉ/SUPERVISOR SST\n' +
        '• Participar en la elaboración y revisión del Plan Anual de SST;\n' +
        '• Aprobar el Plan conforme al artículo 42° del D.S. N° 005-2012-TR;\n' +
        '• Realizar inspecciones periódicas de las condiciones de trabajo;\n' +
        '• Investigar las causas de los accidentes e incidentes;\n' +
        '• Revisar mensualmente los registros del SGSST.\n\n' +
        '8.4. TRABAJADORES\n' +
        '• Cumplir con las normas, procedimientos e instrucciones del SGSST;\n' +
        '• Usar correctamente los EPP proporcionados;\n' +
        '• Reportar inmediatamente todo accidente, incidente o condición insegura;\n' +
        '• Participar en las capacitaciones, inspecciones y simulacros programados;\n' +
        '• Someterse a los exámenes médicos ocupacionales.',
    },
    {
      id: 'registros',
      blockType: 'clause',
      title: '9. REGISTROS OBLIGATORIOS DEL SGSST (R.M. N° 085-2013-TR)',
      text:
        '{{empresa_razon_social}} mantendrá actualizados los siguientes registros obligatorios:\n\n' +
        '┌───┬───────────────────────────────────────────────────────────────────┬────────────┐\n' +
        '│ N°│ Registro                                                          │ Frecuencia │\n' +
        '├───┼───────────────────────────────────────────────────────────────────┼────────────┤\n' +
        '│ 1 │ Registro de accidentes de trabajo, enfermedades ocupacionales e   │ Ante cada  │\n' +
        '│   │ incidentes peligrosos (Formato 1 R.M. 085-2013-TR)                │ evento     │\n' +
        '├───┼───────────────────────────────────────────────────────────────────┼────────────┤\n' +
        '│ 2 │ Registro de exámenes médicos ocupacionales                        │ Continuo   │\n' +
        '├───┼───────────────────────────────────────────────────────────────────┼────────────┤\n' +
        '│ 3 │ Registro de monitoreo de agentes físicos, químicos, biológicos,   │ Según IPERC│\n' +
        '│   │ ergonómicos y psicosociales                                       │            │\n' +
        '├───┼───────────────────────────────────────────────────────────────────┼────────────┤\n' +
        '│ 4 │ Registro de inspecciones internas de SST                          │ Mensual    │\n' +
        '├───┼───────────────────────────────────────────────────────────────────┼────────────┤\n' +
        '│ 5 │ Registro de estadísticas de seguridad y salud                     │ Mensual    │\n' +
        '├───┼───────────────────────────────────────────────────────────────────┼────────────┤\n' +
        '│ 6 │ Registro de equipos de seguridad o emergencia                     │ Continuo   │\n' +
        '├───┼───────────────────────────────────────────────────────────────────┼────────────┤\n' +
        '│ 7 │ Registro de inducción, capacitación, entrenamiento y simulacros   │ Continuo   │\n' +
        '├───┼───────────────────────────────────────────────────────────────────┼────────────┤\n' +
        '│ 8 │ Registro de auditorías                                            │ Semestral  │\n' +
        '└───┴───────────────────────────────────────────────────────────────────┴────────────┘\n\n' +
        'CONSERVACIÓN: Los registros deben conservarse por los siguientes plazos mínimos:\n' +
        '• Accidentes de trabajo e incidentes peligrosos: 10 años\n' +
        '• Otros registros: 5 años (Art. 35° D.S. N° 005-2012-TR)',
    },
    {
      id: 'seguimiento',
      blockType: 'clause',
      title: '10. SEGUIMIENTO, MEDICIÓN Y MEJORA CONTINUA',
      text:
        '{{empresa_razon_social}} medirá el avance del presente Plan mediante los siguientes indicadores clave de desempeño SST:\n\n' +
        '• ÍNDICE DE FRECUENCIA (IF) = (N° accidentes × 1,000,000) / HHT\n' +
        '• ÍNDICE DE GRAVEDAD (IG) = (Días perdidos × 1,000,000) / HHT\n' +
        '• ÍNDICE DE ACCIDENTABILIDAD (IA) = (IF × IG) / 1,000\n' +
        '• % DE CAPACITACIONES REALIZADAS vs. PROGRAMADAS\n' +
        '• % DE INSPECCIONES REALIZADAS vs. PROGRAMADAS\n' +
        '• % DE TRABAJADORES CON EMO VIGENTE\n' +
        '• % DE ACUERDOS CSST IMPLEMENTADOS\n\n' +
        'Donde HHT = Horas Hombre Trabajadas en el período.\n\n' +
        'El {{responsable_sst}} presentará un informe mensual de indicadores al CSST y un informe semestral a la Gerencia General. Las no conformidades detectadas serán objeto de acciones correctivas con plazo y responsable definidos, conforme al ciclo PHVA.',
    },
    {
      id: 'firma',
      blockType: 'signature',
      text:
        'El presente Plan Anual de Seguridad y Salud en el Trabajo {{anio_plan}} ha sido elaborado y aprobado conforme a la Ley N° 29783 y sus normas reglamentarias.\n\n' +
        'Aprobado en {{ciudad}}, el {{fecha_aprobacion}}.\n\n\n' +
        '────────────────────────────────────          ────────────────────────────────────\n' +
        '    {{empresa_gerente}}                             {{responsable_sst}}\n' +
        '    Gerente General                                Responsable SST\n' +
        '    {{empresa_razon_social}}                       {{empresa_razon_social}}\n\n\n' +
        '────────────────────────────────────\n' +
        '    Presidente del CSST / Supervisor SST\n' +
        '    (Aprobación del Plan conforme Art. 42° D.S. N° 005-2012-TR)',
    },
  ],
}
