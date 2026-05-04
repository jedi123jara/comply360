-- Dedicated organization templates storage for contracts/documents.
-- Keeps legacy org_documents.description templates readable during migration.
CREATE TABLE "org_templates" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "document_type" TEXT NOT NULL,
  "contract_type" TEXT,
  "content" TEXT NOT NULL,
  "placeholders" JSONB NOT NULL,
  "mappings" JSONB NOT NULL,
  "notes" TEXT,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "org_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_templates_org_id_active_idx" ON "org_templates"("org_id", "active");
CREATE INDEX "org_templates_org_id_document_type_idx" ON "org_templates"("org_id", "document_type");

ALTER TABLE "org_templates"
  ADD CONSTRAINT "org_templates_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
