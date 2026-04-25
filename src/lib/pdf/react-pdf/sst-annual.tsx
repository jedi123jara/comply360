/**
 * Template react-pdf — Informe Anual de Seguridad y Salud en el Trabajo.
 *
 * Cumple con la Ley 29783 (art. 32) que obliga al empleador a presentar un
 * informe anual al Comité de SST sobre la gestión del ejercicio.
 *
 * Agrupa:
 *  - Estadística de accidentes e incidentes
 *  - Avance del plan anual
 *  - Capacitaciones ejecutadas
 *  - Exámenes médicos ocupacionales
 *  - Entregas de EPP
 *  - Actividades del Comité y simulacros
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
import { BRAND, TYPO, formatDate } from './theme'

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface SstAnnualData {
  org: OrgInfo
  year: number
  totalWorkers: number

  // Por tipo y estado
  recordsByType: Record<string, { total: number; completed: number; pending: number; overdue: number }>

  // Accidentes / incidentes
  accidents: Array<{ date: string; title: string; status: string; description: string | null }>
  incidents: Array<{ date: string; title: string; status: string; description: string | null }>

  // Capacitaciones
  trainings: Array<{ date: string; title: string; status: string }>
  trainingsCompleted: number
  trainingsPlanned: number

  // Exámenes médicos
  medicalExams: { completed: number; pending: number }

  // EPP
  eppDeliveries: number

  // Comité / simulacros
  committeeActs: number
  evacuationDrills: number

  // Plan anual
  planAnnualCompletion: number // 0-100 %
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const local = StyleSheet.create({
  sectionIntro: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 2,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    marginBottom: 4,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
    borderRadius: 3,
    fontSize: TYPO.xs,
  },
  emptyNote: {
    fontSize: TYPO.sm,
    color: BRAND.muted,
    fontStyle: 'italic',
    padding: 12,
    backgroundColor: BRAND.slate50,
    borderRadius: 4,
  },
  legalBox: {
    backgroundColor: BRAND.primaryLight,
    padding: 12,
    borderRadius: 4,
    marginTop: 10,
  },
  legalTitle: {
    fontSize: TYPO.xs,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.primary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  legalText: {
    fontSize: TYPO.xs,
    color: BRAND.slate700,
    lineHeight: 1.5,
  },
  signatureBlock: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  signatureCol: {
    width: '40%',
    alignItems: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: BRAND.slate700,
    width: '100%',
    marginBottom: 6,
  },
  signatureLabel: {
    fontSize: TYPO.xs,
    color: BRAND.muted,
    textAlign: 'center',
  },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  POLITICA_SST: 'Política de SST',
  IPERC: 'IPERC',
  PLAN_ANUAL: 'Plan Anual',
  CAPACITACION: 'Capacitaciones',
  ACCIDENTE: 'Accidentes',
  INCIDENTE: 'Incidentes',
  EXAMEN_MEDICO: 'Exámenes médicos',
  ENTREGA_EPP: 'Entrega de EPP',
  ACTA_COMITE: 'Actas del Comité',
  MAPA_RIESGOS: 'Mapa de riesgos',
  SIMULACRO_EVACUACION: 'Simulacros',
  MONITOREO_AGENTES: 'Monitoreo de agentes',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SstAnnualPDF({ data }: { data: SstAnnualData }) {
  const {
    org,
    year,
    totalWorkers,
    accidents,
    incidents,
    trainings,
    trainingsCompleted,
    trainingsPlanned,
    medicalExams,
    eppDeliveries,
    committeeActs,
    evacuationDrills,
    planAnnualCompletion,
  } = data

  const kpis: Kpi[] = [
    {
      label: 'Accidentes reportados',
      value: String(accidents.length),
      sub: `en ${year}`,
      tone: accidents.length > 0 ? 'warn' : 'good',
    },
    {
      label: 'Incidentes peligrosos',
      value: String(incidents.length),
      sub: `en ${year}`,
      tone: incidents.length > 2 ? 'warn' : 'neutral',
    },
    {
      label: 'Capacitaciones SST',
      value: `${trainingsCompleted} / ${trainingsPlanned}`,
      sub: trainingsPlanned > 0 ? `${Math.round((trainingsCompleted / trainingsPlanned) * 100)}% del plan` : '—',
      tone: trainingsPlanned === 0 || trainingsCompleted / trainingsPlanned >= 0.8 ? 'good' : 'warn',
    },
    {
      label: 'Plan anual cumplido',
      value: `${planAnnualCompletion}%`,
      sub: planAnnualCompletion >= 80 ? 'al día' : 'requiere seguimiento',
      tone: planAnnualCompletion >= 80 ? 'good' : planAnnualCompletion >= 50 ? 'warn' : 'bad',
    },
  ]

  // Bar chart: avance por tipo de registro
  const barItems = Object.entries(data.recordsByType)
    .filter(([, v]) => v.total > 0)
    .map(([type, v]) => ({
      label: TYPE_LABEL[type] ?? type,
      score: Math.round((v.completed / v.total) * 100),
    }))

  return (
    <Document
      title={`Informe Anual SST ${year} — ${org.razonSocial || org.name}`}
      author="COMPLY360"
      subject={`Informe anual de seguridad y salud en el trabajo ${year}`}
    >
      <Page size="A4" style={styles.page}>
        <ReportHeader
          title={`INFORME ANUAL DE SEGURIDAD Y SALUD EN EL TRABAJO ${year}`}
          subtitle={org.razonSocial || org.name}
        />

        <OrgCard org={org} />

        <View style={local.legalBox}>
          <Text style={local.legalTitle}>MARCO LEGAL</Text>
          <Text style={local.legalText}>
            Este informe se elabora en cumplimiento del artículo 32 de la Ley 29783
            (Ley de Seguridad y Salud en el Trabajo) y del artículo 83 de su reglamento
            (D.S. 005-2012-TR), que obligan al empleador a presentar anualmente al
            Comité de SST el reporte de la gestión del ejercicio.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>INDICADORES CLAVE DEL EJERCICIO {year}</Text>
        <KpiGrid items={kpis} />

        <Text style={styles.sectionTitle}>AVANCE POR ÁREA DE GESTIÓN</Text>
        {barItems.length > 0 ? (
          <BarChart items={barItems} />
        ) : (
          <Text style={local.emptyNote}>
            No se registraron actividades de SST durante el período. El sistema de
            registro está activo y pendiente de la primera carga.
          </Text>
        )}

        <Text style={styles.sectionTitle}>ACCIDENTES REPORTADOS</Text>
        {accidents.length > 0 ? (
          <DataTable
            columns={[
              { header: 'Fecha', width: 1.2 },
              { header: 'Descripción', width: 4 },
              { header: 'Estado', width: 1.2, align: 'center' },
            ]}
            rows={accidents.map((a) => [a.date, a.title, a.status])}
          />
        ) : (
          <Text style={local.emptyNote}>
            Sin accidentes registrados durante {year}. Mantener el registro ordenado
            para auditoría SUNAFIL.
          </Text>
        )}

        <Text style={styles.sectionTitle}>INCIDENTES PELIGROSOS</Text>
        {incidents.length > 0 ? (
          <DataTable
            columns={[
              { header: 'Fecha', width: 1.2 },
              { header: 'Descripción', width: 4 },
              { header: 'Estado', width: 1.2, align: 'center' },
            ]}
            rows={incidents.map((i) => [i.date, i.title, i.status])}
          />
        ) : (
          <Text style={local.emptyNote}>Sin incidentes peligrosos registrados en {year}.</Text>
        )}

        <View break />

        <Text style={styles.sectionTitle}>CAPACITACIONES EJECUTADAS</Text>
        <Text style={local.sectionIntro}>
          La Ley 29783 exige un mínimo de 4 capacitaciones anuales por trabajador,
          dentro del horario laboral y con registro documental (art. 35).
        </Text>
        {trainings.length > 0 ? (
          <DataTable
            columns={[
              { header: 'Fecha', width: 1.2 },
              { header: 'Título', width: 5 },
              { header: 'Estado', width: 1.2, align: 'center' },
            ]}
            rows={trainings.slice(0, 40).map((t) => [t.date, t.title, t.status])}
          />
        ) : (
          <Text style={local.emptyNote}>
            No se registraron capacitaciones en el sistema. Verifica que el módulo
            esté recibiendo los registros o programa las del período.
          </Text>
        )}

        <Text style={styles.sectionTitle}>OTRAS ACTIVIDADES DE SST</Text>
        <KpiGrid
          items={[
            {
              label: 'Exámenes médicos realizados',
              value: String(medicalExams.completed),
              sub: `${medicalExams.pending} pendientes`,
              tone: medicalExams.pending === 0 ? 'good' : 'warn',
            },
            {
              label: 'Entregas de EPP',
              value: String(eppDeliveries),
              sub: 'documentadas',
              tone: eppDeliveries > 0 ? 'good' : 'neutral',
            },
            {
              label: 'Actas del Comité',
              value: String(committeeActs),
              sub: 'sesiones documentadas',
              tone: committeeActs >= 12 ? 'good' : committeeActs >= 6 ? 'warn' : 'bad',
            },
            {
              label: 'Simulacros',
              value: String(evacuationDrills),
              sub: 'evacuación y emergencias',
              tone: evacuationDrills >= 2 ? 'good' : 'warn',
            },
          ]}
        />

        <Text style={styles.sectionTitle}>CONCLUSIONES Y RECOMENDACIONES</Text>
        <Text style={local.sectionIntro}>
          Al cierre del ejercicio {year}, la empresa gestionó a {totalWorkers} trabajador{totalWorkers === 1 ? '' : 'es'} bajo el
          Sistema de Gestión de Seguridad y Salud en el Trabajo. El cumplimiento del
          plan anual alcanzó {planAnnualCompletion}%. Se registraron {accidents.length} accidente
          {accidents.length === 1 ? '' : 's'} e {incidents.length} incidente{incidents.length === 1 ? '' : 's'} peligroso{incidents.length === 1 ? '' : 's'}.
          Todas las observaciones y acciones correctivas derivadas deberán incorporarse
          al Plan Anual del siguiente ejercicio.
        </Text>

        <View style={local.signatureBlock}>
          <View style={local.signatureCol}>
            <View style={local.signatureLine} />
            <Text style={local.signatureLabel}>Presidente del Comité de SST</Text>
          </View>
          <View style={local.signatureCol}>
            <View style={local.signatureLine} />
            <Text style={local.signatureLabel}>Representante del Empleador</Text>
          </View>
        </View>

        <Text style={[local.legalText, { textAlign: 'center', marginTop: 20 }]}>
          Documento generado el {formatDate(new Date())}
        </Text>

        <ReportFooter disclaimer="COMPLY360 — Informe generado automáticamente. Debe ser revisado y firmado por el Comité de SST." />
      </Page>
    </Document>
  )
}
