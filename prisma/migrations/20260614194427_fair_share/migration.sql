-- AlterTable
ALTER TABLE "CsvImportBatch" RENAME CONSTRAINT "ImportBatch_pkey" TO "CsvImportBatch_pkey";

-- AlterTable
ALTER TABLE "CsvRawRow" RENAME CONSTRAINT "ImportRawRow_pkey" TO "CsvRawRow_pkey";

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "normalizedAmountInrCents" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GroupMembership" RENAME CONSTRAINT "GroupMember_pkey" TO "GroupMembership_pkey";

-- AlterTable
ALTER TABLE "Settlement" ALTER COLUMN "normalizedAmountInrCents" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "CsvImportBatch" RENAME CONSTRAINT "ImportBatch_createdById_fkey" TO "CsvImportBatch_createdById_fkey";

-- RenameForeignKey
ALTER TABLE "CsvImportBatch" RENAME CONSTRAINT "ImportBatch_groupId_fkey" TO "CsvImportBatch_groupId_fkey";

-- RenameForeignKey
ALTER TABLE "CsvRawRow" RENAME CONSTRAINT "ImportRawRow_expenseId_fkey" TO "CsvRawRow_expenseId_fkey";

-- RenameForeignKey
ALTER TABLE "CsvRawRow" RENAME CONSTRAINT "ImportRawRow_importId_fkey" TO "CsvRawRow_importId_fkey";

-- RenameForeignKey
ALTER TABLE "GroupMembership" RENAME CONSTRAINT "GroupMember_groupId_fkey" TO "GroupMembership_groupId_fkey";

-- RenameForeignKey
ALTER TABLE "GroupMembership" RENAME CONSTRAINT "GroupMember_userId_fkey" TO "GroupMembership_userId_fkey";

-- RenameIndex
ALTER INDEX "ImportRawRow_expenseId_key" RENAME TO "CsvRawRow_expenseId_key";

-- RenameIndex
ALTER INDEX "ImportRawRow_importId_rowNumber_key" RENAME TO "CsvRawRow_importId_rowNumber_key";

-- RenameIndex
ALTER INDEX "CurrencyRate_groupId_sourceCurrency_targetCurrency_effectiveDat" RENAME TO "CurrencyRate_groupId_sourceCurrency_targetCurrency_effectiv_key";

-- RenameIndex
ALTER INDEX "GroupMember_groupId_userId_key" RENAME TO "GroupMembership_groupId_userId_key";
