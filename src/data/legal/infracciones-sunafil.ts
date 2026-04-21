/**
 * SUNAFIL — Infracciones del sistema inspectivo (TIPIFICADAS)
 *
 * Fuente: "02 Check List Infracciones del sistema inspectivo.xlsx" del pack
 * Compensaciones Laborales 30°.
 *
 * Generado automáticamente por scripts/ingest/ingest-checklists.mjs.
 * NO EDITAR A MANO — regenerar con: `node scripts/ingest/ingest-checklists.mjs`.
 *
 * Total: 7 categorías · 164 infracciones tipificadas.
 *
 * Cada infracción puede clasificarse como LEVE, GRAVE o MUY_GRAVE
 * (D.S. 019-2006-TR — Reglamento de la Ley General de Inspección del Trabajo).
 */

export type InfracGravity = 'LEVE' | 'GRAVE' | 'MUY_GRAVE'

export interface InfraccionSunafil {
  /** ID estable (slug). */
  id: string
  /** Descripción completa (padre + sub-item si aplica). */
  description: string
  /** Infracción "padre" que agrupa sub-items del mismo tipo. */
  parent?: string
  /** Gravedad oficial según el reglamento. */
  gravity: InfracGravity
  /** Materia / categoría SUNAFIL. */
  category: string
}

export interface InfracSection {
  key: string
  label: string
  category: string
  sheet: string
  count: number
  items: readonly InfraccionSunafil[]
}

/**
 * Todas las secciones de infracciones agrupadas por materia.
 */
