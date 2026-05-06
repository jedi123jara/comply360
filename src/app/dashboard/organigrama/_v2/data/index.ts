/**
 * Re-exports de queries y mutations del módulo Organigrama v2.
 */
export { useTreeQuery, treeKey } from './queries/use-tree'
export { useSnapshotsQuery, snapshotsKey } from './queries/use-snapshots'
export {
  useAlertsQuery,
  alertsKey,
  type OrgAlertDTO,
  type OrgAlertsReportDTO,
  type OrgAlertSeverity,
  type OrgAlertCategory,
} from './queries/use-alerts'
export { useDoctorReportQuery, doctorKey } from './queries/use-doctor-report'
export {
  useBootstrapPreviewQuery,
  bootstrapPreviewKey,
  pendingBootstrapCount,
  type BootstrapPreviewDTO,
} from './queries/use-bootstrap-preview'
export {
  useDraftsQuery,
  draftsKey,
  type DraftDTO,
  type DraftStatus,
  type WhatIfImpactReportDTO,
  type WhatIfRiskDTO,
  type WhatIfCostImpactDTO,
} from './queries/use-drafts'

export { useReparentPositionMutation, type ReparentInput } from './mutations/use-reparent-position'
export {
  useCreateSnapshotMutation,
  type CreateSnapshotInput,
} from './mutations/use-create-snapshot'
export {
  useApplyBootstrapMutation,
  type ApplyBootstrapResult,
} from './mutations/use-apply-bootstrap'
export {
  useCreateDraftMutation,
  useApplyDraftMutation,
  useDiscardDraftMutation,
  type CreateDraftInput,
} from './mutations/use-draft-mutations'
