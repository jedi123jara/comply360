-- Add staged case documents for the internal complaints channel.
CREATE TYPE "ComplaintStage" AS ENUM (
  'RECEPCION',
  'EVALUACION',
  'MEDIDAS_PROTECCION',
  'INVESTIGACION',
  'INFORME_COMITE',
  'DECISION_FINAL',
  'COMUNICACION_AUTORIDAD',
  'CIERRE',
  'APELACION'
);

CREATE TYPE "ComplaintDocumentKind" AS ENUM (
  'ACTA',
  'QUEJA',
  'INFORME',
  'MEDIDA_PROTECCION',
  'COMUNICACION_AUTORIDAD',
  'DESCARGO',
  'EVIDENCIA',
  'RESOLUCION',
  'OTRO'
);

CREATE TABLE "complaint_documents" (
  "id" TEXT NOT NULL,
  "complaint_id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "stage" "ComplaintStage" NOT NULL,
  "kind" "ComplaintDocumentKind" NOT NULL DEFAULT 'OTRO',
  "url" TEXT NOT NULL,
  "storage_path" TEXT,
  "mime_type" TEXT,
  "size" INTEGER,
  "visible_to_reporter" BOOLEAN NOT NULL DEFAULT false,
  "uploaded_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "complaint_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "complaint_documents_org_id_complaint_id_idx" ON "complaint_documents"("org_id", "complaint_id");
CREATE INDEX "complaint_documents_complaint_id_visible_to_reporter_idx" ON "complaint_documents"("complaint_id", "visible_to_reporter");
CREATE INDEX "complaint_documents_stage_idx" ON "complaint_documents"("stage");

ALTER TABLE "complaint_documents" ADD CONSTRAINT "complaint_documents_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_documents" ADD CONSTRAINT "complaint_documents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
