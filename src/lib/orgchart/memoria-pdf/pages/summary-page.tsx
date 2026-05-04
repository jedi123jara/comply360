/**
 * Página 3 — Capítulo I: Resumen Ejecutivo.
 *
 * Score de salud + KPIs + datos de empresa. Es el "vistazo" para Directorio.
 */
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  ReportHeader,
  ReportFooter,
  ScoreBadge,
  KpiGrid,
  OrgCard,
  styles as baseStyles,
  type Kpi,
} from '@/lib/pdf/react-pdf/components'
import { BRAND, TYPO } from '@/lib/pdf/react-pdf/theme'
import type { MemoriaAnualData } from '../types'

const local = StyleSheet.create({
  intro: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 4,
    marginBottom: 12,
  },
  histogramRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  histogramCard: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
  },
  histogramValue: {
    fontSize: TYPO.xl,
    fontFamily: 'Helvetica-Bold',
  },
  histogramLabel: {
    fontSize: TYPO.xs,
    marginTop: 2,
  },
})

const TONE_HEX = {
  success: BRAND.accent,
  warning: BRAND.warning,
  danger: '#f97316',
  critical: BRAND.danger,
} as const

const TONE_LABEL = {
  success: 'En regla',
  warning: 'Atención',
  danger: 'En riesgo',
  critical: 'Crítico',
} as const

export function SummaryPage({ data }: { data: MemoriaAnualData }) {
  const { org, year, doctorReport, coverage, stats } = data

  const kpis: Kpi[] = [
    {
      label: 'Personas asignadas',
      value: String(stats.workerCount),
      sub: `${stats.vacantCount} vacante${stats.vacantCount === 1 ? '' : 's'}`,
    },
    {
      label: 'Unidades organizacionales',
      value: String(stats.unitCount),
      sub: `${stats.positionCount} cargos`,
    },
    {
      label: 'Roles legales designados',
      value: `${stats.legalRolesAssigned}/${stats.legalRolesRequired}`,
      tone:
        stats.legalRolesAssigned >= stats.legalRolesRequired
          ? 'good'
          : stats.legalRolesAssigned >= stats.legalRolesRequired * 0.6
            ? 'warn'
            : 'bad',
      sub: 'DPO, CSST, hostigamiento, etc.',
    },
    {
      label: 'Hallazgos del Org Doctor',
      value: String(doctorReport.findings.length),
      tone:
        doctorReport.totals.critical > 0
          ? 'bad'
          : doctorReport.totals.high > 0
            ? 'warn'
            : 'good',
      sub: `${doctorReport.totals.critical} crítico${doctorReport.totals.critical === 1 ? '' : 's'}, ${doctorReport.totals.high} alto${doctorReport.totals.high === 1 ? '' : 's'}`,
    },
  ]

  const scoreDescription =
    coverage.globalScore >= 85
      ? 'El organigrama cumple con los requisitos legales evaluados (Ley 29783, Ley 29733, Ley 27942 y normas conexas). Mantener la designación de responsables al día.'
      : coverage.globalScore >= 65
        ? 'El organigrama presenta observaciones relevantes en cumplimiento. Atender las findings de severidad alta antes de cualquier inspección.'
        : 'El organigrama tiene incumplimientos críticos. Implementar el plan de acción priorizado para evitar multas SUNAFIL.'

  return (
    <Page size="A4" style={baseStyles.page}>
      <ReportHeader
        title="I · RESUMEN EJECUTIVO"
        subtitle={`${org.razonSocial ?? org.name} — Ejercicio ${year}`}
      />

      <OrgCard org={org} />

      <Text style={baseStyles.sectionTitle}>SALUD DEL ORGANIGRAMA</Text>
      <Text style={local.intro}>
        Score consolidado del cumplimiento legal de la estructura organizacional al
        cierre del ejercicio. Calculado sobre las 8 reglas del Org Doctor (CSST,
        Hostigamiento, DPO, MOF, vacantes, sucesión, spans of control, riesgo de
        subordinación) ponderadas por severidad y propagadas hacia arriba en el árbol.
      </Text>
      <ScoreBadge score={coverage.globalScore} description={scoreDescription} />

      <View style={local.histogramRow}>
        {(Object.keys(TONE_HEX) as Array<keyof typeof TONE_HEX>).map((tone) => (
          <View
            key={tone}
            style={[
              local.histogramCard,
              {
                borderColor: TONE_HEX[tone],
                backgroundColor: `${TONE_HEX[tone]}1a`,
              },
            ]}
          >
            <Text style={[local.histogramValue, { color: TONE_HEX[tone] }]}>
              {coverage.histogram[tone]}
            </Text>
            <Text style={[local.histogramLabel, { color: TONE_HEX[tone] }]}>
              {TONE_LABEL[tone]}
            </Text>
          </View>
        ))}
      </View>

      <Text style={baseStyles.sectionTitle}>MÉTRICAS GLOBALES</Text>
      <KpiGrid items={kpis} />

      <ReportFooter />
    </Page>
  )
}
