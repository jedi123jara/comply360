/**
 * Template react-pdf — Resultado del Diagnóstico SUNAFIL.
 *
 * Versión profesional del PDF que se entrega al cliente tras completar
 * el diagnóstico de 135 preguntas. Incluye score por área, plan de acción
 * priorizado y multa estimada.
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
import { BRAND, TYPO, formatMoney, formatDate } from './theme'

export interface DiagnosticoResultadoData {
  org: OrgInfo
  tipo: 'FULL' | 'EXPRESS' | 'SIMULATION'
  scoreGlobal: number
  multaRiesgoTotal: number
  fechaCompletado: Date
  scorePorArea: Array<{
    area: string
    score: number
    weight: number
    pendientes: number
    multa: number
  }>
  topRiesgos: Array<{
    titulo: string
    base: string
    multa: number
    accion: string
    plazo: string
  }>
  preguntasRespondidas: number
}

const local = StyleSheet.create({
  intro: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 6,
  },
  multaSummary: {
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
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.danger,
  },
  multaSub: {
    flex: 1,
    marginLeft: 16,
    fontSize: TYPO.xs,
    color: BRAND.slate700,
    lineHeight: 1.4,
  },
})

const TIPO_LABEL: Record<DiagnosticoResultadoData['tipo'], string> = {
  FULL: 'Diagnóstico completo (135 preguntas)',
  EXPRESS: 'Diagnóstico rápido (20 preguntas)',
  SIMULATION: 'Simulacro de inspección SUNAFIL',
}

export function DiagnosticoResultadoPDF({ data }: { data: DiagnosticoResultadoData }) {
  const { org, scoreGlobal, multaRiesgoTotal, scorePorArea, topRiesgos } = data

  const kpis: Kpi[] = [
    { label: 'Score global', value: `${scoreGlobal}/100`, tone: scoreGlobal >= 80 ? 'good' : scoreGlobal >= 60 ? 'warn' : 'bad' },
    { label: 'Multa de riesgo', value: `S/ ${formatMoney(multaRiesgoTotal)}`, tone: multaRiesgoTotal > 10000 ? 'bad' : 'warn', sub: 'sin subsanar' },
    { label: 'Preguntas evaluadas', value: String(data.preguntasRespondidas) },
    { label: 'Áreas con brechas', value: String(scorePorArea.filter((a) => a.score < 80).length), tone: 'warn' },
  ]

  return (
    <Document
      title={`Diagnóstico SUNAFIL — ${org.razonSocial || org.name}`}
      author="COMPLY360"
      subject={TIPO_LABEL[data.tipo]}
    >
      <Page size="A4" style={styles.page}>
        <ReportHeader
          title="RESULTADO DEL DIAGNÓSTICO DE COMPLIANCE"
          subtitle={TIPO_LABEL[data.tipo]}
        />

        <OrgCard org={org} reportDate={data.fechaCompletado} />

        <Text style={styles.sectionTitle}>SCORE GLOBAL</Text>
        <ScoreBadge
          score={scoreGlobal}
          description={
            scoreGlobal >= 80
              ? 'La organización cumple con la normativa fundamental. Continuar con monitoreo periódico.'
              : scoreGlobal >= 60
                ? 'Se detectaron brechas relevantes. Implementar el plan de acción para reducir riesgos.'
                : 'Múltiples incumplimientos detectados. Priorizar subsanación voluntaria antes de inspección.'
          }
        />

        <Text style={styles.sectionTitle}>EXPOSICIÓN ECONÓMICA ESTIMADA</Text>
        <Text style={local.intro}>
          Multa potencial calculada a partir de las brechas detectadas, aplicando
          el cuadro de infracciones del D.S. 019-2006-TR con UIT 2026 (S/ 5,500).
        </Text>
        <View style={local.multaSummary}>
          <Text style={local.multaAmount}>S/ {formatMoney(multaRiesgoTotal)}</Text>
          <Text style={local.multaSub}>
            Subsanación voluntaria antes de inspección reduce la multa hasta 90%
            (Art. 40 Ley 28806). Durante inspección la reducción puede llegar al 70%.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>RESUMEN POR ÁREA</Text>
        <KpiGrid items={kpis} />

        <Text style={styles.sectionTitle}>SCORE POR ÁREA</Text>
        <BarChart
          items={scorePorArea.map((a) => ({ label: a.area, score: a.score, weight: a.weight }))}
        />

        <View break />

        <Text style={styles.sectionTitle}>DETALLE DE BRECHAS POR ÁREA</Text>
        <DataTable
          columns={[
            { header: 'Área', width: 3 },
            { header: 'Score', width: 1, align: 'right' },
            { header: 'Pendientes', width: 1, align: 'right' },
            { header: 'Multa estimada', width: 2, align: 'right' },
          ]}
          rows={scorePorArea.map((a) => [
            a.area,
            `${a.score}/100`,
            String(a.pendientes),
            `S/ ${formatMoney(a.multa)}`,
          ])}
        />

        {topRiesgos.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>TOP RIESGOS A SUBSANAR (priorizado)</Text>
            <DataTable
              columns={[
                { header: '#', width: 0.5, align: 'center' },
                { header: 'Hallazgo', width: 3 },
                { header: 'Base legal', width: 2 },
                { header: 'Acción', width: 3 },
                { header: 'Plazo', width: 1, align: 'center' },
                { header: 'Multa', width: 1, align: 'right' },
              ]}
              rows={topRiesgos.map((r, i) => [
                String(i + 1),
                r.titulo,
                r.base,
                r.accion,
                r.plazo,
                `S/ ${formatMoney(r.multa)}`,
              ])}
            />
          </>
        ) : null}

        <ReportFooter
          disclaimer={`Diagnóstico generado el ${formatDate(data.fechaCompletado)}. Las estimaciones de multa son referenciales y no sustituyen el criterio de un inspector SUNAFIL.`}
        />
      </Page>
    </Document>
  )
}
