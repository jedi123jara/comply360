-- CreateTable
CREATE TABLE "consultor_clients" (
    "id" TEXT NOT NULL,
    "consultor_user_id" TEXT NOT NULL,
    "consultor_org_id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "client_org_name" TEXT,
    "client_ruc" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultor_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consultor_clients_consultor_user_id_client_org_id_key" ON "consultor_clients"("consultor_user_id", "client_org_id");

-- CreateIndex
CREATE INDEX "consultor_clients_consultor_user_id_is_active_idx" ON "consultor_clients"("consultor_user_id", "is_active");

-- CreateIndex
CREATE INDEX "consultor_clients_consultor_org_id_idx" ON "consultor_clients"("consultor_org_id");

-- AddForeignKey
ALTER TABLE "consultor_clients" ADD CONSTRAINT "consultor_clients_consultor_org_id_fkey" FOREIGN KEY ("consultor_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultor_clients" ADD CONSTRAINT "consultor_clients_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
