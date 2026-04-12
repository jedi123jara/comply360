-- CreateEnum
CREATE TYPE "CourseCategory" AS ENUM ('SST', 'HOSTIGAMIENTO', 'DERECHOS_LABORALES', 'CONTRATOS', 'PLANILLA', 'INSPECCIONES', 'IGUALDAD', 'GENERAL');

-- CreateEnum
CREATE TYPE "LessonContentType" AS ENUM ('VIDEO', 'READING', 'INTERACTIVE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'EXAM_PENDING', 'PASSED', 'FAILED');

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "CourseCategory" NOT NULL,
    "thumbnail_url" TEXT,
    "duration_min" INTEGER NOT NULL DEFAULT 30,
    "is_obligatory" BOOLEAN NOT NULL DEFAULT false,
    "target_regimen" "RegimenLaboral"[],
    "target_roles" TEXT[],
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content_type" "LessonContentType" NOT NULL,
    "content_url" TEXT,
    "content_html" TEXT,
    "duration_min" INTEGER NOT NULL DEFAULT 10,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "org_id" TEXT NOT NULL,
    "worker_name" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "exam_score" INTEGER,
    "exam_attempts" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "certificate_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "time_spent_sec" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "explanation" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "worker_name" TEXT NOT NULL,
    "worker_dni" TEXT,
    "course_title" TEXT NOT NULL,
    "course_category" "CourseCategory" NOT NULL,
    "score" INTEGER NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "qr_data" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_category_idx" ON "courses"("category");

-- CreateIndex
CREATE INDEX "lessons_course_id_idx" ON "lessons"("course_id");

-- CreateIndex
CREATE INDEX "enrollments_org_id_status_idx" ON "enrollments"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_course_id_worker_id_org_id_key" ON "enrollments"("course_id", "worker_id", "org_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_enrollment_id_lesson_id_key" ON "lesson_progress"("enrollment_id", "lesson_id");

-- CreateIndex
CREATE INDEX "exam_questions_course_id_idx" ON "exam_questions"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");

-- CreateIndex
CREATE INDEX "certificates_org_id_idx" ON "certificates"("org_id");

-- CreateIndex
CREATE INDEX "certificates_code_idx" ON "certificates"("code");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
