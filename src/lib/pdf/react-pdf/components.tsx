/**
 * Componentes reutilizables para los reportes react-pdf.
 * Usan las primitivas de @react-pdf/renderer (View, Text, StyleSheet).
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { DocumentProps, PageProps } from '@react-pdf/renderer'
import { BRAND, TYPO, scoreSemantic, formatDate } from './theme'

// ═══════════════════════════════════════════════════════════════════════════
// Estilos base
// ═══════════════════════════════════════════════════════════════════════════

export const styles = StyleSheet.create({
  page: {
    paddingTop: 110,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontSize: TYPO.base,
    fontFamily: 'Helvetica',
    color: BRAND.slate900,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: BRAND.primary,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    color: BRAND.white,
    fontSize: TYPO.lg,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#bfd4f3',
    fontSize: TYPO.sm,
    marginTop: 3,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  brand: {
    color: BRAND.white,
    fontSize: TYPO.md,
    fontFamily: 'Helvetica-Bold',
  },
  brandTag: {
    color: '#bfd4f3',
    fontSize: TYPO.xs,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: TYPO.xs,
    color: BRAND.muted,
  },
  sectionTitle: {
    fontSize: TYPO.md,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.primary,
    marginTop: 14,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: BRAND.primaryLight,
  },
  kvRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  kvLabel: {
    width: 150,
    color: BRAND.muted,
    fontSize: TYPO.sm,
  },
  kvValue: {
    flex: 1,
    color: BRAND.slate900,
    fontSize: TYPO.sm,
  },
  pill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontSize: TYPO.xs,
    fontFamily: 'Helvetica-Bold',
    alignSelf: 'flex-start',
  },
})

// ═══════════════════════════════════════════════════════════════════════════
// Header compartido
// ═══════════════════════════════════════════════════════════════════════════

interface HeaderProps {
  title: string
  subtitle?: string
}

export function ReportHeader({ title, subtitle }: HeaderProps) {
  return (
    <View style={styles.header} fixed>
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.brand}>COMPLY360</Text>
        <Text style={styles.brandTag}>Compliance Laboral Perú</Text>
      </View>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Footer con paginación
// ═══════════════════════════════════════════════════════════════════════════

export function ReportFooter({ disclaimer }: { disclaimer?: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {disclaimer ?? 'Generado por COMPLY360 — comply360.pe · Informativo, no constituye asesoría legal.'}
      </Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Score Badge (círculo grande con score)
// ═══════════════════════════════════════════════════════════════════════════

const badgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
  },
  maxText: {
    fontSize: 8,
    marginTop: -2,
  },
  body: {
    marginLeft: 20,
    flex: 1,
  },
  label: {
    fontSize: TYPO.sm,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  desc: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.4,
  },
})

export function ScoreBadge({ score, description }: { score: number; description?: string }) {
  const sem = scoreSemantic(score)
  return (
    <View style={[badgeStyles.wrap, { borderColor: sem.color, backgroundColor: sem.bg }]}>
      <View style={[badgeStyles.circle, { borderColor: sem.color }]}>
        <Text style={[badgeStyles.scoreText, { color: sem.color }]}>{score}</Text>
        <Text style={[badgeStyles.maxText, { color: sem.color }]}>/ 100</Text>
      </View>
      <View style={badgeStyles.body}>
        <Text style={[badgeStyles.label, { color: sem.color }]}>{sem.label}</Text>
        {description && <Text style={badgeStyles.desc}>{description}</Text>}
      </View>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// KPI Grid — 4 métricas en 2x2
// ═══════════════════════════════════════════════════════════════════════════

const kpiStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 10,
  },
  card: {
    width: '50%',
    padding: 4,
  },
  inner: {
    backgroundColor: BRAND.slate50,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 6,
    padding: 12,
  },
  label: {
    fontSize: TYPO.xs,
    color: BRAND.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: TYPO.xl,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.slate900,
  },
  sub: {
    fontSize: TYPO.xs,
    color: BRAND.muted,
    marginTop: 2,
  },
})

export interface Kpi {
  label: string
  value: string
  sub?: string
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
}

export function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <View style={kpiStyles.grid}>
      {items.map((kpi, i) => {
        const toneColor =
          kpi.tone === 'good' ? BRAND.accent :
          kpi.tone === 'warn' ? BRAND.warning :
          kpi.tone === 'bad' ? BRAND.danger :
          BRAND.slate900
        return (
          <View key={i} style={kpiStyles.card}>
            <View style={kpiStyles.inner}>
              <Text style={kpiStyles.label}>{kpi.label}</Text>
              <Text style={[kpiStyles.value, { color: toneColor }]}>{kpi.value}</Text>
              {kpi.sub && <Text style={kpiStyles.sub}>{kpi.sub}</Text>}
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Bar Chart — barras horizontales (score por área)
// ═══════════════════════════════════════════════════════════════════════════

const barStyles = StyleSheet.create({
  row: {
    marginBottom: 8,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  label: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
  },
  value: {
    fontSize: TYPO.sm,
    fontFamily: 'Helvetica-Bold',
  },
  track: {
    height: 8,
    backgroundColor: BRAND.slate100,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
})

export interface BarItem {
  label: string
  score: number // 0-100
  weight?: number
}

export function BarChart({ items }: { items: BarItem[] }) {
  return (
    <View>
      {items.map((b, i) => {
        const sem = scoreSemantic(b.score)
        const width = `${Math.max(2, Math.min(100, b.score))}%` as const
        return (
          <View key={i} style={barStyles.row}>
            <View style={barStyles.top}>
              <Text style={barStyles.label}>
                {b.label}
                {b.weight !== undefined && (
                  <Text style={{ color: BRAND.muted }}> · peso {b.weight}%</Text>
                )}
              </Text>
              <Text style={[barStyles.value, { color: sem.color }]}>
                {b.score}
              </Text>
            </View>
            <View style={barStyles.track}>
              <View style={[barStyles.fill, { width, backgroundColor: sem.color }]} />
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DataTable — tabla simple con zebra
// ═══════════════════════════════════════════════════════════════════════════

const tableStyles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: BRAND.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  headerCell: {
    padding: 8,
    fontSize: TYPO.sm,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.primary,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
  },
  rowZebra: {
    backgroundColor: BRAND.slate50,
  },
  cell: {
    padding: 7,
    fontSize: TYPO.xs,
    color: BRAND.slate700,
  },
})

export interface TableColumn {
  header: string
  width: number // proporción (e.g. 3, 1, 1, 2)
  align?: 'left' | 'right' | 'center'
}

export function DataTable({
  columns,
  rows,
}: {
  columns: TableColumn[]
  rows: string[][]
}) {
  const totalWeight = columns.reduce((sum, c) => sum + c.width, 0)
  return (
    <View style={tableStyles.table}>
      <View style={tableStyles.headerRow}>
        {columns.map((c, i) => (
          <Text
            key={i}
            style={[
              tableStyles.headerCell,
              { width: `${(c.width / totalWeight) * 100}%`, textAlign: c.align ?? 'left' },
            ]}
          >
            {c.header}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={[tableStyles.row, ri % 2 === 1 ? tableStyles.rowZebra : {}]}>
          {columns.map((c, ci) => (
            <Text
              key={ci}
              style={[
                tableStyles.cell,
                { width: `${(c.width / totalWeight) * 100}%`, textAlign: c.align ?? 'left' },
              ]}
            >
              {row[ci] ?? ''}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Company card — ficha de empresa
// ═══════════════════════════════════════════════════════════════════════════

export interface OrgInfo {
  name: string
  razonSocial?: string | null
  ruc?: string | null
  sector?: string | null
  plan?: string | null
  regimenPrincipal?: string | null
}

export function OrgCard({ org, reportDate }: { org: OrgInfo; reportDate?: Date }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>DATOS DE LA EMPRESA</Text>
      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Razón Social</Text>
        <Text style={styles.kvValue}>{org.razonSocial || org.name}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>RUC</Text>
        <Text style={styles.kvValue}>{org.ruc || 'No registrado'}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Sector</Text>
        <Text style={styles.kvValue}>{org.sector || 'No especificado'}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Plan</Text>
        <Text style={styles.kvValue}>{org.plan || '—'}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Régimen laboral</Text>
        <Text style={styles.kvValue}>
          {(org.regimenPrincipal || 'GENERAL').replace(/_/g, ' ')}
        </Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Fecha del reporte</Text>
        <Text style={styles.kvValue}>{formatDate(reportDate ?? new Date())}</Text>
      </View>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Re-exports
// ═══════════════════════════════════════════════════════════════════════════

export { Document, Page, Text, View }
export type { DocumentProps, PageProps }
