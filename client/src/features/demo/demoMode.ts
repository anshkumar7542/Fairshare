import { useEffect, useState } from "react";
import type { Balance, BalanceExplanation, CsvImportBatch, Expense, Group, Settlement, SettlementRecommendation, User } from "../../types/domain";

const DEMO_MODE_KEY = "fairshare-demo-mode";
const DEMO_SETTLED_KEY = "fairshare-demo-settled";
const DEMO_EVENT = "fairshare-demo-change";

export const demoUser: User = { id: "demo-aisha", name: "Aisha Khan", email: "aisha@flatshare.demo" };

const users = {
  aisha: demoUser,
  rohan: { id: "demo-rohan", name: "Rohan Mehta", email: "rohan@flatshare.demo" },
  priya: { id: "demo-priya", name: "Priya Shah", email: "priya@flatshare.demo" },
  meera: { id: "demo-meera", name: "Meera Iyer", email: "meera@flatshare.demo" },
  dev: { id: "demo-dev", name: "Dev Arora", email: "dev@flatshare.demo" },
  sam: { id: "demo-sam", name: "Sam Fernandes", email: "sam@flatshare.demo" }
} satisfies Record<string, User>;

const memberships = [
  { id: "mem-aisha", userId: users.aisha.id, joinedAt: "2026-01-01T00:00:00.000Z", leftAt: null, membershipType: "FLATMATE", user: users.aisha },
  { id: "mem-rohan", userId: users.rohan.id, joinedAt: "2026-01-01T00:00:00.000Z", leftAt: null, membershipType: "FLATMATE", user: users.rohan },
  { id: "mem-priya", userId: users.priya.id, joinedAt: "2026-01-01T00:00:00.000Z", leftAt: null, membershipType: "FLATMATE", user: users.priya },
  { id: "mem-meera", userId: users.meera.id, joinedAt: "2026-01-01T00:00:00.000Z", leftAt: "2026-03-31T23:59:59.000Z", membershipType: "FORMER_FLATMATE", user: users.meera },
  { id: "mem-sam", userId: users.sam.id, joinedAt: "2026-04-15T00:00:00.000Z", leftAt: null, membershipType: "FLATMATE", user: users.sam },
  { id: "mem-dev", userId: users.dev.id, joinedAt: "2026-04-10T00:00:00.000Z", leftAt: "2026-04-14T23:59:59.000Z", membershipType: "TRIP_GUEST", user: users.dev }
];

const expenses: Expense[] = [
  {
    id: "exp-rent-apr",
    groupId: "demo-flat",
    description: "April rent after Sam moved in",
    amountCents: 960000,
    paidById: users.aisha.id,
    paidBy: users.aisha,
    splitMethod: "SHARES",
    expenseDate: "2026-04-20T09:30:00.000Z",
    notes: "Sam included from mid-April; Meera excluded after March.",
    splits: [
      { id: "split-rent-aisha", userId: users.aisha.id, owedCents: 220000, inputShares: 1, user: users.aisha },
      { id: "split-rent-rohan", userId: users.rohan.id, owedCents: 220000, inputShares: 1, user: users.rohan },
      { id: "split-rent-priya", userId: users.priya.id, owedCents: 220000, inputShares: 1, user: users.priya },
      { id: "split-rent-sam", userId: users.sam.id, owedCents: 300000, inputShares: 1.36, user: users.sam }
    ],
    messages: [
      { id: "msg-rent-1", message: "Sam's mid-month move-in is reflected in shares.", createdAt: "2026-04-20T10:15:00.000Z", author: users.rohan }
    ]
  },
  {
    id: "exp-groceries",
    groupId: "demo-flat",
    description: "Weekly groceries",
    amountCents: 680000,
    paidById: users.priya.id,
    paidBy: users.priya,
    splitMethod: "EQUAL",
    expenseDate: "2026-04-24T18:00:00.000Z",
    notes: "Imported from CSV row 14.",
    splits: [
      { id: "split-groceries-aisha", userId: users.aisha.id, owedCents: 170000, user: users.aisha },
      { id: "split-groceries-rohan", userId: users.rohan.id, owedCents: 170000, user: users.rohan },
      { id: "split-groceries-priya", userId: users.priya.id, owedCents: 170000, user: users.priya },
      { id: "split-groceries-sam", userId: users.sam.id, owedCents: 170000, user: users.sam }
    ],
    messages: []
  },
  {
    id: "exp-goa-trip",
    groupId: "demo-flat",
    description: "Goa trip villa",
    amountCents: 1200000,
    paidById: users.dev.id,
    paidBy: users.dev,
    splitMethod: "PERCENTAGE",
    expenseDate: "2026-04-12T11:00:00.000Z",
    notes: "Dev joined only for this trip.",
    splits: [
      { id: "split-trip-aisha", userId: users.aisha.id, owedCents: 240000, inputPercentage: 20, user: users.aisha },
      { id: "split-trip-rohan", userId: users.rohan.id, owedCents: 240000, inputPercentage: 20, user: users.rohan },
      { id: "split-trip-priya", userId: users.priya.id, owedCents: 240000, inputPercentage: 20, user: users.priya },
      { id: "split-trip-dev", userId: users.dev.id, owedCents: 480000, inputPercentage: 40, user: users.dev }
    ],
    messages: []
  },
  {
    id: "exp-internet",
    groupId: "demo-flat",
    description: "Internet and router recharge",
    amountCents: 300000,
    paidById: users.rohan.id,
    paidBy: users.rohan,
    splitMethod: "UNEQUAL",
    expenseDate: "2026-04-28T20:00:00.000Z",
    notes: "Rohan paid; Sam paid lower share because he joined mid-month.",
    splits: [
      { id: "split-net-aisha", userId: users.aisha.id, owedCents: 85000, inputAmountCents: 85000, user: users.aisha },
      { id: "split-net-rohan", userId: users.rohan.id, owedCents: 85000, inputAmountCents: 85000, user: users.rohan },
      { id: "split-net-priya", userId: users.priya.id, owedCents: 85000, inputAmountCents: 85000, user: users.priya },
      { id: "split-net-sam", userId: users.sam.id, owedCents: 45000, inputAmountCents: 45000, user: users.sam }
    ],
    messages: []
  }
];

