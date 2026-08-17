-- AlterTable
ALTER TABLE "task_comments" ADD COLUMN     "mentionedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
