/**
 * Catálogo de capacitaciones (/capacitaciones y /capacitaciones/[tema]).
 *
 * Base legal verificada (oct-2026):
 *  - Ley 29783, art. 35 b: al menos 4 capacitaciones de SST al año, en jornada.
 *  - Reglamento de SST (D.S. 005-2012-TR) art. 28: las puede impartir el
 *    empleador, terceros o la AAT; art. 29 b: profesionales competentes y con
 *    experiencia. Art. 27-A: presenciales al contratar y por cambio de puesto
 *    o tecnología; las demás, por otros medios.
 *  - D.S. 014-2019-MIMP, art. 11: hostigamiento al inicio de la relación y
 *    anual especializada (no exigible a MYPE con REMYPE).
 */

export type Modalidad = 'Presencial' | 'Presencial o virtual en vivo' | 'Virtual en vivo'

export interface Capacitacion {
  slug: string
  nombre: string
  /** H1 de la página. */
  titulo: string
  metaTitulo: string
  metaDescripcion: string
  keywords: string[]
  resumen: string
  obligatoriaPara: string
  frecuencia: string
  baseLegal: string
  dicta: string
  modalidad: Modalidad
  /** Para schema.org Course. */
  modo: 'Onsite' | 'Online' | 'Blended'
  duracion: string
  temario: string[]
  precio: string
  /** Precio mínimo en soles (sin IGV) para el JSON-LD. */
  precioDesde: number
  nota?: string
  faqs: Array<{ pregunta: string; respuesta: string }>
}

const EVIDENCIA = [
  'Registro de capacitación con el formato del reglamento de SST',
  'Lista de asistencia firmada',
  'Temario y material',
  'Evaluación de lo aprendido',
  'Constancias firmadas por el instructor y Comply360',
  'Fotos o grabación de la sesión',
] as const

export const EVIDENCIA_ENTREGADA: readonly string[] = EVIDENCIA

