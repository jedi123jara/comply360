-- Generador de Contratos — Chunk 4: Catálogo de cláusulas potestativas
-- Las cláusulas viven como DATOS (bodyTemplate + variables JSON) y se sembran
-- vía prisma/seed.ts. Las "instancias" usadas en un contrato concreto se
-- guardan dentro de Contract.formData._selectedClauses (no requiere tabla
-- adicional en v1).

-- CreateTable
CREATE TABLE "contract_clauses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "applicableTo" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_clauses_code_key" ON "contract_clauses"("code");

-- CreateIndex
CREATE INDEX "contract_clauses_category_active_idx" ON "contract_clauses"("category", "active");

-- CreateIndex
CREATE INDEX "contract_clauses_type_idx" ON "contract_clauses"("type");