export const INFRAC_SECTIONS: readonly InfracSection[] = [
  {
    "key": "relaciones-laborales",
    "label": "Relaciones laborales",
    "category": "RELACIONES_LABORALES",
    "sheet": "I. Relac. Laborales",
    "count": 53,
    "items": [
      {
        "id": "relaciones-laborales-no-comunicar-y-registrar-ante-la-autoridad-documentacion-o-",
        "description": "No comunicar y registrar ante la autoridad documentación o información (no tipificado como infracción grave)",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-no-comunicar-y-registrar-ante-la-autoridad-documentacion-o-",
        "parent": "No comunicar y registrar ante la autoridad documentación o información (no tipificado como infracción grave)",
        "description": "No comunicar y registrar ante la autoridad documentación o información (no tipificado como infracción grave): No entregar al trabajador",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-el-incumplimiento-de-las-obligaciones-sobre-siempre-que-no-",
        "description": "El incumplimiento de las obligaciones sobre (siempre que no esté tipificado como infracción grave)",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-el-incumplimiento-de-las-obligaciones-sobre-siempre-que-no-",
        "description": "El incumplimiento de las obligaciones sobre (siempre que no esté tipificado como infracción grave)",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-el-incumplimiento-de-las-obligaciones-sobre-siempre-que-no-",
        "parent": "El incumplimiento de las obligaciones sobre (siempre que no esté tipificado como infracción grave)",
        "description": "El incumplimiento de las obligaciones sobre (siempre que no esté tipificado como infracción grave): No exponer en lugar visible el horario de trabajo",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-el-incumplimiento-de-las-obligaciones-sobre-siempre-que-no-",
        "parent": "El incumplimiento de las obligaciones sobre (siempre que no esté tipificado como infracción grave)",
        "description": "El incumplimiento de las obligaciones sobre (siempre que no esté tipificado como infracción grave): No entregar el reglamento interno de trabajo",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-el-incumplimiento-de-las-obligaciones-sobre-siempre-que-no-",
        "parent": "El incumplimiento de las obligaciones sobre (siempre que no esté tipificado como infracción grave)",
        "description": "El incumplimiento de las obligaciones sobre (siempre que no esté tipificado como infracción grave): No exponer o entregar cualquier otra información o documento que deba ser puesto en conocimiento del trabajador",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-el-incumplimiento-de-las-obligaciones-sobre-siempre-que-no-",
        "parent": "El incumplimiento de las obligaciones sobre (siempre que no esté tipificado como infracción grave)",
        "description": "El incumplimiento de las obligaciones sobre (siempre que no esté tipificado como infracción grave): No cumplir oportunamente con informar a las entidades depositarias la disponibilidad e intangibilidad de los depósitos de CTS",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-registro-nacional-de-obras-de-construccion-civ",
        "description": "Respecto del Registro Nacional de Obras de Construcción Civil – RENOCC",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-hostigamiento-sexual-no-comunicar-al-ministeri",
        "description": "Respecto del hostigamiento sexual, no comunicar al Ministerio de Trabajo",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-registro-del-trabajo-del-hogar-no-entregar-den",
        "description": "Respecto del registro del trabajo del hogar no entregar dentro del plazo y forma",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-impedir-la-concurrencia-del-teletrabajador-al-centro-de-tra",
        "description": "Impedir la concurrencia del teletrabajador al centro de trabajo para",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-teletrabajo",
        "description": "Respecto del teletrabajo",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-teletrabajo-cualquier-otro-incumplimiento-que-",
        "parent": "Respecto del teletrabajo",
        "description": "Respecto del teletrabajo: Cualquier otro incumplimiento que afecte obligaciones meramente formales o documentales, siempre que no esté tipificado como infracción grave",
        "gravity": "LEVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-sobre-planillas-de-pago-planillas-electronicas-registro-de-",
        "description": "Sobre planillas de pago, planillas electrónicas, registro de trabajadores y prestadores de servicios",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-sobre-boletas-de-pago",
        "description": "Sobre boletas de pago",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-sobre-remuneraciones-y-beneficios-laborales-legales-contrac",
        "description": "Sobre remuneraciones y beneficios laborales (legales, contractuales, por convenio, por laudo)",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-sobre-remuneraciones-y-beneficios-laborales-legales-contrac",
        "parent": "Sobre remuneraciones y beneficios laborales (legales, contractuales, por convenio, por laudo)",
        "description": "Sobre remuneraciones y beneficios laborales (legales, contractuales, por convenio, por laudo): El incumplimiento de las disposiciones de prestaciones alimentarias (que no esté tipificado como muy grave)",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-contrato-de-trabajo",
        "description": "Respecto del contrato de trabajo",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-en-la-negociacion-colectiva-la-no-entrega-a-los-representan",
        "description": "En la negociación colectiva, la no entrega a los representantes de los trabajadores de información sobre",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-el-incumplimiento-de-las-disposiciones-sobre",
        "description": "El incumplimiento de las disposiciones sobre",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-el-incumplimiento-de-las-disposiciones-sobre-incumplimiento",
        "parent": "El incumplimiento de las disposiciones sobre",
        "description": "El incumplimiento de las disposiciones sobre: Incumplimiento de del otorgamiento de facilidades para el ejercicio de la actividad sindical",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-sobre-el-seguro-de-vida-ley",
        "description": "Sobre el seguro de vida ley",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-los-trabajadores-del-hogar-cuando-corresponda",
        "description": "Respecto de los trabajadores del hogar, cuando corresponda",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-los-trabajadores-del-hogar-cuando-corresponda-n",
        "parent": "Respecto de los trabajadores del hogar, cuando corresponda",
        "description": "Respecto de los trabajadores del hogar, cuando corresponda: No contar con una dependencia adecuada de relaciones industriales, cuando corresponda",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-los-trabajadores-del-hogar-cuando-corresponda-n",
        "parent": "Respecto de los trabajadores del hogar, cuando corresponda",
        "description": "Respecto de los trabajadores del hogar, cuando corresponda: No contar con reglamento interno de trabajo, cuando corresponda",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-los-trabajadores-del-hogar-cuando-corresponda-c",
        "parent": "Respecto de los trabajadores del hogar, cuando corresponda",
        "description": "Respecto de los trabajadores del hogar, cuando corresponda: Contratar trabajadores de construcción civil no inscritos en el Registro Nacional de Trabajadores de Construcción Civil - RETCC",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-teletrabajo",
        "description": "Respecto del teletrabajo",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-los-lactarios-no-cumplir",
        "description": "Respecto de los lactarios, no cumplir",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-la-industria-pesquera-de-consumo-directo-ley-n-",
        "description": "Respecto de la industria pesquera de consumo directo (Ley Nº 27979)",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-la-prevencion-y-sancion-del-hostigamiento-sexua",
        "description": "Respecto de la prevención y sanción del hostigamiento sexual",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-no-dar-a-los-trabajadores-del-regimen-agrario-agroindustria",
        "description": "No dar a los trabajadores del régimen agrario, agroindustrial y agroexportador",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-no-dar-a-los-trabajadores-del-regimen-agrario-agroindustria",
        "parent": "No dar a los trabajadores del régimen agrario, agroindustrial y agroexportador",
        "description": "No dar a los trabajadores del régimen agrario, agroindustrial y agroexportador: Abono de remuneración a través de transferencia financiera sin consentimiento por escrito",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-registro-del-trabajo-del-hogar-no-hacer-dentro",
        "description": "Respecto del registro del trabajo del hogar, no hacer dentro del plazo",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-registro-del-trabajo-del-hogar-no-hacer-dentro",
        "parent": "Respecto del registro del trabajo del hogar, no hacer dentro del plazo",
        "description": "Respecto del registro del trabajo del hogar, no hacer dentro del plazo: Depositar la CTS en entidad financiera distinta a la elegida por el trabajador",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-teletrabajo",
        "description": "Respecto del teletrabajo",
        "gravity": "GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-no-pagar-la-remuneracion-minima-correspondiente",
        "description": "No pagar la remuneración mínima correspondiente",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-las-prestaciones-alimentarias",
        "description": "Respecto de las prestaciones alimentarias",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-los-contratos-modales",
        "description": "Respecto de los contratos modales",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-tiempo-de-trabajo",
        "description": "Respecto del tiempo de trabajo",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-trabajo-de-menores-de-edad",
        "description": "Respecto del trabajo de menores de edad",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-trabajo-de-menores-de-edad-respecto-de-relacio",
        "parent": "Respecto del trabajo de menores de edad",
        "description": "Respecto del trabajo de menores de edad: Respecto de relaciones colectivas de trabajo",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-centro-de-trabajo",
        "description": "Respecto del centro de trabajo",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-la-proteccion-del-trabajador",
        "description": "Respecto de la protección del trabajador",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-registro-de-asistencia",
        "description": "Respecto del registro de asistencia",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-del-registro-en-la-planilla-electronica",
        "description": "Respecto del registro en la planilla electrónica",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-los-contratos-de-trabajo",
        "description": "Respecto de los contratos de trabajo",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-la-no-discriminacion-por-sexo-ley-n-30709",
        "description": "Respecto de la no discriminación por sexo (Ley Nº 30709)",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-la-no-discriminacion-en-las-ofertas-de-empleo-l",
        "description": "Respecto de la no discriminación en las ofertas de empleo (Ley N° 26772 y D.S. N° 002-98-TR)",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-la-no-discriminacion-en-las-ofertas-de-empleo-l",
        "parent": "Respecto de la no discriminación en las ofertas de empleo (Ley N° 26772 y D.S. N° 002-98-TR)",
        "description": "Respecto de la no discriminación en las ofertas de empleo (Ley N° 26772 y D.S. N° 002-98-TR): Respecto del cuadro de categorías y funciones (Ley N° 30709)",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-la-no-discriminacion-en-las-ofertas-de-empleo-l",
        "parent": "Respecto de la no discriminación en las ofertas de empleo (Ley N° 26772 y D.S. N° 002-98-TR)",
        "description": "Respecto de la no discriminación en las ofertas de empleo (Ley N° 26772 y D.S. N° 002-98-TR): Sobre el hostigamiento sexual (Ley N° 27942 y D.S. N° 014-2019-MIMP)",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-la-no-discriminacion-en-las-ofertas-de-empleo-l",
        "parent": "Respecto de la no discriminación en las ofertas de empleo (Ley N° 26772 y D.S. N° 002-98-TR)",
        "description": "Respecto de la no discriminación en las ofertas de empleo (Ley N° 26772 y D.S. N° 002-98-TR): Sobre Régimen Laboral Agrario (Ley N° 31110)",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      },
      {
        "id": "relaciones-laborales-respecto-de-la-no-discriminacion-en-las-ofertas-de-empleo-l",
        "parent": "Respecto de la no discriminación en las ofertas de empleo (Ley N° 26772 y D.S. N° 002-98-TR)",
        "description": "Respecto de la no discriminación en las ofertas de empleo (Ley N° 26772 y D.S. N° 002-98-TR): Sobre el teletrabajo (Ley N° 31572)",
        "gravity": "MUY_GRAVE",
        "category": "RELACIONES_LABORALES"
      }
    ]
  },
  {
    "key": "sst",
    "label": "Seguridad y Salud en el Trabajo",
    "category": "SST",
    "sheet": "II. SST",
    "count": 33,
    "items": [
      {
        "id": "sst-no-comunicar-a-la-autoridad-competente",
        "description": "No comunicar a la autoridad competente",
        "gravity": "LEVE",
        "category": "SST"
      },
      {
        "id": "sst-no-comunicar-a-la-autoridad-competente-incumplimientos-en-la-prevencion-de-r",
        "parent": "No comunicar a la autoridad competente",
        "description": "No comunicar a la autoridad competente: Incumplimientos en la prevención de riesgos (siempre que carezcan de trascendencia grave)",
        "gravity": "LEVE",
        "category": "SST"
      },
      {
        "id": "sst-no-comunicar-a-la-autoridad-competente-cualquier-otro-incumplimiento-en-prev",
        "parent": "No comunicar a la autoridad competente",
        "description": "No comunicar a la autoridad competente: Cualquier otro incumplimiento en prevención de riesgos que afecte a obligaciones de carácter formal o documental no tipificados como graves",
        "gravity": "LEVE",
        "category": "SST"
      },
      {
        "id": "sst-no-comunicar-a-la-autoridad-competente-falta-de-orden-que-implique-riesgos-p",
        "parent": "No comunicar a la autoridad competente",
        "description": "No comunicar a la autoridad competente: Falta de orden que implique riesgos para la integridad física y salud de los trabajadores",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-comunicar-a-la-autoridad-competente-falta-de-limpieza-que-implique-riesgo",
        "parent": "No comunicar a la autoridad competente",
        "description": "No comunicar a la autoridad competente: Falta de limpieza que implique riesgos para la integridad física y salud de los trabajadores",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-comunicar-a-la-autoridad-competente-segun-normas-de-sst",
        "description": "No comunicar a la autoridad competente, según normas de SST",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-comunicar-a-la-autoridad-competente-segun-normas-de-sst-no-comunicar-al-c",
        "parent": "No comunicar a la autoridad competente, según normas de SST",
        "description": "No comunicar a la autoridad competente, según normas de SST: No comunicar al centro médico asistencial los accidentes de trabajo no mortales",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-investigar-en-caso-de",
        "description": "No investigar en caso de",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-investigar-en-caso-de-no-realizar-evaluaciones-de-riesgos-periodicos-de-l",
        "parent": "No investigar en caso de",
        "description": "No investigar en caso de: No realizar evaluaciones de riesgos periódicos de las condiciones de trabajo",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-investigar-en-caso-de-no-realizar-evaluaciones-de-controles-periodicos-de",
        "parent": "No investigar en caso de",
        "description": "No investigar en caso de: No realizar evaluaciones de controles periódicos de las actividades de los trabajadores",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-investigar-en-caso-de-no-realizar-actividades-de-prevencion-necesarias-se",
        "parent": "No investigar en caso de",
        "description": "No investigar en caso de: No realizar actividades de prevención necesarias según los resultados de las evaluaciones",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-investigar-en-caso-de-no-comunicar-resultados-de-examenes-medicos-de-vigi",
        "parent": "No investigar en caso de",
        "description": "No investigar en caso de: No comunicar resultados de exámenes médicos de vigilancia de la salud",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-investigar-en-caso-de-no-comunicar-resultados-de-pruebas-de-vigilancia-de",
        "parent": "No investigar en caso de",
        "description": "No investigar en caso de: No comunicar resultados de pruebas de vigilancia de la salud",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-en-caso-de-industria-de-alto-riesgo-por-ser-insalubre-o-nociva-y-por-los-ele",
        "description": "En caso de industria de alto riesgo, por ser insalubre o nociva, y por los elementos, procesos o sustancias que manipulan, no comunicar a la autoridad competente",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-el-incumplimiento-de-las-obligaciones-de-implementar-los-registros-de-sst",
        "description": "El incumplimiento de las obligaciones de implementar los registros de SST",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-el-incumplimiento-de-las-obligaciones-de-implementar-los-registros-de-sst-no",
        "parent": "El incumplimiento de las obligaciones de implementar los registros de SST",
        "description": "El incumplimiento de las obligaciones de implementar los registros de SST: No mantener actualizados los registros de SST",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-disponer-de-los-documentos-obligatorios-en-materia-de-sst",
        "description": "No disponer de los documentos obligatorios en materia de SST",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-disponer-de-los-documentos-obligatorios-en-materia-de-sst-incumplimiento-",
        "parent": "No disponer de los documentos obligatorios en materia de SST",
        "description": "No disponer de los documentos obligatorios en materia de SST: Incumplimiento de planificar la acción preventiva de riesgos para la SST",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-disponer-de-los-documentos-obligatorios-en-materia-de-sst-incumplimiento-",
        "parent": "No disponer de los documentos obligatorios en materia de SST",
        "description": "No disponer de los documentos obligatorios en materia de SST: Incumplimiento de elaborar un plan o programa de SST",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-sobre-riesgos-del-puesto-de-trabajo-y-sobre-medidas-preventivas",
        "description": "Sobre riesgos del puesto de trabajo y sobre medidas preventivas",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-los-incumplimientos-de-los-que-se-derive-un-riesgo-grave-para-la-sst-de-los-",
        "description": "Los incumplimientos de los que se derive un riesgo grave para la SST de los trabajadores en materia de",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-adoptar-las-medidas-necesarias-en-materia-de",
        "description": "No adoptar las medidas necesarias en materia de",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-adoptar-las-medidas-necesarias-en-materia-de-incumplimiento-de-las-obliga",
        "parent": "No adoptar las medidas necesarias en materia de",
        "description": "No adoptar las medidas necesarias en materia de: Incumplimiento de las obligaciones de SST en materia de coordinación entre empresas que desarrollen actividades en un mismo centro de trabajo",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-respecto-del-comite-o-supervisor-en-sst",
        "description": "Respecto del comité o supervisor en SST",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-en-materia-de-prevencion-de-riesgos-la-vulneracion-de-los-derechos-de-los-tr",
        "description": "En materia de prevención de riesgos, la vulneración de los derechos de los trabajadores de",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-en-materia-de-prevencion-de-riesgos-la-vulneracion-de-los-derechos-de-los-tr",
        "parent": "En materia de prevención de riesgos, la vulneración de los derechos de los trabajadores de",
        "description": "En materia de prevención de riesgos, la vulneración de los derechos de los trabajadores de: Incumplimiento referidas a las de auditorías del sistema de gestión de SST",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-en-materia-de-prevencion-de-riesgos-la-vulneracion-de-los-derechos-de-los-tr",
        "parent": "En materia de prevención de riesgos, la vulneración de los derechos de los trabajadores de",
        "description": "En materia de prevención de riesgos, la vulneración de los derechos de los trabajadores de: No cumplir las obligaciones relativas al seguro complementario de trabajo de riesgo",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-verificar-el-cumplimiento-de-la-normativa-sobre-sst-obras-o-servicios-en-",
        "description": "No verificar el cumplimiento de la normativa sobre SST, obras o servicios en el centro de trabajo o del trabajo realizado por encargo de la principal, por parte de",
        "gravity": "GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-no-observar-normas-especificas-de-proteccion-de-la-sst",
        "description": "No observar normas específicas de protección de la SST",
        "gravity": "MUY_GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-designar-a-trabajadores-en-puestos-incompatibles-cuando-impliquen-un-riesgo-",
        "description": "Designar a trabajadores en puestos incompatibles, cuando impliquen un riesgo grave e inminente para la SST",
        "gravity": "MUY_GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-incumplimiento-de-normativa-de-sst-que-produzca",
        "description": "Incumplimiento de normativa de SST que produzca",
        "gravity": "MUY_GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-incumplimiento-de-normativa-de-sst-que-produzca-no-realizar-los-examenes-med",
        "parent": "Incumplimiento de normativa de SST que produzca",
        "description": "Incumplimiento de normativa de SST que produzca: No realizar los exámenes médicos ocupacionales",
        "gravity": "MUY_GRAVE",
        "category": "SST"
      },
      {
        "id": "sst-incumplimiento-de-normativa-de-sst-que-produzca-no-realizar-la-vigilancia-de",
        "parent": "Incumplimiento de normativa de SST que produzca",
        "description": "Incumplimiento de normativa de SST que produzca: No realizar la vigilancia de la salud de sus trabajadores",
        "gravity": "MUY_GRAVE",
        "category": "SST"
      }
    ]
  },
  {
    "key": "empleo",
    "label": "Empleo y Colocación",
    "category": "EMPLEO",
    "sheet": "III. Empleo y Colocación",
    "count": 13,
    "items": [
      {
        "id": "empleo-incumplimiento-de-comunicacion-y-registro-ante-la-autoridad-no-tipificada",
        "description": "Incumplimiento de comunicación y registro ante la Autoridad (no tipificada como grave)",
        "gravity": "LEVE",
        "category": "EMPLEO"
      },
      {
        "id": "empleo-respecto-del-registro-de-las-mypes-y-empresas-promocionales-para-personas",
        "description": "Respecto del registro de las Mypes y empresas promocionales para personas con discapacidad, incumplir con",
        "gravity": "LEVE",
        "category": "EMPLEO"
      },
      {
        "id": "empleo-respecto-del-registro-de-las-mypes-y-empresas-promocionales-para-personas",
        "parent": "Respecto del registro de las Mypes y empresas promocionales para personas con discapacidad, incumplir con",
        "description": "Respecto del registro de las Mypes y empresas promocionales para personas con discapacidad, incumplir con: Cualquier otro incumplimiento que afecte obligaciones, meramente formales o documentales",
        "gravity": "LEVE",
        "category": "EMPLEO"
      },
      {
        "id": "empleo-incumplimiento-de-la-inscripcion-en-el-registro-delas-agencias-de-empleo",
        "description": "Incumplimiento de la inscripción en el registro delas agencias de empleo",
        "gravity": "GRAVE",
        "category": "EMPLEO"
      },
      {
        "id": "empleo-incumplimiento-de-las-agencias-de-empleo-de-la-comunicacion-de-informacio",
        "description": "Incumplimiento de las agencias de empleo de la comunicación de información relativa al ejercicio de sus actividades en el mercado de trabajo",
        "gravity": "GRAVE",
        "category": "EMPLEO"
      },
      {
        "id": "empleo-incumplimiento-de-las-agencias-de-empleo-de-la-comunicacion-de-informacio",
        "parent": "Incumplimiento de las agencias de empleo de la comunicación de información relativa al ejercicio de sus actividades en el mercado de trabajo",
        "description": "Incumplimiento de las agencias de empleo de la comunicación de información relativa al ejercicio de sus actividades en el mercado de trabajo: Incumplimiento de las disposiciones sobre promoción y empleo de las personas con discapacidad",
        "gravity": "GRAVE",
        "category": "EMPLEO"
      },
      {
        "id": "empleo-incumplimiento-de-las-agencias-de-empleo-de-la-comunicacion-de-informacio",
        "parent": "Incumplimiento de las agencias de empleo de la comunicación de información relativa al ejercicio de sus actividades en el mercado de trabajo",
        "description": "Incumplimiento de las agencias de empleo de la comunicación de información relativa al ejercicio de sus actividades en el mercado de trabajo: No publicar en espacio público y visible el protocolo de contratación (literal o, artículo 8, D.S. Nº 020-2012-TR)",
        "gravity": "GRAVE",
        "category": "EMPLEO"
      },
      {
        "id": "empleo-ejercer-actividades-en-el-mercado-de-trabajo-de-colocacion-de-trabajadore",
        "description": "Ejercer actividades en el mercado de trabajo de colocación de trabajadores con fines lucrativos sin",
        "gravity": "MUY_GRAVE",
        "category": "EMPLEO"
      },
      {
        "id": "empleo-ejercer-actividades-en-el-mercado-de-trabajo-de-colocacion-de-trabajadore",
        "parent": "Ejercer actividades en el mercado de trabajo de colocación de trabajadores con fines lucrativos sin",
        "description": "Ejercer actividades en el mercado de trabajo de colocación de trabajadores con fines lucrativos sin: Ejercer actividades en el mercado de trabajo de colocación de menores trabajadores contrarias a la normativa)",
        "gravity": "MUY_GRAVE",
        "category": "EMPLEO"
      },
      {
        "id": "empleo-realizacion-por-cualquier-medio-de-ofertas-de-empleo-discriminatorias-por",
        "description": "Realización, por cualquier medio, de ofertas de empleo discriminatorias, por motivo de",
        "gravity": "MUY_GRAVE",
        "category": "EMPLEO"
      },
      {
        "id": "empleo-registro-fraudulento-como-agencia-de-empleo",
        "description": "Registro fraudulento como agencia de empleo",
        "gravity": "MUY_GRAVE",
        "category": "EMPLEO"
      },
      {
        "id": "empleo-exigir-a-los-buscadores-de-empleo-como-consecuencia-del-servicio-de-coloc",
        "description": "Exigir a los buscadores de empleo, como consecuencia del servicio de colocación",
        "gravity": "MUY_GRAVE",
        "category": "EMPLEO"
      },
      {
        "id": "empleo-retener-por-parte-de-las-agencias-privadas-de-empleo",
        "description": "Retener, por parte de las agencias privadas de empleo",
        "gravity": "MUY_GRAVE",
        "category": "EMPLEO"
      }
    ]
  },
  {
    "key": "intermediacion",
    "label": "Intermediación y Tercerización",
    "category": "INTERMEDIACION",
    "sheet": "IV. Intermed. y Tercer. Lab.",
    "count": 24,
    "items": [
      {
        "id": "intermediacion-el-incumplimiento-de-las-obligaciones-relacionadas-con-la-inscrip",
        "description": "El incumplimiento de las obligaciones relacionadas con la inscripción en el registro",
        "gravity": "GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-respecto-de-la-informacion-y-documentacion-relacionada-con-el-eje",
        "description": "Respecto de la información y documentación relacionada con el ejercicio de sus actividades de intermediación",
        "gravity": "GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-respecto-de-los-contratos-suscritos-con-los-trabajadores-destacad",
        "description": "Respecto de los contratos suscritos con los trabajadores destacados a la empresa usuaria",
        "gravity": "GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-respecto-de-registrar-los-contratos-suscritos-con-las-empresas-us",
        "description": "Respecto de registrar los contratos suscritos con las empresas usuarias",
        "gravity": "GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-respecto-de-los-contratos-de-prestacion-de-servicios-celebrados-c",
        "description": "Respecto de los contratos de prestación de servicios celebrados con las empresas usuarias",
        "gravity": "GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-respecto-de-los-contratos-de-prestacion-de-servicios-celebrados-c",
        "parent": "Respecto de los contratos de prestación de servicios celebrados con las empresas usuarias",
        "description": "Respecto de los contratos de prestación de servicios celebrados con las empresas usuarias: No formalizar por escrito los contratos de trabajo con los trabajadores",
        "gravity": "GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-el-incumplimiento-respecto-del-contenido-que-debe-ser-incluido-en",
        "description": "El incumplimiento respecto del contenido que debe ser incluido en los contratos de trabajo de los trabajadores de la empresa tercerizadora",
        "gravity": "GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-el-incumplimiento-respecto-de-la-obligacion-de-informar-a-los-tra",
        "description": "El incumplimiento respecto de la obligación de informar a los trabajadores o sus representantes",
        "gravity": "GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-ejercer-actividades-de-intermediacion",
        "description": "Ejercer actividades de intermediación",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-ejercer-actividades-de-intermediacion-no-prestar-de-manera-exclus",
        "parent": "Ejercer actividades de intermediación",
        "description": "Ejercer actividades de intermediación: No prestar de manera exclusiva servicios de intermediación laboral",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-utilizar-la-intermediacion-con-la-intencion-o-efecto-de",
        "description": "Utilizar la intermediación con la intención o efecto de",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-utilizar-la-tercerizacion-con-la-intencion-o-efecto-de",
        "description": "Utilizar la tercerización con la intención o efecto de",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-no-conceder-la-garantia-de",
        "description": "No conceder la garantía de",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-no-conceder-la-garantia-de-dar-a-la-autoridad-informacion-o-docum",
        "parent": "No conceder la garantía de",
        "description": "No conceder la garantía de: Dar a la Autoridad información o documentación falsa relacionada con el ejercicio de sus actividades como entidad de intermediación",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-no-conceder-la-garantia-de-registro-fraudulento-como-entidad-de-i",
        "parent": "No conceder la garantía de",
        "description": "No conceder la garantía de: Registro fraudulento como entidad de intermediación",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-usar-la-tercerizacion-laboral",
        "description": "Usar la tercerización laboral",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-usar-la-tercerizacion-laboral-iv-2-infracciones-de-las-empresas-u",
        "parent": "Usar la tercerización laboral",
        "description": "Usar la tercerización laboral: IV. 2 Infracciones de las empresas usuarias",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-usar-la-tercerizacion-laboral-incumplimiento-de-obligaciones-mera",
        "parent": "Usar la tercerización laboral",
        "description": "Usar la tercerización laboral: Incumplimiento de obligaciones meramente formales o documentales",
        "gravity": "LEVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-respecto-del-contrato-de-prestacion-de-servicios-celebrado-con-la",
        "description": "Respecto del contrato de prestación de servicios celebrado con la entidad de intermediación",
        "gravity": "GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-respecto-del-contrato-de-prestacion-de-servicios-celebrado-con-la",
        "parent": "Respecto del contrato de prestación de servicios celebrado con la entidad de intermediación",
        "description": "Respecto del contrato de prestación de servicios celebrado con la entidad de intermediación: Exceder los límites porcentuales aplicables a la intermediación",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-respecto-del-contrato-de-prestacion-de-servicios-celebrado-con-la",
        "parent": "Respecto del contrato de prestación de servicios celebrado con la entidad de intermediación",
        "description": "Respecto del contrato de prestación de servicios celebrado con la entidad de intermediación: Exceder los límites cualitativos aplicables a la intermediación",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-la-ocupacion-de-trabajadores-destacados-en-supuestos-prohibidos",
        "description": "La ocupación de trabajadores destacados en supuestos prohibidos",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-la-ocupacion-de-trabajadores-destacados-en-supuestos-prohibidos-l",
        "parent": "La ocupación de trabajadores destacados en supuestos prohibidos",
        "description": "La ocupación de trabajadores destacados en supuestos prohibidos: La cesión a otras empresas de trabajadores destacados",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      },
      {
        "id": "intermediacion-la-ocupacion-de-trabajadores-destacados-en-supuestos-prohibidos-c",
        "parent": "La ocupación de trabajadores destacados en supuestos prohibidos",
        "description": "La ocupación de trabajadores destacados en supuestos prohibidos: Contratar a una entidad de intermediación laboral sin registro vigente",
        "gravity": "MUY_GRAVE",
        "category": "INTERMEDIACION"
      }
    ]
  },
  {
    "key": "promocion-formativa",
    "label": "Promoción y formación laboral",
    "category": "FORMATIVA",
    "sheet": "V. Prom. y Form. Lab.",
    "count": 17,
    "items": [
      {
        "id": "promocion-formativa-respecto-de-registros-especiales-de-modalidades-formativas",
        "description": "Respecto de registros especiales de modalidades formativas",
        "gravity": "GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-respecto-de-registros-especiales-de-modalidades-formativas-e",
        "parent": "Respecto de registros especiales de modalidades formativas",
        "description": "Respecto de registros especiales de modalidades formativas: Exceder los límites de contratación bajo modalidades formativas",
        "gravity": "GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-respecto-de-registros-especiales-de-modalidades-formativas-n",
        "parent": "Respecto de registros especiales de modalidades formativas",
        "description": "Respecto de registros especiales de modalidades formativas: No cumplir con las obligaciones en materia de formación",
        "gravity": "GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-respecto-de-registros-especiales-de-modalidades-formativas-n",
        "parent": "Respecto de registros especiales de modalidades formativas",
        "description": "Respecto de registros especiales de modalidades formativas: No brindar facilidades para que el beneficiario se afilie a un sistema pensionario",
        "gravity": "GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-respecto-de-registros-especiales-de-modalidades-formativas-n",
        "parent": "Respecto de registros especiales de modalidades formativas",
        "description": "Respecto de registros especiales de modalidades formativas: No emitir los informes que requiera el centro de formación profesional",
        "gravity": "GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-respecto-del-certificado",
        "description": "Respecto del certificado",
        "gravity": "GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-respecto-del-plan-o-programa-correspondiente-a-la-modalidad",
        "description": "Respecto del plan o programa correspondiente a la modalidad",
        "gravity": "GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-respecto-de-la-subvencion-de-los-beneficiarios",
        "description": "Respecto de la subvención de los beneficiarios",
        "gravity": "MUY_GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-respecto-de-otros-derechos-economicos-de-los-beneficiarios",
        "description": "Respecto de otros derechos económicos de los beneficiarios",
        "gravity": "MUY_GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-el-incumplimiento-de-las-disposiciones-referidas",
        "description": "El incumplimiento de las disposiciones referidas",
        "gravity": "MUY_GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-el-incumplimiento-de-las-disposiciones-referidas-no-cubrir-l",
        "parent": "El incumplimiento de las disposiciones referidas",
        "description": "El incumplimiento de las disposiciones referidas: No cubrir los riesgos de enfermedad y accidentes de trabajo a través de EsSalud o de un seguro privado",
        "gravity": "MUY_GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-el-incumplimiento-de-las-disposiciones-referidas-no-asumir-d",
        "parent": "El incumplimiento de las disposiciones referidas",
        "description": "El incumplimiento de las disposiciones referidas: No asumir directamente el costo de contingencias originadas por accidente o enfermedad cuando la empresa que no haya cubierto los riesgos a través de EsSalud o de seguro privado",
        "gravity": "MUY_GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-el-incumplimiento-de-las-disposiciones-referidas-presentacio",
        "parent": "El incumplimiento de las disposiciones referidas",
        "description": "El incumplimiento de las disposiciones referidas: Presentación de documentación falsa ante la autoridad para acogerse al incremento porcentual de los límites de contratación bajo modalidades formativas",
        "gravity": "MUY_GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-el-incumplimiento-de-las-disposiciones-referidas-no-contar-c",
        "parent": "El incumplimiento de las disposiciones referidas",
        "description": "El incumplimiento de las disposiciones referidas: No contar con el plan o programa correspondiente a la modalidad formativa",
        "gravity": "MUY_GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-el-incumplimiento-de-las-disposiciones-referidas-el-uso-frau",
        "parent": "El incumplimiento de las disposiciones referidas",
        "description": "El incumplimiento de las disposiciones referidas: El uso fraudulento de las modalidades formativas",
        "gravity": "MUY_GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-respecto-de-los-convenios-de-modalidades-formativas",
        "description": "Respecto de los convenios de modalidades formativas",
        "gravity": "MUY_GRAVE",
        "category": "FORMATIVA"
      },
      {
        "id": "promocion-formativa-respecto-de-los-convenios-de-modalidades-formativas-el-uso-d",
        "parent": "Respecto de los convenios de modalidades formativas",
        "description": "Respecto de los convenios de modalidades formativas: El uso de castigo físico y humillante contra los beneficiarios de alguna modalidad formativa (Ley Nº 30403, Ley que prohíbe el uso del castigo físico y humillante)",
        "gravity": "MUY_GRAVE",
        "category": "FORMATIVA"
      }
    ]
  },
  {
    "key": "extranjeros",
    "label": "Contratación de trabajadores extranjeros",
    "category": "EXTRANJEROS",
    "sheet": "VI. Cont. de Trab. Extran.",
    "count": 6,
    "items": [
      {
        "id": "extranjeros-respecto-del-contrato-de-trabajo",
        "description": "Respecto del contrato de trabajo",
        "gravity": "LEVE",
        "category": "EXTRANJEROS"
      },
      {
        "id": "extranjeros-respecto-del-contrato-de-trabajo-no-formalizar-por-escrito-los-contr",
        "parent": "Respecto del contrato de trabajo",
        "description": "Respecto del contrato de trabajo: No formalizar por escrito los contratos con los requisitos previstos",
        "gravity": "GRAVE",
        "category": "EXTRANJEROS"
      },
      {
        "id": "extranjeros-respecto-del-contrato-de-trabajo-no-cumplir-con-los-limites-a-la-con",
        "parent": "Respecto del contrato de trabajo",
        "description": "Respecto del contrato de trabajo: No cumplir con los límites a la contratación de trabajadores extranjeros",
        "gravity": "GRAVE",
        "category": "EXTRANJEROS"
      },
      {
        "id": "extranjeros-respecto-del-contrato-de-trabajo-contratar-trabajadores-extranjeros-",
        "parent": "Respecto del contrato de trabajo",
        "description": "Respecto del contrato de trabajo: Contratar trabajadores extranjeros sin haber obtenido previamente la autorización administrativa correspondiente",
        "gravity": "MUY_GRAVE",
        "category": "EXTRANJEROS"
      },
      {
        "id": "extranjeros-respecto-del-contrato-de-trabajo-la-presentacion-a-la-autoridad-de-i",
        "parent": "Respecto del contrato de trabajo",
        "description": "Respecto del contrato de trabajo: La presentación a la Autoridad de información o documentación falsa para la exoneración de los límites a la contratación",
        "gravity": "MUY_GRAVE",
        "category": "EXTRANJEROS"
      },
      {
        "id": "extranjeros-respecto-del-contrato-de-trabajo-la-contratacion-fraudulenta-de-trab",
        "parent": "Respecto del contrato de trabajo",
        "description": "Respecto del contrato de trabajo: La contratación fraudulenta de trabajadores extranjeros",
        "gravity": "MUY_GRAVE",
        "category": "EXTRANJEROS"
      }
    ]
  },
  {
    "key": "seguridad-social",
    "label": "Seguridad social",
    "category": "SEGURIDAD_SOCIAL",
    "sheet": "VII. Seg. Social",
    "count": 18,
    "items": [
      {
        "id": "seguridad-social-no-informar-a-la-administradora-de-fondos-de-pensiones-los-caso",
        "description": "No informar a la Administradora de Fondos de Pensiones los casos de",
        "gravity": "LEVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-de-los-aportes-al-spp",
        "description": "Respecto de los aportes al SPP",
        "gravity": "LEVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-del-boletin-informativo-ley-n-28991",
        "description": "Respecto del “Boletín Informativo” (Ley Nº 28991)",
        "gravity": "LEVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-del-boletin-informativo-ley-n-28991-no-solicitar-la-co",
        "parent": "Respecto del “Boletín Informativo” (Ley Nº 28991)",
        "description": "Respecto del “Boletín Informativo” (Ley Nº 28991): No solicitar la constancia de afiliación a algún régimen previsional al trabajador",
        "gravity": "LEVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-de-la-baja-de-quien-pierde-la-condicion-de-asegurado-e",
        "description": "Respecto de la baja de quien pierde la condición de asegurado en el sistema de seguridad social en salud",
        "gravity": "GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-de-la-baja-de-quien-pierde-la-condicion-de-asegurado-e",
        "parent": "Respecto de la baja de quien pierde la condición de asegurado en el sistema de seguridad social en salud",
        "description": "Respecto de la baja de quien pierde la condición de asegurado en el sistema de seguridad social en salud: No afiliarse como conductor de una microempresa al Sistema de Pensiones Sociales",
        "gravity": "GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-de-la-afiliacion-y-el-boletin-informativo",
        "description": "Respecto de la afiliación y el Boletín Informativo",
        "gravity": "GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-de-la-afiliacion-y-el-boletin-informativo-no-afiliar-a",
        "parent": "Respecto de la afiliación y el Boletín Informativo",
        "description": "Respecto de la afiliación y el Boletín Informativo: No afiliar al trabajador en el sistema de pensiones de su elección o en el que corresponda conforme a ley",
        "gravity": "GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-de-los-aportes-de-los-trabajadores-al-sistema-privado-",
        "description": "Respecto de los aportes de los trabajadores al Sistema Privado de Pensiones",
        "gravity": "GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-del-fondo-complementario-de-jubilacion-minera-metalurg",
        "description": "Respecto del Fondo Complementario de Jubilación Minera, Metalúrgica y Siderúrgica",
        "gravity": "GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-la-falta-de-inscripcion-de-trabajadores-u-otras-personas-respec",
        "description": "La falta de inscripción de trabajadores, u otras personas respecto de las que exista la obligación de inscripción",
        "gravity": "MUY_GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-de-los-aportes-al-sistema-privado-de-pensiones-efectiv",
        "description": "Respecto de los aportes al Sistema Privado de Pensiones efectivamente retenidos",
        "gravity": "MUY_GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-de-los-aportes-al-sistema-privado-de-pensiones-efectiv",
        "parent": "Respecto de los aportes al Sistema Privado de Pensiones efectivamente retenidos",
        "description": "Respecto de los aportes al Sistema Privado de Pensiones efectivamente retenidos: No regularizar los aportes adeudados a las AFP que hayan sido cotizados al SNP luego de la incorporación de sus trabajadores al SPP",
        "gravity": "MUY_GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-de-los-aportes-al-sistema-privado-de-pensiones-efectiv",
        "parent": "Respecto de los aportes al Sistema Privado de Pensiones efectivamente retenidos",
        "description": "Respecto de los aportes al Sistema Privado de Pensiones efectivamente retenidos: No regularizar los aportes de un trabajador contratado como independiente que es realmente trabajador dependiente incluyendo los intereses por mora",
        "gravity": "MUY_GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-de-los-aportes-al-sistema-privado-de-pensiones-efectiv",
        "parent": "Respecto de los aportes al Sistema Privado de Pensiones efectivamente retenidos",
        "description": "Respecto de los aportes al Sistema Privado de Pensiones efectivamente retenidos: No efectuar el pago de los aportes voluntarios en la oportunidad correspondiente",
        "gravity": "MUY_GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-de-los-aportes-al-sistema-privado-de-pensiones-efectiv",
        "parent": "Respecto de los aportes al Sistema Privado de Pensiones efectivamente retenidos",
        "description": "Respecto de los aportes al Sistema Privado de Pensiones efectivamente retenidos: Efectuar declaraciones o consignar datos falsos o inexactos en los documentos de cotización que ocasionen deducciones fraudulentas en las aportaciones al SPP",
        "gravity": "MUY_GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-del-monto-retenido-a-los-trabajadores-por-aporte-al-fo",
        "description": "Respecto del monto retenido a los trabajadores por aporte al Fondo Complementario de Jubilación Minera, Metalúrgica y Siderúrgica",
        "gravity": "MUY_GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      },
      {
        "id": "seguridad-social-respecto-del-aporte-a-cargo-del-empleador-al-fondo-complementar",
        "description": "Respecto del aporte a cargo del empleador al Fondo Complementario de Jubilación Minera, Metalúrgica y Siderúrgica",
        "gravity": "MUY_GRAVE",
        "category": "SEGURIDAD_SOCIAL"
      }
    ]
  }
] as const

/**
 * Vista plana de todas las infracciones tipificadas.
 */
export const INFRACCIONES: readonly InfraccionSunafil[] = INFRAC_SECTIONS.flatMap(s => s.items)

/**
 * Total de infracciones.
 */
export const INFRAC_TOTAL: number = 164

/**
 * Mapa category → sección completa.
 */
export const INFRAC_BY_CATEGORY: Readonly<Record<string, InfracSection>> = Object.fromEntries(
  INFRAC_SECTIONS.map(s => [s.category, s])
)

/**
 * Conteo rápido por gravedad.
 */
export const INFRAC_COUNT_BY_GRAVITY: Readonly<Record<InfracGravity, number>> = INFRACCIONES.reduce(
  (acc, i) => ({ ...acc, [i.gravity]: (acc[i.gravity] ?? 0) + 1 }),
  { LEVE: 0, GRAVE: 0, MUY_GRAVE: 0 } as Record<InfracGravity, number>
)
