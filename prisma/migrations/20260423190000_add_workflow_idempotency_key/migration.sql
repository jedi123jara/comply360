-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "workflow_runs_idempotency_key_key" ON "workflow_runs"("idempotency_key");
