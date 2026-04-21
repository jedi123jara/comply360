/**
 * SUNAFIL — Checklist de Auditoría Laboral (OFICIAL)
 *
 * Fuente: "01 Check List Auditoría Laboral.xlsx" del pack
 * Compensaciones Laborales 30° (Gaceta Jurídica / Contadores & Empresas).
 *
 * Generado automáticamente por scripts/ingest/ingest-checklists.mjs.
 * NO EDITAR A MANO — regenerar con: `node scripts/ingest/ingest-checklists.mjs`.
 *
 * Total: 18 secciones · 133 preguntas.
 */

export interface AuditQuestion {
  /** ID estable (slug). */
  id: string
  /** Pregunta padre (agrupa sub-items). */
  parent?: string
  /** Texto completo de la pregunta. */
  question: string
  /** Área del compliance score a la que pertenece. */
  area: string
}

export interface AuditSection {
  /** Slug único de la sección. */
  key: string
  /** Label humano. */
  label: string
  /** Área del score (matches legal-engine/compliance areas). */
  area: string
  /** Peso relativo en el score global (0-100). */
  weight: number
  /** Nombre original del sheet en el xlsx. */
  sheet: string
  /** Total de preguntas en esta sección. */
  count: number
  /** Lista de preguntas. */
  questions: readonly AuditQuestion[]
}

/**
 * Respuestas posibles a cada pregunta del checklist.
 * Coinciden con la convención SUNAFIL: Sí / Parcial (+/-) / No.
 */
export type AuditAnswer = 'SI' | 'PARCIAL' | 'NO' | 'NA'

/**
 * Secciones completas del checklist oficial.
 */
