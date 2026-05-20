-- Fase 3 — SST operativo (capacitaciones, EPP, simulacros) + Cuadro Categorías Ley 30709

-- ── WorkerCapacitacionSST ─────────────────────────────────────────────
CREATE TABLE "worker_capacitaciones_sst" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "worker_id" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "fecha_capacitacion" TIMESTAMP(3) NOT NULL,
  "duracion_horas" DOUBLE PRECISION NOT NULL,
  "temario" TEXT NOT NULL,
  "instructor_nombre" TEXT,
  "instructor_empresa" TEXT,
  "certificado_url" TEXT,
  "firma_worker_url" TEXT,
  "evidencia_foto_url" TEXT,
  "observaciones" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "worker_capacitaciones_sst_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "worker_capacitaciones_sst_org_id_fecha_capacitacion_idx" ON "worker_capacitaciones_sst"("org_id", "fecha_capacitacion");
CREATE INDEX "worker_capacitaciones_sst_worker_id_tipo_idx" ON "worker_capacitaciones_sst"("worker_id", "tipo");
CREATE INDEX "worker_capacitaciones_sst_org_id_tipo_fecha_capacitacion_idx" ON "worker_capacitaciones_sst"("org_id", "tipo", "fecha_capacitacion");

ALTER TABLE "worker_capacitaciones_sst" ADD CONSTRAINT "worker_capacitaciones_sst_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worker_capacitaciones_sst" ADD CONSTRAINT "worker_capacitaciones_sst_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── WorkerEPP ─────────────────────────────────────────────────────────
CREATE TABLE "worker_epp" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "worker_id" TEXT NOT NULL,
  "tipo_epp" TEXT NOT NULL,
  "marca" TEXT,
  "modelo" TEXT,
  "fecha_entrega" TIMESTAMP(3) NOT NULL,
  "cantidad_entregada" INTEGER NOT NULL DEFAULT 1,
  "fecha_vencimiento" TIMESTAMP(3),
  "evidencia_foto_url" TEXT,
  "firma_worker_url" TEXT,
  "observaciones" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "worker_epp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "worker_epp_org_id_idx" ON "worker_epp"("org_id");
CREATE INDEX "worker_epp_worker_id_fecha_entrega_idx" ON "worker_epp"("worker_id", "fecha_entrega");

ALTER TABLE "worker_epp" ADD CONSTRAINT "worker_epp_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worker_epp" ADD CONSTRAINT "worker_epp_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Simulacros ────────────────────────────────────────────────────────
CREATE TABLE "simulacros" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "sede_id" TEXT,
  "tipo" TEXT NOT NULL,
  "fecha_programada" TIMESTAMP(3) NOT NULL,
  "fecha_ejecutada" TIMESTAMP(3),
  "participantes_count" INTEGER,
  "brigadistas_count" INTEGER,
  "duracion_minutos" INTEGER,
  "observaciones" TEXT,
  "acta_url" TEXT,
  "foto_evidencia_url" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'PROGRAMADO',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "simulacros_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "simulacros_org_id_fecha_programada_idx" ON "simulacros"("org_id", "fecha_programada");
CREATE INDEX "simulacros_org_id_estado_idx" ON "simulacros"("org_id", "estado");

ALTER TABLE "simulacros" ADD CONSTRAINT "simulacros_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CuadroCategorias + Item ───────────────────────────────────────────
CREATE TABLE "cuadro_categorias" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "vigente_desde" TIMESTAMP(3) NOT NULL,
  "vigente_hasta" TIMESTAMP(3),
  "metodologia" TEXT NOT NULL,
  "pdf_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cuadro_categorias_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cuadro_categorias_org_id_vigente_desde_idx" ON "cuadro_categorias"("org_id", "vigente_desde");

ALTER TABLE "cuadro_categorias" ADD CONSTRAINT "cuadro_categorias_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cuadro_categoria_items" (
  "id" TEXT NOT NULL,
  "cuadro_id" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "rango_salarial_min" DECIMAL(10, 2) NOT NULL,
  "rango_salarial_max" DECIMAL(10, 2) NOT NULL,
  "conocimientos_requeridos" TEXT NOT NULL,
  "responsabilidad" TEXT NOT NULL,
  "esfuerzo_fisico" TEXT NOT NULL,
  "condiciones_ambientales" TEXT NOT NULL,

  CONSTRAINT "cuadro_categoria_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cuadro_categoria_items_cuadro_id_codigo_key" ON "cuadro_categoria_items"("cuadro_id", "codigo");
CREATE INDEX "cuadro_categoria_items_cuadro_id_idx" ON "cuadro_categoria_items"("cuadro_id");

ALTER TABLE "cuadro_categoria_items" ADD CONSTRAINT "cuadro_categoria_items_cuadro_id_fkey" FOREIGN KEY ("cuadro_id") REFERENCES "cuadro_categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Worker.cuadroCategoriaId ──────────────────────────────────────────
ALTER TABLE "workers" ADD COLUMN "cuadro_categoria_id" TEXT;
ALTER TABLE "workers" ADD CONSTRAINT "workers_cuadro_categoria_id_fkey" FOREIGN KEY ("cuadro_categoria_id") REFERENCES "cuadro_categoria_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "workers_cuadro_categoria_id_idx" ON "workers"("cuadro_categoria_id");
