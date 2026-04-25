/**
 * Template react-pdf — Reporte Anual del Canal de Denuncias (Ley 27942).
 *
 * Estadísticas anonimizadas que la empresa debe mantener para acreditar
 * que el canal funciona ante SUNAFIL. Incluye conteos por tipo, tiempos
 * de resolución, medidas de protección aplicadas, y compliance con plazos.
 */

import { StyleSheet } from '@react-pdf/renderer'
import {
  Document,
  Page,
  Text,
  View,
  ReportHeader,
  ReportFooter,
  KpiGrid,
  BarChart,
  DataTable,
  OrgCard,
  styles,
  type OrgInfo,
  type Kpi,
} from './components'
import { BRAND, TYPO } from './theme'

export interface DenunciasAnualData {
  org: OrgInfo
  anio: number
  totalDenuncias: number
  porTipo: Array<{ tipo: string; count: number }>
  porEstado: Array<{ estado: string; count: number }>
  tiempoMedioResolucionDias: number
  porcentajeAnonimas: number
  medidasProteccionAplicadas: number
  cumplimientoPlazoLegal: number // % en los plazos del D.S. 014-2019-MIMP
  lineaBaseLegal: string // ej. "Ley 27942, D.S. 014-2019-MIMP, Art. 22"
}

const local = StyleSheet.create({
  intro: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 8,
  },
  highlight: {
    backgroundColor: BRAND.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: BRAND.primary,
    padding: 12,
    marginTop: 6,
    borderRadius: 4,
  },
  highlightText: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.4,
  },
  legalLink: {
    fontFamily: 'Helvetica-Bold',
    color: BRAND.primary,
  },
})

export function DenunciasAnualPDF({ data }: { data: DenunciasAnualData }) {
  const { org, anio, porTipo, porEstado } = data

  const kpis: Kpi[] = [
    {
      label: 'Total denuncias',
      value: String(data.totalDenuncias),
      sub: `año ${anio}`,
    },
    {
      label: 'Anónimas',
      value: `${data.porcentajeAnonimas}%`,
      sub: 'sin revelar identidad',
    },
    {
      label: 'Tiempo medio resolución',
      value: `${data.tiempoMedioResolucionDias} días`,
      tone: data.tiempoMedioResolucionDias <= 30 ? 'good' : 'warn',
    },
    {
      label: 'Cumplimiento plazos',
      value: `${data.cumplimientoPlazoLegal}%`,
      tone: data.cumplimientoPlazoLegal >= 95 ? 'good' : data.cumplimientoPlazoLegal >= 80 ? 'warn' : 'bad',
      sub: 'según D.S. 014-2019',
    },
  ]

  return (
    <Document
      title={`Reporte anual de denuncias ${anio} — ${org.razonSocial || org.name}`}
      author="COMPLY360"
      subject={`Estadísticas Ley 27942 — ${anio}`}
    >
      <Page size="A4" style={styles.page}>
        <ReportHeader
          title={`REPORTE ANUAL — CANAL DE DENUNCIAS ${anio}`}
          subtitle={`Hostigamiento sexual y derechos del trabajador (Ley 27942)`}
        />

        <OrgCard org={org} />

        <Text style={local.intro}>
          Este reporte resume estadísticamente las denuncias recibidas a través
          del canal interno durante el período {anio}. Se mantiene la identidad
          de los denunciantes en estricto anonimato, conforme a la Ley 27942 y
          el D.S. 014-2019-MIMP. La información agregada permite acreditar el
          funcionamiento del canal ante SUNAFIL.
        </Text>

        <View style={local.highlight}>
          <Text style={local.highlightText}>
            Base legal de referencia:{' '}
            <Text style={local.legalLink}>{data.lineaBaseLegal}</Text>
          </Text>
        </View>

        <Text style={styles.sectionTitle}>INDICADORES PRINCIPALES</Text>
        <KpiGrid items={kpis} />

        <Text style={styles.sectionTitle}>DENUNCIAS POR TIPO</Text>
        <BarChart
          items={porTipo.map((t) => ({
            label: t.tipo.replace(/_/g, ' '),
            score: data.totalDenuncias > 0 ? Math.round((t.count / data.totalDenuncias) * 100) : 0,
            weight: undefined,
          }))}
        />
        <DataTable
          columns={[
            { header: 'Tipo de denuncia', width: 4 },
            { header: 'Cantidad', width: 1, align: 'right' },
            { header: '% del total', width: 1, align: 'right' },
          ]}
          rows={porTipo.map((t) => [
            t.tipo.replace(/_/g, ' '),
            String(t.count),
            data.totalDenuncias > 0 ? `${Math.round((t.count / data.totalDenuncias) * 100)}%` : '0%',
          ])}
        />

        <Text style={styles.sectionTitle}>ESTADO DE LAS DENUNCIAS AL CIERRE</Text>
        <DataTable
          columns={[
            { header: 'Estado', width: 3 },
            { header: 'Cantidad', width: 1, align: 'right' },
            { header: '% del total', width: 1, align: 'right' },
          ]}
          rows={porEstado.map((e) => [
            e.estado.replace(/_/g, ' '),
            String(e.count),
            data.totalDenuncias > 0 ? `${Math.round((e.count / data.totalDenuncias) * 100)}%` : '0%',
          ])}
        />

        <Text style={styles.sectionTitle}>MEDIDAS DE PROTECCIÓN</Text>
        <Text style={local.intro}>
          Durante el año se aplicaron <Text style={{ fontFamily: 'Helvetica-Bold' }}>
            {data.medidasProteccionAplicadas}
          </Text>{' '}
          medidas de protección a favor de las personas denunciantes, conforme
          al artículo 24 del D.S. 014-2019-MIMP (separación de áreas, traslado
          temporal, asignación de canal de comunicación alternativo, etc.).
        </Text>

        <ReportFooter
          disclaimer="Datos agregados y anonimizados. Los expedientes individuales se mantienen bajo reserva legal del Comité de Intervención de la empresa."
        />
      </Page>
    </Document>
  )
}
