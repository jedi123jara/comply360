// =============================================
// POLÍTICA DE PREVENCIÓN Y SANCIÓN DEL
// HOSTIGAMIENTO SEXUAL EN EL TRABAJO
//
// Base legal:
//   Ley N° 27942 — Ley de Prevención y Sanción del
//     Hostigamiento Sexual (27.02.2003)
//   D.S. N° 014-2019-MIMP — Reglamento de la Ley N° 27942
//     (22.07.2019) — Obligatorio para empleadores con
//     20+ trabajadores implementar el Comité de Intervención
//   D.Leg. N° 1410 — Fortalece la prevención y sanción
//     del hostigamiento sexual laboral (12.09.2018)
//   Ley N° 29430 — Modifica Ley 27942
//   D.S. N° 003-97-TR — Art. 25°(k) y 30°(f): hostigamiento
//     como falta grave y causal de despido indirecto
//   Ley N° 29783 — Art. 35°: obligaciones SST que incluyen
//     ambiente laboral libre de violencia
//
// Obligatorio:
//   - Política escrita: desde 1 trabajador
//   - Comité de Intervención: desde 20 trabajadores
//   - Supervisor de Prevención: menos de 20 trabajadores
// Sanción SUNAFIL: Grave a Muy Grave (3 a 10 UIT)
// UIT 2026 = S/ 5,500
// =============================================

import type { DocumentTemplateDefinition } from './types'

