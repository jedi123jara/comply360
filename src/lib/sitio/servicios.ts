/**
 * Líneas de servicio y páginas por área (/servicios/[area]).
 * Contenido apoyado en el mapa de obligaciones verificado (obligaciones.ts).
 */
import type { AreaObligacion } from './obligaciones'

export interface LineaServicio {
  id: 'diagnostico' | 'implementacion' | 'iguala' | 'capacitaciones' | 'defensa' | 'puntuales'
  verbo: string
  nombre: string
  descripcion: string
  entregable: string
  plazo: string
}

export const LINEAS_SERVICIO: LineaServicio[] = [
  {
    id: 'diagnostico',
    verbo: 'Diagnosticar',
    nombre: 'Diagnóstico de cumplimiento',
    descripcion:
      'Revisamos planillas, contratos, registros y políticas, y te decimos cuánto arriesgas en multas, en soles. La versión express es gratis.',
    entregable: 'Informe por materia, multa estimada por hallazgo y plan de acción a 30, 60 y 90 días',
    plazo: 'Express: el mismo día. Completo: 5 a 7 días hábiles',
  },
  {
    id: 'implementacion',
    verbo: 'Implementar',
    nombre: 'Implementación',
    descripcion:
      'Hacemos los documentos, comités y registros que te faltan, por módulos: laboral, SST y hostigamiento sexual.',
    entregable: 'Documentos listos para firmar, comités instalados y registros al día',
    plazo: '2 a 6 semanas por módulo',
  },
  {
    id: 'iguala',
    verbo: 'Mantener',
    nombre: 'Iguala mensual',
    descripcion:
      'Cuidamos que sigas en regla todo el año: calendario de obligaciones con alertas, boletín normativo, consultas y actualización anual de documentos.',
    entregable: 'Reporte mensual de estado y archivo de evidencias al día',
    plazo: 'Contrato anual, pago mensual',
  },
  {
    id: 'capacitaciones',
    verbo: 'Capacitar',
    nombre: 'Capacitaciones obligatorias',
    descripcion:
      'Dictamos las capacitaciones que exige la ley con especialistas competentes: ingenieros de seguridad, instructores de brigadas, psicólogos y abogados.',
    entregable: 'Registro de capacitación, asistencia firmada, evaluación y constancias',
    plazo: 'Según el cronograma anual que acordamos contigo',
  },
  {
    id: 'defensa',
    verbo: 'Defender',
    nombre: 'Defensa ante SUNAFIL',
    descripcion:
      'Te acompañamos en la inspección, atendemos los requerimientos y preparamos descargos, apelación y recurso de revisión ante el Tribunal de Fiscalización Laboral.',
    entregable: 'Escritos y estrategia apoyada en resoluciones del Tribunal de Fiscalización Laboral',
    plazo: 'Según los plazos del procedimiento',
  },
  {
    id: 'puntuales',
    verbo: 'Resolver',
    nombre: 'Servicios puntuales',
    descripcion:
      'Elecciones del comité de SST, desvinculaciones sin contingencias, apoyo en la investigación de una denuncia de hostigamiento y simulacros de inspección.',
    entregable: 'Actas, cartas y procedimientos revisados',
    plazo: 'A pedido',
  },
]

export type SlugArea = 'laboral' | 'sst' | 'hostigamiento'

export interface AreaServicio {
  slug: SlugArea
  nombreCorto: string
  /** Texto del enlace hacia la página (anclas descriptivas para SEO). */
  enlace: string
  /** H1 de la página. */
  titulo: string
  /** Título SEO (sin la marca). */
  metaTitulo: string
  metaDescripcion: string
  keywords: string[]
  resumen: string
  porQueImporta: string[]
  areasObligacion: AreaObligacion[]
  queHacemos: Array<{ titulo: string; detalle: string }>
  entregables: string[]
  /** Nombre del servicio en SERVICIOS_PRECIO_FIJO para mostrar su precio. */
  servicioPrecio: string
  capacitaciones: string[]
  faqs: Array<{ pregunta: string; respuesta: string }>
}

