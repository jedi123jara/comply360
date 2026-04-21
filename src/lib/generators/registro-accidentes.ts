/**
 * Generador: Registro de Accidentes de Trabajo, Enfermedades Ocupacionales
 * e Incidentes Peligrosos
 *
 * Base legal:
 *  - Ley 29783, Art. 28 — Registros obligatorios
 *  - D.S. 005-2012-TR, Art. 33, 110 — Notificación de accidentes
 *  - R.M. 050-2013-TR, Anexo 6 — Formato del Registro
 *  - D.S. 012-2014-TR — Registro Único de Accidentes
 *
 * Plazos de notificación al MTPE (Art. 110 D.S. 005-2012-TR):
 *  - Accidente mortal: **24 horas**
 *  - Accidente incapacitante: **24 horas** (desde que se conoce)
 *  - Enfermedad ocupacional: 24 horas desde que se diagnostica
 *  - Incidente peligroso: 24 horas
 *
 * El registro debe conservarse **10 años** (accidentes) / **20 años** (enfermedades).
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export type TipoEvento = 'accidente_leve' | 'accidente_incapacitante' | 'accidente_mortal' | 'incidente_peligroso' | 'enfermedad_ocupacional'

export type FormaAccidente =
  | 'caida_mismo_nivel'
  | 'caida_distinto_nivel'
  | 'golpe'
  | 'atrapamiento'
  | 'corte'
  | 'quemadura'
  | 'contacto_electrico'
  | 'sobreesfuerzo'
  | 'exposicion_quimico'
  | 'exposicion_biologico'
  | 'accidente_transito'
  | 'otro'

export type ParteCuerpo =
  | 'cabeza'
  | 'cuello'
  | 'torax'
  | 'abdomen'
  | 'espalda'
  | 'miembros_superiores'
  | 'miembros_inferiores'
  | 'multiples'
  | 'no_aplica'

export interface RegistroAccidenteParams {
  /** Tipo de evento. Determina si se requiere notificación 24h. */
  tipo: TipoEvento
  /** Código interno del evento (ej. AT-2026-001). */
  codigo: string
  /** Fecha y hora del evento (ISO datetime). */
  fechaEvento: string
  /** Fecha en que el empleador tomó conocimiento (ISO). */
  fechaConocimiento: string
  /** Lugar exacto del evento. */
  lugar: string
  /** Turno en que ocurrió. */
  turno: 'manana' | 'tarde' | 'noche'

  // === Trabajador afectado ===
  trabajador: {
    nombre: string
    dni: string
    edad?: number
    genero?: 'M' | 'F' | 'otro'
    cargo: string
    area: string
    antiguedadMeses?: number
    regimen?: string // laboral
  }

  // === Descripción del evento ===
  forma: FormaAccidente
  descripcionHechos: string
  /** Cómo se produjo el hecho (secuencia causal). */
  secuenciaCausal?: string
  /** Parte del cuerpo lesionada (para accidentes). */
  parteCuerpo?: ParteCuerpo
  /** Diagnóstico médico (si aplica). */
  diagnostico?: string

  // === Consecuencias ===
  /** Días de descanso médico / incapacidad. 0 si fue leve sin incapacidad. */
  diasIncapacidad: number
  /** Trabajador falleció. Solo true para tipo=accidente_mortal. */
  fallecimiento?: boolean
  /** Costo económico estimado (atención médica + días perdidos + reposición). */
  costoEstimadoSoles?: number

  // === Investigación ===
  /** Causas básicas identificadas (acto inseguro + condición insegura + factor humano). */
  causasBasicas: string[]
  /** Causas inmediatas. */
  causasInmediatas: string[]
  /** Testigos (opcional). */
  testigos?: Array<{ nombre: string; dni?: string; cargo?: string }>

  // === Acciones correctivas ===
  accionesCorrectivas: Array<{
    accion: string
    responsable: string
    plazoDias: number
  }>

  // === Notificación ===
  /** ¿Ya se notificó a MTPE? (para marcar cumplimiento). */
  notificadoMtpe?: boolean
  fechaNotificacionMtpe?: string
  numeroReporteMtpe?: string
}

