import type { PlanFeature } from '@/lib/plan-features'
import { AREAS } from '@/lib/compliance/questions/types'

/**
 * Textos de la "vista previa" de funciones de un plan superior.
 *
 * Público: responsables de RR.HH. y gerentes de PYMES sin formación legal.
 * Reglas: tuteo peruano neutro, frases cortas, sin jerga (nada de "upgrade",
 * "feature", "ROI"). Cada función explica QUÉ HACE en 2-3 líneas y da un
 * EJEMPLO concreto de beneficio.
 *
 * Es un `Record<PlanFeature, …>`: si se agrega una función nueva en
 * `plan-features.ts`, TypeScript obliga a escribir su texto aquí.
 */
export interface FeaturePreviewCopy {
  /** Nombre claro de la función. */
  title: string
  /** Qué hace, en 2-3 líneas simples. */
  summary: string
  /** Ejemplo concreto de cómo te ayuda. */
  example: string
}

export const FEATURE_PREVIEW_COPY: Record<PlanFeature, FeaturePreviewCopy> = {
  calculadoras: {
    title: 'Calculadoras laborales',
    summary:
      'Calcula CTS, gratificaciones, vacaciones, liquidaciones y más según el régimen de cada trabajador, con los valores vigentes en Perú.',
    example:
      'Antes de pagar una liquidación, revisas en un minuto si el monto está bien y evitas pagar de menos (o de más).',
  },
  workers: {
    title: 'Trabajadores y legajo digital',
    summary:
      'Registra a tu personal con su régimen, contrato, sueldo y aportes. Guarda sus documentos en un legajo digital que te dice qué falta.',
    example:
      'Si SUNAFIL te pide el legajo de un trabajador, lo tienes completo y ordenado en segundos.',
  },
  alertas_basicas: {
    title: 'Alertas de vencimientos',
    summary:
      'Te avisa antes de que venza un contrato, un examen médico o un pago como la CTS, ordenado por urgencia para que sepas qué atender primero.',
    example:
      'Recibes un aviso 30 días antes de que venza un contrato a plazo fijo y decides a tiempo si lo renuevas.',
  },
  calendario: {
    title: 'Calendario de obligaciones',
    summary:
      'Reúne en un solo lugar las fechas clave: CTS, gratificaciones, AFP, PLAME y vencimientos de tu personal. Puedes pasarlo a Google Calendar u Outlook.',
    example: 'El depósito de CTS de mayo ya no se te pasa: lo ves marcado con anticipación.',
  },
  contratos: {
    title: 'Contratos y documentos laborales',
    summary:
      'Crea, guarda y organiza los contratos de tus trabajadores, y revisa que el tipo de contrato corresponda al régimen de cada uno.',
    example:
      'Generas el contrato de un nuevo ingreso con sus datos ya llenados, listo para firmar.',
  },
  diagnostico: {
    title: 'Diagnóstico SUNAFIL y plan de acción',
    summary: `Respondes preguntas guiadas sobre las ${AREAS.length} áreas que revisa SUNAFIL. Te muestra tu nivel de cumplimiento, la multa a la que estás expuesto y una lista de tareas para corregir lo que falta.`,
    example:
      'Descubres que te falta el registro de control de asistencia y lo corriges antes de una inspección, no después.',
  },
  simulacro_basico: {
    title: 'Simulacro de inspección SUNAFIL',
    summary:
      'Practica una inspección antes de que llegue la real: el sistema te pide los documentos que pediría un inspector y al final te entrega un acta con lo que falta.',
    example:
      'Detectas que tu reglamento interno está desactualizado y lo arreglas con calma, sin un inspector esperando.',
  },
  reportes_pdf: {
    title: 'Reportes y documentos en PDF',
    summary:
      'Genera reportes de cumplimiento, planilla y SST listos para imprimir o enviar, además de documentos obligatorios como políticas internas y el análisis de igualdad salarial.',
    example:
      'Le envías a gerencia un reporte claro del estado de la empresa sin armar nada a mano en Excel.',
  },
  ia_contratos: {
    title: 'Plantillas propias y asistentes de decisiones',
    summary:
      'Sube el contrato que ya revisó tu abogado, marca los datos que cambian y genera uno por trabajador en pocos clics. Incluye asistentes que te guían antes de contratar, renovar o cesar a alguien.',
    example:
      'Preparas los contratos de 10 nuevos ingresos en minutos, con tu propio modelo y sin errores de tipeo.',
  },
  asistente_ia: {
    title: 'Asistente laboral con IA',
    summary:
      'Hazle preguntas laborales en palabras simples y te responde con base en la normativa peruana, indicando la norma en la que se apoya para que puedas verificarla.',
    example:
      '¿Le toca gratificación completa a alguien que entró en mayo? Lo preguntas y en segundos tienes la respuesta con su base legal.',
  },
  review_ia: {
    title: 'Revisión de contratos con IA',
    summary:
      'Sube un contrato y la IA lo revisa cláusula por cláusula: te marca los puntos de riesgo y te sugiere cómo corregirlos. También verifica los documentos del legajo que suben tus trabajadores, como el DNI.',
    example:
      'Antes de firmar, detectas que a un contrato a plazo fijo le falta la causa objetiva, un error que puede convertirlo en indefinido.',
  },
  simulacro_completo: {
    title: 'Simulacro SUNAFIL completo',
    summary:
      'Un inspector virtual conversa contigo y revisa tu empresa según tu sector. Te muestra cuánto se reduce la multa si corriges antes de una inspección.',
    example:
      'Tu equipo practica cómo responder a un inspector, para que el día de la visita nadie se ponga nervioso.',
  },
  denuncias: {
    title: 'Canal de denuncias',
    summary:
      'Un enlace público donde tus trabajadores pueden reportar hostigamiento u otros problemas, incluso de forma anónima. Tú das seguimiento a cada caso con su historial.',
    example:
      'Cumples con tener un canal para denuncias de hostigamiento sexual (Ley 27942) sin montarlo por tu cuenta.',
  },
  sst_completo: {
    title: 'Seguridad y Salud en el Trabajo (SST)',
    summary:
      'Organiza lo que pide la Ley 29783: matriz IPERC, plan anual, comité, exámenes médicos, accidentes y EPP. Te recuerda qué vence y te ayuda a preparar los registros obligatorios.',
    example:
      'Si ocurre un accidente, sabes en qué plazo notificarlo y tienes el formato listo.',
  },
  api_access: {
    title: 'Conexión con tus otros sistemas',
    summary:
      'Permite que tu sistema contable o de planillas se comunique con Comply360 de forma automática (mediante API), para que los datos pasen solos.',
    example:
      'Registras un trabajador en tu sistema de planillas y también aparece aquí, sin volver a digitarlo.',
  },
  gamificacion: {
    title: 'Retos y logros de cumplimiento',
    summary:
      'Convierte el cumplimiento en metas: tu equipo suma puntos y desbloquea logros al completar tareas, y ves la racha de tu empresa.',
    example:
      'Tu equipo de RR.HH. se motiva a cerrar los pendientes del legajo antes de fin de mes.',
  },
  attendance_selfie: {
    title: 'Control de asistencia digital',
    summary:
      'Tus trabajadores marcan entrada y salida desde el celular con foto y ubicación. Registra tardanzas y justificaciones para cumplir con el control digital del tiempo de trabajo.',
    example:
      'Si te piden el registro de asistencia en una inspección, lo tienes listo y ordenado por fecha.',
  },
  organigrama: {
    title: 'Organigrama y responsables',
    summary:
      'Dibuja la estructura de tu empresa (áreas, cargos y quién reporta a quién) y asigna los roles que la ley exige, como el comité de SST.',
    example:
      'Ves de un vistazo qué responsable obligatorio te falta designar y lo completas en el momento.',
  },
  organigrama_completo: {
    title: 'Organigrama avanzado',
    summary:
      'Revisa tu organigrama con IA y te sugiere mejoras. Guarda cómo estaba la estructura en cada fecha y crea un enlace de solo lectura para auditores.',
    example:
      'Un auditor revisa tu estructura desde un enlace seguro, sin que tengas que enviarle archivos sueltos.',
  },
  multi_empresa: {
    title: 'Varias empresas en una sola cuenta',
    summary:
      'Administra más de una empresa (por ejemplo, un grupo empresarial) desde la misma cuenta y cambia entre ellas sin cerrar sesión.',
    example:
      'Si tienes dos razones sociales, controlas el cumplimiento de ambas sin duplicar usuarios.',
  },
  reportes_consolidados: {
    title: 'Reportes de todo tu grupo',
    summary:
      'Une en un solo reporte la información de cumplimiento de todas las empresas de tu grupo.',
    example: 'El directorio ve en una sola página qué empresa del grupo tiene más riesgo.',
  },
  csm_dedicado: {
    title: 'Asesor dedicado a tu cuenta',
    summary:
      'Una persona de Comply360 acompaña a tu empresa: te ayuda a configurar todo y revisa contigo los avances.',
    example:
      'Tienes a quién recurrir cuando necesitas ayuda para configurar algo o entender un reporte.',
  },
  sla_garantizado: {
    title: 'Atención con tiempos garantizados',
    summary:
      'Tiempos de respuesta y disponibilidad comprometidos por contrato, para operaciones que no pueden esperar.',
    example: 'Si algo falla en pleno cierre de planilla, sabes en cuánto tiempo te atenderán.',
  },
  webhooks_salientes: {
    title: 'Avisos automáticos a tus sistemas',
    summary:
      'Cuando algo cambia en Comply360 (por ejemplo, aparece una alerta nueva), se avisa solo a tus otros sistemas.',
    example:
      'Una alerta crítica crea un pendiente en tu sistema interno sin que nadie la copie a mano.',
  },
  white_label: {
    title: 'Tu marca en la plataforma',
    summary: 'Muestra el logo y los colores de tu empresa en la plataforma y en los documentos.',
    example: 'Tus trabajadores ven el portal con la marca de tu empresa.',
  },
  integracion_planilla: {
    title: 'Integración con tu sistema de planillas',
    summary:
      'Conecta Comply360 con sistemas como Buk, Ofisis o Starsoft para que los datos de tu personal se mantengan iguales en ambos lados.',
    example: 'Un cambio de sueldo hecho en tu planilla se refleja aquí sin volver a digitarlo.',
  },
  t_registro_export: {
    title: 'Exportación a T-REGISTRO',
    summary:
      'Prepara el archivo para registrar a tus trabajadores en el T-REGISTRO de SUNAT con los datos que ya tienes cargados.',
    example:
      'Registras un nuevo ingreso dentro del plazo (un día hábil) sin llenar el formulario campo por campo.',
  },
  sync_planilla_externa: {
    title: 'Sincronización con tu planilla externa',
    summary:
      'Mantiene los datos de tus trabajadores iguales en Comply360 y en tu sistema de planillas, en ambos sentidos.',
    example: 'Das de alta a alguien en un sistema y aparece en el otro automáticamente.',
  },
  historial_extendido_12m: {
    title: 'Historial de 12 meses por trabajador',
    summary:
      'Guarda los cambios de cada trabajador (sueldo, cargo, contrato) durante el último año, con fecha y responsable.',
    example:
      'Si te preguntan cuándo se le subió el sueldo a alguien, lo ves en su historial al instante.',
  },
  historial_infinito: {
    title: 'Historial completo por trabajador',
    summary:
      'Guarda todos los cambios de cada trabajador desde que lo registraste, sin límite de tiempo.',
    example:
      'Ante un reclamo, muestras cómo cambió la relación laboral desde el primer día.',
  },
}

/** Texto cuando no sabemos qué función se intentó usar. */
export const GENERIC_PREVIEW_COPY: Omit<FeaturePreviewCopy, 'example'> & { example: null } = {
  title: 'Esta función es parte de un plan superior',
  summary:
    'Lo que intentaste abrir no está incluido en tu plan actual. Revisa qué incluye cada plan y elige el que mejor se ajuste a tu empresa.',
  example: null,
}
