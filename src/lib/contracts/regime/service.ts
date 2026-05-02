// =============================================
// REGIME DETECTOR — SERVICE LAYER
// Genera el snapshot de inputs leyendo Organization desde BD.
// Aislado del detector puro para que el motor pueda tener tests sin DB.
// =============================================

import { prisma } from '@/lib/prisma'
import { detectRegime } from './detect'
import type { RegimeDetectionResult, RegimeInputs } from './types'

const UIT_2026 = 5500 // sincronizar con src/lib/legal-engine/peru-labor.ts

/**
 * Lee Organization por id y arma RegimeInputs. Si la org no tiene los campos
 * nuevos seteados, el detector cae a confianza baja y emite warnings.
 */
export async function detectRegimeForOrg(orgId: string): Promise<RegimeDetectionResult & {
  org: {
    id: string
    name: string
    ruc: string | null
    declaredRegimen: string | null
  }
}> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      ruc: true,
      regimenPrincipal: true,
      ciiu: true,
      ubigeo: true,
      annualSalesPEN: true,
      groupAnnualSalesPEN: true,
      isPartOfBigGroup: true,
      remypeRegistered: true,
      exportRatioPct: true,
      currentProjectCostUIT: true,
      employerType: true,
      domesticPurpose: true,
      usesAgroInputs: true,
      isPublicEntity: true,
    },
  })

  if (!org) {
    throw new Error(`Organization ${orgId} no encontrada`)
  }

  const inputs: RegimeInputs = {
    ciiu: org.ciiu,
    ubigeo: org.ubigeo,
    annualSalesPEN: org.annualSalesPEN ? Number(org.annualSalesPEN) : null,
    groupAnnualSalesPEN: org.groupAnnualSalesPEN ? Number(org.groupAnnualSalesPEN) : null,
    isPartOfBigGroup: org.isPartOfBigGroup,
    remypeRegistered: org.remypeRegistered,
    exportRatioPct: org.exportRatioPct ? Number(org.exportRatioPct) : null,
    currentProjectCostUIT: org.currentProjectCostUIT ? Number(org.currentProjectCostUIT) : null,
    employerType: org.employerType,
    domesticPurpose: org.domesticPurpose,
    usesAgroInputs: org.usesAgroInputs,
    isPublicEntity: org.isPublicEntity,
    uitValue: UIT_2026,
  }

  const result = detectRegime(inputs)

  return {
    ...result,
    org: {
      id: org.id,
      name: org.name,
      ruc: org.ruc,
      declaredRegimen: org.regimenPrincipal,
    },
  }
}
