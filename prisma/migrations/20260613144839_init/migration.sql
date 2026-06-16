-- CreateTable
CREATE TABLE "store_configs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT,
    "apiSecretEncrypted" TEXT,
    "apiVersion" TEXT NOT NULL DEFAULT '2025-07',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_configs_pkey" PRIMARY KEY ("id")
);
