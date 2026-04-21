/**
 * Generador: Mapa de Riesgos
 *
 * Base legal:
 *  - D.S. 005-2012-TR, Art. 35-e
 *  - NTP 399.010-1 — Señales de seguridad (colores y forma)
 *  - R.M. 050-2013-TR
 *
 * El "Mapa de Riesgos" documentado incluye descripción de áreas, peligros
 * identificados por zona y la señalética que debe exhibirse. No sustituye
 * el diagrama gráfico físico del centro de trabajo, pero documenta su contenido.
 */
import type { GeneratedDocument, GeneratedSection, GeneratorOrgContext } from './types'

export type TipoSenal =
  | 'prohibicion' // roja circular con barra diagonal
  | 'obligacion' // azul circular
  | 'advertencia' // amarilla triangular
  | 'salvamento' // verde cuadrada
  | 'incendio' // roja cuadrada

export interface AreaMapa {
  nombre: string
  /** Ubicación física (piso, sector). */
  ubicacion?: string
  /** Peligros identificados en esta área. */
  peligros: string[]
  /** Señalética que debe exhibirse. */
  senales: Array<{
    tipo: TipoSenal
    simbolo: string // ej. "Uso obligatorio de casco"
  }>
  /** Equipos de emergencia presentes (extintor, botiquín, ducha, etc.). */
  equipamientoEmergencia?: string[]
}

export interface MapaRiesgosParams {
  fechaElaboracion: string
  responsable: string
  /** Dirección del centro de trabajo cubierto por el mapa. */
  direccionCentro: string
  areas: AreaMapa[]
  /** Próxima revisión (default +1 año). */
  proximaRevision?: string
  /** Indicación de exhibición (dónde se pondrá el mapa físico). */
  lugarExhibicion: string
}

const SENAL_LABEL: Record<TipoSenal, string> = {
  prohibicion: 'Prohibición (rojo circular)',
  obligacion: 'Obligación (azul circular)',
  advertencia: 'Advertencia (amarillo triangular)',
  salvamento: 'Salvamento / Escape (verde cuadrado)',
  incendio: 'Equipo contra incendios (rojo cuadrado)',
}

export function generarMapaRiesgos(
  params: MapaRiesgosParams,
  org: GeneratorOrgContext,
): GeneratedDocument {
  if (params.areas.length === 0) {
    throw new Error('Se requiere al menos 1 área identificada.')
  }

  const fechaLegible = formatFechaLegible(params.fechaElaboracion)
  const proximaRevision =
    params.proximaRevision || formatFechaLegible(addYears(params.fechaElaboracion, 1))

  const totalPeligros = params.areas.reduce((s, a) => s + a.peligros.length, 0)
  const totalSenales = params.areas.reduce((s, a) => s + a.senales.length, 0)

  const sections: GeneratedSection[] = [
    {
      id: 'identificacion',
      numbering: 'I',
      title: 'Identificación del Mapa',
      content: `**Empresa:** ${org.razonSocial} · RUC ${org.ruc}\n**Centro de trabajo:** ${params.direccionCentro}\n**Responsable:** ${params.responsable}\n**Fecha de elaboración:** ${fechaLegible}\n**Próxima revisión:** ${proximaRevision}\n**Lugar de exhibición:** ${params.lugarExhibicion}\n\n**Estadísticas:**\n- Áreas cubiertas: **${params.areas.length}**\n- Peligros identificados: **${totalPeligros}**\n- Señales requeridas: **${totalSenales}**`,
      baseLegal: 'D.S. 005-2012-TR, Art. 35-e',
    },
    {
      id: 'metodologia',
      numbering: 'II',
      title: 'Metodología y Normas de Señalética',
      content: `El presente Mapa de Riesgos se elaboró siguiendo:\n\n- **Norma Técnica Peruana NTP 399.010-1** — Señales de seguridad (colores y formas estándar)\n- **R.M. 050-2013-TR** — Formato referencial de mapa de riesgos\n- Los resultados de la Matriz IPERC vigente\n\n**Colores y formas de las señales:**\n\n| Color + Forma | Significado | Uso |\n|---|---|---|\n| Rojo + círculo con barra | PROHIBICIÓN | No fumar, no pasar, etc. |\n| Azul + círculo | OBLIGACIÓN | Uso de EPP obligatorio |\n| Amarillo + triángulo | ADVERTENCIA | Peligro, alto voltaje, resbaloso |\n| Verde + cuadrado | SALVAMENTO | Salida de emergencia, primeros auxilios |\n| Rojo + cuadrado | INCENDIO | Extintor, hidrante, alarma |\n\nLas señales deben estar **a una altura de 1.5 a 2 metros**, iluminadas si aplica, y mantenerse limpias y visibles.`,
      baseLegal: 'NTP 399.010-1 · R.M. 050-2013-TR',
    },
    ...params.areas.map((area, idx) => ({
      id: `area-${idx + 1}`,
      numbering: `III.${idx + 1}`,
      title: `Área: ${area.nombre}`,
      content: buildAreaContent(area),
      baseLegal: 'Art. 57 Ley 29783 · D.S. 005-2012-TR',
    })),
    {
      id: 'checklist-senaletica',
      numbering: 'IV',
      title: 'Checklist de Señalética Requerida',
      content: buildChecklistSenaletica(params.areas),
      baseLegal: 'NTP 399.010-1',
    },
    {
      id: 'instrucciones-exhibicion',
      numbering: 'V',
      title: 'Instrucciones de Exhibición',
      content: `Este mapa debe:\n\n1. **Exhibirse físicamente** en ${params.lugarExhibicion}, en tamaño mínimo A2 con letras legibles a 2 metros.\n2. **Actualizarse** al menos anualmente o ante cambios físicos del centro (nuevas áreas, reubicación, nuevos equipos).\n3. **Incluirse en la inducción SST** de todo nuevo trabajador.\n4. **Estar disponible** para SUNAFIL en cualquier inspección.\n5. Complementarse con un **diagrama o plano** del centro de trabajo señalando las ubicaciones de cada área.`,
      baseLegal: 'D.S. 005-2012-TR Art. 35-e',
    },
    {
      id: 'firmas',
      numbering: 'VI',
      title: 'Firmas y Aprobación',
      content: `_____________________________________\n**${params.responsable}**\nResponsable de la elaboración\n\n_____________________________________\n**${org.representanteLegal ?? 'Representante del Empleador'}**\n${org.cargoRepresentante ?? 'Representante Legal'}\n${org.razonSocial}\n\n_____________________________________\n**${org.totalWorkers >= 20 ? 'Presidente del Comité SST' : 'Supervisor SST'}**`,
      baseLegal: 'Art. 52 D.S. 005-2012-TR',
    },
  ]

  const markdown = buildMarkdown(org, fechaLegible, sections)

  return {
    type: 'mapa-riesgos',
    title: `Mapa de Riesgos — ${org.razonSocial}`,
    markdown,
    sections,
    legalBasis: [
      'D.S. 005-2012-TR, Art. 35-e',
      'NTP 399.010-1 — Señales de seguridad',
      'R.M. 050-2013-TR',
    ],
    metadata: {
      fechaElaboracion: params.fechaElaboracion,
      proximaRevision,
      vigenciaAnos: 1,
      totalAreas: params.areas.length,
      totalPeligros,
      totalSenales,
    },
  }
}

