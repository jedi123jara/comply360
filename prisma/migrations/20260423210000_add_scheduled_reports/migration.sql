-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "cron_expression" TEXT NOT NULL,
    "recipients" TEXT[],
    "format" TEXT NOT NULL,
    "params" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "last_run_status" TEXT,
    "last_run_error" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_reports_org_id_active_idx" ON "scheduled_reports"("org_id", "active");
