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

export { useReparentPositionMutation, type ReparentInput } from './mutations/use-reparent-position'
export {
  useCreateSnapshotMutation,
  type CreateSnapshotInput,
} from './mutations/use-create-snapshot'
