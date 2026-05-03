-- =============================================
-- FASE 5 — SST PREMIUM
-- =============================================
-- Schema tabular real del módulo SST: Sede / PuestoTrabajo / IPERC matriz
-- P×S oficial SUNAFIL (R.M. 050-2013-TR) / Accidente con tracking SAT manual
-- (D.S. 006-2022-TR) / Comité paritario (R.M. 245-2021-TR) / FieldAudit con
-- captura offline + ingesta en oficina / sub-schema médico cifrado (Ley 29733
-- + D.S. 016-2024-JUS) / catálogos seed.
-- =============================================

-- Habilitar pgcrypto para cifrado de columnas médicas
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- CreateEnum
CREATE TYPE "TipoInstalacion" AS ENUM ('OFICINA', 'PLANTA', 'OBRA', 'SUCURSAL', 'TALLER', 'ALMACEN', 'CAMPO');

-- CreateEnum
CREATE TYPE "NivelRiesgoIPERC" AS ENUM ('TRIVIAL', 'TOLERABLE', 'MODERADO', 'IMPORTANTE', 'INTOLERABLE');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('BORRADOR', 'REVISION', 'VIGENTE', 'VENCIDO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "TipoAccidente" AS ENUM ('MORTAL', 'NO_MORTAL', 'INCIDENTE_PELIGROSO', 'ENFERMEDAD_OCUPACIONAL');

-- CreateEnum
CREATE TYPE "EstadoSAT" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'NOTIFICADO', 'CONFIRMADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoComite" AS ENUM ('VIGENTE', 'EN_ELECCION', 'INACTIVO');

-- CreateEnum
CREATE TYPE "CargoComite" AS ENUM ('PRESIDENTE', 'SECRETARIO', 'MIEMBRO');

-- CreateEnum
CREATE TYPE "OrigenMiembro" AS ENUM ('REPRESENTANTE_EMPLEADOR', 'REPRESENTANTE_TRABAJADORES');

-- CreateEnum
CREATE TYPE "TipoColaborador" AS ENUM ('EMPLEADO_INTERNO', 'CONTRATISTA');

-- CreateEnum
CREATE TYPE "EstadoVisita" AS ENUM ('PROGRAMADA', 'EN_CAMPO', 'PENDIENTE_INGESTA', 'EN_INGESTA', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoHallazgo" AS ENUM ('PELIGRO_NUEVO', 'PROCEDIMIENTO_INCUMPLIDO', 'EPP_AUSENTE', 'SENALIZACION_FALTANTE', 'EXTINTOR_VENCIDO', 'RUTA_EVACUACION_BLOQUEADA', 'OTRO');

-- CreateEnum
CREATE TYPE "FamiliaPeligro" AS ENUM ('FISICO', 'QUIMICO', 'BIOLOGICO', 'ERGONOMICO', 'PSICOSOCIAL', 'MECANICO', 'ELECTRICO', 'LOCATIVO');

-- CreateEnum
CREATE TYPE "NivelControl" AS ENUM ('ELIMINACION', 'SUSTITUCION', 'INGENIERIA', 'ADMINISTRATIVO', 'EPP');

-- CreateEnum
CREATE TYPE "TipoExamenEMO" AS ENUM ('PRE_EMPLEO', 'PERIODICO', 'RETIRO', 'REINTEGRO_LARGA_AUSENCIA');

-- CreateEnum
CREATE TYPE "AptitudEMO" AS ENUM ('APTO', 'APTO_CON_RESTRICCIONES', 'NO_APTO', 'OBSERVADO');

-- CreateEnum
CREATE TYPE "TipoARCO" AS ENUM ('ACCESO', 'RECTIFICACION', 'CANCELACION', 'OPOSICION', 'PORTABILIDAD');

-- CreateEnum
CREATE TYPE "EstadoARCO" AS ENUM ('RECIBIDA', 'EN_PROCESO', 'RESPONDIDA', 'VENCIDA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkerAlertType" ADD VALUE 'IPERC_VENCIDO';
ALTER TYPE "WorkerAlertType" ADD VALUE 'EMO_PROXIMO';
ALTER TYPE "WorkerAlertType" ADD VALUE 'EMO_VENCIDO';
ALTER TYPE "WorkerAlertType" ADD VALUE 'SAT_PLAZO_PROXIMO';
ALTER TYPE "WorkerAlertType" ADD VALUE 'SAT_PLAZO_VENCIDO';
ALTER TYPE "WorkerAlertType" ADD VALUE 'COMITE_REUNION_PENDIENTE';
ALTER TYPE "WorkerAlertType" ADD VALUE 'COMITE_MANDATO_VENCE';

-- CreateTable
CREATE TABLE "sedes" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "ubigeo" VARCHAR(6) NOT NULL,
    "departamento" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "area_m2" DECIMAL(10,2),
    "numero_pisos" INTEGER,
    "plano_archivo_url" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "tipo_instalacion" "TipoInstalacion" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puestos_trabajo" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "sede_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion_tareas" TEXT[],
    "jornada" TEXT,
    "exposicion_fisica" BOOLEAN NOT NULL DEFAULT false,
    "exposicion_quimica" BOOLEAN NOT NULL DEFAULT false,
    "exposicion_biologica" BOOLEAN NOT NULL DEFAULT false,
    "exposicion_ergonomica" BOOLEAN NOT NULL DEFAULT false,
    "exposicion_psicosocial" BOOLEAN NOT NULL DEFAULT false,
    "requiere_alturas" BOOLEAN NOT NULL DEFAULT false,
    "requiere_espacio_confinado" BOOLEAN NOT NULL DEFAULT false,
    "requiere_caliente_frio" BOOLEAN NOT NULL DEFAULT false,
    "requiere_sctr" BOOLEAN NOT NULL DEFAULT false,
    "requiere_exposicion_uv_solar" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puestos_trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iperc_bases" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "sede_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "hash_sha256" TEXT NOT NULL,
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'BORRADOR',
    "fecha_aprobacion" TIMESTAMP(3),
    "aprobado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iperc_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iperc_filas" (
    "id" TEXT NOT NULL,
    "iper_base_id" TEXT NOT NULL,
    "proceso" TEXT NOT NULL,
    "actividad" TEXT NOT NULL,
    "tarea" TEXT NOT NULL,
    "peligro_id" TEXT,
    "riesgo" TEXT NOT NULL,
    "indice_personas" INTEGER NOT NULL,
    "indice_procedimiento" INTEGER NOT NULL,
    "indice_capacitacion" INTEGER NOT NULL,
    "indice_exposicion" INTEGER NOT NULL,
    "indice_probabilidad" INTEGER NOT NULL,
    "indice_severidad" INTEGER NOT NULL,
    "nivel_riesgo" INTEGER NOT NULL,
    "clasificacion" "NivelRiesgoIPERC" NOT NULL,
    "es_significativo" BOOLEAN NOT NULL,
    "controles_actuales" TEXT[],
    "controles_propuestos" JSONB NOT NULL,
    "responsable" TEXT,
    "plazo_cierre" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iperc_filas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accidentes" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "sede_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "tipo" "TipoAccidente" NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "plazo_legal_horas" INTEGER NOT NULL,
    "sat_numero_manual" TEXT,
    "sat_fecha_envio_manual" TIMESTAMP(3),
    "sat_cargo_archivo_url" TEXT,
    "sat_estado" "EstadoSAT" NOT NULL DEFAULT 'PENDIENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accidentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigaciones_accidente" (
    "id" TEXT NOT NULL,
    "accidente_id" TEXT NOT NULL,
    "fecha_investigacion" TIMESTAMP(3) NOT NULL,
    "causas_inmediatas" JSONB NOT NULL,
    "causas_basicas" JSONB NOT NULL,
    "acciones_correctivas" JSONB NOT NULL,
    "responsable_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigaciones_accidente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comites_sst" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "mandato_inicio" TIMESTAMP(3) NOT NULL,
    "mandato_fin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoComite" NOT NULL DEFAULT 'VIGENTE',
    "libro_actas_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comites_sst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "miembros_comite" (
    "id" TEXT NOT NULL,
    "comite_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "cargo" "CargoComite" NOT NULL,
    "origen" "OrigenMiembro" NOT NULL,
    "fecha_alta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_baja" TIMESTAMP(3),

    CONSTRAINT "miembros_comite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colaboradores_sst" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "tipo_colaborador" "TipoColaborador" NOT NULL,
    "vigencia_contrato_hasta" TIMESTAMP(3),
    "disponibilidad" JSONB,
    "especialidades" TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colaboradores_sst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas_field_audit" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "sede_id" TEXT NOT NULL,
    "colaborador_id" TEXT NOT NULL,
    "fecha_programada" TIMESTAMP(3) NOT NULL,
    "fecha_inicio_campo" TIMESTAMP(3),
    "fecha_cierre_oficina" TIMESTAMP(3),
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "foto_fachada_url" TEXT,
    "estado" "EstadoVisita" NOT NULL DEFAULT 'PROGRAMADA',
    "payload_offline_json" JSONB,
    "notas_inspector" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitas_field_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hallazgos_field_audit" (
    "id" TEXT NOT NULL,
    "visita_id" TEXT NOT NULL,
    "tipo" "TipoHallazgo" NOT NULL,
    "severidad" "NivelRiesgoIPERC" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "foto_url" TEXT,
    "coordenadas_gps" JSONB,
    "accion_propuesta" TEXT NOT NULL,
    "responsable" TEXT,
    "plazo_cierre" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hallazgos_field_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_peligros" (
    "id" TEXT NOT NULL,
    "familia" "FamiliaPeligro" NOT NULL,
    "sector_ciiu" TEXT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fuente_legal" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_peligros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_controles" (
    "id" TEXT NOT NULL,
    "peligro_id_sugerido" TEXT,
    "nivel" "NivelControl" NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "costo_estimado_soles" DECIMAL(10,2),
    "fuente_legal" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_controles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emo" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "tipo_examen" "TipoExamenEMO" NOT NULL,
    "fecha_examen" TIMESTAMP(3) NOT NULL,
    "centro_medico_nombre" TEXT NOT NULL,
    "centro_medico_ruc" TEXT,
    "aptitud" "AptitudEMO" NOT NULL,
    "restricciones_cifrado" BYTEA,
    "consentimiento_ley_29733" BOOLEAN NOT NULL,
    "fecha_consentimiento" TIMESTAMP(3),
    "proximo_examen_antes" TIMESTAMP(3),
    "certificado_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimientos_ley_29733" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "texto_cifrado" BYTEA NOT NULL,
    "firma_cifrada" BYTEA NOT NULL,
    "webauthn_credential_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "vigencia_hasta" TIMESTAMP(3) NOT NULL,
    "revocado_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consentimientos_ley_29733_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_arco" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "solicitante_dni" TEXT NOT NULL,
    "solicitante_name" TEXT NOT NULL,
    "tipo" "TipoARCO" NOT NULL,
    "detalle_cifrado" BYTEA,
    "estado" "EstadoARCO" NOT NULL DEFAULT 'RECIBIDA',
    "sla_hasta" TIMESTAMP(3) NOT NULL,
    "dpo_asignado_id" TEXT,
    "respuesta_at" TIMESTAMP(3),
    "respuesta_archivo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_arco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- CreateIndex
CREATE INDEX "sedes_org_id_idx" ON "sedes"("org_id");

-- CreateIndex
CREATE INDEX "sedes_org_id_tipo_instalacion_idx" ON "sedes"("org_id", "tipo_instalacion");

-- CreateIndex
CREATE INDEX "puestos_trabajo_org_id_idx" ON "puestos_trabajo"("org_id");

-- CreateIndex
CREATE INDEX "puestos_trabajo_sede_id_idx" ON "puestos_trabajo"("sede_id");

-- CreateIndex
CREATE INDEX "puestos_trabajo_worker_id_idx" ON "puestos_trabajo"("worker_id");

-- CreateIndex
CREATE INDEX "iperc_bases_org_id_estado_idx" ON "iperc_bases"("org_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "iperc_bases_org_id_sede_id_version_key" ON "iperc_bases"("org_id", "sede_id", "version");

-- CreateIndex
CREATE INDEX "iperc_filas_iper_base_id_idx" ON "iperc_filas"("iper_base_id");

-- CreateIndex
CREATE INDEX "iperc_filas_clasificacion_idx" ON "iperc_filas"("clasificacion");

-- CreateIndex
CREATE INDEX "accidentes_org_id_sat_estado_idx" ON "accidentes"("org_id", "sat_estado");

-- CreateIndex
CREATE INDEX "accidentes_org_id_fecha_hora_idx" ON "accidentes"("org_id", "fecha_hora");

-- CreateIndex
CREATE INDEX "accidentes_sede_id_idx" ON "accidentes"("sede_id");

-- CreateIndex
CREATE INDEX "investigaciones_accidente_accidente_id_idx" ON "investigaciones_accidente"("accidente_id");

-- CreateIndex
CREATE INDEX "comites_sst_org_id_estado_idx" ON "comites_sst"("org_id", "estado");

-- CreateIndex
CREATE INDEX "miembros_comite_comite_id_idx" ON "miembros_comite"("comite_id");

-- CreateIndex
CREATE UNIQUE INDEX "miembros_comite_comite_id_worker_id_key" ON "miembros_comite"("comite_id", "worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "colaboradores_sst_dni_key" ON "colaboradores_sst"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "colaboradores_sst_email_key" ON "colaboradores_sst"("email");

-- CreateIndex
CREATE INDEX "colaboradores_sst_activo_idx" ON "colaboradores_sst"("activo");

-- CreateIndex
CREATE INDEX "visitas_field_audit_org_id_estado_idx" ON "visitas_field_audit"("org_id", "estado");

-- CreateIndex
CREATE INDEX "visitas_field_audit_sede_id_idx" ON "visitas_field_audit"("sede_id");

-- CreateIndex
CREATE INDEX "visitas_field_audit_colaborador_id_idx" ON "visitas_field_audit"("colaborador_id");

-- CreateIndex
CREATE INDEX "hallazgos_field_audit_visita_id_idx" ON "hallazgos_field_audit"("visita_id");

-- CreateIndex
CREATE INDEX "hallazgos_field_audit_severidad_idx" ON "hallazgos_field_audit"("severidad");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_peligros_codigo_key" ON "catalogo_peligros"("codigo");

-- CreateIndex
CREATE INDEX "catalogo_peligros_familia_idx" ON "catalogo_peligros"("familia");

-- CreateIndex
CREATE INDEX "catalogo_peligros_sector_ciiu_idx" ON "catalogo_peligros"("sector_ciiu");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_controles_codigo_key" ON "catalogo_controles"("codigo");

-- CreateIndex
CREATE INDEX "catalogo_controles_nivel_idx" ON "catalogo_controles"("nivel");

-- CreateIndex
CREATE INDEX "catalogo_controles_peligro_id_sugerido_idx" ON "catalogo_controles"("peligro_id_sugerido");

-- CreateIndex
CREATE INDEX "emo_org_id_worker_id_idx" ON "emo"("org_id", "worker_id");

-- CreateIndex
CREATE INDEX "emo_proximo_examen_antes_idx" ON "emo"("proximo_examen_antes");

-- CreateIndex
CREATE INDEX "consentimientos_ley_29733_org_id_worker_id_idx" ON "consentimientos_ley_29733"("org_id", "worker_id");

-- CreateIndex
CREATE INDEX "solicitudes_arco_org_id_estado_idx" ON "solicitudes_arco"("org_id", "estado");

-- CreateIndex
CREATE INDEX "solicitudes_arco_sla_hasta_idx" ON "solicitudes_arco"("sla_hasta");

-- CreateIndex
-- AddForeignKey
ALTER TABLE "sedes" ADD CONSTRAINT "sedes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puestos_trabajo" ADD CONSTRAINT "puestos_trabajo_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puestos_trabajo" ADD CONSTRAINT "puestos_trabajo_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iperc_bases" ADD CONSTRAINT "iperc_bases_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iperc_bases" ADD CONSTRAINT "iperc_bases_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iperc_filas" ADD CONSTRAINT "iperc_filas_iper_base_id_fkey" FOREIGN KEY ("iper_base_id") REFERENCES "iperc_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accidentes" ADD CONSTRAINT "accidentes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accidentes" ADD CONSTRAINT "accidentes_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accidentes" ADD CONSTRAINT "accidentes_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigaciones_accidente" ADD CONSTRAINT "investigaciones_accidente_accidente_id_fkey" FOREIGN KEY ("accidente_id") REFERENCES "accidentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comites_sst" ADD CONSTRAINT "comites_sst_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembros_comite" ADD CONSTRAINT "miembros_comite_comite_id_fkey" FOREIGN KEY ("comite_id") REFERENCES "comites_sst"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembros_comite" ADD CONSTRAINT "miembros_comite_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_field_audit" ADD CONSTRAINT "visitas_field_audit_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_field_audit" ADD CONSTRAINT "visitas_field_audit_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_field_audit" ADD CONSTRAINT "visitas_field_audit_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores_sst"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hallazgos_field_audit" ADD CONSTRAINT "hallazgos_field_audit_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visitas_field_audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emo" ADD CONSTRAINT "emo_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emo" ADD CONSTRAINT "emo_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos_ley_29733" ADD CONSTRAINT "consentimientos_ley_29733_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos_ley_29733" ADD CONSTRAINT "consentimientos_ley_29733_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_arco" ADD CONSTRAINT "solicitudes_arco_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_arco" ADD CONSTRAINT "solicitudes_arco_dpo_asignado_id_fkey" FOREIGN KEY ("dpo_asignado_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