const settlements: Settlement[] = [
  {
    id: "set-meera-closeout",
    groupId: "demo-flat",
    fromUserId: users.meera.id,
    toUserId: users.aisha.id,
    fromUser: users.meera,
    toUser: users.aisha,
    amountCents: 180000,
    note: "March move-out closeout",
    settledAt: "2026-04-02T13:00:00.000Z"
  }
];

const group: Group = {
  id: "demo-flat",
  name: "Indiranagar Flatmates",
  description: "Aisha, Rohan, Priya, Meera, Dev, and Sam with membership changes, messy CSV imports, and explainable balances.",
  members: memberships,
  expenses,
  settlements
};

const recommendations: SettlementRecommendation[] = [
  { fromUser: users.rohan, toUser: users.priya, amountCents: 230000, explanation: "Rohan pays Priya to settle the current normalized INR balance." },
  { fromUser: users.sam, toUser: users.aisha, amountCents: 175000, explanation: "Sam pays Aisha for rent and utilities after his mid-April move-in." },
  { fromUser: users.aisha, toUser: users.dev, amountCents: 240000, explanation: "Aisha pays Dev for the Goa trip villa." }
];

const balance: Balance = {
  users: Object.values(users),
  netByUser: [
    { ...users.aisha, netCents: 175000 },
    { ...users.rohan, netCents: -230000 },
    { ...users.priya, netCents: 230000 },
    { ...users.meera, netCents: 0 },
    { ...users.dev, netCents: 240000 },
    { ...users.sam, netCents: -175000 }
  ],
  pairwise: recommendations.map((item) => ({ fromUser: item.fromUser, toUser: item.toUser, amountCents: item.amountCents }))
};

const importRows = [
  {
    id: "row-7",
    rowNumber: 7,
    rawText: "07/04/2026,Utilities,Internet recharge,Rohan,3000,INR,UNEQUAL,Aisha:850|Rohan:850|Priya:850|Sam:450,",
    rawData: {
      date: "07/04/2026",
      category: "Utilities",
      description: "Internet recharge",
      payer: "Rohan",
      amount: "3000",
      currency: "INR",
      split_type: "UNEQUAL",
      participants: "Aisha:850|Rohan:850|Priya:850|Sam:450",
      notes: ""
    },
    parsedData: { amountCents: 300000, splitTotalCents: 300000, dateFormat: "DD/MM/YYYY" },
    status: "PENDING" as const,
    finalAction: null,
    anomalies: [] as CsvImportBatch["anomalies"]
  },
  {
    id: "row-11",
    rowNumber: 11,
    rawText: "2026-03-31,Rent,March rent,Aisha,9600,INR,EQUAL,Aisha|Rohan|Priya|Meera,",
    rawData: {
      date: "2026-03-31",
      category: "Rent",
      description: "March rent",
      payer: "Aisha",
      amount: "9600",
      currency: "INR",
      split_type: "EQUAL",
      participants: "Aisha|Rohan|Priya|Meera",
      notes: ""
    },
    parsedData: { amountCents: 960000, dateFormat: "YYYY-MM-DD" },
    status: "PENDING" as const,
    finalAction: null,
    anomalies: [] as CsvImportBatch["anomalies"]
  },
  {
    id: "row-18",
    rowNumber: 18,
    rawText: "04-01-2026,Trip,Villa booking,Dev,12000,USD,PERCENTAGE,Aisha:20|Rohan:20|Priya:20|Dev:40,Goa trip",
    rawData: {
      date: "04-01-2026",
      category: "Trip",
      description: "Villa booking",
      payer: "Dev",
      amount: "12000",
      currency: "USD",
      split_type: "PERCENTAGE",
      participants: "Aisha:20|Rohan:20|Priya:20|Dev:40",
      notes: "Goa trip"
    },
    parsedData: { amountCents: 1200000, currency: "USD", dateFormat: "MM-DD-YYYY" },
    status: "BLOCKED" as const,
    finalAction: null,
    anomalies: [] as CsvImportBatch["anomalies"]
  }
];

