-- Organigrama Compliance-First: 6 tablas + 2 enums
-- Ver src/lib/orgchart/ para la lógica de mantenimiento del closure table.

-- CreateEnum
CREATE TYPE "UnitKind" AS ENUM ('GERENCIA', 'AREA', 'DEPARTAMENTO', 'EQUIPO', 'COMITE_LEGAL', 'BRIGADA', 'PROYECTO');

-- CreateEnum
CREATE TYPE "ComplianceRoleType" AS ENUM (
  'PRESIDENTE_COMITE_SST',
  'SECRETARIO_COMITE_SST',
  'REPRESENTANTE_TRABAJADORES_SST',
  'REPRESENTANTE_EMPLEADOR_SST',
  'SUPERVISOR_SST',
  'PRESIDENTE_COMITE_HOSTIGAMIENTO',
  'MIEMBRO_COMITE_HOSTIGAMIENTO',
  'JEFE_INMEDIATO_HOSTIGAMIENTO',
  'BRIGADISTA_PRIMEROS_AUXILIOS',
  'BRIGADISTA_EVACUACION',
  'BRIGADISTA_AMAGO_INCENDIO',
  'DPO_LEY_29733',
  'RT_PLANILLA',
  'RESPONSABLE_IGUALDAD_SALARIAL',
  'ENCARGADO_LIBRO_RECLAMACIONES',
  'MEDICO_OCUPACIONAL',
  'ASISTENTA_SOCIAL',
  'RESPONSABLE_LACTARIO',
  'ENCARGADO_NUTRICION'
);

-- CreateEnum
CREATE TYPE "OrgStructureChangeType" AS ENUM (
  'UNIT_CREATE',
  'UNIT_UPDATE',
  'UNIT_DELETE',
  'UNIT_MOVE',
  'POSITION_CREATE',
  'POSITION_UPDATE',
  'POSITION_DELETE',
  'POSITION_REPARENT',
  'ASSIGNMENT_CREATE',
  'ASSIGNMENT_END',
  'ASSIGNMENT_REASSIGN',
  'COMPLIANCE_ROLE_CREATE',
  'COMPLIANCE_ROLE_END',
  'SNAPSHOT_CREATE',
  'PUBLIC_LINK_CREATE'
);

-- CreateTable: org_units
CREATE TABLE "org_units" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "UnitKind" NOT NULL DEFAULT 'AREA',
    "code" TEXT,
    "description" TEXT,
    "cost_center" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "icon" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_units_org_id_slug_key" ON "org_units"("org_id", "slug");
CREATE INDEX "org_units_org_id_parent_id_idx" ON "org_units"("org_id", "parent_id");
CREATE INDEX "org_units_org_id_kind_idx" ON "org_units"("org_id", "kind");
CREATE INDEX "org_units_org_id_valid_from_valid_to_idx" ON "org_units"("org_id", "valid_from", "valid_to");

ALTER TABLE "org_units" ADD CONSTRAINT "org_units_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: org_unit_closure
CREATE TABLE "org_unit_closure" (
    "ancestor_id" TEXT NOT NULL,
    "descendant_id" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,

    CONSTRAINT "org_unit_closure_pkey" PRIMARY KEY ("ancestor_id", "descendant_id")
);

CREATE INDEX "org_unit_closure_descendant_id_idx" ON "org_unit_closure"("descendant_id");

ALTER TABLE "org_unit_closure" ADD CONSTRAINT "org_unit_closure_ancestor_id_fkey" FOREIGN KEY ("ancestor_id") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_unit_closure" ADD CONSTRAINT "org_unit_closure_descendant_id_fkey" FOREIGN KEY ("descendant_id") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: org_positions
CREATE TABLE "org_positions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "org_unit_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "level" TEXT,
    "purpose" TEXT,
    "functions" JSONB,
    "responsibilities" JSONB,
    "requirements" JSONB,
    "salary_band_min" DECIMAL(10,2),
    "salary_band_max" DECIMAL(10,2),
    "category" TEXT,
    "risk_category" TEXT,
    "requires_sctr" BOOLEAN NOT NULL DEFAULT false,
    "requires_medical_exam" BOOLEAN NOT NULL DEFAULT false,
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "is_managerial" BOOLEAN NOT NULL DEFAULT false,
    "reports_to_position_id" TEXT,
    "backup_position_id" TEXT,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "raci_default" JSONB,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_positions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_positions_org_id_org_unit_id_idx" ON "org_positions"("org_id", "org_unit_id");
