/**
 * Página 7 — Capítulo V: Anexo MOF (Manual de Organización y Funciones).
 *
 * Para cada cargo con MOF completo, imprime el detalle: propósito, funciones,
 * responsabilidades, requisitos. Los cargos sin MOF aparecen como
 * "pendiente" para que quede en evidencia.
 */
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  ReportHeader,
  ReportFooter,
  styles as baseStyles,
} from '@/lib/pdf/react-pdf/components'
import { BRAND, TYPO } from '@/lib/pdf/react-pdf/theme'
import type { OrgPositionDTO } from '../../types'
import type { MemoriaAnualData } from '../types'

const local = StyleSheet.create({
  intro: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 4,
    marginBottom: 12,
  },
  positionBlock: {
    marginTop: 14,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 0.5,
    borderTopColor: BRAND.border,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  positionTitle: {
    fontSize: TYPO.md,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.slate900,
  },
  positionUnit: {
    marginLeft: 8,
    fontSize: TYPO.xs,
    color: BRAND.muted,
  },
  pendingPill: {
    marginLeft: 'auto',
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: BRAND.dangerLight,
    borderRadius: 3,
  },
  pendingText: {
    fontSize: TYPO.xs,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.danger,
  },
  okPill: {
    marginLeft: 'auto',
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: BRAND.accentLight,
    borderRadius: 3,
  },
  okText: {
    fontSize: TYPO.xs,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.accent,
  },
  fieldLabel: {
    fontSize: TYPO.xs,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 2,
  },
  fieldText: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.4,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bullet: {
    width: 10,
    fontSize: TYPO.sm,
    color: BRAND.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.4,
  },
})

function hasMof(p: OrgPositionDTO): boolean {
  return Boolean(p.purpose && p.functions && p.responsibilities && p.requirements)
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((v) => String(v).trim())
      .filter(Boolean)
  }
  return []
}

export function MofAppendixPage({ data }: { data: MemoriaAnualData }) {
  const { org, year, tree } = data
  const unitsById = new Map(tree.units.map((u) => [u.id, u]))
  // Ordenar por unidad y luego por título
  const sorted = [...tree.positions].sort((a, b) => {
    const ua = unitsById.get(a.orgUnitId)?.name ?? ''
    const ub = unitsById.get(b.orgUnitId)?.name ?? ''
    return ua.localeCompare(ub) || a.title.localeCompare(b.title)
  })

  return (
    <Page size="A4" style={baseStyles.page}>
      <ReportHeader
        title="V · ANEXO MOF"
        subtitle={`${org.razonSocial ?? org.name} — Ejercicio ${year}`}
      />
      <Text style={baseStyles.sectionTitle}>MANUAL DE ORGANIZACIÓN Y FUNCIONES</Text>
      <Text style={local.intro}>
        Detalle por cargo del propósito, funciones, responsabilidades y requisitos
        documentados (R.M. 050-2013-TR). Los cargos sin MOF aparecen marcados como
        pendientes — formalizar antes de la siguiente revisión interna.
      </Text>

      {sorted.map((p) => {
        const unit = unitsById.get(p.orgUnitId)
        const ok = hasMof(p)
        const functions = asList(p.functions)
        const responsibilities = asList(p.responsibilities)
        return (
          <View key={p.id} style={local.positionBlock} wrap={false}>
            <View style={local.positionHeader}>
              <Text style={local.positionTitle}>{p.title}</Text>
              {unit && <Text style={local.positionUnit}>· {unit.name}</Text>}
              {ok ? (
                <View style={local.okPill}>
                  <Text style={local.okText}>MOF DOCUMENTADO</Text>
                </View>
              ) : (
                <View style={local.pendingPill}>
                  <Text style={local.pendingText}>PENDIENTE</Text>
                </View>
              )}
            </View>

            {!ok && (
              <Text style={local.fieldText}>
                Cargo sin MOF formalizado. Documentar propósito, funciones,
                responsabilidades y requisitos antes de la próxima auditoría.
              </Text>
            )}

            {ok && p.purpose && (
              <>
                <Text style={local.fieldLabel}>Propósito</Text>
                <Text style={local.fieldText}>{String(p.purpose)}</Text>
              </>
            )}

            {ok && functions.length > 0 && (
              <>
                <Text style={local.fieldLabel}>Funciones principales</Text>
                {functions.map((fn, i) => (
                  <View key={i} style={local.bulletItem}>
                    <Text style={local.bullet}>·</Text>
                    <Text style={local.bulletText}>{fn}</Text>
                  </View>
                ))}
              </>
            )}

            {ok && responsibilities.length > 0 && (
              <>
                <Text style={local.fieldLabel}>Responsabilidades</Text>
                {responsibilities.map((r, i) => (
                  <View key={i} style={local.bulletItem}>
                    <Text style={local.bullet}>·</Text>
                    <Text style={local.bulletText}>{r}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )
      })}

      <ReportFooter />
    </Page>
  )
}
