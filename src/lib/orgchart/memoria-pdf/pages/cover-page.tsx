/**
 * Página 1 — Portada de la Memoria Anual.
 *
 * Layout institucional: nombre empresa grande, año destacado, hash del
 * snapshot de cierre como prueba de gobernanza, fecha de generación.
 */
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { BRAND, TYPO, formatDate } from '@/lib/pdf/react-pdf/theme'
import type { MemoriaAnualData } from '../types'

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
  },
  topStripe: {
    height: 8,
    backgroundColor: BRAND.primary,
  },
  body: {
    flex: 1,
    padding: 60,
    paddingTop: 80,
    flexDirection: 'column',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 60,
  },
  brand: {
    fontSize: TYPO.lg,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.primary,
    letterSpacing: 1.5,
  },
  brandTag: {
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: BRAND.muted,
    fontSize: TYPO.xs,
    color: BRAND.muted,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.slate900,
    lineHeight: 1.15,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: TYPO.lg,
    color: BRAND.muted,
    marginBottom: 60,
    letterSpacing: 0.5,
  },
  yearBlock: {
    backgroundColor: BRAND.primary,
    padding: 28,
    borderRadius: 6,
    marginBottom: 50,
  },
  year: {
    fontSize: 64,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.white,
    letterSpacing: 4,
    textAlign: 'center',
  },
  yearLabel: {
    fontSize: TYPO.sm,
    color: '#bfd4f3',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 4,
  },
  orgBlock: {
    marginBottom: 40,
  },
  orgLabel: {
    fontSize: TYPO.xs,
    color: BRAND.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  orgName: {
    fontSize: TYPO.xl,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.slate900,
    marginBottom: 4,
  },
  orgRuc: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
  },
  proofBox: {
    marginTop: 'auto',
    backgroundColor: BRAND.slate50,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.accent,
    padding: 14,
  },
  proofTitle: {
    fontSize: TYPO.xs,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.accent,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  proofLine: {
    fontSize: TYPO.xs,
    color: BRAND.slate700,
    marginBottom: 2,
  },
  proofHash: {
    fontFamily: 'Courier-Bold',
    fontSize: TYPO.xs,
    color: BRAND.slate900,
    marginTop: 2,
  },
  bottomStripe: {
    height: 4,
    backgroundColor: BRAND.accent,
  },
})

export function CoverPage({ data }: { data: MemoriaAnualData }) {
  const { org, year, evolution, generatedAt } = data
  const hashShort = evolution.endSnapshot.hash.slice(0, 16)

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.topStripe} />
      <View style={styles.body}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>COMPLY360</Text>
          <Text style={styles.brandTag}>COMPLIANCE LABORAL · PERÚ</Text>
        </View>

        <Text style={styles.title}>
          Memoria Anual del{'\n'}Organigrama
        </Text>
        <Text style={styles.subtitle}>
          Estructura organizacional, cumplimiento legal y evolución
        </Text>

        <View style={styles.yearBlock}>
          <Text style={styles.year}>{year}</Text>
          <Text style={styles.yearLabel}>EJERCICIO</Text>
        </View>

        <View style={styles.orgBlock}>
          <Text style={styles.orgLabel}>Empresa</Text>
          <Text style={styles.orgName}>{org.razonSocial ?? org.name}</Text>
          {org.ruc && <Text style={styles.orgRuc}>RUC {org.ruc}</Text>}
          {org.sector && <Text style={styles.orgRuc}>Sector: {org.sector}</Text>}
        </View>

        <View style={styles.proofBox}>
          <Text style={styles.proofTitle}>SELLO DE GOBERNANZA</Text>
          <Text style={styles.proofLine}>
            Este documento fue generado a partir del snapshot del organigrama firmado con
            SHA-256 al cierre del ejercicio. Cualquier alteración del estado original es
            verificable mediante el hash:
          </Text>
          <Text style={styles.proofHash}>{hashShort}…</Text>
          <Text style={styles.proofLine}>
            Generado el {formatDate(generatedAt)}.
          </Text>
        </View>
      </View>
      <View style={styles.bottomStripe} />
    </Page>
  )
}