const anomalies: CsvImportBatch["anomalies"] = [
  {
    id: "anom-currency",
    rowNumber: 18,
    originalRowData: importRows[2].rawData,
    anomalyType: "CURRENCY_MISMATCH",
    severity: "ERROR",
    explanation: "Currency is USD and cannot be silently treated as INR.",
    suggestedAction: "Approve only after applying the documented INR normalization policy.",
    finalActionTaken: null,
    userApprovalRequired: true,
    fieldName: "currency"
  },
  {
    id: "anom-mixed-date",
    rowNumber: 18,
    originalRowData: importRows[2].rawData,
    anomalyType: "MIXED_DATE_FORMATS",
    severity: "WARNING",
    explanation: "The file contains YYYY-MM-DD, DD/MM/YYYY, and MM-DD-YYYY date formats.",
    suggestedAction: "Confirm the intended date format before import.",
    finalActionTaken: "NEEDS_REVIEW",
    userApprovalRequired: false,
    fieldName: "date"
  },
  {
    id: "anom-blank-notes",
    rowNumber: 7,
    originalRowData: importRows[0].rawData,
    anomalyType: "BLANK_NOTES_OR_CATEGORY",
    severity: "INFO",
    explanation: "Notes are blank, so classification relies on category and description.",
    suggestedAction: "Proceed if the row is understandable from other fields.",
    finalActionTaken: "APPROVE_IMPORT",
    userApprovalRequired: false,
    fieldName: "notes"
  },
  {
    id: "anom-sam-period",
    rowNumber: 11,
    originalRowData: importRows[1].rawData,
    anomalyType: "MEMBER_LEFT_EARLIER_OR_JOINED_LATER",
    severity: "WARNING",
    explanation: "Membership windows are checked: Meera is valid through March, Sam is excluded before mid-April.",
    suggestedAction: "Verify membership periods before finalizing.",
    finalActionTaken: "APPROVE_IMPORT",
    userApprovalRequired: true,
    fieldName: "participants"
  }
];

importRows[0].anomalies = anomalies.filter((item) => item.rowNumber === 7);
importRows[1].anomalies = anomalies.filter((item) => item.rowNumber === 11);
importRows[2].anomalies = anomalies.filter((item) => item.rowNumber === 18);

const importBatch: CsvImportBatch = {
  id: "demo-import",
  groupId: group.id,
  fileName: "expenses_export.csv",
  status: "PARTIAL",
  totalRows: 18,
  importedRows: 14,
  skippedRows: 2,
  blockedRows: 2,
  rows: importRows,
  anomalies,
  report: {
    fileName: "expenses_export.csv",
    totalRows: 18,
    importedRows: 14,
    blockedRows: 2,
    anomalyCounts: { ERROR: 1, WARNING: 2, INFO: 1 },
    policy: "No suspicious row was silently modified or deleted."
  }
};

