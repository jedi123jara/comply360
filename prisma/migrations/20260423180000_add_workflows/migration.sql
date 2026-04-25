-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "trigger_id" TEXT NOT NULL,
    "steps_json" JSONB NOT NULL,
    "metadata" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trigger_data" JSONB NOT NULL,
    "step_results_json" JSONB NOT NULL,
    "context" JSONB,
    "current_step_index" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error" TEXT,
    "triggered_by" TEXT,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflows_org_id_active_idx" ON "workflows"("org_id", "active");

-- CreateIndex
CREATE INDEX "workflows_org_id_created_at_idx" ON "workflows"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "workflow_runs_workflow_id_started_at_idx" ON "workflow_runs"("workflow_id", "started_at");

-- CreateIndex
CREATE INDEX "workflow_runs_org_id_started_at_idx" ON "workflow_runs"("org_id", "started_at");

-- CreateIndex
CREATE INDEX "workflow_runs_org_id_status_idx" ON "workflow_runs"("org_id", "status");

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