export const HOSTIGAMIENTO_SEXUAL_TEMPLATE: DocumentTemplateDefinition = {
  id: 'politica-hostigamiento-sexual',
  type: 'POLITICA_HOSTIGAMIENTO',
  name: 'Política de Prevención y Sanción del Hostigamiento Sexual en el Trabajo',
  description:
    'Documento obligatorio conforme a la Ley N° 27942 y D.S. N° 014-2019-MIMP. Establece la definición, conductas prohibidas, canales de denuncia, procedimiento de investigación en 3 etapas, medidas de protección y sanciones aplicables.',
  legalBasis:
    'Ley N° 27942 | D.S. N° 014-2019-MIMP | D.Leg. N° 1410 | D.S. N° 003-97-TR Art. 25°(k)',
  mandatoryFrom:
    'Política escrita: desde 1 trabajador. Comité de Intervención: desde 20 trabajadores',
  workerThreshold: 1,
  approvalAuthority: 'Gerencia General — difusión obligatoria a todos los trabajadores',
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
        },
        {
          id: 'empresa_direccion',
          label: 'Domicilio principal',
          type: 'text',
          required: true,
        },
        {
          id: 'empresa_sector',
          label: 'Sector o actividad económica',
          type: 'text',
          required: true,
        },
        {
          id: 'empresa_num_trabajadores',
          label: 'Número de trabajadores',
          type: 'number',
          required: true,
          helpText:
            'Determina si es obligatorio el Comité de Intervención (20+ trabajadores) o el Supervisor de Prevención (menos de 20).',
        },
        {
          id: 'empresa_gerente',
          label: 'Gerente General o máximo representante',
          type: 'text',
          required: true,
        },
        {
          id: 'fecha_aprobacion',
          label: 'Fecha de aprobación de la política',
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
      id: 'comite',
      title: 'Órgano de Investigación',
      fields: [
        {
          id: 'tiene_comite',
          label: '¿La empresa tiene 20 o más trabajadores?',
          type: 'toggle',
          helpText:
            '20+ trabajadores: obligatorio Comité de Intervención. Menos de 20: obligatorio Supervisor de Prevención.',
        },
        {
          id: 'comite_presidente',
          label: 'Presidente/a del Comité de Intervención',
          type: 'text',
          condition: { field: 'tiene_comite', value: true },
        },
        {
          id: 'comite_secretario',
          label: 'Secretario/a del Comité de Intervención',
          type: 'text',
          condition: { field: 'tiene_comite', value: true },
        },
        {
          id: 'comite_integrante1',
          label: 'Integrante del Comité (trabajadores)',
          type: 'text',
          condition: { field: 'tiene_comite', value: true },
          helpText: 'El Comité debe tener al menos 1 representante de los trabajadores.',
        },
        {
          id: 'supervisor_nombre',
          label: 'Nombre del Supervisor de Prevención',
          type: 'text',
          condition: { field: 'tiene_comite', value: false },
          helpText: 'Para empresas con menos de 20 trabajadores.',
        },
        {
          id: 'canal_denuncia_email',
          label: 'Correo electrónico para recibir denuncias',
          type: 'email',
          required: true,
          placeholder: 'denuncias@empresa.com',
          helpText: 'Canal confidencial para recepción de denuncias.',
        },
        {
          id: 'canal_denuncia_telefono',
          label: 'Teléfono / WhatsApp confidencial para denuncias',
          type: 'text',
          placeholder: '9XX XXX XXX',
        },
      ],
    },
  ],
  blocks: [
    {
      id: 'encabezado',
      blockType: 'header',
      text:
        'POLÍTICA DE PREVENCIÓN Y SANCIÓN DEL\nHOSTIGAMIENTO SEXUAL EN EL TRABAJO\n\n' +
        '{{empresa_razon_social}}\n' +
        'RUC: {{empresa_ruc}}\n' +
        'Domicilio: {{empresa_direccion}}\n\n' +
        'Aprobada por: {{empresa_gerente}} — Gerente General\n' +
        'Fecha de aprobación: {{fecha_aprobacion}}\n' +
        'Vigencia: Indefinida, sujeta a revisión anual\n' +
        'Aplicación: Obligatoria para todos los trabajadores, directivos, contratistas y terceros vinculados',
    },
    {
      id: 'compromiso',
      blockType: 'clause',
      title: '1. COMPROMISO DE LA EMPRESA',
      text:
        '{{empresa_razon_social}} considera que todos sus trabajadores, independientemente de su cargo, sexo, condición contractual o relación con la empresa, tienen derecho a laborar en un ambiente de trabajo digno, libre de toda forma de hostigamiento, acoso y violencia.\n\n' +
        'La presente Política refleja el compromiso expreso e irrenunciable de la más alta dirección de {{empresa_razon_social}} de:\n\n' +
        '(i) Prevenir toda forma de hostigamiento sexual en el trabajo;\n' +
        '(ii) Investigar con imparcialidad, celeridad y confidencialidad toda denuncia presentada;\n' +
        '(iii) Sancionar efectivamente las conductas probadas de hostigamiento sexual;\n' +
        '(iv) Proteger a las personas denunciantes, testigos y participantes del procedimiento frente a represalias; y\n' +
        '(v) Cumplir integralmente las obligaciones establecidas en la Ley N° 27942, el D.Leg. N° 1410 y el D.S. N° 014-2019-MIMP.',
    },
    {
      id: 'definiciones',
      blockType: 'clause',
      title: '2. DEFINICIÓN DE HOSTIGAMIENTO SEXUAL Y CONDUCTAS PROHIBIDAS',
      text:
        '2.1. DEFINICIÓN LEGAL (Art. 4° Ley N° 27942)\n\n' +
        'El hostigamiento sexual es una forma de violencia que se configura a través de una conducta de naturaleza o connotación sexual o sexista no deseada por la persona hacia quien se dirige, que puede crear un ambiente intimidatorio, hostil o humillante, o que puede afectar su actividad o situación laboral. No se requiere repetición de la conducta ni que esta afecte la condición laboral del hostigado; basta con una sola conducta para que se configure el hostigamiento.\n\n' +
        '2.2. MODALIDADES DE HOSTIGAMIENTO SEXUAL PROHIBIDAS\n\n' +
        'Sin carácter limitativo, constituyen hostigamiento sexual las siguientes conductas:\n\n' +
        'A) HOSTIGAMIENTO SEXUAL TÍPICO O CHANTAJE SEXUAL:\n' +
        '• Promesas explícitas o implícitas de un trato preferente (ascenso, aumento salarial, beneficios) a cambio de favores sexuales;\n' +
        '• Amenazas de perjuicio (despido, degradación, cambio de sede) condicionadas al rechazo de proposiciones de naturaleza sexual;\n' +
        '• Uso de la posición de autoridad para obtener favores sexuales.\n\n' +
        'B) HOSTIGAMIENTO SEXUAL AMBIENTAL:\n' +
        '• Gestos obscenos o de connotación sexual;\n' +
        '• Comentarios, bromas o insinuaciones de connotación sexual reiteradas;\n' +
        '• Exhibición de imágenes, videos o materiales pornográficos o de connotación sexual en el centro de trabajo;\n' +
        '• Mensajes escritos, electrónicos o audios de contenido sexual no deseado;\n' +
        '• Contacto físico no deseado de naturaleza sexual (tocamientos, roces, besos);\n' +
        '• Miradas de connotación sexual que generan incomodidad o intimidación;\n' +
        '• Solicitudes de citas de carácter sexual reiteradamente rechazadas;\n' +
        '• Comentarios o cuestionamientos sobre la vida sexual o sentimental de la persona;\n' +
        '• Acoso por medios virtuales o digitales (redes sociales, mensajería, correo electrónico).\n\n' +
        '2.3. VÍCTIMAS PROTEGIDAS\n\n' +
        'La protección de la presente Política aplica a toda persona víctima de hostigamiento sexual, independientemente de:\n' +
        '• Su sexo o identidad de género;\n' +
        '• El cargo o jerarquía del hostigador (puede ser superior, par o subordinado);\n' +
        '• La condición laboral (trabajador en planilla, practicante, contratista, proveedor, cliente);\n' +
        '• Que la conducta haya ocurrido dentro o fuera del centro de trabajo, siempre que guarde vinculación con la relación laboral.',
    },
    {
      id: 'canales',
      blockType: 'clause',
      title: '3. CANALES DE DENUNCIA Y PRESENTACIÓN',
      text:
        '3.1. CANALES DISPONIBLES\n\n' +
        '{{empresa_razon_social}} pone a disposición de sus trabajadores los siguientes canales confidenciales para presentar una denuncia de hostigamiento sexual:\n\n' +
        '• Correo electrónico confidencial: {{canal_denuncia_email}}\n' +
        '• Teléfono / WhatsApp confidencial: {{canal_denuncia_telefono}}\n' +
        '• Denuncia presencial: Ante el Comité de Intervención / Supervisor de Prevención, en horario laboral\n' +
        '• Denuncia escrita: Carta dirigida al Comité de Intervención, depositada en el buzón de denuncias ubicado en [INDICAR UBICACIÓN]\n\n' +
        'CANAL EXTERNO: La persona también puede presentar su denuncia ante el Ministerio de Trabajo y Promoción del Empleo (MTPE) a través de la Mesa de Partes Virtual o las oficinas regionales.\n\n' +
        '3.2. QUIÉN PUEDE DENUNCIAR\n\n' +
        '• La propia víctima del hostigamiento (de forma nominada o anónima);\n' +
        '• Cualquier persona que haya presenciado los hechos o tenga conocimiento de ellos;\n' +
        '• El sindicato, cuando la víctima sea afiliada.\n\n' +
        '3.3. CONTENIDO DE LA DENUNCIA\n\n' +
        'La denuncia puede ser verbal o escrita. En cualquier caso, deberá contener:\n' +
        '(i) Identificación de la persona denunciante (si no es anónima);\n' +
        '(ii) Identificación del presunto hostigador;\n' +
        '(iii) Descripción de los hechos (fecha, lugar, circunstancias);\n' +
        '(iv) Indicación de posibles testigos;\n' +
        '(v) Medios probatorios disponibles (mensajes, correos, grabaciones, fotos).\n\n' +
        '3.4. DENUNCIA ANÓNIMA\n\n' +
        'Se acepta la denuncia anónima. En este caso, la investigación se realizará con los elementos disponibles. La empresa no exigirá la identificación del denunciante como requisito para iniciar el procedimiento.',
    },
    {
      id: 'procedimiento',
      blockType: 'clause',
      title: '4. PROCEDIMIENTO DE INVESTIGACIÓN Y SANCIÓN (3 ETAPAS)',
      text:
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'ETAPA 1: CALIFICACIÓN DE LA DENUNCIA Y MEDIDAS DE PROTECCIÓN\n' +
        'Plazo: TRES (3) DÍAS HÁBILES desde la recepción de la denuncia\n\n' +
        'Acciones del Comité de Intervención / Supervisor de Prevención:\n' +
        '• Registrar la denuncia y asignarle un código de seguimiento;\n' +
        '• Evaluar si los hechos descritos encuadran en la definición de hostigamiento sexual;\n' +
        '• Aplicar de manera INMEDIATA e INCONDICIONAL las medidas de protección a favor de la víctima. Estas medidas NO requieren que los hechos sean probados previamente. Son obligatorias ante la sola denuncia. Incluyen:\n' +
        '  - Separación física entre la víctima y el presunto hostigador (cambio de área, turno o sede, a elección de la víctima, no del hostigador);\n' +
        '  - Prohibición al presunto hostigador de acercarse o comunicarse con la víctima;\n' +
        '  - Asignación de tarea diferente si la víctima lo solicita;\n' +
        '  - Acompañamiento psicológico si la empresa cuenta con el recurso;\n' +
        '  - Cualquier otra medida que garantice la protección efectiva.\n' +
        '• Notificar a la víctima las medidas adoptadas y el código de seguimiento de su denuncia;\n' +
        '• Notificar al presunto hostigador el inicio del procedimiento (sin revelar datos que permitan identificar al denunciante si es anónimo).\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'ETAPA 2: INVESTIGACIÓN\n' +
        'Plazo: TREINTA (30) DÍAS CALENDARIO desde la denuncia\n\n' +
        'El Comité de Intervención / Supervisor de Prevención realizará:\n' +
        '• Notificar al presunto hostigador los cargos en su contra (con suficiente detalle para ejercer derecho de defensa);\n' +
        '• Recabar la declaración de la víctima (en sesión reservada y sin la presencia del presunto hostigador);\n' +
        '• Recabar la declaración del presunto hostigador (en sesión reservada);\n' +
        '• Tomar declaración de testigos identificados;\n' +
        '• Recopilar y analizar los medios probatorios disponibles (mensajes, correos electrónicos, grabaciones de audio o video, registros de acceso, bitácoras de sistemas);\n' +
        '• Garantizar la confidencialidad de todas las actuaciones — el incumplimiento puede dar lugar a responsabilidad del Comité;\n' +
        '• Elaborar el INFORME FINAL que contenga: (a) relación de hechos probados, (b) análisis jurídico, (c) conclusión (hostigamiento acreditado / no acreditado), (d) recomendación de sanción;\n' +
        '• Remitir el Informe Final a la Gerencia General dentro del plazo.\n\n' +
        'PRINCIPIOS GARANTIZADOS DURANTE LA INVESTIGACIÓN:\n' +
        '• Contradicción: el presunto hostigador puede conocer los cargos y presentar descargos;\n' +
        '• Confidencialidad: ninguna parte del procedimiento puede ser divulgada externamente;\n' +
        '• Celeridad: los plazos son de obligatorio cumplimiento;\n' +
        '• No revictimización: la víctima no será interrogada repetidamente sobre los mismos hechos;\n' +
        '• Perspectiva de género: el análisis de los hechos considerará las relaciones de poder y el contexto.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'ETAPA 3: SANCIÓN Y RESOLUCIÓN\n' +
        'Plazo: DIEZ (10) DÍAS CALENDARIO desde la recepción del Informe Final\n\n' +
        'Acciones de la Gerencia General:\n' +
        '• Revisar el Informe Final del Comité;\n' +
        '• Emitir la Resolución de sanción o archivo, debidamente motivada;\n' +
        '• Si el hostigamiento resulta acreditado, aplicar la sanción correspondiente:\n\n' +
        '  CUANDO EL HOSTIGADOR ES TRABAJADOR DE {{empresa_razon_social}}:\n' +
        '  - Amonestación escrita (primer incidente, conducta leve);\n' +
        '  - Suspensión sin goce de haber de uno (1) a treinta (30) días;\n' +
        '  - DESPIDO por falta grave conforme al artículo 25°(k) del D.S. N° 003-97-TR, para casos de hostigamiento grave o reiterado.\n\n' +
        '  CUANDO EL HOSTIGADOR ES EL EMPLEADOR O SU REPRESENTANTE:\n' +
        '  - La víctima tiene derecho al despido indirecto conforme al artículo 30°(f) del D.S. N° 003-97-TR y a la indemnización especial de tres (3) meses de remuneración, conforme al artículo 11° de la Ley N° 27942.\n\n' +
        '  CUANDO EL HOSTIGADOR ES UN TERCERO (cliente, proveedor, contratista):\n' +
        '  - {{empresa_razon_social}} adoptará las medidas a su alcance para cessar la conducta: resolución del contrato, restricción de acceso, denuncia a la empresa del hostigador.\n\n' +
        '• Notificar la Resolución a ambas partes;\n' +
        '• Registrar el caso en el Registro de Hostigamiento Sexual de la empresa;\n' +
        '• Reportar al MTPE, dentro de los CINCO (5) DÍAS HÁBILES de emitida la Resolución sancionadora, los casos de hostigamiento sexual acreditados, conforme al artículo 25° de la Ley N° 27942.',
    },
    {
      id: 'represalias',
      blockType: 'clause',
      title: '5. PROHIBICIÓN ABSOLUTA DE REPRESALIAS',
      text:
        '{{empresa_razon_social}} prohíbe expresamente cualquier acto de represalia contra:\n' +
        '• La persona denunciante de hostigamiento sexual;\n' +
        '• Los testigos que hayan declarado o aportado información al procedimiento;\n' +
        '• Los miembros del Comité de Intervención en el ejercicio de sus funciones;\n' +
        '• Cualquier persona que haya participado en el procedimiento de investigación.\n\n' +
        'Se entiende por represalia toda acción que perjudique directa o indirectamente a la persona (despido, degradación, cambio de funciones, reducción de remuneración, marginación, maltrato) en relación causal con su denuncia o participación en el procedimiento.\n\n' +
        'La represalia constituye falta grave INDEPENDIENTE del resultado de la investigación, sancionable con suspensión o despido conforme al artículo 25° del D.S. N° 003-97-TR.',
    },
    {
      id: 'comite_bloque',
      blockType: 'clause',
      title: '6. ÓRGANO COMPETENTE DE INVESTIGACIÓN',
      text:
        'COMITÉ DE INTERVENCIÓN ANTE EL HOSTIGAMIENTO SEXUAL\n\n' +
        'Conforme al artículo 10° del D.S. N° 014-2019-MIMP, {{empresa_razon_social}} cuenta con el siguiente Comité de Intervención:\n\n' +
        '• Presidente/a: {{comite_presidente}}\n' +
        '• Secretario/a: {{comite_secretario}}\n' +
        '• Integrante (representante de trabajadores): {{comite_integrante1}}\n\n' +
        'El mandato del Comité es de dos (2) años renovables. El Comité sesionará de manera ordinaria cada seis (6) meses y de manera extraordinaria ante cada denuncia presentada.\n\n' +
        'Los miembros del Comité tienen derecho a licencia con goce de haber para el desempeño de sus funciones de investigación, conforme a ley.',
      condition: 'tiene_comite === true',
      isOptional: true,
    },
    {
      id: 'supervisor_bloque',
      blockType: 'clause',
      title: '6. ÓRGANO COMPETENTE DE INVESTIGACIÓN',
      text:
        'SUPERVISOR DE PREVENCIÓN DEL HOSTIGAMIENTO SEXUAL\n\n' +
        'Por contar con menos de veinte (20) trabajadores, {{empresa_razon_social}} designa como Supervisor de Prevención del Hostigamiento Sexual a:\n\n' +
        '{{supervisor_nombre}}\n\n' +
        'El Supervisor de Prevención es el responsable de recibir las denuncias, aplicar las medidas de protección inmediatas e iniciar el proceso de investigación conforme al procedimiento establecido en la presente Política.',
      condition: 'tiene_comite === false',
      isOptional: true,
    },
    {
      id: 'obligaciones_empresa',
      blockType: 'clause',
      title: '7. OBLIGACIONES PREVENTIVAS DE {{empresa_razon_social}}',
      text:
        'Conforme al artículo 8° de la Ley N° 27942 y el D.S. N° 014-2019-MIMP, {{empresa_razon_social}} se obliga a:\n\n' +
        'a) DIFUNDIR la presente Política a todos los trabajadores al inicio del vínculo laboral (inducción) y periódicamente durante la relación laboral;\n\n' +
        'b) PUBLICAR la Política en lugares visibles del centro de trabajo (carteleras, intranet, mural de RRHH) y mantenerla accesible en todo momento;\n\n' +
        'c) CAPACITAR a todos los trabajadores sobre la prevención, identificación y sanción del hostigamiento sexual al menos UNA (1) VEZ AL AÑO; con mayor frecuencia para los miembros del Comité;\n\n' +
        'd) REGISTRAR las capacitaciones dictadas (listas de asistencia, temario, fecha) como evidencia ante SUNAFIL;\n\n' +
        'e) IMPLEMENTAR Y MANTENER OPERATIVOS los canales de denuncia señalados en la presente Política;\n\n' +
        'f) REPORTAR al MTPE, dentro de los CINCO (5) DÍAS HÁBILES de emitida la resolución sancionadora, los casos acreditados de hostigamiento sexual;\n\n' +
        'g) INFORMAR ANUALMENTE al MTPE sobre los casos de hostigamiento presentados y resueltos durante el período, mediante el mecanismo que establezca el MTPE;\n\n' +
        'h) INCLUIR en el Reglamento Interno de Trabajo (cuando sea obligatorio) las disposiciones relativas al hostigamiento sexual;\n\n' +
        'i) EVALUAR periódicamente el clima laboral para detectar situaciones de riesgo de hostigamiento.',
    },
    {
      id: 'denuncia_mala_fe',
      blockType: 'clause',
      title: '8. DENUNCIA DE MALA FE',
      text:
        'La presentación de una denuncia falsa o de mala fe, acreditada en el procedimiento de investigación, constituye falta grave conforme al artículo 25° del TUO del D.Leg. N° 728, y será sancionada disciplinariamente de acuerdo con la gravedad de la conducta.\n\n' +
        'La declaración de mala fe no se deriva automáticamente del hecho de que la denuncia no sea acreditada; requiere prueba positiva de que el denunciante actuó con conocimiento de la falsedad o con intención de perjudicar.',
    },
    {
      id: 'sanciones_empresa',
      blockType: 'clause',
      title: '9. INFRACCIONES Y SANCIONES PARA LA EMPRESA (SUNAFIL)',
      text:
        'El incumplimiento de las obligaciones del empleador en materia de hostigamiento sexual constituye infracción laboral sancionada por SUNAFIL (UIT 2026 = S/ 5,500):\n\n' +
        '┌──────────────────────────────────────────────┬──────────────┬────────────────────┐\n' +
        '│ Infracción                                   │ Tipo         │ Multa              │\n' +
        '├──────────────────────────────────────────────┼──────────────┼────────────────────┤\n' +
        '│ No contar con Política escrita               │ Grave        │ 0.5 a 5 UIT        │\n' +
        '│ No capacitar al personal                     │ Grave        │ 0.5 a 5 UIT        │\n' +
        '│ No iniciar investigación ante denuncia       │ Muy Grave    │ 3 a 10 UIT         │\n' +
        '│ No dictar medidas de protección inmediatas   │ Muy Grave    │ 3 a 10 UIT         │\n' +
        '│ No emitir resolución dentro del plazo        │ Muy Grave    │ 3 a 10 UIT         │\n' +
        '│ No reportar al MTPE casos acreditados        │ Leve         │ 0.1 a 1 UIT        │\n' +
        '│ Represalia contra denunciante                │ Muy Grave    │ 3 a 10 UIT         │\n' +
        '└──────────────────────────────────────────────┴──────────────┴────────────────────┘',
    },
    {
      id: 'vigencia',
      blockType: 'clause',
      title: '10. VIGENCIA Y ACTUALIZACIÓN',
      text:
        'La presente Política entra en vigencia el {{fecha_aprobacion}} y tiene carácter indefinido, sujeta a revisión anual o cuando se modifique la legislación aplicable.\n\n' +
        '{{empresa_razon_social}} se compromete a actualizar la presente Política en los siguientes casos:\n' +
        '• Modificación de la Ley N° 27942 o sus reglamentos;\n' +
        '• Cambio en la composición del Comité de Intervención;\n' +
        '• Variación significativa en el número de trabajadores;\n' +
        '• Incorporación de nuevos canales de denuncia o nuevas sedes de trabajo.',
    },
    {
      id: 'firma',
      blockType: 'signature',
      text:
        'En {{ciudad}}, el {{fecha_aprobacion}}.\n\n\n' +
        '────────────────────────────────────\n' +
        '    {{empresa_gerente}}\n' +
        '    Gerente General\n' +
        '    {{empresa_razon_social}}\n' +
        '    RUC N° {{empresa_ruc}}\n\n\n' +
        '────────────────────────────────────\n' +
        '    Gerente / Jefe de Recursos Humanos\n' +
        '    {{empresa_razon_social}}\n\n\n' +
        'CONSTANCIA DE RECEPCIÓN:\n' +
        'El/la trabajador/a _________________________, identificado/a con DNI N° __________, declara haber recibido y leído la presente Política.\n\n' +
        'Firma: ___________________________    Fecha: ___________',
    },
  ],
}
