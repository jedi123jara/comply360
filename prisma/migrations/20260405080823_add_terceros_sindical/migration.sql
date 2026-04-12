-- CreateEnum
CREATE TYPE "SindicalRecordType" AS ENUM ('SINDICATO', 'CONVENIO_COLECTIVO', 'NEGOCIACION', 'PLIEGO_RECLAMOS', 'FUERO_SINDICAL', 'HUELGA');

-- CreateTable
CREATE TABLE "terceros" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "actividad_principal" TEXT,
    "tipo_servicio" TEXT,
    "contrato_url" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "trabajadores_asignados" INTEGER NOT NULL DEFAULT 0,
    "is_actividad_principal" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terceros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sindical_records" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "type" "SindicalRecordType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sindical_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "terceros_org_id_idx" ON "terceros"("org_id");

-- CreateIndex
CREATE INDEX "sindical_records_org_id_type_idx" ON "sindical_records"("org_id", "type");
