-- Rename assignment-facing tables and membership date fields.
ALTER TABLE "GroupMember" RENAME TO "GroupMembership";
ALTER TABLE "GroupMembership" RENAME COLUMN "activeFrom" TO "joinedAt";
ALTER TABLE "GroupMembership" RENAME COLUMN "activeTo" TO "leftAt";

ALTER TABLE "ImportBatch" RENAME TO "CsvImportBatch";
ALTER TABLE "ImportRawRow" RENAME TO "CsvRawRow";

-- Original money and normalized INR audit fields.
ALTER TABLE "Expense"
ADD COLUMN "originalAmountMinor" INTEGER,
ADD COLUMN "originalCurrency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN "normalizedAmountInrCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "exchangeRateId" TEXT;

UPDATE "Expense" SET
  "originalAmountMinor" = "amountCents",
  "normalizedAmountInrCents" = "amountCents",
  "originalCurrency" = "currencyCode";

ALTER TABLE "ExpenseSplit"
ADD COLUMN "normalizedOwedInrCents" INTEGER,
ADD COLUMN "originalOwedMinor" INTEGER,
ADD COLUMN "originalCurrency" TEXT;

UPDATE "ExpenseSplit" SET
  "normalizedOwedInrCents" = "owedCents",
  "originalOwedMinor" = "owedCents",
  "originalCurrency" = 'INR';

ALTER TABLE "Settlement"
ADD COLUMN "originalAmountMinor" INTEGER,
ADD COLUMN "originalCurrency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN "normalizedAmountInrCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "exchangeRateId" TEXT;

UPDATE "Settlement" SET
  "originalAmountMinor" = "amountCents",
  "normalizedAmountInrCents" = "amountCents",
  "originalCurrency" = "currencyCode";

-- Import decisions are append-only records of reviewer choices.
CREATE TABLE "ImportDecision" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "anomalyId" TEXT,
    "decision" TEXT NOT NULL,
    "rationale" TEXT,
    "decidedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportDecision_pkey" PRIMARY KEY ("id")
);

-- Exchange rates store deterministic correction policy for non-INR CSV rows.
CREATE TABLE "CurrencyRate" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "sourceCurrency" TEXT NOT NULL,
    "targetCurrency" TEXT NOT NULL DEFAULT 'INR',
    "rateMicros" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyRate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "importId" TEXT,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CurrencyRate_groupId_sourceCurrency_targetCurrency_effectiveDate_key" ON "CurrencyRate"("groupId", "sourceCurrency", "targetCurrency", "effectiveDate");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_exchangeRateId_fkey" FOREIGN KEY ("exchangeRateId") REFERENCES "CurrencyRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_exchangeRateId_fkey" FOREIGN KEY ("exchangeRateId") REFERENCES "CurrencyRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImportDecision" ADD CONSTRAINT "ImportDecision_importId_fkey" FOREIGN KEY ("importId") REFERENCES "CsvImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportDecision" ADD CONSTRAINT "ImportDecision_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "CsvRawRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportDecision" ADD CONSTRAINT "ImportDecision_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "ImportAnomaly"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportDecision" ADD CONSTRAINT "ImportDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CurrencyRate" ADD CONSTRAINT "CurrencyRate_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_importId_fkey" FOREIGN KEY ("importId") REFERENCES "CsvImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
