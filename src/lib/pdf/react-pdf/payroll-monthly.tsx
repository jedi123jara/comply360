/**
 * Template react-pdf — Reporte Mensual de Planilla.
 *
 * Resumen ejecutivo de la nómina del mes: total devengado, total descuentos,
 * neto pagado, breakdown por área/régimen, lista de trabajadores con sueldo
 * y aportes. Útil para cierre contable y auditoría interna.
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
  DataTable,
  OrgCard,
  styles,
  type OrgInfo,
  type Kpi,
} from './components'
import { BRAND, TYPO, formatMoney } from './theme'

export interface PayrollMonthlyData {
  org: OrgInfo
  periodo: string // "Abril 2026"
  totalTrabajadores: number
  totalDevengado: number
  totalDescuentos: number
  totalAportesEmpleador: number
  totalNetoPagado: number
  trabajadores: Array<{
    nombre: string
    dni: string
    cargo: string | null
    regimen: string
    sueldoBruto: number
    descuentos: number
    aportes: number // a cargo del empleador (EsSalud, SCTR)
    netoPagar: number
  }>
  desgloseRegimen: Array<{
    regimen: string
    trabajadores: number
    totalBruto: number
    totalNeto: number
  }>
}

const local = StyleSheet.create({
  totalsBox: {
    flexDirection: 'row',
    backgroundColor: BRAND.primaryLight,
    border: `1pt solid ${BRAND.border}`,
    padding: 12,
    marginTop: 8,
    borderRadius: 4,
  },
  totalCol: { flex: 1, paddingHorizontal: 6 },
  totalLabel: { fontSize: TYPO.xs, color: BRAND.muted, textTransform: 'uppercase' },
  totalValue: { fontSize: TYPO.lg, color: BRAND.slate900, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  legalNote: {
    marginTop: 12,
    fontSize: TYPO.xs,
    color: BRAND.muted,
    fontStyle: 'italic',
    lineHeight: 1.4,
  },
})

export function PayrollMonthlyPDF({ data }: { data: PayrollMonthlyData }) {
  const { org, periodo, trabajadores, desgloseRegimen } = data

  const kpis: Kpi[] = [
    { label: 'Trabajadores', value: String(data.totalTrabajadores) },
    { label: 'Devengado total', value: `S/ ${formatMoney(data.totalDevengado)}` },
    { label: 'Descuentos', value: `S/ ${formatMoney(data.totalDescuentos)}`, tone: 'warn' },
    { label: 'Neto pagado', value: `S/ ${formatMoney(data.totalNetoPagado)}`, tone: 'good' },
  ]

  return (
    <Document
      title={`Planilla — ${periodo} — ${org.razonSocial || org.name}`}
      author="COMPLY360"
      subject={`Reporte mensual de planilla — ${periodo}`}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <ReportHeader
          title="REPORTE MENSUAL DE PLANILLA"
          subtitle={periodo}
        />

        <OrgCard org={org} />

        <View style={local.totalsBox}>
          <View style={local.totalCol}>
            <Text style={local.totalLabel}>Devengado total</Text>
            <Text style={local.totalValue}>S/ {formatMoney(data.totalDevengado)}</Text>
          </View>
          <View style={local.totalCol}>
            <Text style={local.totalLabel}>Descuentos del trabajador</Text>
            <Text style={local.totalValue}>S/ {formatMoney(data.totalDescuentos)}</Text>
          </View>
          <View style={local.totalCol}>
            <Text style={local.totalLabel}>Aportes empleador</Text>
            <Text style={local.totalValue}>S/ {formatMoney(data.totalAportesEmpleador)}</Text>
          </View>
          <View style={local.totalCol}>
            <Text style={local.totalLabel}>Neto pagado</Text>
            <Text style={[local.totalValue, { color: BRAND.accent }]}>
              S/ {formatMoney(data.totalNetoPagado)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>RESUMEN</Text>
        <KpiGrid items={kpis} />

        {desgloseRegimen.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>DESGLOSE POR RÉGIMEN LABORAL</Text>
            <DataTable
              columns={[
                { header: 'Régimen', width: 3 },
                { header: 'Trabajadores', width: 1, align: 'right' },
                { header: 'Bruto total', width: 2, align: 'right' },
                { header: 'Neto total', width: 2, align: 'right' },
              ]}
              rows={desgloseRegimen.map((r) => [
                r.regimen.replace(/_/g, ' '),
                String(r.trabajadores),
                `S/ ${formatMoney(r.totalBruto)}`,
                `S/ ${formatMoney(r.totalNeto)}`,
              ])}
            />
          </>
        ) : null}

        <View break />

        <Text style={styles.sectionTitle}>DETALLE POR TRABAJADOR</Text>
        <DataTable
          columns={[
            { header: 'Trabajador', width: 3 },
            { header: 'DNI', width: 1.2, align: 'center' },
            { header: 'Cargo', width: 2 },
            { header: 'Régimen', width: 1.5, align: 'center' },
            { header: 'Bruto', width: 1, align: 'right' },
            { header: 'Descuentos', width: 1, align: 'right' },
            { header: 'Aportes ER', width: 1, align: 'right' },
            { header: 'Neto', width: 1, align: 'right' },
          ]}
          rows={trabajadores.map((t) => [
            t.nombre,
            t.dni,
            t.cargo ?? '—',
            t.regimen.replace(/_/g, ' '),
            `S/ ${formatMoney(t.sueldoBruto)}`,
            `S/ ${formatMoney(t.descuentos)}`,
            `S/ ${formatMoney(t.aportes)}`,
            `S/ ${formatMoney(t.netoPagar)}`,
          ])}
        />

        <Text style={local.legalNote}>
          Reporte de uso interno. Aportes del trabajador (AFP/ONP, EsSalud) y
          aportes del empleador (EsSalud, SCTR cuando aplica) son referenciales.
          La declaración formal se hace mediante PLAME ante SUNAT.
        </Text>

        <ReportFooter />
      </Page>
    </Document>
  )
}
