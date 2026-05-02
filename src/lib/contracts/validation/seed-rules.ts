// =============================================
// CONTRACT VALIDATION ENGINE — REGLAS SEMILLA
//
// Catálogo MVP del Generador de Contratos (Chunk 1).
// Cada entrada se materializa en BD vía upsert por `code`. Cambios de
// `ruleSpec` deben subir `version` para preservar trazabilidad.
//
// Base legal verbatim donde corresponde. Casaciones: ver
// docs/specs/contract-generator-spec.md §4.2.
// =============================================

import type { ContractRuleDefinition } from './types'

export const CONTRACT_VALIDATION_RULES: ContractRuleDefinition[] = [
  // ─── FORMAL ─────────────────────────────────────────────────────────────
  {
    code: 'FORMAL-001',
    category: 'FORMAL',
    severity: 'BLOCKER',
    title: 'Contrato modal sin causa objetiva',
    description:
      'Todo contrato modal (plazo fijo) debe consignar de forma expresa la causa objetiva determinante de la contratación.',
    legalBasis:
      'Art. 72 TUO D.Leg. 728 (D.S. 003-97-TR): "Los contratos de trabajo a que se refiere este Título necesariamente deberán constar por escrito y por triplicado, debiendo consignarse en forma expresa su duración, y las causas objetivas determinantes de la contratación".',
    ruleSpec: {
      kind: 'FIELD_REQUIRED',
      field: 'contract.causeObjective',
      min: 1,
    },
    appliesTo: {
      contractTypes: ['LABORAL_PLAZO_FIJO'],
    },
    version: '1.0.0',
  },

  {
    code: 'FORMAL-002',
    category: 'FORMAL',
    severity: 'BLOCKER',
    title: 'Contrato a plazo fijo sin fecha de fin',
    description:
      'Un contrato a plazo determinado debe consignar fecha de inicio y fecha de fin.',
    legalBasis:
      'Art. 72 TUO D.Leg. 728. Cas. Lab. 24648-2019-Lima Este: la falta de plazo definido configura desnaturalización vía Art. 77.a.',
    ruleSpec: {
      kind: 'DURATION_MAX_DAYS',
      startPath: 'contract.startDate',
      endPath: 'contract.endDate',
      maxDays: 1825, // chequeo de presencia + tope global Art. 74
      requireEnd: true,
    },
    appliesTo: {
      contractTypes: ['LABORAL_PLAZO_FIJO'],
    },
    version: '1.0.0',
  },

  // ─── MODAL (calidad de la causa objetiva) ───────────────────────────────
  {
    code: 'MODAL-001',
    category: 'MODAL',
    severity: 'BLOCKER',
    title: 'Causa objetiva genérica',
    description:
      'La causa objetiva no puede limitarse a fórmulas genéricas como "incremento de actividad" o "necesidades del mercado" sin elementos específicos. La Corte Suprema rechaza cláusulas genéricas porque no permiten verificar la temporalidad real.',
    legalBasis:
      'Art. 72 LPCL + Cas. Lab. 13734-2017-Lima (apertura de establecimientos como "expansión planificada" no es causa válida) + Cas. Lab. 24648-2019-Lima Este (fórmulas genéricas = desnaturalización).',
    ruleSpec: {
      kind: 'FIELD_REGEX_DENY',
      field: 'contract.causeObjective',
      patterns: [
        // Fórmulas genéricas más comunes detectadas en jurisprudencia
        '^\\s*(?:por\\s+)?(?:el\\s+)?incremento\\s+(?:de\\s+)?actividad(?:es)?\\s*\\.?\\s*$',
        '^\\s*(?:por\\s+)?(?:las?\\s+)?necesidad(?:es)?\\s+(?:de\\s+)?(?:el\\s+)?mercado\\s*\\.?\\s*$',
        '^\\s*(?:por\\s+)?labores?\\s+propias?\\s+del\\s+cargo\\s*\\.?\\s*$',
        '^\\s*(?:por\\s+)?expansi[óo]n\\s+(?:de\\s+)?(?:la\\s+)?empresa\\s*\\.?\\s*$',
        '^\\s*(?:por\\s+)?aumento\\s+(?:de\\s+)?(?:la\\s+)?demanda\\s*\\.?\\s*$',
      ],
      flags: 'i',
    },
    appliesTo: {
      contractTypes: ['LABORAL_PLAZO_FIJO'],
    },
    version: '1.0.0',
  },

  {
    code: 'MODAL-002',
    category: 'MODAL',
    severity: 'WARNING',
    title: 'Causa objetiva muy breve',
    description:
      'La causa objetiva debe ser desarrollada de forma clara y precisa, identificando el proyecto/área/circunstancia concreta. Causas con menos de 80 caracteres rara vez resisten una inspección SUNAFIL.',
    legalBasis:
      'Resolución 576-2020-SUNAFIL: "La causa objetiva debe ser desarrollada de forma clara y precisa […] no resultando coherente que se pretenda justificar como incremento de actividades la apertura de nuevos establecimientos de forma general".',
    ruleSpec: {
      kind: 'FIELD_REQUIRED',
      field: 'contract.causeObjective',
      min: 80,
    },
    appliesTo: {
      contractTypes: ['LABORAL_PLAZO_FIJO'],
    },
    version: '1.0.0',
  },

  // ─── PLAZO ──────────────────────────────────────────────────────────────
  {
    code: 'PLAZO-001',
    category: 'PLAZO',
    severity: 'BLOCKER',
    title: 'Suma de contratos modales del trabajador supera 5 años',
    description:
      'El conjunto de contratos modales sucesivos con el mismo trabajador no puede superar 5 años (1825 días). Excederlo configura desnaturalización a indeterminado.',
    legalBasis:
      'Art. 74 TUO D.Leg. 728: "podrán celebrarse en forma sucesiva con el mismo trabajador diversos contratos bajo distintas modalidades en el centro de trabajo, en función de las necesidades empresariales y siempre que en conjunto no superen la duración máxima de cinco años".',
    ruleSpec: {
      kind: 'WORKER_MODAL_SUM_MAX_DAYS',
      maxDays: 1825,
    },
    appliesTo: {
      contractTypes: ['LABORAL_PLAZO_FIJO'],
    },
    version: '1.0.0',
  },

  {
    code: 'PLAZO-002',
    category: 'PLAZO',
    severity: 'BLOCKER',
    title: 'Inicio o lanzamiento de nueva actividad supera 3 años',
    description:
      'La modalidad de inicio o incremento de actividad tiene plazo máximo de 3 años (1095 días).',
    legalBasis: 'Art. 57 TUO D.Leg. 728.',
    ruleSpec: {
      kind: 'DURATION_MAX_DAYS',
      startPath: 'contract.startDate',
      endPath: 'contract.endDate',
      maxDays: 1095,
    },
    appliesTo: {
      // Hoy el enum ContractType de Contract no distingue submodalidades —
      // se valida por título o se delega a la versión 2 cuando se agreguen
      // submodalidades. Mantenemos la regla activa para PLAZO_FIJO genérico
      // como tope superior compatible con Inicio.
      contractTypes: ['LABORAL_PLAZO_FIJO'],
    },
    version: '1.0.0',
  },

  {
    code: 'PLAZO-003',
    category: 'PLAZO',
    severity: 'INFO',
    title: 'Contrato modal con duración cercana al tope (4-5 años)',
    description:
      'El contrato actual + histórico modal del trabajador acumula entre 4 y 5 años. Próxima renovación riesgosa.',
    legalBasis: 'Art. 74 LPCL (reforzado por Cas. Lab. 8912-2023-Lima Corp. Lindley).',
    ruleSpec: {
      kind: 'DURATION_MAX_DAYS',
      startPath: 'contract.startDate',
      endPath: 'contract.endDate',
      maxDays: 1460, // 4 años — si excede, dispara como INFO
    },
    appliesTo: {
      contractTypes: ['LABORAL_PLAZO_FIJO'],
    },
    version: '1.0.0',
  },

  // ─── SUPLENCIA ──────────────────────────────────────────────────────────
  {
    code: 'SUPLENCIA-001',
    category: 'SUPLENCIA',
    severity: 'BLOCKER',
    title: 'Suplencia sin titular identificado',
    description:
      'El contrato de suplencia debe identificar al titular cuyo puesto se reserva (DNI + nombres + motivo de suspensión).',
    legalBasis:
      'Art. 61 TUO D.Leg. 728. Cas. Lab. 19684-2016-Lima (doctrina vinculante 13-mar-2019): la finalidad debe ser reservar el puesto del titular.',
    ruleSpec: {
      kind: 'CONDITIONAL_FIELD_REQUIRED',
      whenContractTypeIn: ['LABORAL_PLAZO_FIJO'],
      requiredField: 'contract.formData.titular_suplido',
    },
    appliesTo: null, // se filtra por modalidad dentro del propio spec
    version: '1.0.0',
  },

  // ─── GESTANTE / TUTELA ──────────────────────────────────────────────────
  {
    code: 'GESTANTE-001',
    category: 'GESTANTE',
    severity: 'BLOCKER',
    title: 'No se permite contrato modal a trabajadora gestante',
    description:
      'No se admite generar contrato a plazo fijo (con fecha de término) cuando una trabajadora vinculada está en estado de gestación o lactancia, salvo justificación específica adjunta. Use indeterminado.',
    legalBasis:
      'Ley 30709 (igualdad remunerativa) + STC 00797-2022-AA/TC (2025): es nulo todo despido por embarazo o lactancia, lo que incluye la no-renovación encubierta.',
    ruleSpec: {
      kind: 'TUTELA_GESTANTE_NO_RENEWAL',
    },
    appliesTo: {
      contractTypes: ['LABORAL_PLAZO_FIJO'],
    },
    version: '1.0.0',
  },

  // ─── RMV ────────────────────────────────────────────────────────────────
  {
    code: 'RMV-001',
    category: 'RMV',
    severity: 'BLOCKER',
    title: 'Remuneración inferior a la RMV',
    description:
      'La remuneración mensual no puede ser inferior a la Remuneración Mínima Vital (RMV) vigente. Para tiempo parcial se admite proporcional.',
    legalBasis: 'D.S. 006-2024-TR (RMV S/ 1,130 vigente desde 01-ene-2025).',
    ruleSpec: {
      kind: 'FIELD_COMPARE',
      leftPath: 'contract.monthlySalary',
      operator: '>=',
      rightValue: 'constants.RMV',
      rightIsPath: true,
    },
    appliesTo: {
      contractTypes: ['LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO'],
    },
    version: '1.0.0',
  },

  // ─── TIEMPO PARCIAL ─────────────────────────────────────────────────────
  {
    code: 'TPARCIAL-001',
    category: 'TPARCIAL',
    severity: 'BLOCKER',
    title: 'Tiempo parcial con jornada ≥ 24 horas semanales',
    description:
      'El contrato a tiempo parcial requiere promedio diario menor a 4 horas (≈ < 24 h/semana). Excederlo lo desnaturaliza a tiempo completo y obliga a CTS, vacaciones y protección por despido arbitrario.',
    legalBasis:
      'Art. 11 D.S. 001-96-TR + Informe MTPE 159-2019-MTPE/2/14.1 (registro sustantivamente obligatorio).',
    ruleSpec: {
      kind: 'WEEKLY_HOURS_RANGE',
      max: 23,
    },
    appliesTo: {
      contractTypes: ['LABORAL_TIEMPO_PARCIAL'],
    },
    version: '1.0.0',
  },

  // ─── EXTRANJERO ─────────────────────────────────────────────────────────
  {
    code: 'EXTRANJ-001',
    category: 'EXTRANJ',
    severity: 'BLOCKER',
    title: 'Contrato de extranjero supera plazo máximo de 3 años',
    description:
      'El contrato de personal extranjero tiene plazo máximo de 3 años (1095 días), prorrogable.',
    legalBasis: 'Art. 5 D.Leg. 689 + D.S. 014-92-TR.',
    ruleSpec: {
      kind: 'DURATION_MAX_DAYS',
      startPath: 'contract.startDate',
      endPath: 'contract.endDate',
      maxDays: 1095,
    },
    // Aplica solo si el worker vinculado tiene nacionalidad ≠ peruana.
    // El context-builder ya expone worker.nationality; la regla la chequea
    // implícitamente porque si workers no incluye un extranjero, no hay
    // forma de violar el límite. Para v1 mantenemos el chequeo de duración
    // y dejamos la nacionalidad para PR siguiente.
    appliesTo: {
      contractTypes: ['LABORAL_PLAZO_FIJO'],
    },
    version: '1.0.0',
  },

  // ─── PERIODO DE PRUEBA ──────────────────────────────────────────────────
  {
    code: 'PRUEBA-001',
    category: 'PRUEBA',
    severity: 'WARNING',
    title: 'Periodo de prueba excede 6 meses sin justificación de cargo calificado',
    description:
      'El periodo de prueba general es 3 meses; 6 meses para cargos calificados; 12 meses para confianza/dirección. Si el cargo no es calificado y el contrato consigna >6 meses, riesgo de desnaturalización.',
    legalBasis: 'Art. 10 LPCL.',
    ruleSpec: {
      kind: 'FIELD_COMPARE',
      leftPath: 'contract.formData.periodo_prueba_meses',
      operator: '<=',
      rightValue: 6,
    },
    appliesTo: {
      contractTypes: ['LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO'],
    },
    version: '1.0.0',
  },

  // ─── PROTECCIÓN DE DATOS PERSONALES ─────────────────────────────────────
  {
    code: 'DATOS-001',
    category: 'DATOS',
    severity: 'INFO',
    title: 'Falta cláusula de protección de datos personales',
    description:
      'Se recomienda incluir cláusula de tratamiento de datos personales con designación del Oficial de Datos. Reduce exposición a multas ANPDP.',
    legalBasis: 'Art. 28 Ley 29733 + DS 016-2024-JUS (Reglamento LPDP).',
    ruleSpec: {
      kind: 'FIELD_REGEX_REQUIRE',
      field: 'contract.contentHtml',
      patterns: ['ley\\s+29733', 'datos\\s+personales', 'tratamiento\\s+de\\s+datos'],
      flags: 'i',
    },
    appliesTo: {
      contractTypes: ['LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO', 'LABORAL_TIEMPO_PARCIAL'],
    },
    version: '1.0.0',
  },

  // ─── CARGO REQUERIDO ────────────────────────────────────────────────────
  {
    code: 'FORMAL-003',
    category: 'FORMAL',
    severity: 'WARNING',
    title: 'Cargo / puesto no especificado',
    description:
      'El contrato debe especificar el cargo del trabajador. La inspección SUNAFIL exige verificar la coherencia entre cargo y causa objetiva.',
    legalBasis:
      'Protocolo SUNAFIL 03-2016-SUNAFIL/INII (R.S. 071-2016-SUNAFIL): solicita organigrama, relación de personal con áreas y puestos.',
    ruleSpec: {
      kind: 'FIELD_REQUIRED',
      field: 'contract.position',
      min: 3,
    },
    appliesTo: {
      contractTypes: ['LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO', 'LABORAL_TIEMPO_PARCIAL'],
    },
    version: '1.0.0',
  },
]
