/**
 * Generador: Registro de Capacitación SST
 *
 * Base legal:
 *  - Ley 29783, Art. 35 — Capacitación mínima 4/año
 *  - D.S. 005-2012-TR, Art. 28-29
 *  - R.M. 050-2013-TR, Anexo 5 — Registro de Capacitación, Entrenamiento, Inducción y Simulacros
 *
 * Cada sesión genera un acta individual que debe firmarse por:
 *  - Capacitador
 *  - Todos los participantes (lista de asistencia)
 *  - Representante del empleador
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export interface ParticipanteCapacitacion {
  nombre: string
  dni: string
  cargo?: string
  area?: string
  /** Firma presencial (true) o virtual con token. */
  asistio?: boolean
}

export interface CapacitacionSstParams {
  /** Tema de la capacitación. */
  tema: string
  /** Objetivo general. */
  objetivo: string
  /** Fecha (ISO). */
  fecha: string
  horaInicio: string // "14:00"
  horaFin: string // "17:00"
  /** Modalidad. */
  modalidad: 'presencial' | 'virtual' | 'mixta'
  /** Capacitador. */
  capacitador: {
    nombre: string
    cargo?: string
    especialidad?: string
    registro?: string // CIP, colegiatura, certificación
  }
  /** Contenido temático cubierto (bullet points). */
  contenidos: string[]
  /** Metodología usada. */
  metodologia?: string
  /** Material de apoyo entregado. */
  materialEntregado?: string[]
  /** Evaluación realizada (descripción). */
  evaluacion?: string
  /** Nota promedio obtenida (0-20 o %). */
  notaPromedio?: number
  /** Participantes. */
  participantes: ParticipanteCapacitacion[]
  /** Lugar físico o plataforma virtual. */
  lugar: string
}

