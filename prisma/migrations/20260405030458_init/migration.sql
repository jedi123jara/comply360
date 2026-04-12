-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'STARTER', 'EMPRESA', 'PRO');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO', 'LABORAL_TIEMPO_PARCIAL', 'LOCACION_SERVICIOS', 'CONFIDENCIALIDAD', 'NO_COMPETENCIA', 'POLITICA_HOSTIGAMIENTO', 'POLITICA_SST', 'REGLAMENTO_INTERNO', 'ADDENDUM', 'CONVENIO_PRACTICAS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NormCategory" AS ENUM ('LABORAL', 'SUNAFIL', 'SEGURIDAD_SALUD', 'TRIBUTARIO', 'PROCESAL', 'GENERAL');

-- CreateEnum
CREATE TYPE "RuleOutput" AS ENUM ('NUMBER', 'BOOLEAN', 'PERCENTAGE', 'TEXT', 'CLAUSE');

-- CreateEnum
CREATE TYPE "CalculationType" AS ENUM ('LIQUIDACION', 'CTS', 'GRATIFICACION', 'INDEMNIZACION', 'HORAS_EXTRAS', 'VACACIONES', 'MULTA_SUNAFIL', 'INTERESES_LEGALES');

-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('UNREAD', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruc" TEXT,
    "sector" TEXT,
    "size_range" TEXT,
    "logo_url" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "plan_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "org_id" TEXT,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fields_schema" JSONB NOT NULL,
    "content_blocks" JSONB NOT NULL,
    "legal_basis" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "template_id" TEXT,
    "type" "ContractType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "form_data" JSONB,
    "content_json" JSONB,
    "content_html" TEXT,
    "docx_url" TEXT,
    "pdf_url" TEXT,
    "expires_at" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "ai_risk_score" INTEGER,
    "ai_risks_json" JSONB,
    "ai_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_norms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body_text" TEXT,
    "category" "NormCategory" NOT NULL,
    "published_at" TIMESTAMP(3),
    "effective_at" TIMESTAMP(3),
    "repealed_at" TIMESTAMP(3),
    "source_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_norms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_rules" (
    "id" TEXT NOT NULL,
    "norm_id" TEXT NOT NULL,
    "rule_key" TEXT NOT NULL,
    "description" TEXT,
    "condition_json" JSONB,
    "formula" TEXT,
    "parameters" JSONB,
    "output_type" "RuleOutput" NOT NULL DEFAULT 'NUMBER',
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculations" (
    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "user_id" TEXT,
    "type" "CalculationType" NOT NULL,
    "inputs_json" JSONB NOT NULL,
    "result_json" JSONB NOT NULL,
    "total_amount" DECIMAL(12,2),
    "pdf_url" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "norm_alerts" (
    "id" TEXT NOT NULL,
    "norm_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "impact_level" "ImpactLevel" NOT NULL,
    "affected_contract_types" "ContractType"[],
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "norm_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_alerts" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "norm_alert_id" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'UNREAD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "payment_provider" TEXT,
    "external_subscription_id" TEXT,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata_json" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_ruc_key" ON "organizations"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "contracts_org_id_status_idx" ON "contracts"("org_id", "status");

-- CreateIndex
CREATE INDEX "contracts_org_id_type_idx" ON "contracts"("org_id", "type");

-- CreateIndex
CREATE INDEX "contracts_expires_at_idx" ON "contracts"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "legal_norms_code_key" ON "legal_norms"("code");

-- CreateIndex
CREATE INDEX "legal_norms_category_idx" ON "legal_norms"("category");

-- CreateIndex
CREATE UNIQUE INDEX "legal_rules_rule_key_key" ON "legal_rules"("rule_key");

-- CreateIndex
CREATE INDEX "legal_rules_rule_key_idx" ON "legal_rules"("rule_key");

-- CreateIndex
CREATE INDEX "calculations_org_id_type_idx" ON "calculations"("org_id", "type");

-- CreateIndex
CREATE INDEX "calculations_created_at_idx" ON "calculations"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "org_alerts_org_id_norm_alert_id_key" ON "org_alerts"("org_id", "norm_alert_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_org_id_key" ON "subscriptions"("org_id");

-- CreateIndex
CREATE INDEX "audit_logs_org_id_created_at_idx" ON "audit_logs"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_rules" ADD CONSTRAINT "legal_rules_norm_id_fkey" FOREIGN KEY ("norm_id") REFERENCES "legal_norms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "norm_alerts" ADD CONSTRAINT "norm_alerts_norm_id_fkey" FOREIGN KEY ("norm_id") REFERENCES "legal_norms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_alerts" ADD CONSTRAINT "org_alerts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_alerts" ADD CONSTRAINT "org_alerts_norm_alert_id_fkey" FOREIGN KEY ("norm_alert_id") REFERENCES "norm_alerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
