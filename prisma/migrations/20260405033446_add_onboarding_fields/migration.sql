-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "alert_email" TEXT,
ADD COLUMN     "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "razon_social" TEXT,
ADD COLUMN     "regimen_principal" TEXT;
