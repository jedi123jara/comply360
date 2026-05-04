/**
 * Página 2 — Tabla de contenidos.
 *
 * react-pdf no tiene cross-reference automático de números de página, así
 * que la TOC indica capítulos pero no número exacto. Para un reporte
 * institucional esto es aceptable; el inspector ve el orden lógico.
 */
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  ReportHeader,
  ReportFooter,
  styles as baseStyles,
} from '@/lib/pdf/react-pdf/components'
import { BRAND, TYPO } from '@/lib/pdf/react-pdf/theme'

const styles = StyleSheet.create({
  intro: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 4,
    marginBottom: 18,
  },
  tocItem: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
  },
  tocNum: {
    width: 30,
    fontSize: TYPO.md,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.primary,
  },
  tocTitle: {
    flex: 1,
    fontSize: TYPO.md,
    color: BRAND.slate900,
  },
  tocSub: {
    fontSize: TYPO.xs,
    color: BRAND.muted,
    marginTop: 2,
    marginLeft: 30,
    marginBottom: 6,
  },
})

const TOC_ITEMS: Array<{ num: string; title: string; sub: string }> = [
  {
    num: 'I',
    title: 'Resumen ejecutivo',
    sub: 'Indicadores clave, score de salud y métricas globales',
  },
  {
    num: 'II',
    title: 'Estructura organizacional',
    sub: 'Unidades, cargos y línea de mando al cierre del ejercicio',
  },
  {
    num: 'III',
    title: 'Responsables legales designados',
    sub: 'DPO, Comité SST, Hostigamiento y demás roles de Ley',
  },
  {
    num: 'IV',
    title: 'Análisis de cumplimiento',
    sub: 'Findings del Org Doctor con base legal y plan de acción',
  },
  {
    num: 'V',
    title: 'Anexo MOF',
    sub: 'Manual de Organización y Funciones por cargo',
  },
  {
    num: 'VI',
    title: 'Evolución durante el ejercicio',
    sub: 'Headcount mensual, snapshots tomados y principales cambios',
  },
  {
    num: 'VII',
    title: 'Certificado de gobernanza',
    sub: 'Sello con hash SHA-256 del snapshot de cierre',
  },
]

export function TocPage() {
  return (
    <Page size="A4" style={baseStyles.page}>
      <ReportHeader
        title="MEMORIA ANUAL DEL ORGANIGRAMA"
        subtitle="Tabla de contenidos"
      />
      <Text style={baseStyles.sectionTitle}>CONTENIDO</Text>
      <Text style={styles.intro}>
        Este informe documenta la estructura organizacional, los responsables legales
        designados, el análisis de cumplimiento y la evolución del organigrama durante
        el ejercicio. Es entregable a Directorio o a SUNAFIL como evidencia de
        gobernanza laboral.
      </Text>
      <View>
        {TOC_ITEMS.map((item) => (
          <View key={item.num}>
            <View style={styles.tocItem}>
              <Text style={styles.tocNum}>{item.num}</Text>
              <Text style={styles.tocTitle}>{item.title}</Text>
            </View>
            <Text style={styles.tocSub}>{item.sub}</Text>
          </View>
        ))}
      </View>
      <ReportFooter />
    </Page>
  )
}
