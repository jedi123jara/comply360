// =============================================
// CONTRACT CLAUSES — CATÁLOGO SEMILLA
//
// Generador de Contratos / Chunk 4. Texto profesional sugerido tomado del
// artefacto §15 (cláusulas tipo) y revisado para tuteo peruano neutro.
// Cada entrada se materializa en BD vía upsert por `code`.
// =============================================

import type { ContractClauseSeed } from './types'

export const CONTRACT_CLAUSES: ContractClauseSeed[] = [
  // ─── CAUSA OBJETIVA BLINDADA — INICIO O INCREMENTO DE ACTIVIDAD ──────────
  {
    code: 'CO-INI-001',
    category: 'CAUSA_OBJETIVA',
    type: 'CAUSA_OBJETIVA_INICIO',
    title: 'Causa objetiva blindada — Inicio o incremento de actividad',
    legalBasis:
      'Art. 57 TUO D.Leg. 728 (D.S. 003-97-TR) — Cas. Lab. 13734-2017-Lima (apertura de establecimientos como expansión planificada NO es causa válida; debe ser circunstancial o coyuntural).',
    bodyTemplate: `TERCERA — OBJETO Y CAUSA OBJETIVA. EL EMPLEADOR ha decidido implementar {{descripcionProyecto}}, cuyo proyecto de ingeniería fue aprobado mediante {{actaDirectorio}} de fecha {{fechaActa}} y financiado mediante {{fuenteFinanciamiento}}, constituyendo ello una nueva actividad empresarial conforme al artículo 57 del TUO del D.Leg. 728. Esta actividad tiene una duración previsible de {{plazoMeses}} meses, siendo necesario contratar al TRABAJADOR para desempeñar funciones de {{cargoEspecifico}} específicamente en dicha actividad, las cuales son inherentes a la implementación de la nueva actividad y se extinguirán al consolidarse la misma. La causa objetiva aquí especificada está sustentada en los siguientes documentos que se adjuntan como Anexos: (i) {{anexoLicencia}}; (ii) cronograma del proyecto; (iii) memoria descriptiva.`,
    variables: [
      { key: 'descripcionProyecto', label: 'Descripción específica del proyecto', type: 'textarea', required: true, helpText: 'Ejemplo: "la apertura de una nueva línea de producción de envases PET en la planta industrial ubicada en Lurín".' },
      { key: 'actaDirectorio', label: 'Acta de Directorio (N° y referencia)', type: 'text', required: true, helpText: 'Ejemplo: Acta de Directorio N° 015-2026' },
      { key: 'fechaActa', label: 'Fecha del acta', type: 'date', required: true },
      { key: 'fuenteFinanciamiento', label: 'Fuente de financiamiento', type: 'text', required: true, helpText: 'Ejemplo: préstamo BCP, aporte de socios, capital propio.' },
      { key: 'plazoMeses', label: 'Duración previsible (meses)', type: 'number', required: true, default: 24 },
      { key: 'cargoEspecifico', label: 'Cargo específico del trabajador', type: 'text', required: true },
      { key: 'anexoLicencia', label: 'Documento que sustenta la actividad', type: 'text', helpText: 'Licencia de funcionamiento, permiso, contrato.' },
    ],
    applicableTo: { contractTypes: ['LABORAL_PLAZO_FIJO'] },
    version: '1.0.0',
  },

  // ─── CAUSA OBJETIVA BLINDADA — SUPLENCIA ────────────────────────────────
  {
    code: 'CO-SUP-001',
    category: 'CAUSA_OBJETIVA',
    type: 'CAUSA_OBJETIVA_SUPLENCIA',
    title: 'Causa objetiva blindada — Suplencia',
    legalBasis:
      'Art. 61 TUO D.Leg. 728 — Cas. Lab. 19684-2016-Lima (doctrina vinculante 13-mar-2019): la finalidad debe ser reservar el puesto del titular.',
    bodyTemplate: `TERCERA — OBJETO Y CAUSA OBJETIVA. EL TRABAJADOR es contratado para sustituir transitoriamente a {{nombreTitular}}, identificado(a) con DNI {{dniTitular}}, quien ocupa el cargo de {{cargoTitular}} y cuyo vínculo laboral con EL EMPLEADOR se encuentra suspendido por {{motivoSuspension}} por el periodo del {{fechaInicioSuspension}} al {{fechaFinSuspension}}, conforme {{documentoRespaldo}}. La suplencia comprende la reserva del puesto y se extinguirá automáticamente con la reincorporación del/la titular, conforme al artículo 61 del TUO del D.Leg. 728.`,
    variables: [
      { key: 'nombreTitular', label: 'Nombre completo del titular', type: 'text', required: true },
      { key: 'dniTitular', label: 'DNI del titular', type: 'text', required: true, helpText: '8 dígitos.' },
      { key: 'cargoTitular', label: 'Cargo del titular', type: 'text', required: true },
      { key: 'motivoSuspension', label: 'Motivo de suspensión', type: 'select', required: true, options: [
        { value: 'licencia por maternidad', label: 'Licencia por maternidad' },
        { value: 'descanso médico', label: 'Descanso médico' },
        { value: 'licencia sin goce de haber', label: 'Licencia sin goce de haber' },
        { value: 'subsidio por enfermedad', label: 'Subsidio por enfermedad' },
        { value: 'licencia por paternidad', label: 'Licencia por paternidad' },
      ] },
      { key: 'fechaInicioSuspension', label: 'Fecha inicio de la suspensión', type: 'date', required: true },
      { key: 'fechaFinSuspension', label: 'Fecha fin estimada', type: 'date', required: true },
      { key: 'documentoRespaldo', label: 'Documento que respalda la suspensión', type: 'text', required: true, helpText: 'Ejemplo: "Resolución N° 003-2026", "Certificado Médico CITT N° 12345"' },
    ],
    applicableTo: { contractTypes: ['LABORAL_PLAZO_FIJO'] },
    version: '1.0.0',
  },

  // ─── CAUSA OBJETIVA — NECESIDAD DE MERCADO ─────────────────────────────
  {
    code: 'CO-NEC-001',
    category: 'CAUSA_OBJETIVA',
    type: 'CAUSA_OBJETIVA_NECESIDAD_MERCADO',
    title: 'Causa objetiva blindada — Necesidades de mercado',
    legalBasis:
      'Art. 58 TUO D.Leg. 728 — Cas. Lab. 24648-2019-Lima Este (la fórmula genérica "necesidad de mercado" sin elemento específico = desnaturalización).',
    bodyTemplate: `TERCERA — OBJETO Y CAUSA OBJETIVA. EL EMPLEADOR atraviesa un incremento coyuntural y no cíclico de la demanda en {{areaProductiva}}, según se evidencia en {{evidenciaDemanda}}. Este incremento NO corresponde a una variación estacional sino a {{razonNoCiclica}}. En consecuencia, EL EMPLEADOR contrata a EL TRABAJADOR para desempeñar funciones de {{cargoEspecifico}} por un periodo de {{plazoMeses}} meses, vencido el cual la causa objetiva se extinguirá. El presente contrato se rige por el artículo 58 del TUO del D.Leg. 728 y se sustenta en los siguientes anexos: (i) {{anexoEvidencia}}; (ii) proyección de demanda elaborada por el área comercial.`,
    variables: [
      { key: 'areaProductiva', label: 'Área productiva afectada', type: 'text', required: true, helpText: 'Ejemplo: "la línea de comercio digital B2B".' },
      { key: 'evidenciaDemanda', label: 'Evidencia del incremento de demanda', type: 'textarea', required: true, helpText: 'Ejemplo: "el contrato marco con XYZ S.A.C. firmado el 12-feb-2026 que duplica nuestro volumen actual".' },
      { key: 'razonNoCiclica', label: 'Razón por la que NO es cíclica', type: 'textarea', required: true, helpText: 'Ejemplo: "la entrada de un nuevo cliente único, sin precedentes en años anteriores".' },
      { key: 'cargoEspecifico', label: 'Cargo del trabajador', type: 'text', required: true },
      { key: 'plazoMeses', label: 'Plazo (meses)', type: 'number', required: true, default: 12 },
      { key: 'anexoEvidencia', label: 'Documento que evidencia el incremento', type: 'text', required: true, helpText: 'Ej.: contrato marco, orden de compra, carta de intención.' },
    ],
    applicableTo: { contractTypes: ['LABORAL_PLAZO_FIJO'] },
    version: '1.0.0',
  },

  // ─── CONFIDENCIALIDAD ───────────────────────────────────────────────────
  {
    code: 'CONF-001',
    category: 'POTESTATIVA',
    type: 'CONFIDENCIALIDAD',
    title: 'Confidencialidad y secretos industriales',
    legalBasis:
      'Arts. 122-123 D.Leg. 823 (Ley de Propiedad Industrial). Arts. 165 y 198 Código Penal (responsabilidad penal por revelación de secretos).',
    bodyTemplate: `CONFIDENCIALIDAD. EL TRABAJADOR se obliga a guardar reserva absoluta sobre toda Información Confidencial a la que tenga acceso con motivo del contrato, entendiéndose por tal la información financiera, comercial, técnica, de clientes, base de datos personales (Ley 29733), procesos productivos, secretos industriales (Arts. 122-123 del D.Leg. 823) y cualquier otra cuya divulgación pueda perjudicar al EMPLEADOR. Esta obligación subsiste por el plazo de {{plazoMeses}} meses posteriores a la extinción del vínculo laboral. El incumplimiento generará responsabilidad civil por daños y perjuicios y, de configurar tipos penales (Arts. 165 y 198 del Código Penal), la responsabilidad penal correspondiente.`,
    variables: [
      { key: 'plazoMeses', label: 'Plazo de confidencialidad post-contrato (meses)', type: 'number', required: true, default: 24, helpText: 'Recomendado: 24 meses. Plazos mayores a 36 pueden ser cuestionados.' },
    ],
    applicableTo: null, // aplica a todos
    version: '1.0.0',
  },

  // ─── NO COMPETENCIA POSCONTRACTUAL ──────────────────────────────────────
  {
    code: 'NOC-001',
    category: 'POTESTATIVA',
    type: 'NO_COMPETENCIA',
    title: 'No competencia poscontractual con compensación',
    legalBasis:
      'Vacío legal regulatorio (anteproyecto LGT). Validez sujeta a adecuación, necesidad y proporcionalidad. Plazo recomendado ≤ 24 meses. Compensación económica obligatoria. Art. 22 Constitución (derecho al trabajo).',
    bodyTemplate: `NO COMPETENCIA. Por un plazo de {{plazoMeses}} meses contados a partir de la extinción del vínculo laboral, EL TRABAJADOR se abstendrá de prestar servicios, directa o indirectamente, a empresas competidoras de EL EMPLEADOR en el sector {{sector}} dentro del territorio {{geografia}}. Como contraprestación, EL EMPLEADOR pagará al TRABAJADOR una compensación económica mensual equivalente al {{compensacionPct}}% de su última remuneración mensual, durante el plazo de la restricción. Esta cláusula respeta los principios de adecuación, necesidad y proporcionalidad respecto del derecho al trabajo (Art. 22 Constitución). El no pago de la compensación libera automáticamente al TRABAJADOR de la obligación de no competir.`,
    variables: [
      { key: 'plazoMeses', label: 'Plazo de no competencia (meses)', type: 'number', required: true, default: 12, helpText: 'Recomendado: 12 meses. Plazos > 24 son altamente cuestionables.' },
      { key: 'sector', label: 'Sector específico', type: 'text', required: true, helpText: 'Ejemplo: "fintech crediticio peruano".' },
      { key: 'geografia', label: 'Cobertura geográfica', type: 'text', required: true, default: 'la República del Perú' },
      { key: 'compensacionPct', label: 'Compensación (% de la última remuneración)', type: 'number', required: true, default: 50, helpText: 'Mínimo recomendado: 50%. Sin compensación la cláusula es nula.' },
    ],
    applicableTo: null,
    version: '1.0.0',
  },

  // ─── PROPIEDAD INTELECTUAL ──────────────────────────────────────────────
  {
    code: 'IP-001',
    category: 'POTESTATIVA',
    type: 'IP',
    title: 'Propiedad intelectual y cesión de derechos',
    legalBasis: 'D.Leg. 822 (Derechos de Autor) — D.Leg. 1075 (Propiedad Industrial). Distinción entre derechos morales (irrenunciables) y patrimoniales.',
    bodyTemplate: `PROPIEDAD INTELECTUAL. Las obras, invenciones, software, diseños y demás creaciones generadas por EL TRABAJADOR en cumplimiento del presente contrato corresponden patrimonialmente a EL EMPLEADOR conforme al D.Leg. 822 y D.Leg. 1075. Los derechos morales, irrenunciables, permanecen en cabeza del TRABAJADOR. La remuneración pactada incluye la cesión patrimonial. Las creaciones libres realizadas fuera de la jornada laboral y sin uso de recursos del EMPLEADOR son de propiedad exclusiva del TRABAJADOR.`,
    variables: [],
    applicableTo: null,
    version: '1.0.0',
  },

  // ─── PROTECCIÓN DE DATOS PERSONALES ─────────────────────────────────────
  {
    code: 'PDP-001',
    category: 'POTESTATIVA',
    type: 'PDP',
    title: 'Tratamiento de datos personales (Ley 29733)',
    legalBasis: 'Ley 29733 (LPDP) — D.S. 016-2024-JUS (Reglamento). Art. 28 LPDP (consentimiento) + Art. 37 Reglamento (Oficial de Datos Personales).',
    bodyTemplate: `TRATAMIENTO DE DATOS PERSONALES. EL TRABAJADOR autoriza a EL EMPLEADOR a tratar sus datos personales (incluyendo datos sensibles como información biométrica, de salud y económica) para finalidades estrictamente laborales: gestión de planilla, EsSalud, SUNAT, AFP/ONP, SUNAFIL, MTPE y cumplimiento de obligaciones legales. EL EMPLEADOR ha designado al Oficial de Datos Personales {{oficialPdpNombre}} ({{oficialPdpEmail}}) ante quien podrá ejercer sus derechos ARCO (acceso, rectificación, cancelación y oposición), conforme al Art. 37 del DS 016-2024-JUS. La conservación se sujeta al plazo de prescripción laboral (4 años desde el cese, Ley 27321) más los plazos contables/tributarios (5 años, Código Tributario).`,
    variables: [
      { key: 'oficialPdpNombre', label: 'Nombre del Oficial de Datos Personales', type: 'text', required: true },
      { key: 'oficialPdpEmail', label: 'Email del Oficial de Datos', type: 'text', required: true },
    ],
    applicableTo: null,
    version: '1.0.0',
  },

  // ─── EXCLUSIVIDAD ───────────────────────────────────────────────────────
  {
    code: 'EXCL-001',
    category: 'POTESTATIVA',
    type: 'EXCLUSIVIDAD',
    title: 'Exclusividad con compensación',
    legalBasis: 'Validez condicionada a proporcionalidad con el cargo y a la existencia de compensación específica. Art. 22 Constitución.',
    bodyTemplate: `EXCLUSIVIDAD. EL TRABAJADOR se obliga a prestar sus servicios de manera exclusiva a EL EMPLEADOR durante la vigencia del presente contrato, absteniéndose de prestar servicios remunerados a terceros en {{sector}}. Como contraprestación a esta obligación, EL EMPLEADOR pagará al TRABAJADOR una compensación adicional equivalente al {{compensacionPct}}% de su remuneración mensual, denominada "bonificación por exclusividad". Esta compensación se considera no remunerativa para fines previsionales y de seguros sociales, conforme al Art. 7 de la Ley 28051.`,
    variables: [
      { key: 'sector', label: 'Sector cuya competencia se restringe', type: 'text', required: true },
      { key: 'compensacionPct', label: 'Compensación por exclusividad (%)', type: 'number', required: true, default: 15 },
    ],
    applicableTo: null,
    version: '1.0.0',
  },

  // ─── PACTO DE PERMANENCIA POR CAPACITACIÓN ──────────────────────────────
  {
    code: 'PERM-001',
    category: 'POTESTATIVA',
    type: 'PERMANENCIA',
    title: 'Pacto de permanencia por capacitación',
    legalBasis: 'Art. 26 D.Leg. 728. Validez condicionada a (i) capacitación efectiva > formación habitual del cargo, (ii) plazo razonable, (iii) penalidad proporcional al costo de la capacitación.',
    bodyTemplate: `PACTO DE PERMANENCIA. EL EMPLEADOR financiará la capacitación de EL TRABAJADOR consistente en {{descripcionCapacitacion}}, con un costo total de S/ {{montoCapacitacion}}. En contraprestación, EL TRABAJADOR se obliga a permanecer en la empresa por un plazo no menor de {{plazoMeses}} meses contados desde la finalización de la capacitación. En caso de renuncia voluntaria o despido por causa justa imputable al TRABAJADOR antes del plazo señalado, EL TRABAJADOR reembolsará al EMPLEADOR el costo de la capacitación de manera proporcional al tiempo de permanencia incumplido (regla de cálculo: monto × meses faltantes / plazoTotal).`,
    variables: [
      { key: 'descripcionCapacitacion', label: 'Descripción de la capacitación', type: 'textarea', required: true },
      { key: 'montoCapacitacion', label: 'Monto financiado (S/)', type: 'number', required: true },
      { key: 'plazoMeses', label: 'Plazo de permanencia (meses)', type: 'number', required: true, default: 12 },
    ],
    applicableTo: null,
    version: '1.0.0',
  },

  // ─── TELETRABAJO ────────────────────────────────────────────────────────
  {
    code: 'TT-001',
    category: 'POTESTATIVA',
    type: 'TELETRABAJO',
    title: 'Modalidad teletrabajo (Ley 31572)',
    legalBasis: 'Ley 31572 + DS 002-2023-TR. Derecho a desconexión digital, compensación de gastos y SST en teletrabajo.',
    bodyTemplate: `TELETRABAJO. Las partes acuerdan que EL TRABAJADOR prestará sus servicios bajo modalidad de teletrabajo conforme a la Ley 31572 y el DS 002-2023-TR. El lugar habitual de trabajo será {{lugarHabitual}}. Los equipos y herramientas serán provistos por {{proveedorEquipos}}. EL EMPLEADOR pagará una compensación mensual de S/ {{compensacionGastos}} para cubrir los gastos de electricidad, conectividad y mobiliario asociados al teletrabajo. Se respeta el derecho a la desconexión digital fuera del horario {{horarioTrabajo}} y los días de descanso. EL TRABAJADOR declara que su domicilio cumple con las condiciones mínimas de seguridad y salud requeridas por la Ley 29783.`,
    variables: [
      { key: 'lugarHabitual', label: 'Domicilio del teletrabajador', type: 'text', required: true },
      { key: 'proveedorEquipos', label: 'Quién provee los equipos', type: 'select', required: true, options: [
        { value: 'EL EMPLEADOR', label: 'El empleador' },
        { value: 'EL TRABAJADOR (con compensación)', label: 'El trabajador (con compensación)' },
      ], default: 'EL EMPLEADOR' },
      { key: 'compensacionGastos', label: 'Compensación mensual de gastos (S/)', type: 'number', required: true, default: 80 },
      { key: 'horarioTrabajo', label: 'Horario de trabajo pactado', type: 'text', required: true, default: '08:00 a 17:00 horas' },
    ],
    applicableTo: null,
    version: '1.0.0',
  },

  // ─── JORNADA ATÍPICA ACUMULATIVA ────────────────────────────────────────
  {
    code: 'JOR-001',
    category: 'POTESTATIVA',
    type: 'JORNADA_ATIPICA',
    title: 'Jornada atípica acumulativa',
    legalBasis: 'D.Leg. 854 — Ley de jornada de trabajo, horario y trabajo en sobretiempo. R.M. 091-92-TR.',
    bodyTemplate: `JORNADA ATÍPICA ACUMULATIVA. Las partes acuerdan que EL TRABAJADOR cumplirá jornada atípica acumulativa con un ciclo de {{cicloDias}} días de trabajo continuo seguidos de {{descansoDias}} días de descanso compensatorio, conforme al D.Leg. 854. La jornada diaria durante el ciclo de trabajo será de {{horasPorDia}} horas. El promedio semanal computado sobre el ciclo completo no excederá las 48 horas. EL EMPLEADOR garantiza el descanso mínimo de 12 horas continuas entre jornadas y el adecuado registro de asistencia conforme al D.S. 004-2006-TR.`,
    variables: [
      { key: 'cicloDias', label: 'Días continuos de trabajo', type: 'number', required: true, default: 14 },
      { key: 'descansoDias', label: 'Días de descanso', type: 'number', required: true, default: 7 },
      { key: 'horasPorDia', label: 'Horas por día durante el ciclo', type: 'number', required: true, default: 12 },
    ],
    applicableTo: null,
    version: '1.0.0',
  },
]
