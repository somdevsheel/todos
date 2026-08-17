-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "mentionedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
