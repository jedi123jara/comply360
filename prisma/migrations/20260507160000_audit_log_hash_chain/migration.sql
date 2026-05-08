-- =============================================
-- FIX #7.D — AuditLog hash chain (tamper-evident)
-- =============================================
-- Agrega prev_hash + entry_hash. Las entries existentes quedan con NULL,
-- el helper verifyAuditChain las salta como "legacy". Las nuevas usan
-- createAuditLogWithChain() que enlaza el hash al chain de la org.

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "prev_hash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entry_hash" TEXT;

CREATE INDEX IF NOT EXISTS "audit_logs_entry_hash_idx" ON "audit_logs"("entry_hash");
