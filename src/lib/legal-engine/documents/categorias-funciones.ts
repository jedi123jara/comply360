// =============================================
// CUADRO DE CATEGORÍAS Y FUNCIONES (CCF)
// + POLÍTICA SALARIAL
//
// Base legal:
//   Ley N° 30709 — Ley que prohíbe la discriminación
//     remunerativa entre varones y mujeres (27.12.2017)
//   D.S. N° 002-2018-TR — Reglamento de la Ley N° 30709
//   R.M. N° 243-2018-TR — Directrices referenciales
//     para evaluación de puestos
//   R.M. N° 145-2019-TR — Guía metodológica
//
// Obligatorio: TODO empleador del sector privado (desde
//   el primer trabajador), conforme Art. 4° D.S. 002-2018-TR.
// Sanción SUNAFIL: Grave a Muy Grave (0.5 a 20 UIT)
// UIT 2026 = S/ 5,500
// =============================================

import type { DocumentTemplateDefinition } from './types'

export const CCF_TEMPLATE: DocumentTemplateDefinition = {
  id: 'ccf-ley-30709',
  type: 'CCF',
  name: 'Cuadro de Categorías y Funciones + Política Salarial',
  description:
    'Documento obligatorio para todo empleador privado conforme a la Ley N° 30709 y D.S. N° 002-2018-TR. Establece la estructura de categorías laborales, descripción de puestos y bandas remunerativas para garantizar la equidad salarial entre varones y mujeres.',
  legalBasis: 'Ley N° 30709 | D.S. N° 002-2018-TR | R.M. N° 243-2018-TR | R.M. N° 145-2019-TR',
  mandatoryFrom: 'Vigente desde el primer (1) trabajador en planilla',
  workerThreshold: 1,
  approvalAuthority:
    'Gerencia General — debe comunicarse a cada trabajador al inicio de la relación laboral',
  sections: [
    {
      id: 'empresa',
      title: 'Datos de la Empresa',
      fields: [
        {
          id: 'empresa_razon_social',
          label: 'Razón Social',
          type: 'text',
          required: true,
          placeholder: 'Empresa S.A.C.',
        },
        {
          id: 'empresa_ruc',
          label: 'RUC',
          type: 'text',
          required: true,
          placeholder: '20XXXXXXXXX',
        },
        {
          id: 'empresa_sector',
          label: 'Sector / Actividad económica',
          type: 'text',
          required: true,
          placeholder: 'Servicios de tecnología / Comercio / Manufactura',
        },
        {
          id: 'empresa_num_trabajadores',
          label: 'Número total de trabajadores',
          type: 'number',
          required: true,
        },
        {
          id: 'empresa_gerente',
          label: 'Gerente General o apoderado',
          type: 'text',
          required: true,
        },
        {
          id: 'fecha_aprobacion',
          label: 'Fecha de aprobación del documento',
          type: 'date',
          required: true,
        },
        {
          id: 'version',
          label: 'Versión del documento',
          type: 'text',
          required: true,
          placeholder: '1.0',
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
      id: 'estructura',
      title: 'Estructura Organizacional',
      description:
        'Defina cuántos niveles de categoría tiene su empresa. Se recomienda entre 3 y 6 niveles. A más niveles, mayor precisión en la evaluación de equidad salarial.',
      fields: [
        {
          id: 'num_categorias',
          label: 'Número de categorías (niveles)',
          type: 'select',
          required: true,
          options: [
            { value: '3', label: '3 niveles (empresa pequeña, estructura simple)' },
            { value: '4', label: '4 niveles (empresa mediana, estructura moderada)' },
            { value: '5', label: '5 niveles (recomendado para la mayoría de empresas)' },
            { value: '6', label: '6 niveles (empresa grande o con alta diferenciación)' },
            { value: '7', label: '7+ niveles (corporación o grupo empresarial)' },
          ],
          helpText: 'SUNAFIL valida que los niveles estén justificados por diferencias reales.',
        },
        {
          id: 'metodologia_evaluacion',
          label: 'Metodología de evaluación de puestos',
          type: 'select',
          required: true,
          options: [
            {
              value: 'puntos',
              label: 'Método de puntos por factores (más riguroso, recomendado)',
            },
            { value: 'clasificacion', label: 'Clasificación simple por niveles' },
            { value: 'comparacion_pares', label: 'Comparación de pares' },
            { value: 'ranking', label: 'Ranking simple' },
          ],
          helpText:
            'R.M. N° 243-2018-TR recomienda el método de puntos. Documentar la metodología es clave para SUNAFIL.',
        },
        {
          id: 'criterios_evaluacion',
          label: 'Criterios objetivos de evaluación utilizados',
          type: 'textarea',
          required: true,
          placeholder:
            'Ej: 1. Formación académica requerida (20 puntos)\n2. Experiencia laboral mínima (20 puntos)\n3. Responsabilidad sobre personas (15 puntos)\n4. Responsabilidad sobre presupuesto/recursos (15 puntos)\n5. Complejidad de las decisiones (15 puntos)\n6. Condiciones de trabajo (15 puntos)\nTotal: 100 puntos',
          helpText:
            'Documente los factores y pesos usados. Esto es fundamental para justificar diferencias remunerativas ante SUNAFIL.',
        },
      ],
    },
    {
      id: 'politica_salarial',
      title: 'Política Salarial',
      description:
        'La Política Salarial es obligatoria conforme al Art. 5° del D.S. N° 002-2018-TR.',
      fields: [
        {
          id: 'criterios_remuneracion',
          label: 'Criterios objetivos para fijar remuneraciones',
          type: 'textarea',
          required: true,
          placeholder:
            'Los criterios permitidos por el Art. 3° D.S. 002-2018-TR son:\n- Antigüedad y tiempo de servicios\n- Evaluación de desempeño\n- Negociación individual o colectiva\n- Escasez de oferta en mercado laboral\n- Costo de vida del lugar de trabajo\n- Experiencia laboral previa\n- Perfil académico y formación especializada\n- Lugar geográfico del trabajo',
        },
        {
          id: 'frecuencia_revision',
          label: 'Frecuencia de revisión del CCF y política salarial',
          type: 'select',
          required: true,
          options: [
            { value: 'anual', label: 'Anual (mínimo obligatorio)' },
            { value: 'semestral', label: 'Semestral' },
            { value: 'ante_reestructuracion', label: 'Ante cada reestructuración orgánica' },
          ],
        },
        {
          id: 'responsable_monitoreo',
          label: 'Responsable del monitoreo de equidad salarial',
          type: 'text',
          required: true,
          placeholder: 'Gerencia de Recursos Humanos / Gerencia Administrativa',
        },
      ],
    },
  ],
  blocks: [
    {
      id: 'encabezado',
      blockType: 'header',
      text:
        'CUADRO DE CATEGORÍAS Y FUNCIONES\nPOLÍTICA SALARIAL\n\n' +
        '{{empresa_razon_social}}\n' +
        'RUC: {{empresa_ruc}}\n' +
        'Sector: {{empresa_sector}}\n' +
        'Elaborado conforme a: Ley N° 30709 y D.S. N° 002-2018-TR\n' +
        'Aprobado por: {{empresa_gerente}} — Gerente General\n' +
        'Fecha de aprobación: {{fecha_aprobacion}}\n' +
        'Versión: {{version}}',
    },
    {
      id: 'base_legal',
      blockType: 'clause',
      title: 'BASE LEGAL',
      text:
        'El presente Cuadro de Categorías y Funciones (CCF) y la Política Salarial adjunta son elaborados por {{empresa_razon_social}} en cumplimiento de:\n\n' +
        '• Ley N° 30709 — Ley que prohíbe la discriminación remunerativa entre varones y mujeres (27.12.2017)\n' +
        '• D.S. N° 002-2018-TR — Reglamento de la Ley N° 30709 (08.03.2018): establece la obligación de elaborar el CCF para todos los empleadores del sector privado\n' +
        '• R.M. N° 243-2018-TR — Directrices referenciales para la evaluación de puestos de trabajo\n' +
        '• R.M. N° 145-2019-TR — Guía metodológica para la elaboración del Cuadro de Categorías y Funciones\n\n' +
        'Todo empleador del sector privado, independientemente del número de trabajadores, está obligado a contar con este documento y a comunicarlo a sus trabajadores.',
    },
    {
      id: 'metodologia',
      blockType: 'clause',
      title: 'METODOLOGÍA DE EVALUACIÓN',
      text:
        '{{empresa_razon_social}} ha utilizado la metodología de {{metodologia_evaluacion}} para la evaluación de los puestos de trabajo, considerando los siguientes criterios objetivos:\n\n' +
        '{{criterios_evaluacion}}\n\n' +
        'Esta metodología garantiza que la agrupación de puestos en categorías refleje diferencias reales y objetivas en el valor relativo de cada puesto para la organización, conforme a las directrices de la R.M. N° 243-2018-TR.',
    },
    {
      id: 'categoria_1',
      blockType: 'clause',
      title: 'CATEGORÍA N-1 — DIRECCIÓN Y ALTA GERENCIA',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'DESCRIPCIÓN GENERAL DEL NIVEL:\n' +
        'Puestos de la más alta jerarquía organizacional, responsables de la formulación, implementación y evaluación de la estrategia empresarial. Ejercen autoridad sobre toda la organización o sobre una línea de negocio completa. Toman decisiones de alto impacto y largo plazo con amplia autonomía. Responden ante el Directorio, Junta General de Accionistas o propietarios. Son personal de dirección conforme al artículo 43° del TUO del D.Leg. N° 728.\n\n' +
        'PUESTOS INCLUIDOS EN ESTA CATEGORÍA:\n' +
        '• Gerente General\n' +
        '• Gerente de Área (Finanzas, Comercial, Operaciones, RRHH, etc.)\n' +
        '• Director de División o Línea de Negocio\n' +
        '• Sub-Gerente (cuando ejerce funciones de dirección)\n\n' +
        'REQUISITOS TÍPICOS DEL NIVEL:\n' +
        '- Formación académica: Título profesional universitario con posgrado (MBA, maestría o especialización en área afín); o experiencia comprobada equivalente.\n' +
        '- Experiencia mínima: [N°] años en posiciones de liderazgo ejecutivo o gerencial, de los cuales [N°] con equipos a cargo.\n' +
        '- Competencias clave: Visión estratégica, liderazgo de organizaciones, gestión presupuestal, negociación de alto nivel, toma de decisiones bajo incertidumbre.\n\n' +
        'BANDA REMUNERATIVA N-1:\n' +
        '  Mínimo: S/ ___________\n' +
        '  Punto Medio (referencial): S/ ___________\n' +
        '  Máximo: S/ ___________\n' +
        '  Ancho de banda: ___% sobre el mínimo\n\n' +
        'CRITERIOS DE POSICIONAMIENTO DENTRO DE LA BANDA:\n' +
        '- Antigüedad en el cargo y en la empresa\n' +
        '- Resultados acreditados en evaluación de desempeño\n' +
        '- Nivel de responsabilidad específico del puesto\n' +
        '- Escasez de perfil en el mercado laboral\n' +
        '- Negociación individual documentada',
    },
    {
      id: 'categoria_2',
      blockType: 'clause',
      title: 'CATEGORÍA N-2 — JEFATURA Y MANDO MEDIO SUPERIOR',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'DESCRIPCIÓN GENERAL DEL NIVEL:\n' +
        'Puestos responsables de la gestión de áreas, departamentos o unidades funcionales. Traducen la estrategia definida por la Categoría N-1 en planes operativos, metas e indicadores de gestión. Supervisan equipos de trabajo, administran presupuestos de área y reportan a la Categoría N-1. Tienen autoridad para tomar decisiones tácticas dentro de su ámbito de responsabilidad. Pueden ser personal de confianza conforme al artículo 43° del TUO del D.Leg. N° 728.\n\n' +
        'PUESTOS INCLUIDOS EN ESTA CATEGORÍA:\n' +
        '• Jefe de Área o Departamento\n' +
        '• Supervisor Senior\n' +
        '• Coordinador Senior\n' +
        '• [Otros puestos de jefatura de área]\n\n' +
        'REQUISITOS TÍPICOS DEL NIVEL:\n' +
        '- Formación académica: Título profesional universitario; posgrado o especialización deseable.\n' +
        '- Experiencia mínima: [N°] años en funciones similares, incluyendo [N°] años con personal a cargo.\n' +
        '- Competencias clave: Liderazgo de equipos, planificación operativa, resolución de problemas complejos, gestión de indicadores KPI, comunicación efectiva.\n\n' +
        'BANDA REMUNERATIVA N-2:\n' +
        '  Mínimo: S/ ___________\n' +
        '  Punto Medio (referencial): S/ ___________\n' +
        '  Máximo: S/ ___________\n' +
        '  Ancho de banda: ___% sobre el mínimo\n' +
        '  Solapamiento con N-1: ___% (máximo recomendado)',
    },
    {
      id: 'categoria_3',
      blockType: 'clause',
      title: 'CATEGORÍA N-3 — PROFESIONAL / ESPECIALISTA',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'DESCRIPCIÓN GENERAL DEL NIVEL:\n' +
        'Puestos que requieren conocimiento técnico o profesional especializado para ejecutar funciones de análisis, diseño, implementación, asesoría o gestión de proyectos. Aplican criterio profesional propio con supervisión moderada. Pueden tener personal a cargo en proyectos o coordinaciones específicas. Reportan a Categoría N-2 o directamente a N-1 en estructuras planas.\n\n' +
        'PUESTOS INCLUIDOS EN ESTA CATEGORÍA:\n' +
        '• Analista Senior de [Área]\n' +
        '• Especialista en [Área]\n' +
        '• Coordinador de [Área o Proceso]\n' +
        '• Abogado / Contador / Ingeniero / Psicólogo (nivel senior)\n' +
        '• [Otros puestos profesionales con experiencia]\n\n' +
        'REQUISITOS TÍPICOS DEL NIVEL:\n' +
        '- Formación académica: Título profesional universitario en área afín.\n' +
        '- Experiencia mínima: [N°] años en funciones similares; colegiatura vigente cuando corresponda.\n' +
        '- Competencias clave: Análisis técnico especializado, propuesta de soluciones, gestión de proyectos, capacidad de autogestión.\n\n' +
        'BANDA REMUNERATIVA N-3:\n' +
        '  Mínimo: S/ ___________\n' +
        '  Punto Medio (referencial): S/ ___________\n' +
        '  Máximo: S/ ___________\n' +
        '  Ancho de banda: ___% sobre el mínimo',
    },
    {
      id: 'categoria_4',
      blockType: 'clause',
      title: 'CATEGORÍA N-4 — TÉCNICO / ASISTENTE PROFESIONAL',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'DESCRIPCIÓN GENERAL DEL NIVEL:\n' +
        'Puestos que ejecutan funciones técnicas o de soporte profesional con autonomía moderada, dentro de procedimientos y metodologías establecidas. Aplican conocimientos técnicos específicos aprendidos por formación o experiencia. Pueden supervisar personal operativo ocasionalmente. Reportan a Categorías N-2 o N-3.\n\n' +
        'PUESTOS INCLUIDOS EN ESTA CATEGORÍA:\n' +
        '• Técnico de [Área o Especialidad]\n' +
        '• Asistente de [Área]\n' +
        '• Analista Junior de [Área]\n' +
        '• Bachiller en práctica profesional\n' +
        '• [Otros puestos técnicos]\n\n' +
        'REQUISITOS TÍPICOS DEL NIVEL:\n' +
        '- Formación académica: Título técnico o bachiller universitario en área afín; o estudios universitarios en último año.\n' +
        '- Experiencia mínima: De [N°] meses a [N°] años en funciones similares.\n' +
        '- Competencias clave: Ejecución de procesos, manejo de herramientas tecnológicas específicas, trabajo en equipo, orientación al detalle y la calidad.\n\n' +
        'BANDA REMUNERATIVA N-4:\n' +
        '  Mínimo: S/ ___________\n' +
        '  Punto Medio (referencial): S/ ___________\n' +
        '  Máximo: S/ ___________\n' +
        '  Ancho de banda: ___% sobre el mínimo',
    },
    {
      id: 'categoria_5',
      blockType: 'clause',
      title: 'CATEGORÍA N-5 — OPERATIVO / AUXILIAR',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'DESCRIPCIÓN GENERAL DEL NIVEL:\n' +
        'Puestos de ejecución operativa con instrucciones específicas y supervisión directa y continua. Realizan tareas rutinarias y definidas que no requieren formación universitaria. Constituyen la base operativa de la organización. Reportan directamente a Categorías N-3 o N-4.\n\n' +
        'PUESTOS INCLUIDOS EN ESTA CATEGORÍA:\n' +
        '• Operario de Producción / Almacén\n' +
        '• Auxiliar de Oficina / Limpieza / Logística\n' +
        '• Recepcionista / Asistente Administrativo\n' +
        '• Chofer / Mensajero / Repartidor\n' +
        '• [Otros puestos operativos]\n\n' +
        'REQUISITOS TÍPICOS DEL NIVEL:\n' +
        '- Formación académica: Secundaria completa; certificación técnica deseable según el puesto.\n' +
        '- Experiencia mínima: De [N°] meses a [N°] años en funciones similares.\n' +
        '- Competencias clave: Ejecución de instrucciones, responsabilidad, puntualidad, trabajo en equipo, actitud de servicio.\n\n' +
        'BANDA REMUNERATIVA N-5:\n' +
        '  Mínimo: S/ 1,130 (RMV vigente 2026)\n' +
        '  Punto Medio (referencial): S/ ___________\n' +
        '  Máximo: S/ ___________\n' +
        '  Ancho de banda: ___% sobre el mínimo',
    },
    {
      id: 'tabla_resumen',
      blockType: 'table',
      title: 'TABLA RESUMEN DE CATEGORÍAS Y BANDAS REMUNERATIVAS',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '┌──────────┬──────────────────────┬────────────────────────────────┬────────┬──────────────┬────────┬────────┐\n' +
        '│ Categoría│ Denominación         │ Puestos representativos        │ Mín S/ │ Punto Med S/ │ Máx S/ │ Banda  │\n' +
        '├──────────┼──────────────────────┼────────────────────────────────┼────────┼──────────────┼────────┼────────┤\n' +
        '│ N-1      │ Dirección            │ Gerente General, Gerentes      │ ______ │ ___________  │ ______ │  ___%  │\n' +
        '│ N-2      │ Jefatura             │ Jefes de Área, Supervisores    │ ______ │ ___________  │ ______ │  ___%  │\n' +
        '│ N-3      │ Profesional          │ Especialistas, Analistas Sr.   │ ______ │ ___________  │ ______ │  ___%  │\n' +
        '│ N-4      │ Técnico              │ Técnicos, Asistentes, Analistas│ ______ │ ___________  │ ______ │  ___%  │\n' +
        '│ N-5      │ Operativo            │ Operarios, Auxiliares          │ 1,130  │ ___________  │ ______ │  ___%  │\n' +
        '└──────────┴──────────────────────┴────────────────────────────────┴────────┴──────────────┴────────┴────────┘\n\n' +
        'NOTAS TÉCNICAS:\n' +
        '• Ancho de banda recomendado: 40-60% para operativo/técnico; 60-100% para dirección.\n' +
        '• Solapamiento entre bandas contiguas: 15-25% (permite movilidad sin cambio de categoría).\n' +
        '• El mínimo de ninguna categoría puede ser inferior a la RMV vigente (S/ 1,130 en 2026).',
    },
    {
      id: 'politica_salarial_texto',
      blockType: 'clause',
      title: 'POLÍTICA SALARIAL — {{empresa_razon_social}}',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '1. OBJETO\n\n' +
        'La presente Política Salarial tiene por objeto establecer los criterios y directrices para la gestión, fijación y ajuste de las remuneraciones de los trabajadores de {{empresa_razon_social}}, garantizando la equidad interna y la competitividad externa, sin discriminación remunerativa por razón de sexo, conforme a la Ley N° 30709 y el D.S. N° 002-2018-TR.\n\n' +
        '2. CRITERIOS OBJETIVOS PARA LA FIJACIÓN DE REMUNERACIONES\n\n' +
        'La remuneración de cada trabajador se determina considerando:\n\n' +
        'a) La categoría asignada conforme al presente Cuadro de Categorías y Funciones;\n' +
        'b) La banda remunerativa correspondiente a la categoría; y\n' +
        'c) El posicionamiento dentro de la banda, basado en los criterios objetivos siguientes (Art. 3° D.S. N° 002-2018-TR):\n\n' +
        '{{criterios_remuneracion}}\n\n' +
        'IMPORTANTE: {{empresa_razon_social}} prohíbe expresamente toda diferencia remunerativa entre trabajadores del mismo cargo o categoría que esté basada en el sexo, estado civil, maternidad/paternidad, embarazo o cualquier otra condición discriminatoria.\n\n' +
        '3. AJUSTES REMUNERATIVOS\n\n' +
        'Los ajustes de remuneración proceden por:\n\n' +
        'a) Incremento general: Ajuste aplicable a categorías o a toda la planilla, por decisión de la empresa o acuerdo colectivo;\n' +
        'b) Incremento por mérito: Ajuste individual basado en evaluación de desempeño documentada y objetiva, dentro de la banda correspondiente;\n' +
        'c) Incremento por promoción: Ajuste al pasar a una categoría superior;\n' +
        'd) Ajuste de equidad: Corrección de brechas remunerativas injustificadas detectadas en el monitoreo anual de equidad salarial;\n' +
        'e) Ajuste por RMV: Incremento obligatorio cuando la RMV supere el mínimo de la banda correspondiente.\n\n' +
        '4. MONITOREO DE EQUIDAD REMUNERATIVA\n\n' +
        '{{empresa_razon_social}} realizará, al menos {{frecuencia_revision}}, un análisis de equidad remunerativa desagregado por sexo dentro de cada categoría. El análisis será realizado por {{responsable_monitoreo}} y sus resultados serán documentados para respaldo ante posibles inspecciones SUNAFIL.\n\n' +
        'Si el análisis revela brechas injustificadas, la empresa implementará un plan de ajuste con cronograma definido.\n\n' +
        '5. COMUNICACIÓN A TRABAJADORES\n\n' +
        'Conforme al artículo 6° del D.S. N° 002-2018-TR, {{empresa_razon_social}} comunicará a cada trabajador:\n\n' +
        'a) Al momento del ingreso: su categoría, la banda remunerativa correspondiente y los criterios objetivos que determinan su posicionamiento;\n' +
        'b) Ante cualquier cambio de categoría o remuneración: los fundamentos objetivos del ajuste;\n' +
        'c) La presente Política Salarial, disponible en formato físico y/o digital para todos los trabajadores.\n\n' +
        'NOTA LEGAL: No es obligatorio comunicar los montos de remuneración de otros trabajadores. La obligación es comunicar la categoría y los criterios objetivos de determinación de la remuneración propia.\n\n' +
        '6. OBLIGACIONES DEL ÁREA DE RECURSOS HUMANOS\n\n' +
        '• Mantener actualizado el CCF ante creación de nuevos puestos o reestructuraciones;\n' +
        '• Conservar la documentación que sustente los criterios aplicados a cada trabajador;\n' +
        '• Informar a {{responsable_monitoreo}} sobre cualquier observación en materia de equidad salarial;\n' +
        '• Reportar al MTPE en los casos que la normativa lo exija;\n' +
        '• Actualizar el CCF y la Política Salarial al menos {{frecuencia_revision}}.',
    },
    {
      id: 'sanciones',
      blockType: 'clause',
      title: 'REFERENCIA: SANCIONES SUNAFIL POR INCUMPLIMIENTO (UIT 2026 = S/ 5,500)',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '┌──────────────────────────────────────────────────┬──────────────┬──────────────────────┐\n' +
        '│ Infracción                                       │ Tipo         │ Multa (UIT 2026)     │\n' +
        '├──────────────────────────────────────────────────┼──────────────┼──────────────────────┤\n' +
        '│ No contar con CCF por escrito                    │ Grave        │ 0.5 a 10 UIT         │\n' +
        '│ CCF sin los 3 elementos mínimos obligatorios     │ Grave        │ 0.5 a 10 UIT         │\n' +
        '│ No contar con Política Salarial escrita          │ Grave        │ 0.5 a 10 UIT         │\n' +
        '│ No comunicar categoría y criterios al trabajador │ Grave        │ 0.5 a 10 UIT         │\n' +
        '│ Diferencias salariales sin criterio objetivo     │ Muy Grave    │ 3 a 20 UIT           │\n' +
        '│ Brecha salarial injustificada por sexo           │ Muy Grave    │ 3 a 20 UIT           │\n' +
        '│ CCF no actualizado ante reestructuraciones       │ Grave        │ 0.5 a 10 UIT         │\n' +
        '└──────────────────────────────────────────────────┴──────────────┴──────────────────────┘\n\n' +
        'Fuente: D.S. N° 019-2006-TR (Reglamento de Infracciones), Ley N° 30709, D.S. N° 002-2018-TR.',
    },
    {
      id: 'firma',
      blockType: 'signature',
      title: 'APROBACIÓN Y VIGENCIA',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'El presente Cuadro de Categorías y Funciones y la Política Salarial adjunta entran en vigencia a partir del {{fecha_aprobacion}} y serán revisados {{frecuencia_revision}} o ante cualquier reestructuración organizacional significativa.\n\n' +
        'Aprobado en {{ciudad}}, el {{fecha_aprobacion}}.\n\n\n' +
        '────────────────────────────────────\n' +
        '    {{empresa_gerente}}\n' +
        '    Gerente General\n' +
        '    {{empresa_razon_social}}\n' +
        '    RUC N° {{empresa_ruc}}\n\n\n' +
        '────────────────────────────────────\n' +
        '    Gerente / Jefe de Recursos Humanos\n' +
        '    {{empresa_razon_social}}\n\n\n' +
        '────────────────────────────────────\n' +
        '    Representante de los Trabajadores\n' +
        '    (cuando exista Sindicato o Comité)',
    },
  ],
}
