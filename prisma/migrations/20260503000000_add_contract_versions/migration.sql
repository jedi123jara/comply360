-- Generador de Contratos — Chunk 3: Hash-chain por contrato
-- Cada edición de contenido crea una nueva ContractVersion con prevHash
-- apuntando a la anterior. Inmutabilidad criptográfica preparada para
-- anclaje posterior (Merkle diario + RFC 3161 + OpenTimestamps).
-- Ver docs/specs/contract-generator-spec.md §10.

-- CreateTable
CREATE TABLE "contract_versions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "content_html" TEXT,
    "content_json" JSONB,
    "form_data" JSONB,
    "content_sha256" TEXT NOT NULL,
    "prev_hash" TEXT NOT NULL,
    "version_hash" TEXT NOT NULL,
    "diff_json" JSONB,
    "diff_summary" TEXT,
    "change_reason" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_versions_contract_id_version_number_key" ON "contract_versions"("contract_id", "version_number");

-- CreateIndex
CREATE INDEX "contract_versions_org_id_contract_id_idx" ON "contract_versions"("org_id", "contract_id");

-- CreateIndex
CREATE INDEX "contract_versions_version_hash_idx" ON "contract_versions"("version_hash");

-- CreateIndex
CREATE INDEX "contract_versions_contract_id_created_at_idx" ON "contract_versions"("contract_id", "created_at");

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
