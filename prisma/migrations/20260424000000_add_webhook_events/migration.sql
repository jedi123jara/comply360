-- Idempotencia de webhooks entrantes (Culqi, futuros providers).
-- Ver `prisma/schema.prisma` → model WebhookEvent.

CREATE TABLE "webhook_events" (
  "id"            TEXT        NOT NULL,
  "provider"      TEXT        NOT NULL,
  "external_id"   TEXT        NOT NULL,
  "event_type"    TEXT,
  "payload"       JSONB       NOT NULL,
  "status"        TEXT        NOT NULL DEFAULT 'RECEIVED',
  "error"         TEXT,
  "received_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at"  TIMESTAMP(3),

  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_events_provider_external_id_key"
  ON "webhook_events"("provider", "external_id");

CREATE INDEX "webhook_events_provider_status_idx"
  ON "webhook_events"("provider", "status");

CREATE INDEX "webhook_events_received_at_idx"
  ON "webhook_events"("received_at");
