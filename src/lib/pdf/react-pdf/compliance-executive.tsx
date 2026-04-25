/**
 * Template react-pdf — Reporte Ejecutivo de Compliance Laboral.
 *
 * Reemplaza la versión jsPDF en /api/reports/compliance-pdf. Layout profesional
 * para presentar al directorio o a SUNAFIL en una eventual inspección.
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
  BarChart,
  DataTable,
  OrgCard,
  styles,
  type OrgInfo,
  type Kpi,
} from './components'
import { BRAND, TYPO, formatMoney } from './theme'

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface ComplianceExecutiveData {
  org: OrgInfo
  scoreGlobal: number
  multaPotencial: number
  activeWorkers: number
  activeAlerts: number
  criticalAlerts: number
  activeContracts: number
  breakdown: Array<{
    label: string
    score: number
    weight: number
    detail: string
  }>
}

// ─── Styles locales ──────────────────────────────────────────────────────────

const local = StyleSheet.create({
  intro: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 6,
    marginBottom: 4,
  },
  multaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.dangerLight,
    borderLeftWidth: 4,
    borderLeftColor: BRAND.danger,
    padding: 14,
    marginTop: 6,
    borderRadius: 4,
  },
  multaAmount: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.danger,
  },
  multaCaption: {
    flex: 1,
    marginLeft: 16,
    fontSize: TYPO.xs,
    color: BRAND.slate700,
    lineHeight: 1.4,
  },
  legalNote: {
    marginTop: 8,
    fontSize: TYPO.xs,
    color: BRAND.muted,
    fontStyle: 'italic',
  },
})

// ─── Component ───────────────────────────────────────────────────────────────

export function ComplianceExecutivePDF({ data }: { data: ComplianceExecutiveData }) {
  const { org, scoreGlobal, multaPotencial, breakdown } = data

  const kpis: Kpi[] = [
    {
      label: 'Trabajadores activos',
      value: String(data.activeWorkers),
      sub: 'no cesados',
    },
    {
      label: 'Contratos vigentes',
      value: String(data.activeContracts),
      sub: 'sin expirar',
    },
    {
      label: 'Alertas pendientes',
      value: String(data.activeAlerts),
      tone: data.activeAlerts > 0 ? 'warn' : 'good',
      sub:
        data.criticalAlerts > 0
          ? `${data.criticalAlerts} crítica${data.criticalAlerts > 1 ? 's' : ''}`
          : 'ninguna crítica',
    },
    {
      label: 'Multa potencial',
      value: `S/ ${formatMoney(multaPotencial)}`,
      tone: multaPotencial > 10000 ? 'bad' : multaPotencial > 0 ? 'warn' : 'good',
      sub: 'si SUNAFIL inspecciona hoy',
    },
  ]

  const scoreDescription =
    scoreGlobal >= 80
      ? 'La empresa cumple con los requisitos laborales fundamentales. Mantener vigilancia sobre vencimientos y actualizaciones normativas.'
      : scoreGlobal >= 60
        ? 'Se detectaron brechas relevantes. Implementar el plan de acción priorizado para evitar riesgos de multa.'
        : 'Existen múltiples incumplimientos con alta probabilidad de multa ante inspección. Atención inmediata requerida.'

  return (
    <Document
      title={`Reporte de Compliance — ${org.razonSocial || org.name}`}
      author="COMPLY360"
      subject="Reporte ejecutivo de compliance laboral"
    >
      <Page size="A4" style={styles.page}>
        <ReportHeader
          title="REPORTE EJECUTIVO DE COMPLIANCE LABORAL"
          subtitle={org.razonSocial || org.name}
        />

        <OrgCard org={org} />

        <Text style={styles.sectionTitle}>SCORE GLOBAL DE CUMPLIMIENTO</Text>
        <ScoreBadge score={scoreGlobal} description={scoreDescription} />

        <Text style={styles.sectionTitle}>MÉTRICAS PRINCIPALES</Text>
        <KpiGrid items={kpis} />

        <Text style={styles.sectionTitle}>DESGLOSE POR ÁREA</Text>
        <BarChart items={breakdown.map((b) => ({ label: b.label, score: b.score, weight: b.weight }))} />

        <View break />

        <Text style={styles.sectionTitle}>DETALLE POR ÁREA</Text>
        <DataTable
          columns={[
            { header: 'Área', width: 3 },
            { header: 'Score', width: 1, align: 'right' },
            { header: 'Peso', width: 1, align: 'right' },
            { header: 'Diagnóstico', width: 5 },
          ]}
          rows={breakdown.map((b) => [
            b.label,
            `${b.score}/100`,
            `${b.weight}%`,
            b.detail,
          ])}
        />

        <Text style={styles.sectionTitle}>ESTIMACIÓN DE MULTA POTENCIAL</Text>
        <Text style={local.intro}>
          Calculada a partir de las alertas pendientes y los documentos faltantes,
          aplicando el cuadro de infracciones del D.S. 019-2006-TR y la UIT vigente
          (S/ 5,500 para 2026).
        </Text>
        <View style={local.multaBox}>
          <Text style={local.multaAmount}>S/ {formatMoney(multaPotencial)}</Text>
          <Text style={local.multaCaption}>
            Monto estimado si SUNAFIL inspeccionara hoy. La subsanación voluntaria
            antes de inspección reduce la multa en 90% (Art. 40, Ley 28806).
          </Text>
        </View>
        <Text style={local.legalNote}>
          Nota metodológica: esta estimación considera infracciones tipificadas y su
          rango de UIT por grupo empresarial. No reemplaza el cálculo caso a caso
          que realiza un inspector SUNAFIL durante una visita formal.
        </Text>

        <ReportFooter />
      </Page>
    </Document>
  )
}
