/**
 * Página 9 — Capítulo VII: Certificado de Gobernanza.
 *
 * Cierre del informe — sello con hash SHA-256 del snapshot, fecha y firma
 * de Comply360 como evidencia de la integridad del documento.
 */
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  ReportHeader,
  ReportFooter,
  styles as baseStyles,
} from '@/lib/pdf/react-pdf/components'
import { BRAND, TYPO, formatDate } from '@/lib/pdf/react-pdf/theme'
import type { MemoriaAnualData } from '../types'

const local = StyleSheet.create({
  intro: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 4,
    marginBottom: 16,
  },
  certBox: {
    borderWidth: 2,
    borderColor: BRAND.primary,
    borderRadius: 6,
    padding: 24,
    marginTop: 8,
    backgroundColor: BRAND.primaryLight,
  },
  certTitle: {
    fontSize: TYPO.xl,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.primary,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  certBody: {
    fontSize: TYPO.sm,
    color: BRAND.slate900,
    lineHeight: 1.6,
    textAlign: 'center',
    marginBottom: 18,
  },
  certKv: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
  },
  certKvLabel: {
    width: 130,
    fontSize: TYPO.xs,
    color: BRAND.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  certKvValue: {
    flex: 1,
    fontSize: TYPO.sm,
    color: BRAND.slate900,
  },
  hashLine: {
    fontFamily: 'Courier-Bold',
    fontSize: 11,
    color: BRAND.slate900,
    backgroundColor: BRAND.white,
    padding: 8,
    borderRadius: 3,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  signRow: {
    flexDirection: 'row',
    marginTop: 30,
    paddingTop: 24,
    borderTopWidth: 0.5,
    borderTopColor: BRAND.border,
  },
  signCell: {
    flex: 1,
    alignItems: 'center',
  },
  signLine: {
    width: '70%',
    height: 1,
    backgroundColor: BRAND.slate900,
    marginBottom: 6,
  },
  signLabel: {
    fontSize: TYPO.xs,
    color: BRAND.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legalNote: {
    marginTop: 24,
    padding: 12,
    backgroundColor: BRAND.slate50,
    borderRadius: 4,
    fontSize: TYPO.xs,
    color: BRAND.muted,
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
})

export function CertificatePage({ data }: { data: MemoriaAnualData }) {
  const { org, year, evolution, generatedAt } = data
  const hash = evolution.endSnapshot.hash
  const hashTop = hash.slice(0, 32)
  const hashBottom = hash.slice(32)

  return (
    <Page size="A4" style={baseStyles.page}>
      <ReportHeader
        title="VII · CERTIFICADO DE GOBERNANZA"
        subtitle={`${org.razonSocial ?? org.name} — Ejercicio ${year}`}
      />

      <Text style={baseStyles.sectionTitle}>SELLO CRIPTOGRÁFICO DE INTEGRIDAD</Text>
      <Text style={local.intro}>
        El estado del organigrama al cierre del ejercicio fue capturado en un snapshot
        firmado con SHA-256. Cualquier alteración posterior a los datos hace que el
        hash deje de coincidir, lo que permite verificar la integridad de este informe
        ante una eventual inspección SUNAFIL.
      </Text>

      <View style={local.certBox}>
        <Text style={local.certTitle}>CERTIFICADO DE GOBERNANZA</Text>
        <Text style={local.certBody}>
          La empresa{' '}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>
            {org.razonSocial ?? org.name}
          </Text>
          {org.ruc ? <Text> (RUC {org.ruc})</Text> : null} ha generado el presente
          informe de gobernanza laboral correspondiente al ejercicio{' '}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{year}</Text>, con el siguiente
          sello criptográfico de integridad:
        </Text>

        <View style={local.certKv}>
          <Text style={local.certKvLabel}>Snapshot</Text>
          <Text style={local.certKvValue}>{evolution.endSnapshot.label}</Text>
        </View>
        <View style={local.certKv}>
          <Text style={local.certKvLabel}>Fecha del snapshot</Text>
          <Text style={local.certKvValue}>
            {formatDate(new Date(evolution.endSnapshot.createdAt))}
          </Text>
        </View>
        <View style={local.certKv}>
          <Text style={local.certKvLabel}>Algoritmo</Text>
          <Text style={local.certKvValue}>SHA-256</Text>
        </View>
        <View style={[local.certKv, { borderBottomWidth: 0 }]}>
          <Text style={local.certKvLabel}>Workers/Unidades</Text>
          <Text style={local.certKvValue}>
            {evolution.endSnapshot.workerCount} trabajadores ·{' '}
            {evolution.endSnapshot.unitCount} unidades
          </Text>
        </View>

        <Text style={[local.certKvLabel, { marginTop: 14, marginBottom: 4 }]}>
          Hash del snapshot
        </Text>
        <Text style={local.hashLine}>{hashTop}</Text>
        <Text style={local.hashLine}>{hashBottom}</Text>

        <View style={local.signRow}>
          <View style={local.signCell}>
            <View style={local.signLine} />
            <Text style={local.signLabel}>Responsable RRHH</Text>
          </View>
          <View style={local.signCell}>
            <View style={local.signLine} />
            <Text style={local.signLabel}>Gerencia General</Text>
          </View>
        </View>
      </View>

      <Text style={local.legalNote}>
        Generado por COMPLY360 el {formatDate(generatedAt)}. Este informe es un
        documento interno de gobernanza, sin valor judicial automático. La verificación
        del hash en caso de inspección la realiza el equipo de COMPLY360 contra el
        snapshot original almacenado en la plataforma.
      </Text>

      <ReportFooter />
    </Page>
  )
}
