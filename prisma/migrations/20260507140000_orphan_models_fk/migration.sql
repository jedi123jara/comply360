-- =============================================
-- FIX #7.B — agregar FK a organizations(id) a 32 tablas tenant-scoped huérfanas
-- =============================================
-- Detección y aplicación: scripts/audit-smoke/find-missing-fks.ts +
-- scripts/audit-smoke/apply-missing-fks.ts.
-- Política: ON DELETE RESTRICT (consistente con #7.A workers).
-- Antes: 32 tablas con `org_id` sin FK → cascadas no las limpian, orgIds
-- huérfanos posibles, integridad referencial frágil.

ALTER TABLE "ai_budget_counters" ADD CONSTRAINT IF NOT EXISTS "ai_budget_counters_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_usage" ADD CONSTRAINT IF NOT EXISTS "ai_usage_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT IF NOT EXISTS "attendance_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_approvals" ADD CONSTRAINT IF NOT EXISTS "attendance_approvals_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_attempts" ADD CONSTRAINT IF NOT EXISTS "attendance_attempts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_evidence" ADD CONSTRAINT IF NOT EXISTS "attendance_evidence_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_justifications" ADD CONSTRAINT IF NOT EXISTS "attendance_justifications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bulk_contract_jobs" ADD CONSTRAINT IF NOT EXISTS "bulk_contract_jobs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "certificates" ADD CONSTRAINT IF NOT EXISTS "certificates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cese_records" ADD CONSTRAINT IF NOT EXISTS "cese_records_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_scores" ADD CONSTRAINT IF NOT EXISTS "compliance_scores_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_validations" ADD CONSTRAINT IF NOT EXISTS "contract_validations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_versions" ADD CONSTRAINT IF NOT EXISTS "contract_versions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT IF NOT EXISTS "enrollments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gamification_events" ADD CONSTRAINT IF NOT EXISTS "gamification_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "geofences" ADD CONSTRAINT IF NOT EXISTS "geofences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "merkle_anchors" ADD CONSTRAINT IF NOT EXISTS "merkle_anchors_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nps_feedback" ADD CONSTRAINT IF NOT EXISTS "nps_feedback_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "org_compliance_seals" ADD CONSTRAINT IF NOT EXISTS "org_compliance_seals_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "puestos_trabajo" ADD CONSTRAINT IF NOT EXISTS "puestos_trabajo_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scheduled_reports" ADD CONSTRAINT IF NOT EXISTS "scheduled_reports_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sindical_records" ADD CONSTRAINT IF NOT EXISTS "sindical_records_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sst_records" ADD CONSTRAINT IF NOT EXISTS "sst_records_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sunat_query_cache" ADD CONSTRAINT IF NOT EXISTS "sunat_query_cache_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "terceros" ADD CONSTRAINT IF NOT EXISTS "terceros_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT IF NOT EXISTS "webhook_deliveries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT IF NOT EXISTS "webhook_subscriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_alerts" ADD CONSTRAINT IF NOT EXISTS "worker_alerts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_dependents" ADD CONSTRAINT IF NOT EXISTS "worker_dependents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_history_events" ADD CONSTRAINT IF NOT EXISTS "worker_history_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_runs" ADD CONSTRAINT IF NOT EXISTS "workflow_runs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflows" ADD CONSTRAINT IF NOT EXISTS "workflows_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
