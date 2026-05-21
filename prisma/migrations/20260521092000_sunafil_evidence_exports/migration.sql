-- Multiple evidence files per compliance task, plus immutable export snapshots
-- for the SUNAFIL dossier generated from Centro SUNAFIL.

CREATE TABLE "compliance_task_evidences" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "source_id" TEXT,
  "title" TEXT,
  "file_name" TEXT,
  "file_url" TEXT NOT NULL,
  "storage_path" TEXT,
  "bucket" TEXT,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "hash_sha256" TEXT,
  "notes" TEXT,
  "uploaded_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "compliance_task_evidences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sunafil_expediente_exports" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "score" INTEGER,
  "total_risks" INTEGER NOT NULL DEFAULT 0,
  "tasks_count" INTEGER NOT NULL DEFAULT 0,
  "evidence_count" INTEGER NOT NULL DEFAULT 0,
  "pdf_hash_sha256" TEXT,
  "zip_hash_sha256" TEXT,
  "manifest" JSONB NOT NULL,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sunafil_expediente_exports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "compliance_task_evidences_org_id_task_id_idx"
  ON "compliance_task_evidences"("org_id", "task_id");

CREATE INDEX "compliance_task_evidences_org_id_created_at_idx"
  ON "compliance_task_evidences"("org_id", "created_at");

CREATE INDEX "sunafil_expediente_exports_org_id_created_at_idx"
  ON "sunafil_expediente_exports"("org_id", "created_at");

ALTER TABLE "compliance_task_evidences"
  ADD CONSTRAINT "compliance_task_evidences_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "compliance_task_evidences"
  ADD CONSTRAINT "compliance_task_evidences_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "compliance_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sunafil_expediente_exports"
  ADD CONSTRAINT "sunafil_expediente_exports_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
