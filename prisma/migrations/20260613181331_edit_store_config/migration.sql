/*
  Warnings:

  - You are about to drop the column `apiKeyEncrypted` on the `store_configs` table. All the data in the column will be lost.
  - You are about to drop the column `apiSecretEncrypted` on the `store_configs` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[shopDomain]` on the table `store_configs` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "store_configs" DROP COLUMN "apiKeyEncrypted",
DROP COLUMN "apiSecretEncrypted";

-- CreateIndex
CREATE UNIQUE INDEX "store_configs_shopDomain_key" ON "store_configs"("shopDomain");
