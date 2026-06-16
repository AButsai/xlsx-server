/*
  Warnings:

  - Added the required column `userId` to the `store_configs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "store_configs" ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "store_configs" ADD CONSTRAINT "store_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