/** Determina si el evento requiere notificación al MTPE dentro de 24h. */
export function requiereNotificacion24h(tipo: TipoEvento): boolean {
  return (
    tipo === 'accidente_mortal' ||
    tipo === 'accidente_incapacitante' ||
    tipo === 'enfermedad_ocupacional' ||
    tipo === 'incidente_peligroso'
  )
}

/** Calcula días restantes para notificar al MTPE (negativo = vencido). */
export function horasRestantesNotificacion(fechaConocimientoIso: string): number {
  const conocimiento = new Date(fechaConocimientoIso)
  const limite = new Date(conocimiento.getTime() + 24 * 60 * 60 * 1000)
  const diff = limite.getTime() - Date.now()
  return Math.round(diff / (60 * 60 * 1000))
}

const TIPO_LABEL: Record<TipoEvento, string> = {
  accidente_leve: 'Accidente de trabajo leve',
  accidente_incapacitante: 'Accidente de trabajo incapacitante',
  accidente_mortal: 'Accidente de trabajo mortal',
  incidente_peligroso: 'Incidente peligroso',
  enfermedad_ocupacional: 'Enfermedad ocupacional',
}

const FORMA_LABEL: Record<FormaAccidente, string> = {
  caida_mismo_nivel: 'Caída al mismo nivel',
  caida_distinto_nivel: 'Caída a distinto nivel',
  golpe: 'Golpe por/contra objeto',
  atrapamiento: 'Atrapamiento',
  corte: 'Cortadura o laceración',
  quemadura: 'Quemadura',
  contacto_electrico: 'Contacto eléctrico',
  sobreesfuerzo: 'Sobreesfuerzo / movimiento repetitivo',
  exposicion_quimico: 'Exposición a agente químico',
  exposicion_biologico: 'Exposición a agente biológico',
  accidente_transito: 'Accidente de tránsito',
  otro: 'Otro',
}

const PARTE_LABEL: Record<ParteCuerpo, string> = {
  cabeza: 'Cabeza',
  cuello: 'Cuello',
  torax: 'Tórax',
  abdomen: 'Abdomen',
  espalda: 'Espalda',
  miembros_superiores: 'Miembros superiores',
  miembros_inferiores: 'Miembros inferiores',
  multiples: 'Múltiples partes',
  no_aplica: 'No aplica',
}