export const CAPACITACIONES: Capacitacion[] = [
  {
    slug: 'capacitaciones-sst',
    nombre: '4 capacitaciones anuales de SST',
    titulo: 'Las 4 capacitaciones obligatorias de SST para tu empresa',
    metaTitulo: 'Capacitaciones obligatorias de SST para empresas',
    metaDescripcion:
      'Dictamos las 4 capacitaciones de SST que exige la Ley 29783 cada año, con ingenieros de seguridad y la evidencia lista para SUNAFIL. Trujillo y todo el Perú.',
    keywords: [
      'capacitaciones obligatorias SST',
      '4 capacitaciones SST al año',
      'capacitación SST Trujillo',
      'capacitación seguridad y salud en el trabajo',
      'Ley 29783 capacitaciones',
    ],
    resumen:
      'La Ley 29783 exige al menos 4 capacitaciones de SST al año para todos los trabajadores, dentro de la jornada y sin costo para ellos. Las organizamos contigo y te dejamos la evidencia lista.',
    obligatoriaPara: 'Toda empresa con trabajadores',
    frecuencia: 'Al menos 4 al año, dentro de la jornada laboral',
    baseLegal: 'Ley 29783, art. 35 b; Reglamento de SST, arts. 27 a 29',
    dicta: 'Ingeniero de seguridad colegiado; los temas legales, un abogado',
    modalidad: 'Presencial o virtual en vivo',
    modo: 'Blended',
    duracion: '1 a 2 horas por sesión',
    temario: [
      'Ley 29783: derechos y obligaciones de empleador y trabajadores',
      'Riesgos del puesto según el IPERC y medidas de control',
      'Uso y cuidado de los equipos de protección personal',
      'Respuesta ante emergencias y primeros auxilios básicos',
      'Ergonomía, pausas activas y riesgos específicos de tu actividad',
    ],
    precio: 'Plan Anual S/ 3,300 + IGV (6 sesiones) o S/ 600 + IGV por sesión',
    precioDesde: 600,
    nota: 'Los temas se eligen según tu IPERC y tu plan anual. El temario de arriba es un ejemplo de año.',
    faqs: [
      {
        pregunta: '¿Cuántas capacitaciones de SST son obligatorias al año?',
        respuesta:
          'Al menos 4 al año (Ley 29783, art. 35 b), además de la inducción al ingresar y las que correspondan por cambio de puesto o de tecnología.',
      },
      {
        pregunta: '¿Pueden ser virtuales?',
        respuesta:
          'Las periódicas, sí. La inducción y las capacitaciones por cambio de puesto o tecnología deben ser presenciales (Reglamento de SST, art. 27-A).',
      },
      {
        pregunta: '¿Quién puede dictarlas?',
        respuesta:
          'El empleador directamente o un tercero, siempre que sean profesionales competentes y con experiencia en la materia (Reglamento de SST, arts. 28 y 29).',
      },
      {
        pregunta: '¿Qué pasa si no las hago?',
        respuesta:
          'No capacitar en SST es una falta grave en el reglamento de inspección (27.8). Y si no puedes probar que capacitaste, para el inspector es como si no lo hubieras hecho.',
      },
    ],
  },
  {
    slug: 'induccion-sst',
    nombre: 'Inducción de SST',
    titulo: 'Inducción de SST para nuevos trabajadores',
    metaTitulo: 'Inducción de SST para nuevos trabajadores',
    metaDescripcion:
      'La inducción de SST es obligatoria y presencial al contratar. La dictamos en tu empresa con un ingeniero de seguridad y te entregamos el registro firmado.',
    keywords: ['inducción SST', 'inducción de seguridad nuevos trabajadores', 'inducción SST presencial', 'charla de inducción SST'],
    resumen:
      'Todo trabajador nuevo debe recibir una inducción de SST al ingresar, y debe ser presencial. La damos en tu centro de trabajo, por grupos de nuevos ingresos.',
    obligatoriaPara: 'Todo trabajador nuevo',
    frecuencia: 'Al ingresar, y al cambiar de puesto o de tecnología',
    baseLegal: 'Ley 29783, art. 49 g; Reglamento de SST, art. 27-A',
    dicta: 'Ingeniero de seguridad colegiado',
    modalidad: 'Presencial',
    modo: 'Onsite',
    duracion: '1 a 2 horas',
    temario: [
      'Política y reglamento interno de SST de la empresa',
      'Riesgos del puesto según el IPERC',
      'Uso de equipos de protección personal',
      'Qué hacer ante un accidente, incidente o emergencia',
      'Rutas de evacuación y zonas seguras',
      'Derechos y obligaciones en SST',
    ],
    precio: 'Desde S/ 250 + IGV por grupo de nuevos ingresos (Trujillo)',
    precioDesde: 250,
    faqs: [
      {
        pregunta: '¿La inducción de SST puede ser virtual?',
        respuesta: 'No. El reglamento de SST exige que sea presencial al momento de la contratación (art. 27-A).',
      },
      {
        pregunta: '¿La inducción cuenta como una de las 4 capacitaciones anuales?',
        respuesta:
          'La inducción es una obligación aparte, por cada nuevo ingreso. Las 4 capacitaciones anuales son para todo el personal.',
      },
      {
        pregunta: '¿Qué evidencia me entregan?',
        respuesta: 'El registro de inducción con asistencia firmada, el temario, la evaluación y las constancias.',
      },
    ],
  },
  {
    slug: 'comite-sst',
    nombre: 'Formación del comité o supervisor de SST',
    titulo: 'Capacitación para el comité y el supervisor de SST',
    metaTitulo: 'Capacitación para el comité de SST',
    metaDescripcion:
      'Formamos a los miembros del comité de SST y al supervisor: funciones, reuniones y actas, inspecciones internas e investigación de accidentes. Con constancias.',
    keywords: ['capacitación comité SST', 'curso comité de seguridad y salud en el trabajo', 'funciones del comité SST', 'supervisor de SST capacitación'],
    resumen:
      'El comité de SST (desde 20 trabajadores) o el supervisor (menos de 20) necesita saber qué le toca hacer. Los formamos para que el comité funcione de verdad y deje evidencia.',
    obligatoriaPara: 'Miembros del comité de SST o el supervisor de SST',
    frecuencia: 'Al instalarse y luego cada año',
    baseLegal: 'Ley 29783, arts. 29 y 30; Reglamento de SST',
    dicta: 'Ingeniero de seguridad colegiado y abogado',
    modalidad: 'Presencial o virtual en vivo',
    modo: 'Blended',
    duracion: '4 horas, en una o dos sesiones',
    temario: [
      'Funciones del comité y del supervisor según la Ley 29783 y su reglamento',
      'Reuniones mensuales, quórum y libro de actas',
      'Inspecciones internas de seguridad',
      'Investigación de accidentes e incidentes',
      'Revisión del plan y programa anual, el IPERC y el mapa de riesgos',
      'El rol del comité durante una inspección de SUNAFIL',
    ],
    precio: 'S/ 600 + IGV in-company o S/ 99 por persona en curso abierto virtual',
    precioDesde: 99,
    faqs: [
      {
        pregunta: '¿Cuándo se necesita comité y cuándo supervisor?',
        respuesta:
          'Con 20 o más trabajadores, comité paritario de 4 a 12 miembros (Ley 29783, art. 29). Con menos de 20, supervisor de SST elegido por los trabajadores (art. 30).',
      },
      {
        pregunta: '¿Organizan también la elección del comité?',
        respuesta: 'Sí, como servicio aparte: convocatoria, padrón, votación, actas e instalación. Ver Planes y precios.',
      },
    ],
  },
  {
    slug: 'hostigamiento-sexual',
    nombre: 'Prevención del hostigamiento sexual',
    titulo: 'Capacitación en prevención del hostigamiento sexual laboral',
    metaTitulo: 'Capacitación en hostigamiento sexual para empresas',
    metaDescripcion:
      'Capacitación inicial para todo el personal y anual especializada para RRHH y el comité de intervención, como exige el D.S. 014-2019-MIMP. Con constancias.',
    keywords: [
      'capacitación hostigamiento sexual',
      'capacitación hostigamiento sexual empresas',
      'curso hostigamiento sexual laboral',
      'D.S. 014-2019-MIMP capacitación',
      'capacitación comité de intervención',
    ],
    resumen:
      'El reglamento de la Ley 27942 exige dos capacitaciones: una al inicio de la relación laboral para todo el personal y otra anual especializada para RRHH y el comité. Dictamos las dos.',
    obligatoriaPara: 'Todo el personal (inicial); RRHH, comité e involucrados en la investigación (anual especializada)',
    frecuencia: 'Al inicio de la relación laboral y una vez al año (especializada)',
    baseLegal: 'Ley 27942; D.S. 014-2019-MIMP, art. 11',
    dicta: 'Abogado, con apoyo de psicólogo',
    modalidad: 'Presencial o virtual en vivo',
    modo: 'Blended',
    duracion: 'Inicial: 1 a 2 horas. Especializada: 3 a 4 horas',
    temario: [
      'Qué es el hostigamiento sexual y cómo se manifiesta',
      'Canales de denuncia y cómo usarlos',
      'Medidas de protección y prohibición de represalias',
      'Confidencialidad y trato a la víctima',
      'Especializada: procedimiento de investigación, plazos e informe',
      'Especializada: enfoques que exige la norma y comunicación al MTPE',
    ],
    precio: 'S/ 600 + IGV in-company o S/ 79 por persona en curso abierto virtual',
    precioDesde: 79,
    nota: 'La capacitación anual especializada no es exigible a MYPE inscritas en el REMYPE. El temario sigue el de referencia publicado por el MIMP.',
    faqs: [
      {
        pregunta: '¿Qué capacitaciones de hostigamiento sexual son obligatorias?',
        respuesta:
          'Una al inicio de la relación laboral para todo el personal y una anual especializada para RRHH, el comité de intervención y quienes intervienen en la investigación (D.S. 014-2019-MIMP, art. 11).',
      },
      {
        pregunta: '¿Qué pasa si no capacito?',
        respuesta: 'No cumplir las medidas del art. 11 es una falta grave en el reglamento de inspección (24.22).',
      },
      {
        pregunta: '¿Sirve para practicantes y locadores?',
        respuesta:
          'La capacitación inicial alcanza también a relaciones formativas, contractuales u otras con autoridad o dependencia. Te ayudamos a incluirlos.',
      },
    ],
  },
  {
    slug: 'brigadas-emergencia',
    nombre: 'Brigadas de emergencia',
    titulo: 'Capacitación de brigadas: primeros auxilios, incendios y evacuación',
    metaTitulo: 'Capacitación de brigadas de emergencia',
    metaDescripcion:
      'Formamos a tus brigadistas en primeros auxilios, uso de extintores con práctica y evacuación, con instructores certificados. Presencial en Trujillo.',
    keywords: [
      'capacitación brigadas de emergencia',
      'capacitación primeros auxilios empresas',
      'capacitación uso de extintores',
      'simulacro de evacuación empresa',
      'brigadistas Trujillo',
    ],
    resumen:
      'Tu plan de respuesta ante emergencias necesita brigadistas preparados. Los formamos con práctica real: primeros auxilios, extintores y evacuación.',
    obligatoriaPara: 'Brigadistas designados en el plan de emergencias',
    frecuencia: 'Anual, con simulacros según el plan de emergencias',
    baseLegal: 'Ley 29783; Reglamento de SST (plan de respuesta ante emergencias)',
    dicta: 'Bombero, paramédico o instructor certificado',
    modalidad: 'Presencial',
    modo: 'Onsite',
    duracion: '4 horas con práctica',
    temario: [
      'Organización de las brigadas y roles',
      'Primeros auxilios básicos y RCP',
      'Tipos de fuego y uso de extintores, con práctica',
      'Evacuación, rutas y zonas seguras',
      'Preparación y evaluación de un simulacro',
    ],
    precio: 'Desde S/ 900 + IGV',
    precioDesde: 900,
    faqs: [
      {
        pregunta: '¿La práctica con extintores es real?',
        respuesta: 'Sí, la sesión incluye práctica con extintores a cargo del instructor. Se coordina el espacio con tu empresa.',
      },
      {
        pregunta: '¿Cuenta como capacitación de SST?',
        respuesta: 'Sí, puede formar parte de las 4 capacitaciones anuales de SST si así se programa en el plan anual.',
      },
    ],
  },
  {
    slug: 'inspeccion-sunafil',
    nombre: 'Cómo atender una inspección de SUNAFIL',
    titulo: 'Cómo atender una inspección de SUNAFIL: curso para gerentes y RRHH',
    metaTitulo: 'Cómo atender una inspección de SUNAFIL',
    metaDescripcion:
      'Curso para gerentes y RRHH: cómo llega una inspección, qué pide el inspector, cómo responder requerimientos y subsanar para reducir la multa.',
    keywords: ['inspección SUNAFIL', 'cómo atender una inspección de SUNAFIL', 'curso SUNAFIL', 'requerimiento SUNAFIL', 'subsanación multa SUNAFIL'],
    resumen:
      'La mayoría de las inspecciones nace de una denuncia y llega sin aviso. Este curso prepara a gerencia y RRHH para atenderla sin agravar la situación.',
    obligatoriaPara: 'No es obligatoria; recomendada para gerencia y RRHH',
    frecuencia: 'A pedido',
    baseLegal: 'Ley 28806; D.S. 019-2006-TR',
    dicta: 'Abogado',
    modalidad: 'Presencial o virtual en vivo',
    modo: 'Blended',
    duracion: '2 horas',
    temario: [
      'Cómo se origina una inspección y qué esperar',
      'Derechos y deberes de la empresa durante la visita',
      'Qué documentos pide el inspector',
      'Requerimientos, plazos y cómo responderlos',
      'Subsanación y cómo reduce la multa',
      'Actas, descargos y recursos',
    ],
    precio: 'S/ 149 por persona o S/ 600 + IGV in-company',
    precioDesde: 149,
    faqs: [
      {
        pregunta: '¿Qué pasa si no cumplo un requerimiento del inspector?',
        respuesta: 'No cumplir un requerimiento de SUNAFIL es una falta muy grave. Por eso conviene saber responderlo a tiempo.',
      },
      {
        pregunta: '¿Subsanar reduce la multa?',
        respuesta:
          'Sí. La subsanación oportuna reduce la multa de forma importante; en el curso vemos cuándo y cómo aplica. Puedes estimar tu caso en la calculadora de multas.',
      },
    ],
  },
  {
    slug: 'proteccion-datos-personales',
    nombre: 'Protección de datos personales',
    titulo: 'Capacitación en protección de datos personales para empresas',
    metaTitulo: 'Capacitación en protección de datos personales',
    metaDescripcion:
      'Capacitamos a quienes manejan datos en tu empresa sobre la Ley 29733 y su nuevo reglamento: consentimiento, bancos de datos, oficial de datos y seguridad.',
    keywords: ['capacitación protección de datos personales', 'Ley 29733', 'D.S. 016-2024-JUS', 'oficial de datos personales', 'bancos de datos personales'],
    resumen:
      'El nuevo reglamento de la Ley 29733 está vigente desde marzo de 2025 y trae plazos para designar oficial de datos. Capacitamos a quienes manejan datos de clientes y trabajadores.',
    obligatoriaPara: 'Personal que maneja datos personales (recomendable)',
    frecuencia: 'Anual (recomendable)',
    baseLegal: 'Ley 29733; D.S. 016-2024-JUS',
    dicta: 'Abogado',
    modalidad: 'Virtual en vivo',
    modo: 'Online',
    duracion: '2 horas',
    temario: [
      'Principios y consentimiento',
      'Bancos de datos y su inscripción',
      'Oficial de datos personales: quién debe tenerlo y desde cuándo',
      'Derechos de acceso, rectificación, cancelación y oposición',
      'Medidas de seguridad y datos de trabajadores',
    ],
    precio: 'S/ 600 + IGV in-company',
    precioDesde: 600,
    faqs: [
      {
        pregunta: '¿Mi empresa necesita oficial de datos personales?',
        respuesta:
          'Depende del volumen y del tipo de datos que manejas. Para los obligados, los plazos van por ventas anuales: 30-nov-2026 (1,700 a 2,300 UIT), 30-nov-2027 (150 a 1,700 UIT) y 30-nov-2028 (hasta 150 UIT).',
      },
    ],
  },
  {
    slug: 'procedimiento-disciplinario',
    nombre: 'Procedimiento disciplinario sin contingencias',
    titulo: 'Curso de procedimiento disciplinario laboral para RRHH',
    metaTitulo: 'Curso de procedimiento disciplinario para RRHH',
    metaDescripcion:
      'Aprende a amonestar, suspender y despedir con el procedimiento correcto: razonabilidad, inmediatez, plazo de descargos y cartas. Curso para RRHH y jefaturas.',
    keywords: [
      'curso procedimiento disciplinario laboral',
      'carta de amonestación',
      'carta de preaviso de despido',
      'despido por falta grave',
      'capacitación RRHH',
    ],
    resumen:
      'Amonestar, suspender o despedir sin seguir el procedimiento abre la puerta a una demanda. Este curso le da a RRHH y a las jefaturas el paso a paso y los formatos.',
    obligatoriaPara: 'No es obligatoria; recomendada para RRHH y jefaturas',
    frecuencia: 'A pedido',
    baseLegal: 'D.S. 003-97-TR, arts. 9, 24, 25, 31 y 32',
    dicta: 'Abogado',
    modalidad: 'Presencial o virtual en vivo',
    modo: 'Blended',
    duracion: '3 horas',
    temario: [
      'El poder sancionador del empleador y sus límites',
      'Faltas graves y cómo dejarlas probadas',
      'Memorándum, amonestación y suspensión: cuándo usar cada uno',
      'Carta de preaviso, plazo de descargos e inmediatez',
      'Carta de despido y errores que pueden terminar en reposición o indemnización',
      'Casos prácticos con formatos',
    ],
    precio: 'S/ 149 por persona o S/ 600 + IGV in-company',
    precioDesde: 149,
    faqs: [
      {
        pregunta: '¿Incluye formatos?',
        respuesta: 'Sí: memorándum, amonestación, suspensión, carta de preaviso y carta de despido, adaptables a tu empresa.',
      },
      {
        pregunta: '¿Cuántos días hay que dar para los descargos?',
        respuesta:
          'Al menos 6 días naturales, por escrito, antes de despedir por una falta de conducta, salvo falta grave flagrante (D.S. 003-97-TR, art. 31).',
      },
    ],
  },
  {
    slug: 'gestion-laboral-supervisores',
    nombre: 'Gestión laboral para supervisores',
    titulo: 'Capacitación en gestión laboral para supervisores y jefaturas',
    metaTitulo: 'Gestión laboral para supervisores y jefaturas',
    metaDescripcion:
      'Lo que todo supervisor debe saber para no generar contingencias: jornada y horas extras, vacaciones, trato al personal, hostigamiento sexual y cómo documentar.',
    keywords: ['capacitación supervisores', 'gestión laboral jefaturas', 'horas extras supervisores', 'capacitación jefes de área Perú'],
    resumen:
      'Muchas contingencias laborales empiezan en la línea de supervisión: una hora extra no registrada, una llamada de atención mal hecha, una queja que no se atendió. Preparamos a tus jefaturas.',
    obligatoriaPara: 'No es obligatoria; recomendada para supervisores y jefaturas',
    frecuencia: 'Anual (recomendable)',
    baseLegal: 'D.S. 007-2002-TR; D. Leg. 713; Ley 27942',
    dicta: 'Abogado',
    modalidad: 'Presencial o virtual en vivo',
    modo: 'Blended',
    duracion: '2 a 3 horas',
    temario: [
      'Jornada, horas extras y descansos',
      'Vacaciones y permisos',
      'Cómo dar instrucciones y llamar la atención sin vulnerar derechos',
      'Qué hacer si recibes una queja de hostigamiento sexual',
      'Qué documentar y cómo hacerlo',
      'Qué hacer si llega un inspector',
    ],
    precio: 'S/ 600 + IGV in-company',
    precioDesde: 600,
    faqs: [
      {
        pregunta: '¿Para quién es?',
        respuesta: 'Para supervisores, jefes de área y encargados de turno: quienes dirigen personal todos los días.',
      },
    ],
  },
]

