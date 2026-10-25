-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PREVIEW', 'IMPORTED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('PENDING', 'IMPORTED', 'SKIPPED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('ERROR', 'WARNING', 'INFO');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'INR';

-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'INR';

-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN "activeFrom" TIMESTAMP(3),
ADD COLUMN "activeTo" TIMESTAMP(3),
ADD COLUMN "membershipType" TEXT;

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalCsv" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PREVIEW',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "blockedRows" INTEGER NOT NULL DEFAULT 0,
    "report" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRawRow" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "rawText" TEXT NOT NULL,
    "parsedData" JSONB,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "finalAction" TEXT,
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRawRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportAnomaly" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "originalRowData" JSONB NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "explanation" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "finalActionTaken" TEXT,
    "userApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "fieldName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportRawRow_expenseId_key" ON "ImportRawRow"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRawRow_importId_rowNumber_key" ON "ImportRawRow"("importId", "rowNumber");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRawRow" ADD CONSTRAINT "ImportRawRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRawRow" ADD CONSTRAINT "ImportRawRow_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportAnomaly" ADD CONSTRAINT "ImportAnomaly_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportAnomaly" ADD CONSTRAINT "ImportAnomaly_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "ImportRawRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
