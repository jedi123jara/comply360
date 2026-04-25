-- Bitácora idempotente de crons.
-- Ver `prisma/schema.prisma` → model CronRun.

CREATE TABLE "cron_runs" (
  "id"           TEXT          NOT NULL,
  "cron_name"    TEXT          NOT NULL,
  "bucket"       TEXT          NOT NULL,
  "status"       TEXT          NOT NULL DEFAULT 'RUNNING',
  "result"       JSONB,
  "error"        TEXT,
  "started_at"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),

  CONSTRAINT "cron_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cron_runs_cron_name_bucket_key"
  ON "cron_runs"("cron_name", "bucket");

CREATE INDEX "cron_runs_cron_name_started_at_idx"
  ON "cron_runs"("cron_name", "started_at");
