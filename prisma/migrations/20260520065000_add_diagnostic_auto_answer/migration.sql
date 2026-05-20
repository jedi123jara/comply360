-- CreateTable: DiagnosticAutoAnswer
-- Auto-derivación del diagnóstico SUNAFIL: cachea las respuestas que el motor
-- evaluator pudo derivar a partir de datos del SaaS (Worker, Contract, Payslip,
-- Attendance, IPERC, Complaint, CeseRecord, OrgDocument, etc.).
CREATE TABLE "diagnostic_auto_answers" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "answer" TEXT,
  "confidence" INTEGER NOT NULL DEFAULT 0,
  "evidence" JSONB NOT NULL DEFAULT '[]',
  "sources" JSONB NOT NULL DEFAULT '[]',
  "evaluator_name" TEXT,
  "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "override_answer" TEXT,
  "override_by" TEXT,
  "override_at" TIMESTAMP(3),
  "override_reason" TEXT,

  CONSTRAINT "diagnostic_auto_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_auto_answers_org_id_question_id_key" ON "diagnostic_auto_answers"("org_id", "question_id");

-- CreateIndex
CREATE INDEX "diagnostic_auto_answers_org_id_computed_at_idx" ON "diagnostic_auto_answers"("org_id", "computed_at");

-- AddForeignKey
ALTER TABLE "diagnostic_auto_answers" ADD CONSTRAINT "diagnostic_auto_answers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
