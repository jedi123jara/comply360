CREATE TABLE IF NOT EXISTS "org_delegated_tasks" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "creator_user_id" TEXT NOT NULL,
  "assignee_worker_id" TEXT NOT NULL,
  "source_position_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "due_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "evidence_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_delegated_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "org_delegated_tasks_org_id_assignee_worker_id_status_idx"
  ON "org_delegated_tasks"("org_id", "assignee_worker_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'org_delegated_tasks_org_id_fkey'
  ) THEN
    ALTER TABLE "org_delegated_tasks"
      ADD CONSTRAINT "org_delegated_tasks_org_id_fkey"
      FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "org_delegated_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_delegated_tasks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "org_delegated_tasks";
CREATE POLICY tenant_isolation ON "org_delegated_tasks"
  USING ("org_id" = current_setting('app.current_org_id', true))
  WITH CHECK ("org_id" = current_setting('app.current_org_id', true));