export function generarRegistroAccidentes(
  params: RegistroAccidenteParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  const fechaLegible = formatFechaLegible(params.fechaEvento)
  const horaEvento = formatHora(params.fechaEvento)
  const fechaConocimientoLegible = formatFechaLegible(params.fechaConocimiento)
  const notifica24h = requiereNotificacion24h(params.tipo)
  const horasRestantes = notifica24h ? horasRestantesNotificacion(params.fechaConocimiento) : null

  const alertaNotificacion = notifica24h
    ? params.notificadoMtpe
      ? `✓ **NOTIFICADO AL MTPE** el ${params.fechaNotificacionMtpe ? formatFechaLegible(params.fechaNotificacionMtpe) : '[fecha]'}${params.numeroReporteMtpe ? ` bajo el N° ${params.numeroReporteMtpe}` : ''}. Cumplimiento del Art. 110 D.S. 005-2012-TR.`
      : horasRestantes !== null && horasRestantes < 0
        ? `⚠ **PLAZO VENCIDO** — La notificación al MTPE debió realizarse dentro de las 24 horas desde el conocimiento del evento (${fechaConocimientoLegible}). Hoy llevan **${Math.abs(horasRestantes)} horas de atraso**. **Notificar DE INMEDIATO** vía sistema SUNAFIL o presencialmente en la Inspección Laboral. La omisión constituye falta GRAVE (D.S. 019-2006-TR).`
        : horasRestantes !== null
          ? `⏱ **PENDIENTE DE NOTIFICACIÓN AL MTPE** — Plazo máximo: 24 horas desde el conocimiento (${fechaConocimientoLegible}). Quedan aprox. **${horasRestantes} horas**. Notificar por el sistema de notificación de accidentes de trabajo del MTPE.`
          : `⏱ **PENDIENTE DE NOTIFICACIÓN AL MTPE** dentro de 24 horas del conocimiento del evento.`
    : `Notificación al MTPE: **no requerida** para este tipo de evento. Registro interno obligatorio por ${params.tipo === 'accidente_leve' ? '10' : '20'} años.`

  const sections: GeneratedSection[] = [
    {
      id: 'datos-empresa',
      numbering: 'I',
      title: 'Datos de la Empresa',
      content: `**Razón social:** ${org.razonSocial}\n**RUC:** ${org.ruc}${org.domicilio ? `\n**Domicilio:** ${org.domicilio}` : ''}${org.sector ? `\n**Sector:** ${org.sector}` : ''}\n**N° de trabajadores:** ${org.totalWorkers}\n\n**Código interno del evento:** ${params.codigo}`,
      baseLegal: 'R.M. 050-2013-TR, Anexo 6',
    },
    {
      id: 'alerta-notificacion',
      numbering: 'II',
      title: 'Estado de Notificación al MTPE',
      content: alertaNotificacion,
      baseLegal: 'Ley 29783, Art. 82 · D.S. 005-2012-TR, Art. 110',
    },
    {
      id: 'datos-evento',
      numbering: 'III',
      title: 'Datos del Evento',
      content: `**Tipo:** ${TIPO_LABEL[params.tipo]}\n**Fecha y hora del evento:** ${fechaLegible} a las ${horaEvento}\n**Fecha en que se conoció:** ${fechaConocimientoLegible}\n**Lugar específico:** ${params.lugar}\n**Turno:** ${params.turno === 'manana' ? 'Mañana' : params.turno === 'tarde' ? 'Tarde' : 'Noche'}`,
      baseLegal: 'R.M. 050-2013-TR, Anexo 6 Sección A',
    },
    {
      id: 'trabajador',
      numbering: 'IV',
      title: 'Datos del Trabajador Afectado',
      content: `**Nombre:** ${params.trabajador.nombre}\n**DNI:** ${params.trabajador.dni}${params.trabajador.edad ? `\n**Edad:** ${params.trabajador.edad} años` : ''}${params.trabajador.genero ? `\n**Género:** ${params.trabajador.genero === 'M' ? 'Masculino' : params.trabajador.genero === 'F' ? 'Femenino' : 'Otro'}` : ''}\n**Cargo:** ${params.trabajador.cargo}\n**Área:** ${params.trabajador.area}${params.trabajador.antiguedadMeses !== undefined ? `\n**Antigüedad:** ${params.trabajador.antiguedadMeses} meses` : ''}${params.trabajador.regimen ? `\n**Régimen:** ${params.trabajador.regimen}` : ''}`,
      baseLegal: 'R.M. 050-2013-TR, Anexo 6 Sección B',
    },
    {
      id: 'descripcion',
      numbering: 'V',
      title: 'Descripción del Hecho',
      content: `**Forma del evento:** ${FORMA_LABEL[params.forma]}${params.parteCuerpo ? `\n**Parte del cuerpo lesionada:** ${PARTE_LABEL[params.parteCuerpo]}` : ''}\n\n**Descripción:**\n${params.descripcionHechos}${params.secuenciaCausal ? `\n\n**Secuencia causal:**\n${params.secuenciaCausal}` : ''}${params.diagnostico ? `\n\n**Diagnóstico médico:**\n${params.diagnostico}` : ''}`,
      baseLegal: 'R.M. 050-2013-TR, Anexo 6 Sección C',
    },
    {
      id: 'consecuencias',
      numbering: 'VI',
      title: 'Consecuencias',
      content: `**Días de descanso médico / incapacidad:** ${params.diasIncapacidad} día${params.diasIncapacidad === 1 ? '' : 's'}${params.fallecimiento ? '\n**Fallecimiento:** SÍ — accidente mortal' : ''}${params.costoEstimadoSoles !== undefined ? `\n**Costo económico estimado:** S/ ${params.costoEstimadoSoles.toLocaleString('es-PE')}` : ''}\n\n**Índice de gravedad del evento:** ${calcularGravedad(params)}`,
      baseLegal: 'R.M. 050-2013-TR · Cálculo Índice de Severidad',
    },
    ...(params.testigos && params.testigos.length > 0
      ? [
          {
            id: 'testigos',
            numbering: 'VII',
            title: 'Testigos',
            content: params.testigos
              .map((t, i) => `${i + 1}. **${t.nombre}**${t.dni ? ` (DNI ${t.dni})` : ''}${t.cargo ? ` — ${t.cargo}` : ''}`)
              .join('\n'),
          },
        ]
      : []),
    {
      id: 'investigacion',
      numbering: params.testigos?.length ? 'VIII' : 'VII',
      title: 'Investigación del Evento',
      content: `**Causas inmediatas (¿qué falló en el momento?):**\n${params.causasInmediatas.map((c) => `- ${c}`).join('\n')}\n\n**Causas básicas (¿por qué falló?):**\n${params.causasBasicas.map((c) => `- ${c}`).join('\n')}\n\nEl Comité SST / Supervisor SST acompaña la investigación según el Art. 52 D.S. 005-2012-TR.`,
      baseLegal: 'Ley 29783, Art. 58 · D.S. 005-2012-TR, Art. 84',
    },
    {
      id: 'acciones-correctivas',
      numbering: params.testigos?.length ? 'IX' : 'VIII',
      title: 'Acciones Correctivas y Preventivas',
      content:
        params.accionesCorrectivas.length === 0
          ? '*Sin acciones correctivas registradas. REVISAR — todo accidente debe generar al menos una acción correctiva.*'
          : params.accionesCorrectivas
              .map((a, i) => {
                const fechaLimite = new Date()
                fechaLimite.setDate(fechaLimite.getDate() + a.plazoDias)
                return `**${i + 1}. ${a.accion}**\n- Responsable: ${a.responsable}\n- Plazo: ${a.plazoDias} días (hasta ${fechaLimite.toLocaleDateString('es-PE')})`
              })
              .join('\n\n'),
      baseLegal: 'Art. 58 Ley 29783',
    },
    {
      id: 'firmas',
      numbering: params.testigos?.length ? 'X' : 'IX',
      title: 'Firmas',
      content: `_____________________________________\n**Jefe Inmediato del Trabajador**\n[Nombre y cargo]\n\n_____________________________________\n**Responsable SST / Comité SST**\n[Nombre y cargo]\n\n_____________________________________\n**${org.representanteLegal ?? 'Representante Legal'}**\n${org.cargoRepresentante ?? 'Gerente General'}\n${org.razonSocial}\n\n---\n\n*Este registro debe conservarse por **${params.tipo === 'enfermedad_ocupacional' ? '20 años' : '10 años'}** conforme al Art. 35 D.S. 005-2012-TR. Copia debe archivarse con el Comité SST.*`,
      baseLegal: 'Art. 35 D.S. 005-2012-TR',
    },
  ]

  // Si requiere notificación 24h, agregamos anexo con plantilla de notificación MTPE
  if (notifica24h && !params.notificadoMtpe) {
    sections.push({
      id: 'anexo-notificacion',
      numbering: 'ANEXO',
      title: 'Plantilla de Notificación al MTPE (24h)',
      content: buildTemplateNotificacionMtpe(params, org),
      baseLegal: 'Art. 110 D.S. 005-2012-TR',
    })
  }

  const markdown = buildMarkdown(org, params, fechaLegible, sections)

  return {
    type: 'registro-accidentes',
    title: `${TIPO_LABEL[params.tipo]} — ${params.codigo} — ${params.trabajador.nombre}`,
    markdown,
    sections,
    legalBasis: [
      'Ley 29783, Art. 28 — Registros obligatorios',
      'Ley 29783, Art. 58 — Investigación de accidentes',
      'Ley 29783, Art. 82 — Notificación de accidentes al MTPE',
      'D.S. 005-2012-TR, Art. 33, 84, 110',
      'R.M. 050-2013-TR, Anexo 6 — Formato referencial',
      'D.S. 012-2014-TR — Registro Único de Accidentes',
    ],
    metadata: {
      tipo: params.tipo,
      codigo: params.codigo,
      fechaEvento: params.fechaEvento,
      diasIncapacidad: params.diasIncapacidad,
      requiereNotificacion24h: notifica24h,
      notificadoMtpe: params.notificadoMtpe ?? false,
      totalAccionesCorrectivas: params.accionesCorrectivas.length,
      vigenciaAnos: params.tipo === 'enfermedad_ocupacional' ? 20 : 10,
    },
  }
}

