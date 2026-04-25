/**
 * Template react-pdf — Acta de Requerimiento del Simulacro SUNAFIL.
 *
 * Documento que emula el formato R.M. 199-2016-TR. Se entrega al cliente
 * tras completar un simulacro de inspección como evidencia de los hallazgos
 * y recomendaciones.
 */

import { StyleSheet } from '@react-pdf/renderer'
import {
  Document,
  Page,
  Text,
  View,
  ReportHeader,
  ReportFooter,
  DataTable,
  OrgCard,
  styles,
  type OrgInfo,
} from './components'
import { BRAND, TYPO, formatDate } from './theme'

export interface SimulacroActaData {
  org: OrgInfo
  fechaSimulacro: Date
  inspectorVirtual: string // ej. "COMPLY360 — Asistente IA Inspector"
  duracionMin: number
  hallazgos: Array<{
    nro: number
    tipo: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
    descripcion: string
    baseLegal: string
    documentoSolicitado?: string
    encontrado: boolean
    observacion: string
  }>
  recomendaciones: string[]
  plazoSubsanacion: number // días
}

const local = StyleSheet.create({
  preamble: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 8,
    textAlign: 'justify',
  },
  metaBox: {
    flexDirection: 'row',
    backgroundColor: BRAND.slate50,
    border: `1pt solid ${BRAND.border}`,
    padding: 10,
    marginTop: 8,
    borderRadius: 4,
  },
  metaCol: { flex: 1, paddingHorizontal: 6 },
  metaLabel: { fontSize: TYPO.xs, color: BRAND.muted, textTransform: 'uppercase' },
  metaValue: { fontSize: TYPO.sm, color: BRAND.slate900, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  recomendacion: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    marginTop: 4,
    paddingLeft: 12,
    lineHeight: 1.4,
  },
  closing: {
    marginTop: 18,
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
})

const TIPO_BADGE: Record<SimulacroActaData['hallazgos'][number]['tipo'], string> = {
  LEVE: 'LEVE',
  GRAVE: 'GRAVE',
  MUY_GRAVE: 'MUY GRAVE',
}

export function SimulacroActaPDF({ data }: { data: SimulacroActaData }) {
  const { org, fechaSimulacro, hallazgos, recomendaciones } = data

  const muyGraves = hallazgos.filter((h) => h.tipo === 'MUY_GRAVE').length
  const graves = hallazgos.filter((h) => h.tipo === 'GRAVE').length
  const leves = hallazgos.filter((h) => h.tipo === 'LEVE').length

  return (
    <Document
      title={`Acta de Simulacro SUNAFIL — ${org.razonSocial || org.name}`}
      author="COMPLY360"
      subject="Acta virtual de requerimiento (formato R.M. 199-2016-TR)"
    >
      <Page size="A4" style={styles.page}>
        <ReportHeader
          title="ACTA DE REQUERIMIENTO — SIMULACRO"
          subtitle="Formato basado en R.M. 199-2016-TR (referencial)"
        />

        <OrgCard org={org} reportDate={fechaSimulacro} />

        <View style={local.metaBox}>
          <View style={local.metaCol}>
            <Text style={local.metaLabel}>Inspector virtual</Text>
            <Text style={local.metaValue}>{data.inspectorVirtual}</Text>
          </View>
          <View style={local.metaCol}>
            <Text style={local.metaLabel}>Duración</Text>
            <Text style={local.metaValue}>{data.duracionMin} min</Text>
          </View>
          <View style={local.metaCol}>
            <Text style={local.metaLabel}>Plazo de subsanación</Text>
            <Text style={local.metaValue}>{data.plazoSubsanacion} días hábiles</Text>
          </View>
        </View>

        <Text style={local.preamble}>
          En el marco del simulacro de inspección laboral realizado a la empresa{' '}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>
            {org.razonSocial || org.name}
          </Text>
          {' '}por el sistema COMPLY360, se procedió a verificar el cumplimiento
          de las obligaciones establecidas en la Ley 28806 (Ley General de
          Inspección del Trabajo) y normativa conexa. El presente documento es
          una herramienta interna para fortalecer el cumplimiento normativo y NO
          constituye un acta oficial emitida por SUNAFIL.
        </Text>

        <Text style={styles.sectionTitle}>RESUMEN DE HALLAZGOS</Text>
        <Text style={local.preamble}>
          Total: {hallazgos.length} hallazgos · {muyGraves} muy grave(s) · {graves} grave(s) · {leves} leve(s).
        </Text>

        <Text style={styles.sectionTitle}>DETALLE DE HALLAZGOS</Text>
        <DataTable
          columns={[
            { header: 'N°', width: 0.4, align: 'center' },
            { header: 'Tipo', width: 1, align: 'center' },
            { header: 'Hallazgo', width: 3 },
            { header: 'Base legal', width: 2 },
            { header: 'Documento solicitado', width: 2 },
            { header: 'Encontrado', width: 0.8, align: 'center' },
          ]}
          rows={hallazgos.map((h) => [
            String(h.nro),
            TIPO_BADGE[h.tipo],
            h.descripcion,
            h.baseLegal,
            h.documentoSolicitado ?? '—',
            h.encontrado ? 'SÍ' : 'NO',
          ])}
        />

        {recomendaciones.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>RECOMENDACIONES</Text>
            {recomendaciones.map((r, i) => (
              <Text key={i} style={local.recomendacion}>
                {`${i + 1}. ${r}`}
              </Text>
            ))}
          </>
        ) : null}

        <Text style={local.closing}>
          Se emite la presente acta de simulacro con fines exclusivamente
          internos, para que la empresa proceda a subsanar las observaciones
          dentro del plazo recomendado de {data.plazoSubsanacion} días hábiles.
          Se recuerda que la subsanación voluntaria antes de una inspección
          oficial puede reducir la multa hasta en 90% (Art. 40 Ley 28806).
        </Text>

        <ReportFooter
          disclaimer={`Documento generado el ${formatDate(new Date())}. Para validar la autenticidad: comply360.pe/verify`}
        />
      </Page>
    </Document>
  )
}
