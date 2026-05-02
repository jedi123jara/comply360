-- Generador de Contratos — Chunk 2: Detector automático de régimen
-- Inputs del algoritmo (lib/contracts/regime/detect.ts).
-- Todos los campos son opcionales o con default → no rompen organizaciones existentes.
-- Ver docs/specs/contract-generator-spec.md §8.

-- CreateEnum
CREATE TYPE "EmployerType" AS ENUM ('NATURAL_PERSON', 'LEGAL_PERSON');

-- AlterTable
ALTER TABLE "organizations"
  ADD COLUMN "ciiu" TEXT,
  ADD COLUMN "ubigeo" TEXT,
  ADD COLUMN "annual_sales_pen" DECIMAL(14, 2),
  ADD COLUMN "group_annual_sales_pen" DECIMAL(14, 2),
  ADD COLUMN "is_part_of_big_group" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "remype_registered" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "export_ratio_pct" DECIMAL(5, 2),
  ADD COLUMN "current_project_cost_uit" DECIMAL(10, 2),
  ADD COLUMN "employer_type" "EmployerType" NOT NULL DEFAULT 'LEGAL_PERSON',
  ADD COLUMN "domestic_purpose" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "uses_agro_inputs" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_public_entity" BOOLEAN NOT NULL DEFAULT false;
