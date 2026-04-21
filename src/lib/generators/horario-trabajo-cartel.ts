/**
 * Generador: Cartel de Horario de Trabajo
 *
 * Base legal:
 *  - D.S. 004-2006-TR, Art. 5 — Exhibición de horarios en lugar visible
 *  - D.S. 007-2002-TR, Art. 7 — Refrigerio mínimo 45 min si jornada ≥ 4h
 *
 * Cartel obligatorio que debe exhibirse en lugar visible del centro de trabajo.
 * Generamos un documento listo para imprimir en A3/A4 grande.
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export interface TurnoHorario {
  nombre: string // ej. "Turno Mañana", "Administrativo"
  horaIngreso: string // HH:MM
  horaSalida: string // HH:MM
  /** Día a día (opcional). Si no se especifica, aplica todos los días. */
  dias?: string // ej. "Lunes a Viernes"
  refrigerioInicio?: string
  refrigerioFin?: string
  minutosRefrigerio?: number
}

export interface HorarioCartelParams {
  /** Fecha de aprobación / vigencia. */
  fechaVigencia: string
  /** Turnos presentes en la empresa. */
  turnos: TurnoHorario[]
  /** Excepciones o notas (ej. "viernes sale a 16:00", "feriados...") */
  observaciones?: string
}

export function generarHorarioTrabajoCartel(
  params: HorarioCartelParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  if (params.turnos.length === 0) {
    throw new Error('Se requiere al menos 1 turno.')
  }

  const fechaLegible = formatFechaLegible(params.fechaVigencia)

  const sections: GeneratedSection[] = [
    {
      id: 'empresa',
      numbering: 'I',
      title: 'Empresa',
      content: `**${org.razonSocial}** (RUC ${org.ruc})${org.domicilio ? ` · ${org.domicilio}` : ''}\n\n**Vigencia:** desde el ${fechaLegible} hasta su modificación.`,
      baseLegal: 'D.S. 004-2006-TR, Art. 5',
    },
    {
      id: 'turnos',
      numbering: 'II',
      title: `Horarios de Trabajo (${params.turnos.length} turnos)`,
      content: buildTurnosTable(params.turnos),
      baseLegal: 'D.S. 007-2002-TR · D.S. 004-2006-TR',
    },
    {
      id: 'marco-legal',
      numbering: 'III',
      title: 'Marco Legal Aplicable',
      content: `- **Jornada máxima**: 8 horas diarias o 48 horas semanales (Constitución, Art. 25).\n- **Refrigerio**: mínimo 45 minutos, no es parte de la jornada salvo acuerdo distinto (D.S. 007-2002-TR, Art. 7).\n- **Descanso semanal**: 24 horas consecutivas, preferentemente en día domingo (D.Leg. 713).\n- **Horas extras**: voluntarias, sobretasa 25% las primeras 2h y 35% las siguientes (D.S. 007-2002-TR, Art. 10).\n- **Feriados**: remuneración adicional según Ley 27671.\n\n**Derecho a paralizar labores** ante peligro inminente sin represalias (Art. 63 Ley 29783).`,
      baseLegal: 'Constitución Art. 25 · D.S. 007-2002-TR · D.Leg. 713',
    },
    ...(params.observaciones?.trim()
      ? [
          {
            id: 'observaciones',
            numbering: 'IV',
            title: 'Observaciones',
            content: params.observaciones,
          },
        ]
      : []),
    {
      id: 'exhibicion',
      numbering: params.observaciones?.trim() ? 'V' : 'IV',
      title: 'Instrucciones de Exhibición',
      content: `Este cartel debe exhibirse en **lugar visible del centro de trabajo**, en tamaño mínimo A3, impreso con letra legible a 1-2 metros.\n\nEl incumplimiento de la exhibición del horario constituye infracción LEVE según el D.S. 019-2006-TR.\n\n**Aprobado por:**\n\n_____________________________________\n**${org.representanteLegal ?? 'Representante Legal'}**\n${org.cargoRepresentante ?? 'Gerente General'}\n${org.razonSocial}`,
      baseLegal: 'D.S. 019-2006-TR',
    },
  ]

  const markdown = buildMarkdown(org, fechaLegible, sections)

  return {
    type: 'horario-trabajo-cartel',
    title: `Cartel de Horario de Trabajo — ${org.razonSocial}`,
    markdown,
    sections,
    legalBasis: [
      'D.S. 004-2006-TR, Art. 5 — Exhibición',
      'D.S. 007-2002-TR, Art. 7 — Refrigerio',
      'Constitución Art. 25 — Jornada',
    ],
    metadata: {
      fechaVigencia: params.fechaVigencia,
      totalTurnos: params.turnos.length,
    },
  }
}

function buildTurnosTable(turnos: TurnoHorario[]): string {
  const rows = turnos
    .map(
      (t, i) =>
        `| ${i + 1} | **${t.nombre}** | ${t.dias ?? 'Todos los días laborables'} | ${t.horaIngreso} | ${t.horaSalida} | ${t.refrigerioInicio && t.refrigerioFin ? `${t.refrigerioInicio}–${t.refrigerioFin}` : t.minutosRefrigerio ? `${t.minutosRefrigerio} min` : '—'} |`,
    )
    .join('\n')
  return `| # | Turno | Días | Ingreso | Salida | Refrigerio |\n|---|---|---|---|---|---|\n${rows}`
}

function buildMarkdown(org: GeneratorOrgContext, fecha: string, sections: GeneratedSection[]): string {
  const header = `# HORARIO DE TRABAJO — CARTEL OFICIAL

**${org.razonSocial}** · RUC ${org.ruc}
**Vigente desde:** ${fecha}
**Base legal:** D.S. 004-2006-TR, Art. 5

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
