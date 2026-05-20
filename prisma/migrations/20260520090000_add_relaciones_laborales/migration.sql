-- Fase 4 — Relaciones Laborales: DisciplinaryAction, Sindicato, ConvencionColectiva

CREATE TABLE "disciplinary_actions" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "worker_id" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "fecha_accion" TIMESTAMP(3) NOT NULL,
  "motivo" TEXT NOT NULL,
  "base_legal" TEXT,
  "dias_suspension" INTEGER,
  "descargos_plazo" TIMESTAMP(3),
  "descargos_recibidos" BOOLEAN NOT NULL DEFAULT false,
  "descargos_texto" TEXT,
  "resolucion_final" TEXT,
  "carta_url" TEXT,
  "apelado_por" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "disciplinary_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "disciplinary_actions_org_id_worker_id_fecha_accion_idx" ON "disciplinary_actions"("org_id", "worker_id", "fecha_accion");
CREATE INDEX "disciplinary_actions_org_id_fecha_accion_idx" ON "disciplinary_actions"("org_id", "fecha_accion");

ALTER TABLE "disciplinary_actions" ADD CONSTRAINT "disciplinary_actions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "disciplinary_actions" ADD CONSTRAINT "disciplinary_actions_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "sindicatos" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "fecha_constitucion" TIMESTAMP(3) NOT NULL,
  "registro_mtpe" TEXT,
  "numero_afiliados" INTEGER NOT NULL DEFAULT 0,
  "presidente" TEXT,
  "fecha_proxima_eleccion" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sindicatos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sindicatos_org_id_idx" ON "sindicatos"("org_id");

ALTER TABLE "sindicatos" ADD CONSTRAINT "sindicatos_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "worker_afiliaciones_sindicales" (
  "id" TEXT NOT NULL,
  "worker_id" TEXT NOT NULL,
  "sindicato_id" TEXT NOT NULL,
  "fecha_afiliacion" TIMESTAMP(3) NOT NULL,
  "fecha_baja" TIMESTAMP(3),
  "es_dirigente" BOOLEAN NOT NULL DEFAULT false,
  "cargo_dirigencial" TEXT,
  "fuero_sindical_desde" TIMESTAMP(3),
  "fuero_sindical_hasta" TIMESTAMP(3),

  CONSTRAINT "worker_afiliaciones_sindicales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "worker_afiliaciones_sindicales_worker_id_sindicato_id_key" ON "worker_afiliaciones_sindicales"("worker_id", "sindicato_id");
CREATE INDEX "worker_afiliaciones_sindicales_sindicato_id_idx" ON "worker_afiliaciones_sindicales"("sindicato_id");

ALTER TABLE "worker_afiliaciones_sindicales" ADD CONSTRAINT "worker_afiliaciones_sindicales_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worker_afiliaciones_sindicales" ADD CONSTRAINT "worker_afiliaciones_sindicales_sindicato_id_fkey" FOREIGN KEY ("sindicato_id") REFERENCES "sindicatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "convenciones_colectivas" (
  "id" TEXT NOT NULL,
  "sindicato_id" TEXT NOT NULL,
  "vigencia_desde" TIMESTAMP(3) NOT NULL,
  "vigencia_hasta" TIMESTAMP(3) NOT NULL,
  "file_url" TEXT NOT NULL,
  "resumen_json" JSONB,
  "cumplimiento_verificado_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "convenciones_colectivas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "convenciones_colectivas_sindicato_id_vigencia_desde_idx" ON "convenciones_colectivas"("sindicato_id", "vigencia_desde");

ALTER TABLE "convenciones_colectivas" ADD CONSTRAINT "convenciones_colectivas_sindicato_id_fkey" FOREIGN KEY ("sindicato_id") REFERENCES "sindicatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