const rohanExplanation: BalanceExplanation = {
  user: users.rohan,
  netCents: -230000,
  lines: [
    {
      type: "EXPENSE",
      expenseId: "exp-goa-trip",
      description: "Goa trip villa",
      date: "2026-04-12T11:00:00.000Z",
      paidBy: users.dev,
      amountCents: 1200000,
      originalCurrency: "INR",
      originalAmountMinor: 1200000,
      deltaCents: -240000,
      explanation: "Rohan owes Dev for his 20% villa share.",
      csvRowNumber: 18,
      rawCsvRow: importRows[2].rawData
    },
    {
      type: "EXPENSE",
      expenseId: "exp-internet",
      description: "Internet and router recharge",
      date: "2026-04-28T20:00:00.000Z",
      paidBy: users.rohan,
      amountCents: 300000,
      originalCurrency: "INR",
      originalAmountMinor: 300000,
      deltaCents: 255000,
      explanation: "Rohan paid; other active members owe their shares.",
      csvRowNumber: 7,
      rawCsvRow: importRows[0].rawData
    },
    {
      type: "SETTLEMENT",
      settlementId: "set-rohan-priya-partial",
      date: "2026-04-30T10:00:00.000Z",
      fromUser: users.rohan,
      toUser: users.priya,
      amountCents: 245000,
      originalCurrency: "INR",
      originalAmountMinor: 245000,
      deltaCents: -245000,
      explanation: "Rohan paid Priya, reducing one open debt but leaving a net amount still payable."
    }
  ]
};

export function isDemoModeEnabled() {
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
}

export function setDemoMode(enabled: boolean) {
  localStorage.setItem(DEMO_MODE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: enabled }));
}

export function toggleDemoMode() {
  setDemoMode(!isDemoModeEnabled());
}

export function useDemoMode() {
  const [enabled, setEnabled] = useState(() => isDemoModeEnabled());
  useEffect(() => {
    const sync = () => setEnabled(isDemoModeEnabled());
    window.addEventListener(DEMO_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(DEMO_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { enabled, setEnabled: setDemoMode, toggle: toggleDemoMode };
}

export function useDemoModeShortcut() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        toggleDemoMode();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

export async function demoApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  if (method === "GET") return demoGet(path) as T;
  if (method === "POST" && path === "/api/imports/preview") return { import: importBatch } as T;
  if (method === "POST" && path === "/api/imports/demo-import/finalize") return { import: importBatch } as T;
  if (method === "POST" && path === "/api/settlements") return recordDemoSettlement(options) as T;
  if (method === "POST" && path === "/api/auth/logout") return undefined as T;
  if (method === "PATCH" && path.includes("/api/imports/demo-import/anomalies/")) return { ok: true } as T;
  throw new Error(`Demo Mode does not mock ${method} ${path}`);
}

function demoGet(path: string) {
  if (path === "/api/auth/me") return { user: demoUser };
  if (path === "/api/groups") return { groups: [group] };
  if (path === "/api/groups/demo-flat") return { group };
  if (path === "/api/balances/overall" || path === "/api/balances/groups/demo-flat") return { balance: demoBalance() };
  if (path === "/api/balances/groups/demo-flat/recommendations") return { recommendations: demoRecommendations() };
  if (path.startsWith("/api/balances/groups/demo-flat/explanation/")) return { explanation: rohanExplanation };
  if (path === "/api/imports/demo-import") return { import: importBatch };
  if (path.startsWith("/api/expenses/")) {
    const expense = expenses.find((item) => path.endsWith(item.id));
    if (expense) return { expense };
  }
  throw new Error(`Demo Mode does not mock GET ${path}`);
}

function demoRecommendations() {
  const settled = getSettledDemoRecommendations();
  return recommendations.filter((item) => !settled.includes(recommendationKey(item)));
}

function demoBalance(): Balance {
  const open = demoRecommendations();
  return { ...balance, pairwise: open.map((item) => ({ fromUser: item.fromUser, toUser: item.toUser, amountCents: item.amountCents })) };
}

function recordDemoSettlement(options: RequestInit) {
  const body = JSON.parse(String(options.body || "{}")) as { fromUserId: string; toUserId: string; amountCents: number };
  const item = recommendations.find((recommendation) => (
    recommendation.fromUser.id === body.fromUserId &&
    recommendation.toUser.id === body.toUserId &&
    recommendation.amountCents === body.amountCents
  ));
  if (item) {
    localStorage.setItem(DEMO_SETTLED_KEY, JSON.stringify([...getSettledDemoRecommendations(), recommendationKey(item)]));
  }
  return {
    settlement: {
      id: `demo-settlement-${Date.now()}`,
      groupId: group.id,
      fromUserId: body.fromUserId,
      toUserId: body.toUserId,
      amountCents: body.amountCents,
      note: "Recorded from Demo Mode",
      settledAt: new Date().toISOString(),
      fromUser: item?.fromUser || users.rohan,
      toUser: item?.toUser || users.priya
    }
  };
}

function getSettledDemoRecommendations() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_SETTLED_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

function recommendationKey(item: SettlementRecommendation) {
  return `${item.fromUser.id}:${item.toUser.id}:${item.amountCents}`;
}
