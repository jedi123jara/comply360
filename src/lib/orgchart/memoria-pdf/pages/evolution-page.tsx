/**
 * Página 8 — Capítulo VI: Evolución durante el ejercicio.
 *
 * Headcount mensual (gráfico de barras simple) + highlights de cambios
 * estructurales entre el snapshot inicial y el de cierre.
 */
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  ReportHeader,
  ReportFooter,
  styles as baseStyles,
} from '@/lib/pdf/react-pdf/components'
import { BRAND, TYPO } from '@/lib/pdf/react-pdf/theme'
import type { MemoriaAnualData, MemoriaAnualEvolution } from '../types'

const local = StyleSheet.create({
  intro: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 4,
    marginBottom: 12,
  },
  monthGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    height: 140,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  monthCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 1,
  },
  monthValue: {
    fontSize: TYPO.xs,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.slate900,
    marginBottom: 2,
  },
  monthBar: {
    width: '70%',
    backgroundColor: BRAND.primary,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  monthLabel: {
    fontSize: TYPO.xs,
    color: BRAND.muted,
    marginTop: 4,
  },
  monthRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  monthLabelCol: {
    flex: 1,
    alignItems: 'center',
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    paddingVertical: 4,
  },
  highlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    marginRight: 8,
    backgroundColor: BRAND.accent,
  },
  highlightText: {
    flex: 1,
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.4,
  },
  emptyHighlights: {
    padding: 12,
    backgroundColor: BRAND.slate50,
    borderRadius: 4,
    fontSize: TYPO.sm,
    color: BRAND.muted,
    fontStyle: 'italic',
  },
  snapshotMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: BRAND.slate50,
    borderRadius: 4,
    marginBottom: 10,
  },
  snapshotMetaCell: {
    flex: 1,
  },
  snapshotMetaLabel: {
    fontSize: TYPO.xs,
    color: BRAND.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  snapshotMetaValue: {
    fontSize: TYPO.sm,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.slate900,
    marginTop: 2,
  },
  snapshotHash: {
    fontSize: TYPO.xs,
    fontFamily: 'Courier',
    color: BRAND.slate700,
    marginTop: 2,
  },
})

function HeadcountChart({ evolution }: { evolution: MemoriaAnualEvolution }) {
  const max = Math.max(1, ...evolution.headcountByMonth.map((m) => m.workers))
  return (
    <>
      <View style={local.monthGrid}>
        {evolution.headcountByMonth.map((m) => {
          const heightPct = max > 0 ? (m.workers / max) * 100 : 0
          return (
            <View key={m.month} style={local.monthCol}>
              {m.workers > 0 && <Text style={local.monthValue}>{m.workers}</Text>}
              <View style={[local.monthBar, { height: `${Math.max(heightPct, 2)}%` }]} />
            </View>
          )
        })}
      </View>
      <View style={local.monthRow}>
        {evolution.headcountByMonth.map((m) => (
          <View key={m.month} style={local.monthLabelCol}>
            <Text style={local.monthLabel}>{m.month}</Text>
          </View>
        ))}
      </View>
    </>
  )
}

export function EvolutionPage({ data }: { data: MemoriaAnualData }) {
  const { org, year, evolution } = data

  return (
    <Page size="A4" style={baseStyles.page}>
      <ReportHeader
        title="VI · EVOLUCIÓN DEL EJERCICIO"
        subtitle={`${org.razonSocial ?? org.name} — Ejercicio ${year}`}
      />

      <Text style={baseStyles.sectionTitle}>HEADCOUNT MENSUAL</Text>
      <Text style={local.intro}>
        Trabajadores activos al cierre de cada mes. Calculado a partir de las fechas de
        ingreso y cese registradas en planilla.
      </Text>
      <HeadcountChart evolution={evolution} />

      <Text style={baseStyles.sectionTitle}>SNAPSHOTS DEL EJERCICIO</Text>
      <Text style={local.intro}>
        Durante el ejercicio se tomaron {evolution.totalSnapshots} snapshot
        {evolution.totalSnapshots === 1 ? '' : 's'} firmados con SHA-256. Cada uno es
        evidencia inmutable del estado del organigrama en ese momento.
      </Text>
      {evolution.startSnapshot && (
        <View style={local.snapshotMeta}>
          <View style={local.snapshotMetaCell}>
            <Text style={local.snapshotMetaLabel}>Snapshot de inicio</Text>
            <Text style={local.snapshotMetaValue}>{evolution.startSnapshot.label}</Text>
            <Text style={local.snapshotHash}>
              {new Date(evolution.startSnapshot.createdAt).toLocaleDateString('es-PE')} ·{' '}
              {evolution.startSnapshot.hash.slice(0, 12)}…
            </Text>
          </View>
          <View style={local.snapshotMetaCell}>
            <Text style={local.snapshotMetaLabel}>Workers / Unidades</Text>
            <Text style={local.snapshotMetaValue}>
              {evolution.startSnapshot.workerCount} / {evolution.startSnapshot.unitCount}
            </Text>
          </View>
        </View>
      )}
      <View style={local.snapshotMeta}>
        <View style={local.snapshotMetaCell}>
          <Text style={local.snapshotMetaLabel}>Snapshot de cierre</Text>
          <Text style={local.snapshotMetaValue}>{evolution.endSnapshot.label}</Text>
          <Text style={local.snapshotHash}>
            {new Date(evolution.endSnapshot.createdAt).toLocaleDateString('es-PE')} ·{' '}
            {evolution.endSnapshot.hash.slice(0, 12)}…
          </Text>
        </View>
        <View style={local.snapshotMetaCell}>
          <Text style={local.snapshotMetaLabel}>Workers / Unidades</Text>
          <Text style={local.snapshotMetaValue}>
            {evolution.endSnapshot.workerCount} / {evolution.endSnapshot.unitCount}
          </Text>
        </View>
      </View>

      <Text style={baseStyles.sectionTitle}>PRINCIPALES CAMBIOS</Text>
      {evolution.highlights.length === 0 ? (
        <Text style={local.emptyHighlights}>
          No se detectaron cambios estructurales relevantes (o no se cuenta con snapshot
          de inicio para comparar).
        </Text>
      ) : (
        <View>
          {evolution.highlights.map((h, i) => (
            <View key={i} style={local.highlightItem}>
              <View style={local.highlightDot} />
              <Text style={local.highlightText}>{h.description}</Text>
            </View>
          ))}
        </View>
      )}

      <ReportFooter />
    </Page>
  )
}
