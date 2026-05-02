-- Generador de Contratos — Chunk 1: Motor de Validación Legal Declarativo
-- Ver docs/specs/contract-generator-spec.md §11 (catálogo de reglas).
-- Las reglas viven como DATOS (ContractValidationRule) y se sembran vía
-- prisma/seed.ts. Las ejecuciones se persisten en ContractValidation con
-- evidencia y ack opcional.

-- CreateEnum
CREATE TYPE "ValidationSeverity" AS ENUM ('BLOCKER', 'WARNING', 'INFO');

-- CreateTable
CREATE TABLE "contract_validation_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "ValidationSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "rule_spec" JSONB NOT NULL,
    "applies_to" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_validation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_validation_rules_code_key" ON "contract_validation_rules"("code");

-- CreateIndex
CREATE INDEX "contract_validation_rules_category_active_idx" ON "contract_validation_rules"("category", "active");

-- CreateTable
CREATE TABLE "contract_validations" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "rule_code" TEXT NOT NULL,
    "rule_version" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "severity" "ValidationSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "evidence" JSONB,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "acknowledged_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_validations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_validations_org_id_contract_id_idx" ON "contract_validations"("org_id", "contract_id");

-- CreateIndex
CREATE INDEX "contract_validations_contract_id_passed_idx" ON "contract_validations"("contract_id", "passed");

-- CreateIndex
CREATE INDEX "contract_validations_rule_code_idx" ON "contract_validations"("rule_code");

-- AddForeignKey
ALTER TABLE "contract_validations" ADD CONSTRAINT "contract_validations_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "contract_validation_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_validations" ADD CONSTRAINT "contract_validations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
