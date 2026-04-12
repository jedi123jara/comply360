-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE');

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "clock_in" TIMESTAMP(3) NOT NULL,
    "clock_out" TIMESTAMP(3),
    "hours_worked" DECIMAL(5,2),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_org_id_clock_in_idx" ON "attendance"("org_id", "clock_in");

-- CreateIndex
CREATE INDEX "attendance_worker_id_clock_in_idx" ON "attendance"("worker_id", "clock_in");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