export function generarCapacitacionSst(
  params: CapacitacionSstParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  if (params.participantes.length === 0) {
    throw new Error('Se requiere al menos 1 participante en la capacitación.')
  }

  const fechaLegible = formatFechaLegible(params.fecha)
  const duracionMinutos = calcularDuracion(params.horaInicio, params.horaFin)
  const duracionHoras = Math.round((duracionMinutos / 60) * 10) / 10

  const sections: GeneratedSection[] = [
    {
      id: 'identificacion',
      numbering: 'I',
      title: 'Identificación de la Capacitación',
      content: `**Empresa:** ${org.razonSocial} · RUC ${org.ruc}\n**Tema:** ${params.tema}\n**Objetivo:** ${params.objetivo}\n**Fecha:** ${fechaLegible}\n**Horario:** ${params.horaInicio} - ${params.horaFin} (${duracionHoras} horas)\n**Lugar / Plataforma:** ${params.lugar}\n**Modalidad:** ${params.modalidad === 'presencial' ? 'Presencial' : params.modalidad === 'virtual' ? 'Virtual (con conexión sincrónica verificada)' : 'Mixta'}\n**Participantes:** ${params.participantes.length}`,
      baseLegal: 'Ley 29783, Art. 35 · R.M. 050-2013-TR Anexo 5',
    },
    {
      id: 'capacitador',
      numbering: 'II',
      title: 'Capacitador',
      content: `**Nombre:** ${params.capacitador.nombre}${params.capacitador.cargo ? `\n**Cargo:** ${params.capacitador.cargo}` : ''}${params.capacitador.especialidad ? `\n**Especialidad:** ${params.capacitador.especialidad}` : ''}${params.capacitador.registro ? `\n**Registro / Colegiatura:** ${params.capacitador.registro}` : ''}`,
      baseLegal: 'Art. 35 Ley 29783',
    },
    {
      id: 'contenidos',
      numbering: 'III',
      title: 'Contenidos Desarrollados',
      content: params.contenidos.map((c, i) => `${i + 1}. ${c}`).join('\n') +
        (params.metodologia ? `\n\n**Metodología:** ${params.metodologia}` : '') +
        (params.materialEntregado && params.materialEntregado.length > 0
          ? `\n\n**Material entregado:**\n${params.materialEntregado.map((m) => `- ${m}`).join('\n')}`
          : ''),
      baseLegal: 'Art. 28 D.S. 005-2012-TR',
    },
    ...(params.evaluacion
      ? [
          {
            id: 'evaluacion',
            numbering: 'IV',
            title: 'Evaluación',
            content: `${params.evaluacion}${params.notaPromedio !== undefined ? `\n\n**Nota promedio:** ${params.notaPromedio}` : ''}`,
            baseLegal: 'Art. 29 D.S. 005-2012-TR',
          },
        ]
      : []),
    {
      id: 'participantes',
      numbering: params.evaluacion ? 'V' : 'IV',
      title: `Lista de Asistencia (${params.participantes.filter((p) => p.asistio !== false).length}/${params.participantes.length})`,
      content: `| N° | Nombre | DNI | Cargo | Área | Firma |\n|---|---|---|---|---|---|\n${params.participantes
        .map(
          (p, i) =>
            `| ${i + 1} | ${p.nombre} | ${p.dni} | ${p.cargo ?? '—'} | ${p.area ?? '—'} | ${p.asistio === false ? '(no asistió)' : '_______________'} |`,
        )
        .join('\n')}`,
      baseLegal: 'R.M. 050-2013-TR Anexo 5',
    },
    {
      id: 'cierre',
      numbering: params.evaluacion ? 'VI' : 'V',
      title: 'Cierre del Registro',
      content: `Los participantes firman esta acta en señal de conformidad de haber recibido la capacitación completa, con la metodología indicada, por el tiempo consignado y con el material entregado.\n\nEl capacitador y el representante del empleador firman también confirmando el desarrollo de la capacitación.\n\n_____________________________________\n**${params.capacitador.nombre}**\n${params.capacitador.cargo ?? 'Capacitador'}\n\n_____________________________________\n**${org.representanteLegal ?? 'Representante del Empleador'}**\n${org.cargoRepresentante ?? 'Representante Legal'}\n${org.razonSocial}`,
      baseLegal: 'Art. 29 D.S. 005-2012-TR',
    },
  ]

  const markdown = buildMarkdown(org, params, fechaLegible, sections)

  return {
    type: 'capacitacion-sst',
    title: `Registro Capacitación SST — ${params.tema} — ${fechaLegible}`,
    markdown,
    sections,
    legalBasis: [
      'Ley 29783, Art. 35 — Capacitación mínima 4/año',
      'D.S. 005-2012-TR, Art. 28-29',
      'R.M. 050-2013-TR, Anexo 5',
    ],
    metadata: {
      tema: params.tema,
      fecha: params.fecha,
      duracionHoras,
      totalParticipantes: params.participantes.length,
      participantesAsistieron: params.participantes.filter((p) => p.asistio !== false).length,
      modalidad: params.modalidad,
      notaPromedio: params.notaPromedio,
    },
  }
}

function calcularDuracion(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  return (hf * 60 + mf) - (hi * 60 + mi)
}

function buildMarkdown(
  org: GeneratorOrgContext,
  params: CapacitacionSstParams,
  fecha: string,
  sections: GeneratedSection[],
): string {
  const header = `# REGISTRO DE CAPACITACIÓN EN SST

**Empresa:** ${org.razonSocial}
**RUC:** ${org.ruc}
**Tema:** ${params.tema}
**Fecha:** ${fecha}
**Base legal:** Ley 29783, Art. 35 · R.M. 050-2013-TR Anexo 5

---

`
  const body = sections
    .map((s) => `## ${s.numbering}. ${s.title}\n\n${s.content}${s.baseLegal ? `\n\n*Base legal: ${s.baseLegal}*` : ''}\n`)
    .join('\n')
  return header + body
}

function formatFechaLegible(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}