/* ── Helpers ───────────────────────────────────────────────────── */

function calcularGravedad(p: RegistroAccidenteParams): string {
  if (p.tipo === 'accidente_mortal') return 'CATASTRÓFICO — fallecimiento'
  if (p.diasIncapacidad === 0) return 'LEVE — sin días perdidos'
  if (p.diasIncapacidad <= 3) return 'MENOR — hasta 3 días'
  if (p.diasIncapacidad <= 30) return 'MODERADO — 4-30 días'
  if (p.diasIncapacidad <= 90) return 'GRAVE — 31-90 días'
  return 'MUY GRAVE — >90 días o invalidez'
}

function buildTemplateNotificacionMtpe(
  p: RegistroAccidenteParams,
  org: GeneratorOrgContext,
): string {
  return `Señor/a Inspector/a de Trabajo — Ministerio de Trabajo y Promoción del Empleo

Por la presente, **${org.razonSocial}** (RUC ${org.ruc}) cumple con notificar el siguiente evento dentro del plazo de 24 horas establecido en el Art. 110 del D.S. 005-2012-TR:

**Tipo de evento:** ${TIPO_LABEL[p.tipo]}
**Código interno:** ${p.codigo}
**Fecha y hora del evento:** ${formatFechaLegible(p.fechaEvento)} a las ${formatHora(p.fechaEvento)}
**Lugar:** ${p.lugar}

**Trabajador afectado:**
- Nombre: ${p.trabajador.nombre}
- DNI: ${p.trabajador.dni}
- Cargo: ${p.trabajador.cargo}
- Área: ${p.trabajador.area}

**Descripción breve del hecho:**
${p.descripcionHechos}

**Consecuencias:**
- Días de descanso médico: ${p.diasIncapacidad}${p.fallecimiento ? '\n- **FALLECIMIENTO**' : ''}
${p.diagnostico ? `- Diagnóstico: ${p.diagnostico}` : ''}

**Acciones inmediatas adoptadas:** [resumen de acciones 1-2 líneas]

La empresa se compromete a remitir el informe final de la investigación en un plazo no mayor de 10 días hábiles, junto con las acciones correctivas implementadas.

Atentamente,

_____________________________________
**${org.representanteLegal ?? '[Representante Legal]'}**
${org.cargoRepresentante ?? 'Gerente General'}
${org.razonSocial} · RUC ${org.ruc}
${org.emailContacto ? `Email: ${org.emailContacto}` : ''}

---

*Presentar esta notificación por: (a) el sistema de notificación de accidentes en [www.gob.pe/mtpe](https://www.gob.pe/mtpe), (b) mesa de partes del MTPE o SUNAFIL, o (c) correo certificado con cargo. Conservar el cargo de recepción junto al presente registro.*`
}

function buildMarkdown(
  org: GeneratorOrgContext,
  p: RegistroAccidenteParams,
  fecha: string,
  sections: GeneratedSection[],
): string {
  const header = `# REGISTRO DE ${TIPO_LABEL[p.tipo].toUpperCase()}

**Código:** ${p.codigo}
**Empresa:** ${org.razonSocial} (RUC ${org.ruc})
**Fecha del evento:** ${fecha}
**Trabajador afectado:** ${p.trabajador.nombre} — DNI ${p.trabajador.dni}
**Base legal:** Ley 29783, Art. 28; D.S. 005-2012-TR, Art. 33 y 110; R.M. 050-2013-TR Anexo 6

---

`
  const body = sections
    .map(
      (s) =>
        `## ${s.numbering}. ${s.title}\n\n${s.content}${
          s.baseLegal ? `\n\n*Base legal: ${s.baseLegal}*` : ''
        }\n`,
    )
    .join('\n')

  return header + body
}

function formatFechaLegible(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatHora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}