CREATE INDEX "org_positions_org_id_reports_to_position_id_idx" ON "org_positions"("org_id", "reports_to_position_id");
CREATE INDEX "org_positions_org_id_valid_from_valid_to_idx" ON "org_positions"("org_id", "valid_from", "valid_to");

ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_reports_to_position_id_fkey" FOREIGN KEY ("reports_to_position_id") REFERENCES "org_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_backup_position_id_fkey" FOREIGN KEY ("backup_position_id") REFERENCES "org_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: org_assignments
CREATE TABLE "org_assignments" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "is_interim" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "capacity_pct" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_assignments_org_id_worker_id_ended_at_idx" ON "org_assignments"("org_id", "worker_id", "ended_at");
CREATE INDEX "org_assignments_org_id_position_id_ended_at_idx" ON "org_assignments"("org_id", "position_id", "ended_at");

ALTER TABLE "org_assignments" ADD CONSTRAINT "org_assignments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_assignments" ADD CONSTRAINT "org_assignments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_assignments" ADD CONSTRAINT "org_assignments_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "org_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: org_compliance_roles
CREATE TABLE "org_compliance_roles" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "role_type" "ComplianceRoleType" NOT NULL,
    "unit_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "elected_at" TIMESTAMP(3),
    "acta_url" TEXT,
    "base_legal" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_compliance_roles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_compliance_roles_org_id_role_type_ends_at_idx" ON "org_compliance_roles"("org_id", "role_type", "ends_at");
CREATE INDEX "org_compliance_roles_org_id_worker_id_idx" ON "org_compliance_roles"("org_id", "worker_id");

ALTER TABLE "org_compliance_roles" ADD CONSTRAINT "org_compliance_roles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_compliance_roles" ADD CONSTRAINT "org_compliance_roles_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_compliance_roles" ADD CONSTRAINT "org_compliance_roles_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: org_chart_snapshots
CREATE TABLE "org_chart_snapshots" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "reason" TEXT,
    "taken_by_id" TEXT,
    "payload" JSONB NOT NULL,
    "worker_count" INTEGER NOT NULL DEFAULT 0,
    "unit_count" INTEGER NOT NULL DEFAULT 0,
    "depth_max" INTEGER NOT NULL DEFAULT 0,
    "hash" TEXT NOT NULL,
    "is_auto" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_chart_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_chart_snapshots_org_id_hash_key" ON "org_chart_snapshots"("org_id", "hash");
CREATE INDEX "org_chart_snapshots_org_id_created_at_idx" ON "org_chart_snapshots"("org_id", "created_at");

ALTER TABLE "org_chart_snapshots" ADD CONSTRAINT "org_chart_snapshots_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: org_chart_drafts
CREATE TABLE "org_chart_drafts" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_snapshot_id" TEXT,
    "payload" JSONB NOT NULL,
    "diff_summary" JSONB,
    "impact_report" JSONB,
    "created_by_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "applied_at" TIMESTAMP(3),
    "applied_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_chart_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_chart_drafts_org_id_status_idx" ON "org_chart_drafts"("org_id", "status");

ALTER TABLE "org_chart_drafts" ADD CONSTRAINT "org_chart_drafts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: org_structure_change_logs
CREATE TABLE "org_structure_change_logs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "type" "OrgStructureChangeType" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "performed_by_id" TEXT,
    "ip_address" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_structure_change_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_structure_change_logs_org_id_created_at_idx" ON "org_structure_change_logs"("org_id", "created_at");
CREATE INDEX "org_structure_change_logs_org_id_entity_type_entity_id_idx" ON "org_structure_change_logs"("org_id", "entity_type", "entity_id");

ALTER TABLE "org_structure_change_logs" ADD CONSTRAINT "org_structure_change_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
