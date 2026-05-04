/**
 * Documento PDF "Memoria Anual del Organigrama".
 *
 * Ensambla las 9 páginas en orden. Es la pieza que `renderToBuffer` consume.
 */
import { Document } from '@react-pdf/renderer'
import { CoverPage } from './pages/cover-page'
import { TocPage } from './pages/toc-page'
import { SummaryPage } from './pages/summary-page'
import { StructurePage } from './pages/structure-page'
import { LegalRolesPage } from './pages/legal-roles-page'
import { CompliancePage } from './pages/compliance-page'
import { MofAppendixPage } from './pages/mof-appendix-page'
import { EvolutionPage } from './pages/evolution-page'
import { CertificatePage } from './pages/certificate-page'
import type { MemoriaAnualData } from './types'

export function MemoriaAnualPDF({ data }: { data: MemoriaAnualData }) {
  const orgLabel = data.org.razonSocial ?? data.org.name
  return (
    <Document
      title={`Memoria Anual del Organigrama ${data.year} — ${orgLabel}`}
      author="COMPLY360"
      subject={`Estructura organizacional, cumplimiento y evolución ${data.year}`}
      creator="Comply360 Memoria Anual Generator"
      producer="@react-pdf/renderer"
    >
      <CoverPage data={data} />
      <TocPage />
      <SummaryPage data={data} />
      <StructurePage data={data} />
      <LegalRolesPage data={data} />
      <CompliancePage data={data} />
      <MofAppendixPage data={data} />
      <EvolutionPage data={data} />
      <CertificatePage data={data} />
    </Document>
  )
}
