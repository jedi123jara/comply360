/**
 * Container que monta todos los modales del v2.
 *
 * Cada modal se renderiza siempre, pero internamente lee `activeModal` del
 * store y se muestra/oculta según corresponda. Esto permite que las
 * animaciones de salida funcionen bien con AnimatePresence.
 */
'use client'

import { CreateUnitModal } from './create-unit-modal'
import { CreatePositionModal } from './create-position-modal'
import { AssignWorkerModal } from './assign-worker-modal'
import { EditPositionModal } from './edit-position-modal'
import { AssignRoleModal } from './assign-role-modal'
import { TemplatesModal } from './templates-modal'
import { RoleEvidenceModal } from './role-evidence-modal'
import { BootstrapFromWorkersModal } from './bootstrap-from-workers-modal'
import { WhatIfModal } from './whatif-modal'
import { DraftsListModal } from './drafts-list-modal'
import { LegalResponsiblesModal } from './legal-responsibles-modal'
import { AuditorLinkModal } from './auditor-link-modal'
import { StructureAnalyticsModal } from './structure-analytics-modal'
import { DirectoryModal } from './directory-modal'
import { SubordinationModal } from './subordination-modal'
import { ChangeHistoryModal } from './change-history-modal'

export function ModalsContainer() {
  return (
    <>
      <CreateUnitModal />
      <CreatePositionModal />
      <AssignWorkerModal />
      <EditPositionModal />
      <AssignRoleModal />
      <RoleEvidenceModal />
      <TemplatesModal />
      <BootstrapFromWorkersModal />
      <WhatIfModal />
      <DraftsListModal />
      <LegalResponsiblesModal />
      <AuditorLinkModal />
      <StructureAnalyticsModal />
      <DirectoryModal />
      <SubordinationModal />
      <ChangeHistoryModal />
    </>
  )
}
