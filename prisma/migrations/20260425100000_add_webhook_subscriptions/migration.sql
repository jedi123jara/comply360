-- Webhooks salientes (API pública v1).
-- Ver `prisma/schema.prisma` → models WebhookSubscription + WebhookDelivery.

CREATE TABLE "webhook_subscriptions" (
  "id"                     TEXT         NOT NULL,
  "org_id"                 TEXT         NOT NULL,
  "url"                    TEXT         NOT NULL,
  "events"                 TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "secret"                 TEXT         NOT NULL,
  "description"            TEXT,
  "active"                 BOOLEAN      NOT NULL DEFAULT TRUE,
  "last_delivery_at"       TIMESTAMP(3),
  "last_delivery_status"   TEXT,
  "consecutive_failures"   INT4         NOT NULL DEFAULT 0,
  "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"             TIMESTAMP(3) NOT NULL,
  "created_by"             TEXT,

  CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_subscriptions_org_id_active_idx"
  ON "webhook_subscriptions"("org_id", "active");

CREATE TABLE "webhook_deliveries" (
  "id"               TEXT         NOT NULL,
  "subscription_id"  TEXT         NOT NULL,
  "org_id"           TEXT         NOT NULL,
  "event_name"       TEXT         NOT NULL,
  "event_id"         TEXT         NOT NULL,
  "payload"          JSONB        NOT NULL,
  "status"           TEXT         NOT NULL DEFAULT 'PENDING',
  "attempts"         INT4         NOT NULL DEFAULT 0,
  "last_attempt_at"  TIMESTAMP(3),
  "next_retry_at"    TIMESTAMP(3),
  "response_status"  INT4,
  "response_body"    TEXT,
  "error"            TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at"     TIMESTAMP(3),

  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "webhook_deliveries_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE
);

CREATE INDEX "webhook_deliveries_status_next_retry_at_idx"
  ON "webhook_deliveries"("status", "next_retry_at");

CREATE INDEX "webhook_deliveries_subscription_id_created_at_idx"
  ON "webhook_deliveries"("subscription_id", "created_at");

CREATE INDEX "webhook_deliveries_org_id_created_at_idx"
  ON "webhook_deliveries"("org_id", "created_at");
