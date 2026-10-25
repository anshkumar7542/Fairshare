export type User = {
  id: string;
  name: string;
  email: string;
};

export type GroupMembership = {
  id: string;
  userId: string;
  joinedAt?: string | null;
  leftAt?: string | null;
  membershipType?: string | null;
  user: User;
};

export type SplitMethod = "EQUAL" | "UNEQUAL" | "PERCENTAGE" | "SHARES";

export type ExpenseSplit = {
  id: string;
  userId: string;
  owedCents: number;
  inputAmountCents?: number | null;
  inputPercentage?: number | null;
  inputShares?: number | null;
  user: User;
};

export type ExpenseMessage = {
  id: string;
  message: string;
  createdAt: string;
  author: User;
};

export type Expense = {
  id: string;
  groupId: string;
  description: string;
  amountCents: number;
  paidById: string;
  splitMethod: SplitMethod;
  expenseDate: string;
  notes?: string | null;
  paidBy: User;
  splits: ExpenseSplit[];
  messages?: ExpenseMessage[];
};

export type Settlement = {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  note?: string | null;
  settledAt: string;
  fromUser: User;
  toUser: User;
};

export type Group = {
  id: string;
  name: string;
  description?: string | null;
  members: GroupMembership[];
  expenses?: Expense[];
  settlements?: Settlement[];
};

export type Balance = {
  users: User[];
  netByUser: Array<User & { netCents: number }>;
  pairwise: Array<{
    fromUser: User;
    toUser: User;
    amountCents: number;
  }>;
};

export type BalanceExplanationLine =
  | {
      type: "EXPENSE";
      expenseId: string;
      description: string;
      date: string;
      paidBy: User;
      amountCents: number;
      originalCurrency: string;
      originalAmountMinor?: number | null;
      deltaCents: number;
      explanation: string;
      csvRowNumber?: number;
      rawCsvRow?: unknown;
    }
  | {
      type: "SETTLEMENT";
      settlementId: string;
      date: string;
      fromUser: User;
      toUser: User;
      amountCents: number;
      originalCurrency: string;
      originalAmountMinor?: number | null;
      deltaCents: number;
      explanation: string;
    };

export type BalanceExplanation = {
  user: User;
  netCents: number;
  lines: BalanceExplanationLine[];
};

export type SettlementRecommendation = {
  fromUser: User;
  toUser: User;
  amountCents: number;
  explanation: string;
};

export type ImportAnomaly = {
  id: string;
  rowNumber: number;
  originalRowData: Record<string, string>;
  anomalyType: string;
  severity: "ERROR" | "WARNING" | "INFO";
  explanation: string;
  suggestedAction: string;
  finalActionTaken?: string | null;
  userApprovalRequired: boolean;
  fieldName?: string | null;
};

export type CsvRawRow = {
  id: string;
  rowNumber: number;
  rawData: Record<string, string>;
  rawText: string;
  parsedData?: Record<string, unknown> | null;
  status: "PENDING" | "IMPORTED" | "SKIPPED" | "BLOCKED";
  finalAction?: string | null;
  anomalies: ImportAnomaly[];
};

export type CsvImportBatch = {
  id: string;
  groupId: string;
  fileName: string;
  status: "PREVIEW" | "IMPORTED" | "PARTIAL" | "FAILED";
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  blockedRows: number;
  report?: Record<string, unknown> | null;
  rows: CsvRawRow[];
  anomalies: ImportAnomaly[];
};
