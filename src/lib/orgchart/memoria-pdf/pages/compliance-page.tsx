/**
 * Página 6 — Capítulo IV: Análisis de cumplimiento.
 *
 * Lista las findings del Org Doctor agrupadas por severidad. Cada hallazgo
 * tiene su base legal y suggested-fix.
 */
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  ReportHeader,
  ReportFooter,
  styles as baseStyles,
} from '@/lib/pdf/react-pdf/components'
import { BRAND, TYPO } from '@/lib/pdf/react-pdf/theme'
import type { DoctorSeverity, DoctorFinding } from '../../types'
import type { MemoriaAnualData } from '../types'
import { computeLegalExposure } from '../../legal-exposure'
import { formatSoles } from '@/lib/format/peruvian'

const local = StyleSheet.create({
  intro: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 4,
    marginBottom: 14,
  },
  severityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  severityPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginRight: 8,
  },
  severityPillText: {
    fontSize: TYPO.xs,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.white,
    letterSpacing: 0.5,
  },
  severityTitle: {
    fontSize: TYPO.md,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.slate900,
  },
  severityCount: {
    marginLeft: 'auto',
    fontSize: TYPO.xs,
    color: BRAND.muted,
  },
  finding: {
    padding: 10,
    marginBottom: 6,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderColor: BRAND.border,
    borderWidth: 1,
    backgroundColor: BRAND.slate50,
  },
  findingTitle: {
    fontSize: TYPO.sm,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.slate900,
    marginBottom: 2,
  },
  findingDesc: {
    fontSize: TYPO.xs,
    color: BRAND.slate700,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  findingBaseLegal: {
    fontFamily: 'Courier',
    fontSize: TYPO.xs,
    color: BRAND.muted,
    marginBottom: 4,
  },
  findingFix: {
    fontSize: TYPO.xs,
    color: BRAND.accent,
    backgroundColor: BRAND.white,
    padding: 6,
    borderRadius: 3,
    borderLeftWidth: 2,
    borderLeftColor: BRAND.accent,
  },
  emptyState: {
    padding: 18,
    backgroundColor: BRAND.accentLight,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.accent,
    fontSize: TYPO.sm,
    color: BRAND.accent,
    fontFamily: 'Helvetica-Bold',
  },
  exposureBox: {
    marginTop: 4,
    marginBottom: 16,
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.danger,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: '#fef2f2',
  },
  exposureLabel: {
    fontSize: TYPO.xs,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.danger,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  exposureAmount: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.danger,
  },
  exposureNote: {
    fontSize: TYPO.xs,
    color: BRAND.slate700,
    marginTop: 5,
    lineHeight: 1.4,
  },
  exposureDisclaimer: {
    fontSize: 7,
    color: BRAND.muted,
    marginTop: 5,
    lineHeight: 1.3,
  },
})

const SEVERITY_HEX: Record<DoctorSeverity, string> = {
  CRITICAL: BRAND.danger,
  HIGH: '#f97316',
  MEDIUM: BRAND.warning,
  LOW: '#0284c7',
}
const SEVERITY_LABEL: Record<DoctorSeverity, string> = {
  CRITICAL: 'CRÍTICO',
  HIGH: 'ALTO',
  MEDIUM: 'MEDIO',
  LOW: 'BAJO',
}

const SEVERITY_ORDER: DoctorSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export function CompliancePage({ data }: { data: MemoriaAnualData }) {
  const { org, year, doctorReport } = data
  const exposure =
    doctorReport.findings.length > 0
      ? computeLegalExposure(doctorReport, data.stats.workerCount)
      : null

  const groupedBySeverity = SEVERITY_ORDER.map<{
    severity: DoctorSeverity
    findings: DoctorFinding[]
  }>((sev) => ({
    severity: sev,
    findings: doctorReport.findings.filter((f) => f.severity === sev),
  })).filter((g) => g.findings.length > 0)

  return (
    <Page size="A4" style={baseStyles.page}>
      <ReportHeader
        title="IV · ANÁLISIS DE CUMPLIMIENTO"
        subtitle={`${org.razonSocial ?? org.name} — Ejercicio ${year}`}
      />
      <Text style={baseStyles.sectionTitle}>HALLAZGOS DEL ORG DOCTOR</Text>
      <Text style={local.intro}>
        Análisis automatizado de la estructura del organigrama contra 8 reglas de
        compliance peruano: composición del Comité SST (Ley 29783), Comité de
        Hostigamiento Sexual (Ley 27942), DPO requerido (Ley 29733), spans of control,
        cobertura de sucesión, completitud del MOF (R.M. 050-2013-TR), vacantes
        críticas y riesgo de subordinación.
      </Text>

      {exposure && exposure.totalSoles > 0 && (
        <View style={local.exposureBox}>
          <Text style={local.exposureLabel}>EXPOSICIÓN LEGAL ESTIMADA (MULTA SUNAFIL)</Text>
          <Text style={local.exposureAmount}>{formatSoles(exposure.totalSoles)}</Text>
          <Text style={local.exposureNote}>
            Subsanando antes de la inspección (-90%, Art. 40 Ley 28806), la exposición bajaría a{' '}
            {formatSoles(exposure.totalConSubsanacion)} — un ahorro de{' '}
            {formatSoles(exposure.ahorroSubsanacion)}.
          </Text>
          <Text style={local.exposureDisclaimer}>
            Estimación sobre {data.stats.workerCount} trabajador(es) según la escala del D.S.
            019-2006-TR. Es una referencia de riesgo agregada, no una multa impuesta ni una opinión
            legal vinculante.
          </Text>
        </View>
      )}

      {groupedBySeverity.length === 0 ? (
        <Text style={local.emptyState}>
          Sin hallazgos. El organigrama cumple con los requisitos legales evaluados.
        </Text>
      ) : (
        groupedBySeverity.map(({ severity, findings }) => (
          <View key={severity}>
            <View style={local.severityHeader}>
              <View style={[local.severityPill, { backgroundColor: SEVERITY_HEX[severity] }]}>
                <Text style={local.severityPillText}>{SEVERITY_LABEL[severity]}</Text>
              </View>
              <Text style={local.severityTitle}>
                {severity === 'CRITICAL'
                  ? 'Hallazgos críticos'
                  : severity === 'HIGH'
                    ? 'Hallazgos altos'
                    : severity === 'MEDIUM'
                      ? 'Hallazgos medios'
                      : 'Hallazgos bajos'}
              </Text>
              <Text style={local.severityCount}>
                {findings.length} hallazgo{findings.length === 1 ? '' : 's'}
              </Text>
            </View>
            {findings.map((f, i) => (
              <View
                key={`${severity}-${i}`}
                style={[
                  local.finding,
                  { borderLeftColor: SEVERITY_HEX[severity] },
                ]}
                wrap={false}
              >
                <Text style={local.findingTitle}>{f.title}</Text>
                <Text style={local.findingDesc}>{f.description}</Text>
                {f.baseLegal && <Text style={local.findingBaseLegal}>{f.baseLegal}</Text>}
                {f.suggestedFix && (
                  <Text style={local.findingFix}>→ {f.suggestedFix}</Text>
                )}
              </View>
            ))}
          </View>
        ))
      )}

      <ReportFooter />
    </Page>
  )
}