export const AREAS_SERVICIO: AreaServicio[] = [
  {
    slug: 'sst',
    nombreCorto: 'SST',
    enlace: 'Ver implementación de SST',
    titulo: 'Implementación de seguridad y salud en el trabajo para empresas',
    metaTitulo: 'Implementación de SST para empresas (Ley 29783)',
    metaDescripcion:
      'Implementamos el sistema de gestión de SST de tu empresa: IPERC, mapa de riesgos, reglamento interno, comité y registros, con la evidencia lista para SUNAFIL.',
    keywords: [
      'implementación SST',
      'sistema de gestión de seguridad y salud en el trabajo',
      'Ley 29783',
      'consultoría SST Trujillo',
      'reglamento interno de SST',
      'IPERC',
    ],
    resumen:
      'Toda empresa con trabajadores debe tener un sistema de gestión de SST. Nosotros lo armamos, lo dejamos funcionando y lo mantenemos al día, con un ingeniero de seguridad y respaldo legal.',
    porQueImporta: [
      'La SST es de las materias que más fiscaliza SUNAFIL, y varias faltas son muy graves: no tener reglamento interno de SST desde 20 trabajadores o no hacer los exámenes médicos ocupacionales.',
      'La obligación no depende del tamaño: desde el primer trabajador necesitas política, IPERC, registros y al menos 4 capacitaciones al año.',
      'Lo que te salva en una inspección no es tener los documentos en un cajón, sino poder probar que los aplicas: actas, registros firmados y constancias.',
    ],
    areasObligacion: ['SST'],
    queHacemos: [
      {
        titulo: 'Diagnóstico de SST',
        detalle: 'Revisamos qué tienes y qué falta frente a la Ley 29783 y su reglamento, con la multa estimada de cada brecha.',
      },
      {
        titulo: 'Documentos base',
        detalle: 'Política de SST, IPERC por puesto, mapa de riesgos, plan y programa anual, y reglamento interno de SST si tienes 20 o más trabajadores.',
      },
      {
        titulo: 'Comité o supervisor',
        detalle: 'Organizamos la elección del comité paritario o del supervisor de SST: convocatoria, padrón, votación, actas e instalación.',
      },
      {
        titulo: 'Registros y capacitaciones',
        detalle: 'Dejamos los registros obligatorios al día y armamos el cronograma de las 4 capacitaciones anuales.',
      },
      {
        titulo: 'Mantenimiento',
        detalle: 'Con la iguala, actualizamos el IPERC cada año, acompañamos al comité y te avisamos de cada vencimiento.',
      },
    ],
    entregables: [
      'Política de SST aprobada y difundida',
      'Matriz IPERC por puesto y mapa de riesgos',
      'Plan y programa anual de SST',
      'Reglamento interno de SST (desde 20 trabajadores)',
      'Actas de elección e instalación del comité o supervisor',
      'Registros obligatorios con sus formatos',
      'Archivo de evidencias ordenado como lo pide el inspector',
    ],
    servicioPrecio: 'Implementación de SST',
    capacitaciones: ['capacitaciones-sst', 'induccion-sst', 'comite-sst', 'brigadas-emergencia'],
    faqs: [
      {
        pregunta: '¿Mi empresa necesita un comité de SST?',
        respuesta:
          'Si tienes 20 o más trabajadores, sí: un comité paritario de 4 a 12 miembros (Ley 29783, art. 29). Con menos de 20, basta un supervisor de SST elegido por los trabajadores (art. 30).',
      },
      {
        pregunta: '¿Desde cuántos trabajadores es obligatorio el reglamento interno de SST?',
        respuesta: 'Desde 20 trabajadores (Ley 29783, art. 34). No tenerlo es una falta muy grave en el reglamento de inspección.',
      },
      {
        pregunta: '¿Cada cuánto se actualiza el IPERC?',
        respuesta:
          'Al menos una vez al año, y además cuando cambian las condiciones de trabajo o después de un accidente. Con la iguala, lo actualizamos por ti.',
      },
      {
        pregunta: '¿Trabajan con ingenieros de seguridad?',
        respuesta:
          'Sí. Los temas técnicos (IPERC, mapa de riesgos, capacitaciones técnicas) los ve un ingeniero de seguridad colegiado; lo legal y la evidencia, nosotros.',
      },
      {
        pregunta: '¿Cuánto cuesta implementar la SST?',
        respuesta:
          'Desde S/ 1,500 + IGV para empresas de 20 a 50 trabajadores. El precio depende del tamaño y de lo que ya tengas; el diagnóstico te da el monto exacto.',
      },
    ],
  },
  {
    slug: 'hostigamiento',
    nombreCorto: 'Hostigamiento sexual',
    enlace: 'Ver prevención del hostigamiento',
    titulo: 'Prevención del hostigamiento sexual en el trabajo para empresas',
    metaTitulo: 'Hostigamiento sexual: obligaciones de la empresa',
    metaDescripcion:
      'Implementamos la política, el comité de intervención o delegado, el canal de denuncias, la evaluación anual y las capacitaciones que exige la Ley 27942.',
    keywords: [
      'hostigamiento sexual empresa',
      'comité de intervención frente al hostigamiento sexual',
      'Ley 27942',
      'D.S. 014-2019-MIMP',
      'política de hostigamiento sexual',
      'capacitación hostigamiento sexual',
    ],
    resumen:
      'La ley exige prevenir el hostigamiento sexual y saber actuar cuando hay una denuncia. Te dejamos todo listo: política, comité o delegado, canal de denuncias, procedimiento, evaluación anual y capacitaciones.',
    porQueImporta: [
      'Las faltas en el procedimiento de investigación son muy graves en el reglamento de inspección.',
      'Toda empresa debe evaluar cada año los riesgos de hostigamiento y capacitar a su personal al inicio de la relación laboral.',
      'Una denuncia mal atendida es un problema legal y de reputación. Con el procedimiento y el comité preparados, se actúa a tiempo.',
    ],
    areasObligacion: ['Hostigamiento sexual'],
    queHacemos: [
      {
        titulo: 'Política interna',
        detalle: 'Redactamos la política de prevención del hostigamiento sexual y la dejamos difundida (obligatoria desde 20 trabajadores).',
      },
      {
        titulo: 'Comité o delegado',
        detalle: 'Conformamos el comité de intervención (desde 20 trabajadores, con paridad) o designamos al delegado si tienes menos de 20.',
      },
      {
        titulo: 'Canal y procedimiento',
        detalle: 'Diseñamos el canal de denuncias, el procedimiento con sus plazos y las medidas de protección.',
      },
      {
        titulo: 'Evaluación anual',
        detalle: 'Hacemos la evaluación anual de riesgos de hostigamiento que exige el reglamento.',
      },
      {
        titulo: 'Capacitaciones',
        detalle: 'Dictamos la capacitación inicial para todo el personal y la anual especializada para RRHH y el comité.',
      },
    ],
    entregables: [
      'Política de prevención del hostigamiento sexual',
      'Acta de conformación del comité o designación del delegado',
      'Canal de denuncias y procedimiento con plazos',
      'Formatos de medidas de protección e informe',
      'Informe de evaluación anual de riesgos',
      'Constancias de capacitación',
    ],
    servicioPrecio: 'Implementación de hostigamiento sexual',
    capacitaciones: ['hostigamiento-sexual'],
    faqs: [
      {
        pregunta: '¿Toda empresa necesita un comité de intervención?',
        respuesta:
          'Desde 20 trabajadores se conforma un comité de intervención con paridad. Con menos de 20, se designa un delegado o delegada (D.S. 014-2019-MIMP, art. 27).',
      },
      {
        pregunta: '¿Qué capacitaciones de hostigamiento son obligatorias?',
        respuesta:
          'Una al inicio de la relación laboral para todo el personal y una anual especializada para RRHH, el comité y quienes intervienen en la investigación (art. 11). La anual no es exigible a MYPE inscritas en el REMYPE.',
      },
      {
        pregunta: '¿Investigan denuncias de hostigamiento?',
        respuesta:
          'Apoyamos al comité para que cumpla el procedimiento y los plazos: medidas de protección, investigación e informe. La decisión final es de la empresa.',
      },
      {
        pregunta: '¿Cuánto cuesta?',
        respuesta: 'La implementación cuesta desde S/ 800 + IGV para empresas de 20 a 50 trabajadores.',
      },
    ],
  },
  {
    slug: 'laboral',
    nombreCorto: 'Laboral',
    enlace: 'Ver cumplimiento laboral',
    titulo: 'Cumplimiento laboral para empresas: documentos y obligaciones al día',
    metaTitulo: 'Cumplimiento laboral para empresas en Perú',
    metaDescripcion:
      'Ponemos al día contratos, cuadro de categorías y funciones, control de asistencia, Seguro Vida Ley y reglamento interno, con la evidencia que pide SUNAFIL.',
    keywords: [
      'cumplimiento laboral empresas',
      'asesoría laboral para empresas Trujillo',
      'cuadro de categorías y funciones',
      'Ley 30709',
      'control de asistencia',
      'reglamento interno de trabajo',
    ],
    resumen:
      'Junto con la SST, remuneraciones, jornada, CTS y planillas son las materias que más fiscaliza SUNAFIL. Ordenamos tus documentos laborales y te ayudamos a mantenerlos al día.',
    porQueImporta: [
      'El cuadro de categorías y funciones con su política salarial es obligatorio para todo empleador, sin importar el tamaño, y no tenerlo es falta muy grave.',
      'No llevar el registro de control de asistencia también es muy grave.',
      'El 74% de las inspecciones nace de una denuncia: basta un extrabajador inconforme para que llegue el inspector.',
    ],
    areasObligacion: ['Laboral'],
    queHacemos: [
      {
        titulo: 'Contratos y legajo',
        detalle: 'Revisamos los contratos por modalidad y ordenamos el legajo de cada trabajador.',
      },
      {
        titulo: 'Igualdad salarial',
        detalle: 'Elaboramos el cuadro de categorías y funciones y la política salarial (Ley 30709) y te ayudamos a comunicarlos.',
      },
      {
        titulo: 'Jornada y asistencia',
        detalle: 'Revisamos el control de asistencia, horas extras y descansos.',
      },
      {
        titulo: 'Obligaciones por tamaño',
        detalle: 'Reglamento interno de trabajo (más de 100 trabajadores), cuota de discapacidad (más de 50), lactario y Seguro Vida Ley.',
      },
      {
        titulo: 'Desvinculaciones',
        detalle: 'Revisamos cartas de preaviso, despido y liquidaciones para no terminar en juicio.',
      },
    ],
    entregables: [
      'Contratos revisados y modelos por modalidad',
      'Cuadro de categorías y funciones y política salarial',
      'Políticas internas (vacaciones, horas extras, asistencia)',
      'Reglamento interno de trabajo (si corresponde)',
      'Checklist del legajo por trabajador',
    ],
    servicioPrecio: 'Implementación laboral',
    capacitaciones: ['inspeccion-sunafil'],
    faqs: [
      {
        pregunta: '¿El cuadro de categorías y funciones es obligatorio para una empresa pequeña?',
        respuesta:
          'Sí. La Ley 30709 y su reglamento lo exigen a todo empleador privado, sin umbral de trabajadores, junto con la política salarial.',
      },
      {
        pregunta: '¿Desde cuántos trabajadores es obligatorio el reglamento interno de trabajo?',
        respuesta: 'Cuando la empresa tiene más de 100 trabajadores (D.S. 039-91-TR).',
      },
      {
        pregunta: '¿Calculan planillas o CTS?',
        respuesta:
          'No hacemos planillas: eso lo ve tu contador. Revisamos que lo laboral cumpla la ley y puedes usar gratis nuestras calculadoras de CTS, gratificación y multas.',
      },
      {
        pregunta: '¿Cuánto cuesta?',
        respuesta: 'La implementación laboral cuesta desde S/ 1,200 + IGV para empresas de 20 a 50 trabajadores.',
      },
    ],
  },
]

export function areaPorSlug(slug: string): AreaServicio | undefined {
  return AREAS_SERVICIO.find((a) => a.slug === slug)
}
