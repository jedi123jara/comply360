-- Telemetría AI extendida: cache hits, reasoning tokens, TTFT, fallback, eval scores
ALTER TABLE "ai_usage" ADD COLUMN "cached_tokens" INTEGER;
ALTER TABLE "ai_usage" ADD COLUMN "reasoning_tokens" INTEGER;
ALTER TABLE "ai_usage" ADD COLUMN "ttft_ms" INTEGER;
ALTER TABLE "ai_usage" ADD COLUMN "fallback_used" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_usage" ADD COLUMN "eval_score" DOUBLE PRECISION;

-- Tabla de contadores agregados por org/mes para checkCapacity O(1)
CREATE TABLE "ai_budget_counters" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "month_start" TIMESTAMP(3) NOT NULL,
    "total_calls" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "hourly_calls" INTEGER NOT NULL DEFAULT 0,
    "hourly_reset_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_budget_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_budget_counters_org_id_month_start_key" ON "ai_budget_counters"("org_id", "month_start");
CREATE INDEX "ai_budget_counters_org_id_idx" ON "ai_budget_counters"("org_id");