/** Catálogo completo, incluidas las que todavía no tienen página propia. */
export const CATALOGO_RESUMEN: Array<{
  nombre: string
  para: string
  frecuencia: string
  dicta: string
  modalidad: string
  slug?: string
  disponibilidad: 'Disponible' | 'A pedido'
}> = [
  { nombre: 'Inducción de SST', para: 'Todo trabajador nuevo', frecuencia: 'Al ingresar', dicta: 'Ingeniero de seguridad', modalidad: 'Presencial', slug: 'induccion-sst', disponibilidad: 'Disponible' },
  { nombre: '4 capacitaciones anuales de SST', para: 'Toda empresa con trabajadores', frecuencia: '4 al año', dicta: 'Ingeniero de seguridad y abogado', modalidad: 'Presencial o virtual', slug: 'capacitaciones-sst', disponibilidad: 'Disponible' },
  { nombre: 'Comité o supervisor de SST', para: 'Miembros del comité o supervisor', frecuencia: 'Al instalarse y cada año', dicta: 'Ingeniero de seguridad y abogado', modalidad: 'Presencial o virtual', slug: 'comite-sst', disponibilidad: 'Disponible' },
  { nombre: 'Hostigamiento sexual (inicial y especializada)', para: 'Todo el personal; RRHH y comité', frecuencia: 'Al ingresar y anual', dicta: 'Abogado y psicólogo', modalidad: 'Presencial o virtual', slug: 'hostigamiento-sexual', disponibilidad: 'Disponible' },
  { nombre: 'Brigadas de emergencia', para: 'Brigadistas', frecuencia: 'Anual', dicta: 'Instructor certificado', modalidad: 'Presencial', slug: 'brigadas-emergencia', disponibilidad: 'Disponible' },
  { nombre: 'Cómo atender una inspección de SUNAFIL', para: 'Gerencia y RRHH', frecuencia: 'A pedido', dicta: 'Abogado', modalidad: 'Presencial o virtual', slug: 'inspeccion-sunafil', disponibilidad: 'Disponible' },
  { nombre: 'Protección de datos personales', para: 'Personal que maneja datos', frecuencia: 'Anual', dicta: 'Abogado', modalidad: 'Virtual', slug: 'proteccion-datos-personales', disponibilidad: 'Disponible' },
  { nombre: 'Procedimiento disciplinario sin contingencias', para: 'RRHH y jefaturas', frecuencia: 'A pedido', dicta: 'Abogado', modalidad: 'Presencial o virtual', slug: 'procedimiento-disciplinario', disponibilidad: 'Disponible' },
  { nombre: 'Gestión laboral para supervisores', para: 'Supervisores y jefaturas', frecuencia: 'Anual', dicta: 'Abogado', modalidad: 'Presencial o virtual', slug: 'gestion-laboral-supervisores', disponibilidad: 'Disponible' },
  { nombre: 'Ergonomía y pausas activas', para: 'Oficinas y trabajo repetitivo', frecuencia: 'Anual', dicta: 'Ingeniero de seguridad o fisioterapeuta', modalidad: 'Presencial o virtual', disponibilidad: 'A pedido' },
  { nombre: 'Riesgos psicosociales', para: 'Todo el personal', frecuencia: 'Anual', dicta: 'Psicólogo', modalidad: 'Presencial o virtual', disponibilidad: 'A pedido' },
  { nombre: 'Prevención de lavado de activos', para: 'Sujetos obligados ante la UIF', frecuencia: 'Anual', dicta: 'Abogado', modalidad: 'Virtual', disponibilidad: 'A pedido' },
  { nombre: 'Código de conducta y prevención de delitos', para: 'Empresas con modelo de la Ley 30424', frecuencia: 'Anual', dicta: 'Abogado', modalidad: 'Virtual', disponibilidad: 'A pedido' },
  { nombre: 'Manipulación de alimentos', para: 'Restaurantes y empresas de alimentos', frecuencia: 'Según municipio y DIGESA', dicta: 'Nutricionista o ingeniero alimentario', modalidad: 'Presencial', disponibilidad: 'A pedido' },
]

export function capacitacionPorSlug(slug: string): Capacitacion | undefined {
  return CAPACITACIONES.find((c) => c.slug === slug)
}
