-- CreateTable
CREATE TABLE "HistoryConvert" (
    "id" SERIAL NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT 'KB',
    "titleCsv" TEXT NOT NULL,
    "titleXlsx" TEXT NOT NULL,
    "storeId" INTEGER,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoryConvert_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HistoryConvert" ADD CONSTRAINT "HistoryConvert_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryConvert" ADD CONSTRAINT "HistoryConvert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