export const AUDIT_SECTIONS: readonly AuditSection[] = [
  {
    "key": "inicio-relacion",
    "label": "Inicio de la relación de trabajo",
    "area": "contratacion",
    "weight": 8,
    "sheet": "I. Inic. Relac. Trab.",
    "count": 6,
    "questions": [
      {
        "id": "inicio-relacion-verificar-obligacion-de-no-discriminar-en-las-convocatorias-u-of",
        "question": "Verificar obligación de no discriminar en las convocatorias u ofertas de empleo",
        "area": "contratacion"
      },
      {
        "id": "inicio-relacion-verificar-cumplimiento-de-obligaciones-al-recurrir-a-una-agencia",
        "question": "Verificar cumplimiento de obligaciones al recurrir a una agencia de empleo",
        "area": "contratacion"
      },
      {
        "id": "inicio-relacion-verificar-uso-de-bolsas-de-trabajo-o-ventanillas-de-empleo",
        "question": "Verificar uso de bolsas de trabajo o ventanillas de empleo",
        "area": "contratacion"
      },
      {
        "id": "inicio-relacion-cumplimiento-de-obligaciones-referidas-al-t-registro",
        "question": "Cumplimiento de obligaciones referidas al T- Registro",
        "area": "contratacion"
      },
      {
        "id": "inicio-relacion-verificar-la-calificacion-del-puesto",
        "question": "Verificar la calificación del puesto",
        "area": "contratacion"
      },
      {
        "id": "inicio-relacion-establecer-el-periodo-de-prueba",
        "question": "Establecer el período de prueba",
        "area": "contratacion"
      }
    ]
  },
  {
    "key": "contratacion",
    "label": "Obligaciones de contratación",
    "area": "contratacion",
    "weight": 10,
    "sheet": "II. Oblig. a la Contratación",
    "count": 5,
    "questions": [
      {
        "id": "contratacion-verificar-reconocimiento-del-trabajo-subordinado",
        "question": "Verificar reconocimiento del trabajo subordinado",
        "area": "contratacion"
      },
      {
        "id": "contratacion-verificar-no-desnaturalizar-la-contratacion-laboral-modal",
        "question": "Verificar no desnaturalizar la contratación laboral modal",
        "area": "contratacion"
      },
      {
        "id": "contratacion-verificar-formalizacion-de-los-contratos",
        "question": "Verificar formalización de los contratos",
        "area": "contratacion"
      },
      {
        "id": "contratacion-verificar-obligaciones-frente-a-la-intermediacion-laboral",
        "question": "Verificar obligaciones frente a la intermediación laboral",
        "area": "contratacion"
      },
      {
        "id": "contratacion-verificar-obligaciones-ante-la-tercerizacion-laboral",
        "question": "Verificar obligaciones ante la tercerización laboral",
        "area": "contratacion"
      }
    ]
  },
  {
    "key": "remuneraciones",
    "label": "Remuneraciones",
    "area": "remuneraciones",
    "weight": 10,
    "sheet": "III. Oblig. a Remuneraciones",
    "count": 11,
    "questions": [
      {
        "id": "remuneraciones-obligacion-de-pago-de-la-rmv",
        "question": "Obligación de pago de la RMV",
        "area": "remuneraciones"
      },
      {
        "id": "remuneraciones-obligacion-sobre-la-asignacion-familiar",
        "question": "Obligación sobre la asignación familiar",
        "area": "remuneraciones"
      },
      {
        "id": "remuneraciones-verificar-pago-de-las-remuneraciones",
        "question": "Verificar pago de las remuneraciones",
        "area": "remuneraciones"
      },
      {
        "id": "remuneraciones-pago-de-intereses-legales-laborales",
        "question": "Pago de intereses legales laborales",
        "area": "remuneraciones"
      },
      {
        "id": "remuneraciones-pagos-a-traves-de-terceros",
        "question": "Pagos a través de terceros",
        "area": "remuneraciones"
      },
      {
        "id": "remuneraciones-obligacion-de-bancarizar-pagos",
        "question": "Obligación de bancarizar pagos",
        "area": "remuneraciones"
      },
      {
        "id": "remuneraciones-verificar-intangibilidad-de-las-remuneraciones",
        "question": "Verificar intangibilidad de las remuneraciones",
        "area": "remuneraciones"
      },
      {
        "id": "remuneraciones-verificar-intangibilidad-de-las-remuneraciones-solventar-condicio",
        "parent": "Verificar intangibilidad de las remuneraciones",
        "question": "Verificar intangibilidad de las remuneraciones: Solventar condiciones de trabajo",
        "area": "remuneraciones"
      },
      {
        "id": "remuneraciones-obligaciones-de-retenciones-sobre-las-remuneraciones",
        "question": "Obligaciones de retenciones sobre las remuneraciones",
        "area": "remuneraciones"
      },
      {
        "id": "remuneraciones-obligaciones-frente-a-las-prestaciones-alimentarias",
        "question": "Obligaciones frente a las prestaciones alimentarias",
        "area": "remuneraciones"
      },
      {
        "id": "remuneraciones-obligaciones-referidas-a-las-boletas-de-pago",
        "question": "Obligaciones referidas a las boletas de pago",
        "area": "remuneraciones"
      }
    ]
  },
  {
    "key": "beneficios-sociales",
    "label": "Beneficios sociales (CTS, gratificación, vacaciones)",
    "area": "beneficios",
    "weight": 12,
    "sheet": "IV. Oblig. a Rem. y Benef. Soc.",
    "count": 4,
    "questions": [
      {
        "id": "beneficios-sociales-obligaciones-referidas-a-gratificaciones",
        "question": "Obligaciones referidas a gratificaciones",
        "area": "beneficios"
      },
      {
        "id": "beneficios-sociales-del-seguro-de-vida-ley",
        "question": "Del seguro de vida ley",
        "area": "beneficios"
      },
      {
        "id": "beneficios-sociales-obligaciones-sobre-las-indemnizaciones",
        "question": "Obligaciones sobre las indemnizaciones",
        "area": "beneficios"
      },
      {
        "id": "beneficios-sociales-obligaciones-sobre-las-indemnizaciones-de-la-distribucion-de",
        "parent": "Obligaciones sobre las indemnizaciones",
        "question": "Obligaciones sobre las indemnizaciones: De la distribución de las utilidades",
        "area": "beneficios"
      }
    ]
  },
  {
    "key": "trato-especial",
    "label": "Trabajadores de trato especial",
    "area": "contratacion",
    "weight": 4,
    "sheet": "V. Trab. Tto. Especial",
    "count": 11,
    "questions": [
      {
        "id": "trato-especial-obligaciones-referidas-a-las-modalidades-formativa",
        "question": "Obligaciones referidas a las modalidades formativa",
        "area": "contratacion"
      },
      {
        "id": "trato-especial-obligaciones-referidas-a-las-modalidades-formativa-trabajadores-a",
        "parent": "Obligaciones referidas a las modalidades formativa",
        "question": "Obligaciones referidas a las modalidades formativa: Trabajadores adolescentes",
        "area": "contratacion"
      },
      {
        "id": "trato-especial-obligaciones-referidas-a-las-madres-trabajadoras",
        "question": "Obligaciones referidas a las madres trabajadoras",
        "area": "contratacion"
      },
      {
        "id": "trato-especial-obligaciones-respecto-de-trabajadores-extranjeros",
        "question": "Obligaciones respecto de trabajadores extranjeros",
        "area": "contratacion"
      },
      {
        "id": "trato-especial-obligaciones-con-ocasion-a-la-ley-de-discapacidad",
        "question": "Obligaciones con ocasión a la ley de discapacidad",
        "area": "contratacion"
      },
      {
        "id": "trato-especial-obligaciones-respecto-de-trabajadores-con-vih-sida",
        "question": "Obligaciones respecto de trabajadores con VIH- Sida",
        "area": "contratacion"
      },
      {
        "id": "trato-especial-obligaciones-respecto-de-trabajadores-con-tbc",
        "question": "Obligaciones respecto de trabajadores con TBC",
        "area": "contratacion"
      },
      {
        "id": "trato-especial-obligaciones-frente-a-los-teletrabajadores",
        "question": "Obligaciones frente a los teletrabajadores",
        "area": "contratacion"
      },
      {
        "id": "trato-especial-obligaciones-frente-al-trabajador-agrario",
        "question": "Obligaciones frente al trabajador agrario",
        "area": "contratacion"
      },
      {
        "id": "trato-especial-obligaciones-respecto-de-trabajadores-de-unidades-inmobiliarias",
        "question": "Obligaciones respecto de trabajadores de unidades inmobiliarias",
        "area": "contratacion"
      },
      {
        "id": "trato-especial-obligaciones-especiales-frente-a-los-trabajadores-del-hogar",
        "question": "Obligaciones especiales frente a los trabajadores del hogar",
        "area": "contratacion"
      }
    ]
  },
  {
    "key": "proteccion-trabajador",
    "label": "Protección del trabajador",
    "area": "relaciones-laborales",
    "weight": 6,
    "sheet": "VII. Oblig. Protec. Trab.",
    "count": 8,
    "questions": [
      {
        "id": "proteccion-trabajador-verificar-no-haya-actos-de-discriminacion",
        "question": "Verificar no haya actos de discriminación",
        "area": "relaciones-laborales"
      },
      {
        "id": "proteccion-trabajador-verificar-todas-las-condiciones-de-sst",
        "question": "Verificar todas las condiciones de SST",
        "area": "relaciones-laborales"
      },
      {
        "id": "proteccion-trabajador-verificar-no-haya-actos-que-califiquen-como-actos-de-hosti",
        "question": "Verificar no haya actos que califiquen como actos de hostilidad",
        "area": "relaciones-laborales"
      },
      {
        "id": "proteccion-trabajador-verificar-que-no-haya-casos-de-acoso-laboral-o-acoso-moral",
        "question": "Verificar que no haya casos de acoso laboral o acoso moral (mobbing)",
        "area": "relaciones-laborales"
      },
      {
        "id": "proteccion-trabajador-verificar-cumplimiento-de-obligaciones-referidas-a-la-disc",
        "question": "Verificar cumplimiento de obligaciones referidas a la discriminación salarial por sexo",
        "area": "relaciones-laborales"
      },
      {
        "id": "proteccion-trabajador-verificar-cumplimiento-de-obligaciones-referidas-al-hostig",
        "question": "Verificar cumplimiento de obligaciones referidas al hostigamiento sexual laboral",
        "area": "relaciones-laborales"
      },
      {
        "id": "proteccion-trabajador-verificar-cumplimiento-de-obligaciones-respecto-de-trabaja",
        "question": "Verificar cumplimiento de obligaciones respecto de trabajadores con protección especial",
        "area": "relaciones-laborales"
      },
      {
        "id": "proteccion-trabajador-verificar-proteccion-de-datos-del-trabajador",
        "question": "Verificar protección de datos del trabajador",
        "area": "relaciones-laborales"
      }
    ]
  },
  {
    "key": "extincion",
    "label": "Extinción de la relación de trabajo",
    "area": "cese",
    "weight": 8,
    "sheet": "VIII. Oblig. Des. Relac. Trab.",
    "count": 5,
    "questions": [
      {
        "id": "extincion-verificar-limites-de-las-facultades-del-empleador",
        "question": "Verificar límites de las facultades del empleador",
        "area": "cese"
      },
      {
        "id": "extincion-verificar-obligacion-de-no-hostilizar-al-trabajador",
        "question": "Verificar obligación de no hostilizar al trabajador",
        "area": "cese"
      },
      {
        "id": "extincion-verificar-proteccion-e-indemnidad-del-trabajador",
        "question": "Verificar protección e indemnidad del trabajador",
        "area": "cese"
      },
      {
        "id": "extincion-obligaciones-en-los-procesos-disciplinarios",
        "question": "Obligaciones en los procesos disciplinarios",
        "area": "cese"
      },
      {
        "id": "extincion-obligaciones-en-los-procedimientos-de-despido",
        "question": "Obligaciones en los procedimientos de despido",
        "area": "cese"
      }
    ]
  },
  {
    "key": "jornadas",
    "label": "Jornadas de trabajo",
    "area": "jornada",
    "weight": 6,
    "sheet": "IX. Jornadas Trab.",
    "count": 4,
    "questions": [
      {
        "id": "jornadas-obligaciones-sobre-las-jornadas-de-trabajo",
        "question": "Obligaciones sobre las jornadas de trabajo",
        "area": "jornada"
      },
      {
        "id": "jornadas-obligaciones-sobre-los-horarios-y-turnos-de-trabajo",
        "question": "Obligaciones sobre los horarios y turnos de trabajo",
        "area": "jornada"
      },
      {
        "id": "jornadas-obligaciones-frente-al-trabajo-en-sobretiempo",
        "question": "Obligaciones frente al trabajo en sobretiempo",
        "area": "jornada"
      },
      {
        "id": "jornadas-obligaciones-sobre-el-registro-y-control-de-asistencia",
        "question": "Obligaciones sobre el registro y control de asistencia",
        "area": "jornada"
      }
    ]
  },
  {
    "key": "descansos",
    "label": "Descansos remunerados",
    "area": "jornada",
    "weight": 5,
    "sheet": "X. Descansos Remun.",
    "count": 3,
    "questions": [
      {
        "id": "descansos-obligaciones-sobre-el-descanso-semanal-obligatorio",
        "question": "Obligaciones sobre el descanso semanal obligatorio",
        "area": "jornada"
      },
      {
        "id": "descansos-obligaciones-sobre-los-dias-feriados",
        "question": "Obligaciones sobre los días feriados",
        "area": "jornada"
      },
      {
        "id": "descansos-obligaciones-referidas-a-vacaciones",
        "question": "Obligaciones referidas a vacaciones",
        "area": "jornada"
      }
    ]
  },
  {
    "key": "licencias",
    "label": "Licencias",
    "area": "beneficios",
    "weight": 4,
    "sheet": "XI. Licencias",
    "count": 13,
    "questions": [
      {
        "id": "licencias-verificar-licencia-por-incapacidad-para-el-trabajo",
        "question": "Verificar licencia por incapacidad para el trabajo",
        "area": "beneficios"
      },
      {
        "id": "licencias-verificar-licencia-por-enfermedad-grave-de-familiares",
        "question": "Verificar licencia por enfermedad grave de familiares",
        "area": "beneficios"
      },
      {
        "id": "licencias-verificar-licencia-para-acompanamiento-en-terapias-de-rehabilitacion",
        "question": "Verificar licencia para acompañamiento en terapias de rehabilitación",
        "area": "beneficios"
      },
      {
        "id": "licencias-verificar-proteccion-victima-de-violencia",
        "question": "Verificar protección víctima de violencia",
        "area": "beneficios"
      },
      {
        "id": "licencias-verificar-examenes-oncologicos-generales",
        "question": "Verificar exámenes oncológicos generales",
        "area": "beneficios"
      },
      {
        "id": "licencias-verificar-examenes-oncologicos-para-trabajadoras",
        "question": "Verificar exámenes oncológicos para trabajadoras",
        "area": "beneficios"
      },
      {
        "id": "licencias-verificar-licencia-y-facilidades-por-alzheimer-de-familiar",
        "question": "Verificar licencia y facilidades por Alzheimer de familiar",
        "area": "beneficios"
      },
      {
        "id": "licencias-verificar-licencia-por-fallecimiento-de-familiar",
        "question": "Verificar licencia por fallecimiento de familiar",
        "area": "beneficios"
      },
      {
        "id": "licencias-verificar-licencia-por-paternidad",
        "question": "Verificar licencia por paternidad",
        "area": "beneficios"
      },
      {
        "id": "licencias-verificar-licencia-para-eventos-deportivos-oficiales",
        "question": "Verificar licencia para eventos deportivos oficiales",
        "area": "beneficios"
      },
      {
        "id": "licencias-verificar-licencia-por-adopcion",
        "question": "Verificar licencia por adopción",
        "area": "beneficios"
      },
      {
        "id": "licencias-verificar-licencia-por-caso-fortuito-o-fuerza-mayor",
        "question": "Verificar licencia por caso fortuito o fuerza mayor",
        "area": "beneficios"
      },
      {
        "id": "licencias-verificar-licencia-sindical",
        "question": "Verificar licencia sindical",
        "area": "beneficios"
      }
    ]
  },
  {
    "key": "registros",
    "label": "Registros, exhibiciones y comunicaciones",
    "area": "documentos",
    "weight": 5,
    "sheet": "XII. Reg. Exib. y Com.",
    "count": 5,
    "questions": [
      {
        "id": "registros-obligaciones-referidas-al-registro-de-contratos-y-convenios",
        "question": "Obligaciones referidas al registro de contratos y convenios",
        "area": "documentos"
      },
      {
        "id": "registros-obligaciones-referidas-al-registro-de-contratos-y-convenios-registro-y",
        "parent": "Obligaciones referidas al registro de contratos y convenios",
        "question": "Obligaciones referidas al registro de contratos y convenios: Registro y control de asistencia",
        "area": "documentos"
      },
      {
        "id": "registros-obligaciones-referidas-al-registro-de-contratos-y-convenios-exhibir-la",
        "parent": "Obligaciones referidas al registro de contratos y convenios",
        "question": "Obligaciones referidas al registro de contratos y convenios: Exhibir la síntesis de la legislación laboral",
        "area": "documentos"
      },
      {
        "id": "registros-obligaciones-referidas-al-registro-de-contratos-y-convenios-exhibir-el",
        "parent": "Obligaciones referidas al registro de contratos y convenios",
        "question": "Obligaciones referidas al registro de contratos y convenios: Exhibir el horario de trabajo",
        "area": "documentos"
      },
      {
        "id": "registros-obligaciones-referidas-al-registro-de-contratos-y-convenios-exhibir-pr",
        "parent": "Obligaciones referidas al registro de contratos y convenios",
        "question": "Obligaciones referidas al registro de contratos y convenios: Exhibir prohibición de fumar y vapear",
        "area": "documentos"
      }
    ]
  },
  {
    "key": "sst",
    "label": "Seguridad y Salud en el Trabajo",
    "area": "sst",
    "weight": 15,
    "sheet": "XIII. SST",
    "count": 12,
    "questions": [
      {
        "id": "sst-obligacion-general-de-prevencion-y-de-responsabilidad-objetiva",
        "question": "Obligación general de prevención y de responsabilidad objetiva",
        "area": "sst"
      },
      {
        "id": "sst-verificar-contar-con-documentos-del-sistema-de-gestion-de-la-sst",
        "question": "Verificar contar con documentos del sistema de gestión de la SST",
        "area": "sst"
      },
      {
        "id": "sst-verificar-contar-con-registros-del-sistema-de-gestion-de-la-sst",
        "question": "Verificar contar con registros del sistema de gestión de la SST",
        "area": "sst"
      },
      {
        "id": "sst-verificar-contar-con-reglamento-de-seguridad-y-salud-en-el-trabajo",
        "question": "Verificar contar con reglamento de seguridad y salud en el trabajo",
        "area": "sst"
      },
      {
        "id": "sst-verificar-contar-con-comite-supervisor-de-sst-y-su-registro-en-la-planilla-e",
        "question": "Verificar contar con Comité/Supervisor de SST y su registro en la planilla electrónica",
        "area": "sst"
      },
      {
        "id": "sst-verificar-inclusion-en-el-contrato-de-las-recomendaciones-en-sst",
        "question": "Verificar inclusión en el contrato de las recomendaciones en SST",
        "area": "sst"
      },
      {
        "id": "sst-verificar-inclusion-en-el-contrato-de-las-recomendaciones-en-sst-cumplir-con",
        "parent": "Verificar inclusión en el contrato de las recomendaciones en SST",
        "question": "Verificar inclusión en el contrato de las recomendaciones en SST: Cumplir con comunicación de accidentes e incidentes",
        "area": "sst"
      },
      {
        "id": "sst-verificar-realizar-examenes-medicos",
        "question": "Verificar realizar exámenes médicos",
        "area": "sst"
      },
      {
        "id": "sst-verificar-cumplimiento-de-obligaciones-referidas-a-la-radiacion-solar",
        "question": "Verificar cumplimiento de obligaciones referidas a la radiación solar",
        "area": "sst"
      },
      {
        "id": "sst-verificar-cumplimiento-de-obligaciones-frente-a-la-prohibicion-de-fumar-y-va",
        "question": "Verificar cumplimiento de obligaciones frente a la prohibición de fumar y vapear",
        "area": "sst"
      },
      {
        "id": "sst-verificar-cumplimiento-de-obligaciones-frente-al-riesgo-disergonomico",
        "question": "Verificar cumplimiento de obligaciones frente al riesgo disergonómico",
        "area": "sst"
      },
      {
        "id": "sst-verificar-cumplimiento-de-obligaciones-especiales-frente-al-covid",
        "question": "Verificar cumplimiento de obligaciones especiales frente al Covid",
        "area": "sst"
      }
    ]
  },
  {
    "key": "seguridad-social",
    "label": "Seguridad social",
    "area": "planilla",
    "weight": 8,
    "sheet": "XIV. Oblig. Seg. Social",
    "count": 7,
    "questions": [
      {
        "id": "seguridad-social-verificar-cumplimiento-de-obligaciones-de-inscripcion-a-la-segu",
        "question": "Verificar cumplimiento de obligaciones de inscripción a la seguridad social en salud",
        "area": "planilla"
      },
      {
        "id": "seguridad-social-verificar-cumplimiento-de-obligaciones-de-inscripcion-al-sistem",
        "question": "Verificar cumplimiento de obligaciones de inscripción al sistema pensionario",
        "area": "planilla"
      },
      {
        "id": "seguridad-social-verificar-cumplimiento-de-obligaciones-de-retencion-de-aportaci",
        "question": "Verificar cumplimiento de obligaciones de retención de aportaciones",
        "area": "planilla"
      },
      {
        "id": "seguridad-social-verificar-cumplimiento-de-obligaciones-de-pago-de-aportaciones",
        "question": "Verificar cumplimiento de obligaciones de pago de aportaciones",
        "area": "planilla"
      },
      {
        "id": "seguridad-social-verificar-entrega-de-boletin-del-sistema-pensionario",
        "question": "Verificar entrega de boletín del sistema pensionario",
        "area": "planilla"
      },
      {
        "id": "seguridad-social-verificar-cumplimiento-de-obligaciones-referidas-al-seguro-comp",
        "question": "Verificar cumplimiento de obligaciones referidas al seguro complementario de trabajo de riesgo",
        "area": "planilla"
      },
      {
        "id": "seguridad-social-obligaciones-frente-a-las-entidades-prestadoras-de-salud-eps",
        "question": "Obligaciones frente a las entidades prestadoras de salud - EPS",
        "area": "planilla"
      }
    ]
  },
  {
    "key": "administraciones",
    "label": "Obligaciones frente a administraciones",
    "area": "documentos",
    "weight": 4,
    "sheet": "XV. Oblig. Dis. Adm.",
    "count": 12,
    "questions": [
      {
        "id": "administraciones-obligaciones-frente-a-la-conciliacion-administrativa-de-la-aat",
        "question": "Obligaciones frente a la conciliación administrativa de la AAT",
        "area": "documentos"
      },
      {
        "id": "administraciones-obligaciones-frente-a-la-administracion-tributaria",
        "question": "Obligaciones frente a la Administración Tributaria",
        "area": "documentos"
      },
      {
        "id": "administraciones-obligaciones-frente-a-la-administracion-inspectiva",
        "question": "Obligaciones frente a la Administración Inspectiva",
        "area": "documentos"
      },
      {
        "id": "administraciones-obligaciones-frente-a-la-onp",
        "question": "Obligaciones frente a la ONP",
        "area": "documentos"
      },
      {
        "id": "administraciones-obligaciones-frente-al-essalud",
        "question": "Obligaciones frente al Essalud",
        "area": "documentos"
      },
      {
        "id": "administraciones-obligaciones-frente-a-la-sbs",
        "question": "Obligaciones frente a la SBS",
        "area": "documentos"
      },
      {
        "id": "administraciones-obligaciones-frente-al-poder-judicial",
        "question": "Obligaciones frente al Poder Judicial",
        "area": "documentos"
      },
      {
        "id": "administraciones-obligaciones-frente-al-indeci",
        "question": "Obligaciones frente al INDECI",
        "area": "documentos"
      },
      {
        "id": "administraciones-obligaciones-frente-a-los-gobiernos-locales-y-regionales",
        "question": "Obligaciones frente a los Gobiernos Locales y Regionales",
        "area": "documentos"
      },
      {
        "id": "administraciones-obligaciones-frente-determinados-sectores-dependiendo-de-la-act",
        "question": "Obligaciones frente determinados sectores (dependiendo de la actividad del empleador)",
        "area": "documentos"
      },
      {
        "id": "administraciones-obligaciones-frente-a-la-autoridad-migratoria",
        "question": "Obligaciones frente a la Autoridad Migratoria",
        "area": "documentos"
      },
      {
        "id": "administraciones-obligaciones-frente-a-la-policia-nacional",
        "question": "Obligaciones frente a la Policía Nacional",
        "area": "documentos"
      }
    ]
  },
  {
    "key": "sunafil",
    "label": "Obligaciones frente a SUNAFIL",
    "area": "documentos",
    "weight": 6,
    "sheet": "XVI. Oblig. Frente a SUNAFIL",
    "count": 6,
    "questions": [
      {
        "id": "sunafil-obligacion-frente-a-la-casilla-electronica-de-la-sunafil",
        "question": "Obligación frente a la casilla electrónica de la Sunafil",
        "area": "documentos"
      },
      {
        "id": "sunafil-obligaciones-de-responder-cartas-inductivas-de-la-sunafil",
        "question": "Obligaciones de responder cartas inductivas de la Sunafil",
        "area": "documentos"
      },
      {
        "id": "sunafil-obligacion-de-presentar-informacion-ante-la-sunafil",
        "question": "Obligación de presentar información ante la Sunafil",
        "area": "documentos"
      },
      {
        "id": "sunafil-obligacion-de-comparecer-ante-la-sunafil",
        "question": "Obligación de comparecer ante la Sunafil",
        "area": "documentos"
      },
      {
        "id": "sunafil-obligacion-de-responder-requerimientos-de-la-sunafil",
        "question": "Obligación de responder requerimientos de la Sunafil",
        "area": "documentos"
      },
      {
        "id": "sunafil-obligacion-de-colaboracion-en-el-proceso-inspectivo",
        "question": "Obligación de colaboración en el proceso inspectivo",
        "area": "documentos"
      }
    ]
  },
  {
    "key": "tributacion",
    "label": "Obligaciones tributarias laborales",
    "area": "planilla",
    "weight": 6,
    "sheet": "XVII. Oblig. Trib. Lab",
    "count": 6,
    "questions": [
      {
        "id": "tributacion-verificar-cumplimiento-de-registro-en-el-t-registro",
        "question": "Verificar cumplimiento de registro en el T-registro",
        "area": "planilla"
      },
      {
        "id": "tributacion-verificar-cumplimiento-de-declaracion-mensual-de-la-plame",
        "question": "Verificar cumplimiento de declaración mensual de la PLAME",
        "area": "planilla"
      },
      {
        "id": "tributacion-verificar-cumplimiento-de-retenciones",
        "question": "Verificar cumplimiento de retenciones",
        "area": "planilla"
      },
      {
        "id": "tributacion-verificar-cumplimiento-de-pago-de-retenciones",
        "question": "Verificar cumplimiento de pago de retenciones",
        "area": "planilla"
      },
      {
        "id": "tributacion-verificar-cumplimiento-de-pago-de-aportes-a-cargo-del-empleador",
        "question": "Verificar cumplimiento de pago de aportes a cargo del empleador",
        "area": "planilla"
      },
      {
        "id": "tributacion-verificar-cumplimiento-de-requerimientos-de-la-administracion-tribut",
        "question": "Verificar cumplimiento de requerimientos de la Administración Tributaria",
        "area": "planilla"
      }
    ]
  },
  {
    "key": "rct",
    "label": "Reglamento Interno de Trabajo",
    "area": "documentos",
    "weight": 3,
    "sheet": "XVIII. Oblig. RCT",
    "count": 8,
    "questions": [
      {
        "id": "rct-verificar-respeto-de-la-libertad-sindical",
        "question": "Verificar respeto de la libertad sindical",
        "area": "documentos"
      },
      {
        "id": "rct-verificar-respeto-del-fuero-sindical",
        "question": "Verificar respeto del fuero sindical",
        "area": "documentos"
      },
      {
        "id": "rct-verificar-otorgamiento-de-licencia-sindical",
        "question": "Verificar otorgamiento de licencia sindical",
        "area": "documentos"
      },
      {
        "id": "rct-verificar-cumplimiento-de-obligaciones-en-la-negociacion-colectiva",
        "question": "Verificar cumplimiento de obligaciones en la negociación colectiva",
        "area": "documentos"
      },
      {
        "id": "rct-verificar-comunicacion-de-los-servicios-publicos-esenciales-y-servicios-indi",
        "question": "Verificar comunicación de los servicios públicos esenciales y servicios indispensables",
        "area": "documentos"
      },
      {
        "id": "rct-verificar-respeto-del-derecho-de-huelga",
        "question": "Verificar respeto del derecho de huelga",
        "area": "documentos"
      },
      {
        "id": "rct-verificar-aplicacion-de-los-convenios-colectivos",
        "question": "Verificar aplicación de los convenios colectivos",
        "area": "documentos"
      },
      {
        "id": "rct-verificar-cumplimiento-frente-a-la-conciliacion-mediacion-y-arbitraje",
        "question": "Verificar cumplimiento frente a la conciliación, mediación y arbitraje",
        "area": "documentos"
      }
    ]
  },
  {
    "key": "documentacion",
    "label": "Documentación y otras obligaciones",
    "area": "documentos",
    "weight": 5,
    "sheet": "XIX. Doc. y Otras Oblig.",
    "count": 7,
    "questions": [
      {
        "id": "documentacion-verificar-debida-suscripcion-de-la-documentacion-laboral",
        "question": "Verificar debida suscripción de la documentación laboral",
        "area": "documentos"
      },
      {
        "id": "documentacion-verificar-debida-comunicacion-de-la-documentacion-laboral",
        "question": "Verificar debida comunicación de la documentación laboral",
        "area": "documentos"
      },
      {
        "id": "documentacion-verificar-debida-conservacion-de-documentos",
        "question": "Verificar debida conservación de documentos",
        "area": "documentos"
      },
      {
        "id": "documentacion-verificar-debida-documentacion-con-motivo-del-cese",
        "question": "Verificar debida documentación con motivo del cese",
        "area": "documentos"
      },
      {
        "id": "documentacion-verificar-debida-documentacion-con-motivo-del-cese-documentacion-e",
        "parent": "Verificar debida documentación con motivo del cese",
        "question": "Verificar debida documentación con motivo del cese: Documentación en caso de intermediación",
        "area": "documentos"
      },
      {
        "id": "documentacion-verificar-debida-documentacion-con-motivo-del-cese-documentacion-e",
        "parent": "Verificar debida documentación con motivo del cese",
        "question": "Verificar debida documentación con motivo del cese: Documentación en caso de tercerización",
        "area": "documentos"
      },
      {
        "id": "documentacion-verificar-debida-documentacion-con-motivo-del-cese-actuacion-frent",
        "parent": "Verificar debida documentación con motivo del cese",
        "question": "Verificar debida documentación con motivo del cese: Actuación frente a autoridades – debida representación",
        "area": "documentos"
      }
    ]
  }
] as const

/**
 * Vista plana de todas las preguntas.
 */
export const AUDIT_QUESTIONS: readonly AuditQuestion[] = AUDIT_SECTIONS.flatMap(s => s.questions)

/**
 * Total de preguntas del checklist.
 */
export const AUDIT_TOTAL: number = 133

/**
 * Mapa sección-key → sección completa.
 */
export const AUDIT_BY_KEY: Readonly<Record<string, AuditSection>> = Object.fromEntries(
  AUDIT_SECTIONS.map(s => [s.key, s])
)