function buildAreaContent(area: AreaMapa): string {
  const peligros =
    area.peligros.length > 0
      ? `**Peligros identificados:**\n${area.peligros.map((p) => `- ${p}`).join('\n')}`
      : '*Sin peligros específicos registrados.*'
  const senales =
    area.senales.length > 0
      ? `\n\n**Señalética requerida:**\n${area.senales.map((s) => `- ${SENAL_LABEL[s.tipo]}: **${s.simbolo}**`).join('\n')}`
      : ''
  const eq =
    area.equipamientoEmergencia && area.equipamientoEmergencia.length > 0
      ? `\n\n**Equipamiento de emergencia:**\n${area.equipamientoEmergencia.map((e) => `- ${e}`).join('\n')}`
      : ''
  const ubic = area.ubicacion ? `**Ubicación:** ${area.ubicacion}\n\n` : ''
  return ubic + peligros + senales + eq
}

function buildChecklistSenaletica(areas: AreaMapa[]): string {
  const porTipo: Record<TipoSenal, string[]> = {
    prohibicion: [],
    obligacion: [],
    advertencia: [],
    salvamento: [],
    incendio: [],
  }
  for (const a of areas) {
    for (const s of a.senales) {
      porTipo[s.tipo].push(`${s.simbolo} (${a.nombre})`)
    }
  }
  const lines: string[] = []
  for (const tipo of ['prohibicion', 'obligacion', 'advertencia', 'salvamento', 'incendio'] as TipoSenal[]) {
    if (porTipo[tipo].length === 0) continue
    lines.push(`**${SENAL_LABEL[tipo]}** (${porTipo[tipo].length}):\n${porTipo[tipo].map((s) => `- [ ] ${s}`).join('\n')}`)
  }
  return lines.length > 0 ? lines.join('\n\n') : '*Sin señales registradas.*'
}

function buildMarkdown(org: GeneratorOrgContext, fecha: string, sections: GeneratedSection[]): string {
  const header = `# MAPA DE RIESGOS DEL CENTRO DE TRABAJO

**Empresa:** ${org.razonSocial}
**Fecha:** ${fecha}
**Base legal:** D.S. 005-2012-TR, Art. 35-e · NTP 399.010-1

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

function addYears(iso: string, anos: number): string {
  try {
    const d = new Date(iso)
    d.setFullYear(d.getFullYear() + anos)
    return d.toISOString().slice(0, 10)
  } catch {
    return iso
  }
}
