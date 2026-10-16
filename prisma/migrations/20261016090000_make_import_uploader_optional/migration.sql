-- AlterTable
ALTER TABLE "attendance_imports" ALTER COLUMN "uploaded_by_user_id" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "attendance_imports" DROP CONSTRAINT "attendance_imports_uploaded_by_user_id_fkey";

-- AddForeignKey
ALTER TABLE "attendance_imports" ADD CONSTRAINT "attendance_imports_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
