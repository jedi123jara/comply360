-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Performance indexes + dead code cleanup + ENTERPRISE plan
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Contiene 3 grupos de cambios:
--   1. 5 índices faltantes identificados en auditoría (hot path queries)
--   2. Limpieza de modelos/enums muertos (GamificationEvent, SunatQueryCache, AlertStatus)
--   3. Agregado del tier ENTERPRISE al enum Plan
--
-- IMPORTANTE: ejecutar en orden + verificar en staging antes de prod.
-- Si `prisma migrate deploy` falla por datos existentes usando enums que voy a
-- borrar, usar `npx prisma migrate resolve --applied` tras limpiar manualmente.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- WorkerAlert: filtro por resolvedAt IS NULL es hot path en 12 archivos
CREATE INDEX IF NOT EXISTS "worker_alerts_orgId_resolvedAt_idx"
  ON "worker_alerts" ("org_id", "resolved_at");

-- AuditLog: lookups por action (document.ai_verified, consent.accepted.*, etc.)
CREATE INDEX IF NOT EXISTS "audit_logs_orgId_action_idx"
  ON "audit_logs" ("org_id", "action");

-- Contract: calendar queries filtran por orgId + expiresAt en rango
CREATE INDEX IF NOT EXISTS "contracts_orgId_expiresAt_idx"
  ON "contracts" ("org_id", "expires_at");

-- Payslip: portal worker y cron filtran por orgId + status
CREATE INDEX IF NOT EXISTS "payslips_orgId_status_idx"
  ON "payslips" ("org_id", "status");

-- ComplianceDiagnostic: queries frecuentes por orgId + type
CREATE INDEX IF NOT EXISTS "compliance_diagnostics_orgId_type_idx"
  ON "compliance_diagnostics" ("org_id", "type");

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. PLAN ENUM: agregar ENTERPRISE
-- ═══════════════════════════════════════════════════════════════════════════
-- Postgres requiere ALTER TYPE para agregar valores. Runs en transaction aparte
-- en algunas versiones de PG, por eso no va dentro del COMMIT batch.
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'ENTERPRISE';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. DEAD CODE CLEANUP (solo schema — los datos históricos se preservan
--    temporalmente con un rename por si hay que recuperarlos antes del DROP
--    definitivo en una migración futura)
-- ═══════════════════════════════════════════════════════════════════════════

-- GamificationEvent model — nunca se setean datos; renombrar con sufijo _deprecated
-- para que el próximo dev lo borre en 90 días si sigue vacío.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'gamification_events') THEN
    ALTER TABLE "gamification_events" RENAME TO "gamification_events_deprecated";
  END IF;
END $$;

-- SunatQueryCache: idem
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'sunat_query_cache') THEN
    ALTER TABLE "sunat_query_cache" RENAME TO "sunat_query_cache_deprecated";
  END IF;
END $$;

-- NOTA: AlertStatus enum no se droppea porque podría estar referenciado en
-- rows históricos; queda como dead enum hasta cleanup posterior.

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN
-- ═══════════════════════════════════════════════════════════════════════════
