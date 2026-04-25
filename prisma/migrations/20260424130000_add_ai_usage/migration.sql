-- Telemetría de uso de IA — un registro por llamada al LLM.
-- Ver prisma/schema.prisma → model AiUsage.

CREATE TABLE "ai_usage" (
  "id"                TEXT          NOT NULL,
  "org_id"            TEXT,
  "user_id"           TEXT,
  "feature"           TEXT          NOT NULL,
  "provider"          TEXT          NOT NULL,
  "model"             TEXT          NOT NULL,
  "prompt_tokens"     INT4          NOT NULL DEFAULT 0,
  "completion_tokens" INT4          NOT NULL DEFAULT 0,
  "total_tokens"      INT4          NOT NULL DEFAULT 0,
  "cost_usd"          DECIMAL(12,6) NOT NULL DEFAULT 0,
  "latency_ms"        INT4,
  "success"           BOOLEAN       NOT NULL DEFAULT TRUE,
  "error_message"     TEXT,
  "created_at"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_usage_org_id_created_at_idx"
  ON "ai_usage"("org_id", "created_at");

CREATE INDEX "ai_usage_org_id_feature_created_at_idx"
  ON "ai_usage"("org_id", "feature", "created_at");

CREATE INDEX "ai_usage_feature_created_at_idx"
  ON "ai_usage"("feature", "created_at");
