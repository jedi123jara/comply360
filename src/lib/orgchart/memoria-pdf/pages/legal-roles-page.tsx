/**
 * Página 5 — Capítulo III: Responsables legales designados.
 *
 * Lista los roles de cumplimiento (DPO, CSST, hostigamiento, etc.) con su
 * base legal. Marca claramente los faltantes — esto es la prueba de
 * gobernanza ante SUNAFIL.
 */
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  ReportHeader,
  ReportFooter,
  styles as baseStyles,
} from '@/lib/pdf/react-pdf/components'
import { BRAND, TYPO } from '@/lib/pdf/react-pdf/theme'
import { COMPLIANCE_ROLES } from '../../compliance-rules'
import type { ComplianceRoleType } from '../../types'
import type { MemoriaAnualData } from '../types'

const local = StyleSheet.create({
  intro: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    lineHeight: 1.5,
    marginTop: 4,
    marginBottom: 14,
  },
  roleCard: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleBody: {
    flex: 1,
  },
  roleName: {
    fontSize: TYPO.md,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.slate900,
    marginBottom: 2,
  },
  roleBaseLegal: {
    fontFamily: 'Courier',
    fontSize: TYPO.xs,
    color: BRAND.muted,
    marginBottom: 4,
  },
  roleOccupant: {
    fontSize: TYPO.sm,
    color: BRAND.slate700,
    marginBottom: 2,
  },
  pillBox: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginLeft: 10,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: TYPO.xs,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
})

export function LegalRolesPage({ data }: { data: MemoriaAnualData }) {
  const { org, year, tree } = data

  // Agrupamos los roles asignados por type
  const assignedByType = new Map<ComplianceRoleType, typeof tree.complianceRoles>()
  for (const r of tree.complianceRoles) {
    const list = assignedByType.get(r.roleType) ?? []
    list.push(r)
    assignedByType.set(r.roleType, list)
  }

  const allRoleTypes = Object.keys(COMPLIANCE_ROLES) as ComplianceRoleType[]

  return (
    <Page size="A4" style={baseStyles.page}>
      <ReportHeader
        title="III · RESPONSABLES LEGALES"
        subtitle={`${org.razonSocial ?? org.name} — Ejercicio ${year}`}
      />
      <Text style={baseStyles.sectionTitle}>DESIGNACIONES Y BASE LEGAL</Text>
      <Text style={local.intro}>
        Roles de cumplimiento que la legislación peruana exige designar. La empresa que
        no tenga un rol marcado como obligatorio puede ser objeto de multa SUNAFIL al
        momento de inspección.
      </Text>

      {allRoleTypes.map((type) => {
        const def = COMPLIANCE_ROLES[type]
        const assignees = assignedByType.get(type) ?? []
        const isAssigned = assignees.length > 0
        const borderColor = isAssigned ? BRAND.accent : BRAND.danger
        const bgColor = isAssigned ? BRAND.accentLight : BRAND.dangerLight
        const pillColor = isAssigned ? BRAND.accent : BRAND.danger

        return (
          <View key={type} style={[local.roleCard, { borderColor, backgroundColor: bgColor }]} wrap={false}>
            <View style={local.roleBody}>
              <Text style={local.roleName}>{def.label}</Text>
              {def.baseLegal && <Text style={local.roleBaseLegal}>{def.baseLegal}</Text>}
              {isAssigned ? (
                assignees.map((a) => (
                  <Text key={a.id} style={local.roleOccupant}>
                    {a.worker.firstName} {a.worker.lastName}
                    {a.endsAt
                      ? ` · vence ${new Date(a.endsAt).toLocaleDateString('es-PE')}`
                      : ' · vigente'}
                  </Text>
                ))
              ) : (
                <Text style={local.roleOccupant}>
                  Sin designar — designar antes de la próxima inspección.
                </Text>
              )}
            </View>
            <View style={[local.pillBox, { backgroundColor: pillColor }]}>
              <Text style={[local.pillText, { color: BRAND.white }]}>
                {isAssigned ? 'OK' : 'PENDIENTE'}
              </Text>
            </View>
          </View>
        )
      })}

      <ReportFooter />
    </Page>
  )
}
