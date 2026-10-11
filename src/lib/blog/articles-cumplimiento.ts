/**
 * Artículos del blog /recursos orientados a los servicios del estudio de
 * cumplimiento: capacitaciones obligatorias, comité de SST, hostigamiento
 * sexual e igualdad salarial (Ley 30709).
 *
 * Reglas de contenido:
 *   - Solo afirmaciones legales verificadas (norma + artículo o numeral).
 *   - Sin estadísticas inventadas, sin testimonios, sin promesas de "cero multas".
 *   - Tuteo peruano, frases cortas, párrafos de máximo 3 frases.
 */
import type { BlogArticle } from './articles'

export const ARTICLES_CUMPLIMIENTO: BlogArticle[] = [
  {
    slug: 'capacitaciones-obligatorias-sst-2026',
    keyword: 'capacitaciones obligatorias SST',
    title: 'Capacitaciones obligatorias SST 2026: cuántas y cómo probarlas',
    metaDescription:
      'Capacitaciones obligatorias SST: la Ley 29783 exige al menos 4 al año, dentro de la jornada. Quién puede dictarlas, modalidad y cómo probarlas ante SUNAFIL.',
    category: 'Capacitaciones',
    readMinutes: 6,
    publishedAt: '2026-10-10',
    updatedAt: '2026-10-10',
    author: 'Equipo Comply360',
    content: [
      {
        type: 'p',
        text: 'Toda empresa con trabajadores debe dar al menos 4 capacitaciones de seguridad y salud en el trabajo (SST) al año. Así lo exige la Ley 29783 en su art. 35 b. Deben darse dentro de la jornada laboral y su costo nunca lo asume el trabajador.',
      },
      {
        type: 'p',
        text: 'En esta guía te explicamos para quién son, quién puede dictarlas, cuándo deben ser presenciales y cómo probarlas si llega un inspector de SUNAFIL.',
      },
      { type: 'h2', text: 'Cuántas capacitaciones de SST son obligatorias' },
      {
        type: 'p',
        text: 'El mínimo legal es de 4 capacitaciones de SST al año. Es un piso, no un techo. Si tu actividad tiene riesgos altos, lo prudente es planificar más.',
      },
      {
        type: 'p',
        text: 'La obligación no depende del tamaño de la empresa. Aplica desde el primer trabajador, porque toda empresa con trabajadores debe tener un sistema de gestión de SST.',
      },
      {
        type: 'p',
        text: 'Las capacitaciones se dan como parte de la jornada laboral. Si las programas fuera del horario, no cumples la forma que pide la ley. Y el costo siempre corre por cuenta de la empresa.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Base legal',
        text: 'Ley 29783, art. 35 b: no menos de 4 capacitaciones de SST al año, como parte de la jornada laboral. Reglamento de SST (D.S. 005-2012-TR), arts. 27-A, 28 y 29. No cumplir es falta grave (RLGIT, numeral 27.8).',
      },
      { type: 'h2', text: 'Para quién son las capacitaciones' },
      {
        type: 'p',
        text: 'Están dirigidas a todos tus trabajadores, no solo al personal de planta u operaciones. Quien trabaja en oficina también enfrenta riesgos y debe conocerlos.',
      },
      {
        type: 'p',
        text: 'El contenido sí debe ajustarse a cada puesto. Una persona de oficina y un operario de almacén no enfrentan los mismos peligros. Tu IPERC por puesto es la mejor guía para elegir los temas.',
      },
      {
        type: 'p',
        text: 'Además de las 4 anuales, hay dos momentos clave: cuando contratas a alguien y cuando cambia de puesto o de tecnología. En esos casos la capacitación debe ser presencial, como verás más abajo.',
      },
      { type: 'h2', text: 'Quién puede dictar las capacitaciones' },
      {
        type: 'p',
        text: 'El art. 28 del reglamento de SST, modificado por el D.S. 006-2014-TR, permite tres caminos. La capacitación la puede dar el propio empleador, un tercero o la Autoridad Administrativa de Trabajo. En todos los casos, dentro de la jornada de trabajo.',
      },
      {
        type: 'p',
        text: 'Lo que no se negocia es la calidad. El art. 29 b del reglamento pide "profesionales competentes y con experiencia en la materia".',
      },
      {
        type: 'p',
        text: 'En la práctica, conviene que cada tema lo vea un especialista. Un ingeniero de seguridad para los riesgos técnicos y un instructor para emergencias y primeros auxilios. Guarda el perfil de quien dictó cada sesión.',
      },
      { type: 'h2', text: '¿Presencial o virtual?' },
      {
        type: 'p',
        text: 'El D.S. 001-2021-TR agregó al reglamento el art. 27-A, que ordena la modalidad. Dos casos deben ser presenciales: la capacitación al contratar y la que se da por cambio de puesto o de tecnología.',
      },
      {
        type: 'p',
        text: 'Las demás capacitaciones pueden darse por otros medios, como la modalidad virtual. Esto facilita la vida a empresas con varias sedes o con turnos rotativos.',
      },
      {
        type: 'p',
        text: 'Virtual no significa sin control. Si dictas una sesión en línea, igual necesitas probar quién asistió, cuánto duró y qué aprendió cada persona.',
      },
      { type: 'h2', text: 'Cómo probar las capacitaciones ante SUNAFIL' },
      {
        type: 'p',
        text: 'Para el inspector, lo que no está documentado no existe. Cada capacitación debe quedar en el registro de inducción, capacitación, entrenamiento y simulacros de emergencia. Es uno de los 8 registros obligatorios del art. 33 del reglamento.',
      },
      {
        type: 'p',
        text: 'Las micro y pequeñas empresas pueden usar registros simplificados (R.M. 085-2013-TR). Simplificado no quiere decir opcional: el registro igual debe existir y estar al día.',
      },
      {
        type: 'p',
        text: 'Además del registro, te recomendamos armar un archivo por cada sesión con estas piezas:',
      },
      {
        type: 'ul',
        items: [
          'Temario con objetivos, contenidos y duración.',
          'Lista de asistencia con nombre, DNI y firma de cada participante.',
          'Evaluación de salida, con sus resultados.',
          'Constancia o certificado para cada trabajador.',
          'Datos del expositor y sustento de su experiencia.',
          'Materiales usados: presentación, videos o casos prácticos.',
        ],
      },
      {
        type: 'p',
        text: 'Si la sesión fue virtual, suma el reporte de conexión de la herramienta de videollamada. Así acreditas la asistencia y la duración.',
      },
      { type: 'h2', text: 'Qué pasa si no capacitas' },
      {
        type: 'p',
        text: 'No dar las capacitaciones de SST es falta grave según el RLGIT, numeral 27.8. No llevar los registros obligatorios también es falta grave (numeral 27.6).',
      },
      {
        type: 'p',
        text: 'Si el inspector te ordena corregirlo y no cumples su requerimiento, cometes otra falta, esta vez muy grave. Por eso conviene tener todo listo antes de cualquier visita.',
      },
      {
        type: 'p',
        text: 'Recuerda que el 74% de las inspecciones de SUNAFIL nace de una denuncia. Basta un trabajador que nunca recibió una capacitación para que llegue el inspector.',
      },
      {
        type: 'callout',
        variant: 'warning',
        title: 'Si tu empresa es MYPE',
        text: 'Si estás inscrito en el REMYPE, tus multas bajan 50%. Además, tienen un tope del 1% de tus ingresos netos (RLGIT, art. 48.1-A). La obligación de capacitar se mantiene igual.',
      },
      { type: 'h2', text: 'Pasos para cumplir este año' },
      {
        type: 'ol',
        items: [
          'Revisa tu IPERC por puesto y elige los temas según los riesgos reales.',
          'Arma un cronograma anual con al menos 4 capacitaciones, dentro de la jornada.',
          'Define qué sesiones serán presenciales: al contratar y por cambio de puesto o de tecnología.',
          'Elige expositores competentes y con experiencia en cada tema.',
          'Prepara el temario, la lista de asistencia y la evaluación antes de cada sesión.',
          'Anota cada capacitación en el registro obligatorio y entrega las constancias.',
          'Guarda todo en un archivo ordenado por fecha, listo para el inspector.',
        ],
      },
      { type: 'h2', text: 'Cómo te ayudamos' },
      {
        type: 'p',
        text: 'En Comply360 dictamos las capacitaciones obligatorias de SST con especialistas competentes, dentro de tu jornada. Las hacemos presenciales o virtuales, según lo que corresponda a cada caso. Te entregamos el registro, la asistencia firmada, la evaluación y las constancias de cada sesión.',
      },
      {
        type: 'p',
        text: 'Si no sabes por dónde empezar, armamos contigo el cronograma anual según los riesgos de tu empresa.',
      },
    ],
    cta: { label: 'Ver capacitaciones de SST', href: '/capacitaciones/capacitaciones-sst' },
  },

  {
    slug: 'comite-sst-cuando-es-obligatorio',
    keyword: 'comité de SST',
    title: 'Comité de SST: cuándo es obligatorio y cómo se conforma',
    metaDescription:
      'Comité de SST: es obligatorio desde 20 trabajadores, con 4 a 12 miembros paritarios. Con menos, basta un supervisor. Elección, reuniones, reglamento y faltas.',
    category: 'SST',
    readMinutes: 6,
    publishedAt: '2026-10-10',
    updatedAt: '2026-10-10',
    author: 'Equipo Comply360',
    content: [
      {
        type: 'p',
        text: 'El comité de SST es obligatorio cuando tu empresa tiene 20 o más trabajadores. Es paritario y tiene de 4 a 12 miembros (Ley 29783, art. 29). Si tienes menos de 20, basta con un supervisor de SST elegido por los trabajadores (art. 30).',
      },
      {
        type: 'p',
        text: 'Aquí te explicamos cómo se conforma y quién elige a sus miembros. También qué otras obligaciones aparecen desde los 20 trabajadores y qué pasa si no cumples.',
      },
      { type: 'h2', text: 'Comité o supervisor: el umbral de 20 trabajadores' },
      {
        type: 'p',
        text: 'La regla es simple. Con 20 o más trabajadores necesitas un comité de SST. Con menos de 20, un supervisor de SST.',
      },
      {
        type: 'p',
        text: 'El supervisor no lo escoge la gerencia. Lo eligen los trabajadores, igual que a sus representantes en el comité.',
      },
      {
        type: 'p',
        text: 'Ninguna empresa queda fuera. Toda empresa con trabajadores debe tener un sistema de gestión de SST. El comité o el supervisor es una pieza central de ese sistema.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Base legal',
        text: 'Ley 29783, art. 29: comité paritario de 4 a 12 miembros desde 20 trabajadores. Art. 30: supervisor de SST con menos de 20. Art. 34: reglamento interno de SST desde 20. No tener comité o supervisor es falta grave (RLGIT, numeral 27.12).',
      },
      { type: 'h2', text: 'Cómo se compone el comité' },
      {
        type: 'p',
        text: 'El comité es paritario. Eso significa que tiene el mismo número de representantes de la empresa y de los trabajadores.',
      },
      {
        type: 'p',
        text: 'Su tamaño va de 4 a 12 miembros. Por ejemplo, un comité de 4 tiene 2 representantes de cada parte, y uno de 6 tiene 3 y 3.',
      },
      {
        type: 'p',
        text: 'Elige un tamaño que puedas sostener. Un comité grande que no se reúne vale menos que uno pequeño que funciona. Piensa en tus sedes, tus turnos y tus áreas de mayor riesgo.',
      },
      { type: 'h2', text: 'Cómo se elige a sus miembros' },
      {
        type: 'p',
        text: 'La empresa designa a sus representantes. Los representantes de los trabajadores, en cambio, los eligen los propios trabajadores.',
      },
      {
        type: 'p',
        text: 'Una buena elección deja huella escrita. Te recomendamos que el proceso tenga estas piezas:',
      },
      {
        type: 'ul',
        items: [
          'Convocatoria pública con fechas, requisitos y forma de votación.',
          'Padrón de los trabajadores que pueden votar.',
          'Inscripción de candidatos en un plazo claro.',
          'Votación con garantías y conteo transparente.',
          'Acta de resultados firmada.',
          'Acta de instalación del comité.',
        ],
      },
      {
        type: 'p',
        text: 'Si el proceso tiene vacíos, cualquier trabajador puede cuestionarlo. Un expediente completo te protege a ti y protege la legitimidad del comité.',
      },
      { type: 'h2', text: 'Reuniones y funcionamiento' },
      {
        type: 'p',
        text: 'Instalar el comité es el inicio, no el final. El comité tiene que trabajar: revisar riesgos, seguir los accidentes y proponer mejoras.',
      },
      {
        type: 'p',
        text: 'Fija un calendario de reuniones, por ejemplo mensual, y respétalo. Registra cada sesión en un acta con asistentes, temas y acuerdos.',
      },
      {
        type: 'p',
        text: 'El comité también debe conocer los documentos clave de SST. Entre ellos está el IPERC por puesto, que se actualiza al menos una vez al año. También el mapa de riesgos, que debe estar exhibido.',
      },
      {
        type: 'p',
        text: 'Otro tema para su agenda son los exámenes médicos ocupacionales, que se hacen cada 2 años. No hacerlos es falta muy grave (RLGIT, numeral 28.13).',
      },
      { type: 'h2', text: 'Reglamento interno de SST desde 20 trabajadores' },
      {
        type: 'p',
        text: 'El mismo umbral de 20 trabajadores activa otra obligación: el reglamento interno de SST (Ley 29783, art. 34). Es un documento distinto del reglamento interno de trabajo.',
      },
      {
        type: 'p',
        text: 'No tenerlo es falta muy grave (RLGIT, numeral 28.9). Como referencia, en una empresa no MYPE, una falta muy grave que afecta a un solo trabajador cuesta S/ 14,465. Son 2.63 UIT, con la UIT 2026 de S/ 5,500.',
      },
      {
        type: 'p',
        text: 'Por eso conviene preparar el reglamento junto con la conformación del comité. Así ambos quedan alineados desde el inicio.',
      },
      { type: 'h2', text: 'Formación de los miembros del comité' },
      {
        type: 'p',
        text: 'Un comité sin formación no sabe qué revisar. Sus miembros necesitan entender su rol y las herramientas del sistema de gestión de SST.',
      },
      {
        type: 'p',
        text: 'Te recomendamos capacitarlos al inicio de su mandato. Los temas base son las funciones del comité, el IPERC, la investigación de accidentes y las inspecciones internas.',
      },
      {
        type: 'p',
        text: 'Esa formación debe darla un profesional competente y con experiencia en la materia. Es lo que pide el art. 29 b del reglamento de SST para las capacitaciones.',
      },
      { type: 'h2', text: 'Qué pasa si no cumples' },
      {
        type: 'ul',
        items: [
          'No tener comité o supervisor de SST: falta grave (RLGIT, numeral 27.12).',
          'No tener reglamento interno de SST desde 20 trabajadores: falta muy grave (numeral 28.9).',
          'No hacer los exámenes médicos ocupacionales: falta muy grave (numeral 28.13).',
          'No cumplir un requerimiento del inspector de SUNAFIL: falta muy grave.',
        ],
      },
      {
        type: 'p',
        text: 'Si tu empresa es MYPE inscrita en el REMYPE, las multas bajan 50%. Además, tienen un tope del 1% de tus ingresos netos (RLGIT, art. 48.1-A). La obligación, sin embargo, es la misma.',
      },
      {
        type: 'p',
        text: 'Ten en cuenta que el 74% de las inspecciones de SUNAFIL nace de una denuncia. Un trabajador que nunca votó por un comité puede ser el inicio de una visita.',
      },
      { type: 'h2', text: 'Pasos para conformar tu comité' },
      {
        type: 'ol',
        items: [
          'Cuenta a tus trabajadores y define si te toca comité o supervisor.',
          'Decide el tamaño del comité, entre 4 y 12 miembros.',
          'Designa a los representantes de la empresa.',
          'Convoca la elección de los representantes de los trabajadores.',
          'Levanta las actas de elección y de instalación.',
          'Aprueba un calendario de reuniones y capacita a los miembros.',
          'Si tienes 20 o más trabajadores, prepara también el reglamento interno de SST.',
        ],
      },
      {
        type: 'p',
        text: 'En Comply360 organizamos la elección del comité o del supervisor de SST: convocatoria, padrón, votación, actas e instalación. También capacitamos a sus miembros para que el comité funcione de verdad y no solo en el papel.',
      },
    ],
    cta: { label: 'Ver capacitación para el comité de SST', href: '/capacitaciones/comite-sst' },
  },

  {
    slug: 'hostigamiento-sexual-obligaciones-empleador-2026',
    keyword: 'hostigamiento sexual obligaciones del empleador',
    title: 'Hostigamiento sexual: obligaciones del empleador en 2026',
    metaDescription:
      'Hostigamiento sexual: obligaciones del empleador según la Ley 27942. Política, comité o delegado, evaluación anual, capacitaciones, canal de denuncias y faltas.',
    category: 'Hostigamiento',
    readMinutes: 6,
    publishedAt: '2026-10-10',
    updatedAt: '2026-10-10',
    author: 'Equipo Comply360',
    content: [
      {
        type: 'p',
        text: 'Todo empleador debe prevenir el hostigamiento sexual y estar listo para atender una denuncia. Las obligaciones están en la Ley 27942 y en su reglamento, el D.S. 014-2019-MIMP. Algunas aplican a todas las empresas y otras dependen de si tienes 20 o más trabajadores.',
      },
      {
        type: 'p',
        text: 'Te las resumimos para que sepas qué te toca y cómo probar que cumples.',
      },
      { type: 'h2', text: 'Las obligaciones según el tamaño de tu empresa' },
      {
        type: 'ul',
        items: [
          'Todas las empresas: evaluación anual de riesgos de hostigamiento (art. 10) y capacitación al inicio de la relación laboral (art. 11).',
          'Con 20 o más trabajadores: política interna (art. 24) y comité de intervención (art. 27).',
          'Con menos de 20 trabajadores: un delegado o delegada en lugar del comité (art. 27).',
          'Capacitación anual especializada para RRHH, el comité y quienes investigan (art. 11). No es exigible a las MYPE inscritas en el REMYPE.',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Base legal',
        text: 'Ley 27942, Ley de Prevención y Sanción del Hostigamiento Sexual, y su reglamento, el D.S. 014-2019-MIMP (arts. 10, 11, 24 y 27). No capacitar es falta grave (RLGIT, numeral 24.22).',
      },
      { type: 'h2', text: 'Política interna de prevención' },
      {
        type: 'p',
        text: 'Si tienes 20 o más trabajadores, necesitas una política interna de prevención del hostigamiento sexual (art. 24 del reglamento). Es el documento que fija las reglas de juego para todos.',
      },
      {
        type: 'p',
        text: 'Una buena política explica qué conductas no se toleran, cómo denunciar y quién investiga. También aclara cómo se protege a quien denuncia y a los testigos.',
      },
      {
        type: 'p',
        text: 'Escribirla no basta. Difúndela, guarda constancia de que cada trabajador la recibió y revísala cuando cambie tu organización.',
      },
      { type: 'h2', text: 'Comité de intervención o delegado' },
      {
        type: 'p',
        text: 'Con 20 o más trabajadores, debes conformar un comité de intervención frente al hostigamiento sexual. Tiene cuatro miembros: dos de la empresa y dos de los trabajadores, con paridad de género (art. 27).',
      },
      {
        type: 'p',
        text: 'Con menos de 20 trabajadores, en lugar del comité se designa un delegado o delegada (art. 27). Elige a alguien con criterio, discreción y tiempo para la tarea.',
      },
      {
        type: 'p',
        text: 'Deja todo por escrito: el acta de conformación del comité o el documento de designación del delegado. Y capacita a quienes asuman el rol antes de que llegue la primera denuncia.',
      },
      { type: 'h2', text: 'Evaluación anual de riesgos' },
      {
        type: 'p',
        text: 'Todas las empresas, sin importar su tamaño, deben evaluar cada año los riesgos de hostigamiento sexual (art. 10). La idea es detectar dónde podría ocurrir antes de que ocurra.',
      },
      {
        type: 'p',
        text: 'En la práctica, la evaluación combina encuestas anónimas, revisión de denuncias previas y análisis de espacios y horarios de riesgo. Lo útil es que el resultado se traduzca en medidas concretas.',
      },
      {
        type: 'p',
        text: 'Guarda el informe con su fecha y las medidas que aprobaste. Es la prueba de que la evaluación se hizo.',
      },
      { type: 'h2', text: 'Capacitaciones obligatorias' },
      {
        type: 'p',
        text: 'El art. 11 del reglamento pide dos tipos de capacitación. La primera se da al inicio de la relación laboral. Es el momento ideal para presentar la política y el canal de denuncias.',
      },
      {
        type: 'p',
        text: 'La segunda es una capacitación anual especializada para RRHH, el comité de intervención y quienes participan en la investigación. Esta capacitación anual no es exigible a las MYPE inscritas en el REMYPE.',
      },
      {
        type: 'p',
        text: 'El MIMP publicó un temario de referencia para estas capacitaciones. Úsalo como base y adáptalo a la realidad de tu empresa.',
      },
      { type: 'h2', text: 'Canal de denuncias' },
      {
        type: 'p',
        text: 'Un procedimiento solo funciona si la gente sabe cómo usarlo. Por eso el canal de denuncias es la pieza que une la política con la práctica.',
      },
      {
        type: 'p',
        text: 'Te recomendamos un canal simple, confidencial y con más de una vía. Por ejemplo, un correo exclusivo y la opción de acudir en persona al comité o al delegado.',
      },
      {
        type: 'p',
        text: 'Registra cada denuncia desde el momento en que la recibes. Ese registro te permite probar que actuaste a tiempo.',
      },
      {
        type: 'p',
        text: 'Un mal manejo interno puede escalar rápido. El 74% de las inspecciones de SUNAFIL nace de una denuncia, y una persona desatendida tiene motivos para acudir al inspector.',
      },
      { type: 'h2', text: 'Faltas y multas' },
      {
        type: 'p',
        text: 'No capacitar en prevención del hostigamiento sexual es falta grave (RLGIT, numeral 24.22). Si el inspector te ordena corregir algo y no cumples su requerimiento, cometes además una falta muy grave.',
      },
      {
        type: 'p',
        text: 'Para las MYPE inscritas en el REMYPE, las multas bajan 50% y tienen un tope del 1% de sus ingresos netos (RLGIT, art. 48.1-A). Aun así, una denuncia mal atendida también afecta el clima laboral y la reputación de tu empresa.',
      },
      { type: 'h2', text: 'Pasos para ponerte al día' },
      {
        type: 'ol',
        items: [
          'Cuenta a tus trabajadores para saber si te toca comité o delegado.',
          'Si tienes 20 o más, aprueba y difunde la política interna.',
          'Conforma el comité de intervención con paridad o designa al delegado.',
          'Habilita el canal de denuncias y comunícalo a todo el personal.',
          'Haz la evaluación anual de riesgos y guarda el informe.',
          'Capacita a cada nuevo trabajador al inicio de la relación laboral.',
          'Programa la capacitación anual especializada para RRHH y el comité, salvo que seas MYPE con REMYPE.',
        ],
      },
      {
        type: 'p',
        text: 'En Comply360 implementamos la política, el comité o delegado, el canal de denuncias, la evaluación anual y las capacitaciones que exige la norma. Lo dejamos listo y documentado, para que sepas cómo actuar cuando llegue una denuncia.',
      },
    ],
    cta: { label: 'Ver servicio de hostigamiento sexual', href: '/servicios/hostigamiento' },
  },

  {
    slug: 'cuadro-de-categorias-y-funciones-ley-30709',
    keyword: 'cuadro de categorías y funciones',
    title: 'Cuadro de categorías y funciones: guía de la Ley 30709',
    metaDescription:
      'Cuadro de categorías y funciones: obligatorio para todo empleador privado, sin importar su tamaño. Qué debe contener, la política salarial y cómo prepararlo.',
    category: 'Compliance',
    readMinutes: 6,
    publishedAt: '2026-10-10',
    updatedAt: '2026-10-10',
    author: 'Equipo Comply360',
    content: [
      {
        type: 'p',
        text: 'El cuadro de categorías y funciones es obligatorio para todo empleador privado, sin importar cuántos trabajadores tenga. Lo exigen la Ley 30709 y su reglamento, el D.S. 002-2018-TR, junto con una política salarial que debes informar a tus trabajadores. No tenerlos es falta muy grave.',
      },
      {
        type: 'p',
        text: 'En esta guía verás qué es, qué debe contener en términos generales y cómo prepararlo paso a paso.',
      },
      { type: 'h2', text: 'Qué es el cuadro de categorías y funciones' },
      {
        type: 'p',
        text: 'Es un documento que ordena los puestos de tu empresa en categorías, según sus funciones. Sirve de base para decidir cuánto se paga a cada puesto con criterios objetivos.',
      },
      {
        type: 'p',
        text: 'La Ley 30709 prohíbe la discriminación remunerativa entre varones y mujeres. Este cuadro es la herramienta que te permite demostrar que cumples.',
      },
      {
        type: 'p',
        text: 'No es un organigrama. El organigrama muestra quién reporta a quién; el cuadro muestra cuánto vale cada puesto y por qué.',
      },
      { type: 'h2', text: '¿Quién está obligado?' },
      {
        type: 'p',
        text: 'Todo empleador privado, sin umbral de trabajadores. Da igual si tienes 3 o 300 personas en planilla: la obligación es la misma.',
      },
      {
        type: 'p',
        text: 'Muchas empresas pequeñas creen que esto es solo para las grandes. Es un error, y en una inspección puede salir caro.',
      },
      {
        type: 'p',
        text: 'Tampoco te exime ser MYPE: la norma alcanza a todo empleador privado. Si tienes al menos un trabajador en planilla, te toca.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Base legal',
        text: 'Ley 30709, que prohíbe la discriminación remunerativa entre varones y mujeres, y su reglamento, el D.S. 002-2018-TR. Todo empleador privado debe tener cuadro de categorías y funciones y política salarial, e informarla a los trabajadores. Incumplir es falta muy grave (RLGIT, numerales 25.22 y 25.23).',
      },
      { type: 'h2', text: 'La política salarial: la otra mitad' },
      {
        type: 'p',
        text: 'El cuadro no va solo. La norma exige también una política salarial, que explica cómo se fijan y cómo cambian las remuneraciones.',
      },
      {
        type: 'p',
        text: 'La política salarial debe informarse a los trabajadores. Guarda la prueba: un cargo firmado, un correo con confirmación de lectura o una constancia de entrega.',
      },
      {
        type: 'p',
        text: 'Piensa en ambos documentos como un par. El cuadro dice qué categoría tiene cada puesto; la política dice cómo se paga cada categoría.',
      },
      { type: 'h2', text: 'Qué debe contener, en términos generales' },
      {
        type: 'p',
        text: 'La norma no impone un formato único. En términos generales, un buen cuadro y su política incluyen:',
      },
      {
        type: 'ul',
        items: [
          'Las categorías de la empresa, ordenadas de mayor a menor valor.',
          'Los puestos que pertenecen a cada categoría.',
          'Las funciones principales de cada puesto.',
          'Los criterios objetivos que explican la remuneración, como la experiencia, la formación o el desempeño.',
          'Las reglas para ascensos, aumentos y revisiones.',
        ],
      },
      {
        type: 'p',
        text: 'La regla de fondo es clara: no puede haber diferencias de sueldo por el sexo de quien ocupa el puesto. Las diferencias son válidas solo si responden a criterios objetivos.',
      },
      { type: 'h2', text: 'Qué pasa si no lo tienes' },
      {
        type: 'p',
        text: 'No tener el cuadro de categorías y funciones o la política salarial, o no informarla, es falta muy grave (RLGIT, numerales 25.22 y 25.23).',
      },
      {
        type: 'p',
        text: 'Como referencia, en una empresa no MYPE, una falta muy grave que afecta a un solo trabajador cuesta S/ 14,465. Son 2.63 UIT, con la UIT 2026 de S/ 5,500. Si eres MYPE inscrita en el REMYPE, la multa baja 50% y tiene un tope del 1% de tus ingresos netos (RLGIT, art. 48.1-A).',
      },
      {
        type: 'p',
        text: 'Además, si el inspector te ordena elaborarlo y no cumples su requerimiento, cometes otra falta muy grave. Y recuerda que el 74% de las inspecciones de SUNAFIL nace de una denuncia.',
      },
      { type: 'h2', text: 'Cómo prepararlo paso a paso' },
      {
        type: 'ol',
        items: [
          'Haz un inventario de todos los puestos, con sus ocupantes y sueldos actuales.',
          'Describe las funciones reales de cada puesto, no las de un contrato antiguo.',
          'Valora los puestos con criterios objetivos: responsabilidad, complejidad, formación requerida y condiciones de trabajo.',
          'Agrupa los puestos de valor similar en categorías.',
          'Compara sueldos por categoría y revisa si hay brechas entre varones y mujeres sin una razón objetiva.',
          'Redacta la política salarial con las reglas para fijar y ajustar remuneraciones.',
          'Informa la política a tus trabajadores y guarda la constancia.',
          'Revisa ambos documentos cuando crees puestos nuevos o cambies funciones.',
        ],
      },
      { type: 'h2', text: 'Cómo usarlo en el día a día' },
      {
        type: 'p',
        text: 'El cuadro no es un documento para el cajón. Úsalo cada vez que contrates, asciendas a alguien o subas un sueldo.',
      },
      {
        type: 'p',
        text: 'Antes de fijar el sueldo de un nuevo ingreso, revisa en qué categoría está su puesto. Así evitas pagar distinto a dos personas con funciones equivalentes.',
      },
      {
        type: 'p',
        text: 'Cuando alguien pida un aumento, la política salarial te da el marco para responder. Si la regla es clara, la decisión es más fácil de explicar y de sustentar.',
      },
      { type: 'h2', text: 'Errores frecuentes' },
      {
        type: 'ul',
        items: [
          'Copiar un modelo de internet que no refleja los puestos reales.',
          'Confundir el cuadro con el organigrama o con el manual de funciones.',
          'Tener el documento, pero no haber informado la política a los trabajadores.',
          'Dejar brechas de sueldo sin un criterio objetivo que las explique.',
          'No actualizarlo cuando la empresa crece o cambia sus puestos.',
          'Guardar la política sin fecha ni versión, lo que impide probar desde cuándo rige.',
        ],
      },
      {
        type: 'p',
        text: 'En Comply360 elaboramos el cuadro de categorías y funciones y la política salarial a partir de tus puestos reales. También te ayudamos a comunicarlos y a guardar la evidencia que pide el inspector.',
      },
    ],
    cta: { label: 'Ver servicio de cumplimiento laboral', href: '/servicios/laboral' },
  },
]
