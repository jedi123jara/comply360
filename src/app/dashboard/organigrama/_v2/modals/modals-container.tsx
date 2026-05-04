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

export function ModalsContainer() {
  return (
    <>
      <CreateUnitModal />
      <CreatePositionModal />
      <AssignWorkerModal />
      <EditPositionModal />
      <AssignRoleModal />
    </>
  )
}
