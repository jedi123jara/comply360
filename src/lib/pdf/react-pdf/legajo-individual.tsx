/**
 * Template react-pdf — Legajo Individual del Trabajador.
 *
 * Reporte profesional con foto/datos del trabajador, score de completitud
 * del legajo, y tabla de los 18 documentos obligatorios marcando cuáles
 * están presentes/vencidos/faltantes con base legal.
 */

import { StyleSheet } from '@react-pdf/renderer'
import {
  Document,
  Page,
  Text,
  View,
  ReportHeader,
  ReportFooter,
  ScoreBadge,
  KpiGrid,
  DataTable,
  OrgCard,
  styles,
  type OrgInfo,
  type Kpi,
} from './components'
import { BRAND, TYPO, formatDate } from './theme'

export interface LegajoDocStatus {
  category: string
  documento: string
  estado: 'COMPLETO' | 'VENCIDO' | 'FALTANTE' | 'PENDIENTE'
  fechaSubida: string | null
  fechaVencimiento: string | null
  baseLegal: string
}

export interface LegajoIndividualData {
  org: OrgInfo
  worker: {
    fullName: string
    dni: string
    position: string | null
    department: string | null
    regimenLaboral: string
    fechaIngreso: Date
  }
  legajoScore: number
  totalDocs: number
  docsCompletos: number
  docsVencidos: number
  docsFaltantes: number
  documentos: LegajoDocStatus[]
}

const local = StyleSheet.create({
  workerCard: {
    flexDirection: 'row',
    backgroundColor: BRAND.primaryLight,
    border: `1pt solid ${BRAND.border}`,
    padding: 12,
    marginTop: 6,
    borderRadius: 4,
  },
  workerCol: {
    flex: 1,
    paddingHorizontal: 6,
  },
  workerLabel: {
    fontSize: TYPO.xs,
    color: BRAND.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workerValue: {
    fontSize: TYPO.sm,
    color: BRAND.slate900,
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
  },
  estadoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: TYPO.xs,
    fontFamily: 'Helvetica-Bold',
  },
})

const ESTADO_COLOR: Record<LegajoDocStatus['estado'], { bg: string; color: string }> = {
  COMPLETO: { bg: BRAND.accentLight, color: BRAND.accent },
  VENCIDO: { bg: BRAND.dangerLight, color: BRAND.danger },
  FALTANTE: { bg: BRAND.dangerLight, color: BRAND.danger },
  PENDIENTE: { bg: BRAND.warningLight, color: BRAND.warning },
}

export function LegajoIndividualPDF({ data }: { data: LegajoIndividualData }) {
  const { org, worker, legajoScore, documentos } = data

  const kpis: Kpi[] = [
    { label: 'Documentos al día', value: String(data.docsCompletos), tone: 'good', sub: `de ${data.totalDocs}` },
    { label: 'Documentos vencidos', value: String(data.docsVencidos), tone: data.docsVencidos > 0 ? 'bad' : 'good', sub: 'requieren renovación' },
    { label: 'Documentos faltantes', value: String(data.docsFaltantes), tone: data.docsFaltantes > 0 ? 'bad' : 'good', sub: 'sin subir aún' },
    { label: 'Régimen laboral', value: worker.regimenLaboral.replace(/_/g, ' '), sub: 'aplicable' },
  ]

  return (
    <Document
      title={`Legajo de ${worker.fullName}`}
      author="COMPLY360"
      subject="Legajo digital individual"
    >
      <Page size="A4" style={styles.page}>
        <ReportHeader
          title="LEGAJO DIGITAL DEL TRABAJADOR"
          subtitle={worker.fullName}
        />

        <OrgCard org={org} />

        <View style={local.workerCard}>
          <View style={local.workerCol}>
            <Text style={local.workerLabel}>Trabajador</Text>
            <Text style={local.workerValue}>{worker.fullName}</Text>
            <Text style={[local.workerLabel, { marginTop: 8 }]}>DNI</Text>
            <Text style={local.workerValue}>{worker.dni}</Text>
          </View>
          <View style={local.workerCol}>
            <Text style={local.workerLabel}>Cargo / Área</Text>
            <Text style={local.workerValue}>
              {worker.position || '—'} {worker.department ? ` · ${worker.department}` : ''}
            </Text>
            <Text style={[local.workerLabel, { marginTop: 8 }]}>Fecha de ingreso</Text>
            <Text style={local.workerValue}>{formatDate(worker.fechaIngreso)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>SCORE DE COMPLETITUD DEL LEGAJO</Text>
        <ScoreBadge
          score={legajoScore}
          description={
            legajoScore >= 80
              ? 'Legajo en condiciones óptimas. Inspección SUNAFIL no detectaría documentos faltantes.'
              : legajoScore >= 60
                ? 'Legajo aceptable pero con brechas. Subsanar los documentos faltantes antes de cualquier inspección.'
                : 'Legajo incompleto. Riesgo crítico de multa si SUNAFIL inspecciona hoy.'
          }
        />

        <Text style={styles.sectionTitle}>RESUMEN</Text>
        <KpiGrid items={kpis} />

        <View break />

        <Text style={styles.sectionTitle}>CATÁLOGO DE DOCUMENTOS OBLIGATORIOS</Text>
        <DataTable
          columns={[
            { header: 'Categoría', width: 2 },
            { header: 'Documento', width: 3 },
            { header: 'Estado', width: 1, align: 'center' },
            { header: 'Subido', width: 1, align: 'center' },
            { header: 'Vence', width: 1, align: 'center' },
            { header: 'Base legal', width: 2 },
          ]}
          rows={documentos.map((d) => [
            d.category,
            d.documento,
            d.estado,
            d.fechaSubida ?? '—',
            d.fechaVencimiento ?? '—',
            d.baseLegal,
          ])}
        />

        <ReportFooter
          disclaimer={`Generado el ${formatDate(new Date())}. Documento auditable — el sello digital se valida con la URL pública del certificado en /verify.`}
        />
      </Page>
    </Document>
  )
}

export { ESTADO_COLOR }
