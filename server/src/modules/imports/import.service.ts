import { AnomalySeverity, ImportRowStatus, ImportStatus, SplitMethod } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { calculateSplits, type SplitInput } from "../expenses/splitCalculator.js";

type Member = {
  userId: string;
  joinedAt: Date | null;
  leftAt: Date | null;
  membershipType: string | null;
  user: { id: string; name: string; email: string };
};

type ParsedRow = {
  rowNumber: number;
  rawData: Record<string, string>;
  rawText: string;
  description?: string;
  date?: Date;
  dateFormat?: string;
  amountCents?: number;
  currencyCode?: string;
  payerName?: string;
  participantNames: string[];
  splitMethod?: SplitMethod;
  splitInputs: SplitInput[];
  notes?: string;
  category?: string;
  isSettlementLike: boolean;
};

type AnomalyDraft = {
  rowNumber: number;
  originalRowData: Record<string, string>;
  anomalyType: string;
  severity: AnomalySeverity;
  explanation: string;
  suggestedAction: string;
  userApprovalRequired: boolean;
  fieldName?: string;
};

const requiredColumnAliases = {
  date: ["date", "expense date", "expense_date", "created at", "created_at"],
  description: ["description", "title", "expense", "expense name", "details"],
  amount: ["amount", "cost", "total", "total amount", "amount paid"],
  payer: ["payer", "paid by", "paid_by", "paidby"],
  participants: ["participants", "split between", "split_between", "members", "people"],
  splitType: ["split type", "split_type", "split", "split method", "split_method"],
  splits: ["splits", "split details", "split_details", "shares", "percentages", "amounts"],
  currency: ["currency", "currency code", "currency_code"],
  notes: ["notes", "note", "memo"],
  category: ["category", "type"]
};

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsv(csvText: string) {
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [] as string[], rows: [] as Array<{ rowNumber: number; rawText: string; data: Record<string, string> }> };
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    const data: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      data[header] = values[headerIndex] ?? "";
    });
    return { rowNumber: index + 2, rawText: line, data };
  });
  return { headers, rows };
}

function getValue(data: Record<string, string>, aliases: string[]) {
  const entries = Object.entries(data);
  for (const alias of aliases) {
    const found = entries.find(([key]) => key.trim().toLowerCase() === alias);
    if (found) return found[1]?.trim() || "";
  }
  return "";
}

function parseAmount(value: string) {
  const normalized = value.replace(/[,₹$]/g, "").trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

function parseDate(value: string) {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const slashDmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const dashDmy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;

  let date: Date | null = null;
  let format = "";
  if (iso.test(trimmed)) {
    date = new Date(`${trimmed}T00:00:00.000Z`);
    format = "YYYY-MM-DD";
  } else {
    const slash = trimmed.match(slashDmy);
    const dash = trimmed.match(dashDmy);
    const match = slash || dash;
    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = Number(match[3]);
      date = new Date(Date.UTC(year, month - 1, day));
      format = slash ? "DD/MM/YYYY" : "DD-MM-YYYY";
    }
  }

  if (!date || Number.isNaN(date.getTime())) return { date: null, format: "" };
  return { date, format };
}

function splitNames(value: string) {
  return value
    .split(/[;|]/)
    .flatMap((part) => part.split(/\s*,\s*/))
    .map((name) => name.trim())
    .filter(Boolean);
}

function normalizeSplitMethod(value: string): SplitMethod | undefined {
  const normalized = value.trim().toLowerCase();
  if (["equal", "equally", "split equally"].includes(normalized)) return SplitMethod.EQUAL;
  if (["unequal", "exact", "amount", "amounts", "exact amounts"].includes(normalized)) return SplitMethod.UNEQUAL;
  if (["percentage", "percent", "percentages"].includes(normalized)) return SplitMethod.PERCENTAGE;
  if (["shares", "share"].includes(normalized)) return SplitMethod.SHARES;
  return undefined;
}

function parseNameValueMap(value: string) {
  const result = new Map<string, number>();
  if (!value.trim()) return result;
  const pieces = value.split(/[;|]/).map((piece) => piece.trim()).filter(Boolean);
  for (const piece of pieces) {
    const match = piece.match(/^(.+?)(?:=|:)(-?\d+(?:\.\d{1,2})?)$/);
    if (match) result.set(match[1].trim().toLowerCase(), Number(match[2]));
  }
  return result;
}

function isActiveOn(member: Member, date: Date) {
  if (member.joinedAt && date < member.joinedAt) return false;
  if (member.leftAt && date > member.leftAt) return false;
  return true;
}

function addAnomaly(anomalies: AnomalyDraft[], row: ParsedRow, anomaly: Omit<AnomalyDraft, "rowNumber" | "originalRowData">) {
  anomalies.push({ ...anomaly, rowNumber: row.rowNumber, originalRowData: row.rawData });
}

function toStoredParsed(row: ParsedRow) {
  return {
    ...row,
    date: row.date ? row.date.toISOString() : null
  };
}

function fromStoredParsed(value: unknown): ParsedRow {
  const stored = value as Omit<ParsedRow, "date"> & { date?: string | null };
  return {
    ...stored,
    date: stored.date ? new Date(stored.date) : undefined
  };
}

function parseRow(rowNumber: number, rawText: string, rawData: Record<string, string>, memberByName: Map<string, Member>) {
  const dateRaw = getValue(rawData, requiredColumnAliases.date);
  const description = getValue(rawData, requiredColumnAliases.description);
  const amountRaw = getValue(rawData, requiredColumnAliases.amount);
  const payerName = getValue(rawData, requiredColumnAliases.payer);
  const participantsRaw = getValue(rawData, requiredColumnAliases.participants);
  const splitTypeRaw = getValue(rawData, requiredColumnAliases.splitType);
  const splitsRaw = getValue(rawData, requiredColumnAliases.splits);
  const notes = getValue(rawData, requiredColumnAliases.notes);
  const category = getValue(rawData, requiredColumnAliases.category);
  const currencyCode = (getValue(rawData, requiredColumnAliases.currency) || "INR").toUpperCase();
  const parsedDate = parseDate(dateRaw);
  const amountCents = parseAmount(amountRaw);
  const participantNames = splitNames(participantsRaw);
  const splitMethod = normalizeSplitMethod(splitTypeRaw);
  const parsed: ParsedRow = {
    rowNumber,
    rawData,
    rawText,
    description,
    date: parsedDate.date ?? undefined,
    dateFormat: parsedDate.format || undefined,
    amountCents: amountCents ?? undefined,
    currencyCode,
    payerName,
    participantNames,
    splitMethod,
    splitInputs: [],
    notes,
    category,
    isSettlementLike: /settle|settlement|paid back|reimbursement|repayment/i.test(`${description} ${category} ${notes}`)
  };
  const anomalies: AnomalyDraft[] = [];

  for (const [field, value] of [
    ["date", dateRaw],
    ["description", description],
    ["amount", amountRaw],
    ["payer", payerName],
    ["participants", participantsRaw],
    ["split type", splitTypeRaw]
  ]) {
    if (!value) {
      addAnomaly(anomalies, parsed, {
        anomalyType: "MISSING_REQUIRED_FIELD",
        severity: AnomalySeverity.ERROR,
        fieldName: field,
        explanation: `Required field '${field}' is missing.`,
        suggestedAction: "Fix the row data in the app review flow or skip this row.",
        userApprovalRequired: true
      });
    }
  }

  if (dateRaw && !parsed.date) {
    addAnomaly(anomalies, parsed, {
      anomalyType: "INVALID_DATE",
      severity: AnomalySeverity.ERROR,
      fieldName: "date",
      explanation: `Date '${dateRaw}' is not in a supported format.`,
      suggestedAction: "Provide a valid date before importing this row.",
      userApprovalRequired: true
    });
  }

  if (amountRaw && amountCents === null) {
    addAnomaly(anomalies, parsed, {
      anomalyType: "INVALID_AMOUNT_FORMAT",
      severity: AnomalySeverity.ERROR,
      fieldName: "amount",
      explanation: `Amount '${amountRaw}' cannot be parsed as currency.`,
      suggestedAction: "Fix amount format or skip this row.",
      userApprovalRequired: true
    });
  } else if (amountCents !== null && amountCents < 0) {
    addAnomaly(anomalies, parsed, {
      anomalyType: "NEGATIVE_AMOUNT",
      severity: AnomalySeverity.ERROR,
      fieldName: "amount",
      explanation: "Negative expense amounts are not imported as expenses.",
      suggestedAction: "Classify as settlement/refund or skip the row.",
      userApprovalRequired: true
    });
  } else if (amountCents === 0) {
    addAnomaly(anomalies, parsed, {
      anomalyType: "ZERO_AMOUNT",
      severity: AnomalySeverity.ERROR,
      fieldName: "amount",
      explanation: "Zero amount expenses do not affect balances.",
      suggestedAction: "Skip the row unless corrected.",
      userApprovalRequired: true
    });
  }

  if (payerName && !memberByName.has(payerName.toLowerCase())) {
    addAnomaly(anomalies, parsed, {
      anomalyType: "UNKNOWN_PAYER",
      severity: AnomalySeverity.ERROR,
      fieldName: "payer",
      explanation: `Payer '${payerName}' is not a known group member.`,
      suggestedAction: "Map the payer to a known member or skip this row.",
      userApprovalRequired: true
    });
  }

  for (const participant of participantNames) {
    if (!memberByName.has(participant.toLowerCase())) {
      addAnomaly(anomalies, parsed, {
        anomalyType: "UNKNOWN_PARTICIPANT",
        severity: AnomalySeverity.ERROR,
        fieldName: "participants",
        explanation: `Participant '${participant}' is not a known group member.`,
        suggestedAction: "Map the participant to a known member or skip this row.",
        userApprovalRequired: true
      });
    }
  }

  if (parsed.date) {
    const payer = payerName ? memberByName.get(payerName.toLowerCase()) : undefined;
    if (payer && !isActiveOn(payer, parsed.date)) {
      addAnomaly(anomalies, parsed, {
        anomalyType: "EXPENSE_DATE_OUTSIDE_MEMBER_ACTIVE_PERIOD",
        severity: AnomalySeverity.ERROR,
        fieldName: "date",
        explanation: `Payer '${payerName}' was not active on the expense date.`,
        suggestedAction: "Review membership period or skip this row.",
        userApprovalRequired: true
      });
    }
    for (const participant of participantNames) {
      const member = memberByName.get(participant.toLowerCase());
      if (member && !isActiveOn(member, parsed.date)) {
        const anomalyType = member.joinedAt && parsed.date < member.joinedAt
          ? "MEMBER_JOINED_LATER_INCLUDED_IN_OLDER_EXPENSE"
          : "MEMBER_LEFT_EARLIER_INCLUDED_IN_LATER_EXPENSE";
        addAnomaly(anomalies, parsed, {
          anomalyType,
          severity: AnomalySeverity.ERROR,
          fieldName: "participants",
          explanation: `Participant '${participant}' was not active on the expense date.`,
          suggestedAction: "Review membership timeline or skip this row.",
          userApprovalRequired: true
        });
      }
    }
  }

  if (parsed.isSettlementLike) {
    addAnomaly(anomalies, parsed, {
      anomalyType: "SETTLEMENT_LOGGED_AS_EXPENSE",
      severity: AnomalySeverity.ERROR,
      fieldName: "description",
      explanation: "This row appears to be a settlement/payment, not an expense.",
      suggestedAction: "Import as settlement in a future settlement import flow or skip this expense row.",
      userApprovalRequired: true
    });
  }

  if (!splitMethod) {
    addAnomaly(anomalies, parsed, {
      anomalyType: "UNSUPPORTED_OR_INCONSISTENT_SPLIT_TYPE",
      severity: AnomalySeverity.ERROR,
      fieldName: "split type",
      explanation: `Split type '${splitTypeRaw}' is not supported.`,
      suggestedAction: "Choose equal, unequal, percentage, or shares.",
      userApprovalRequired: true
    });
  }

  if (currencyCode !== "INR") {
    addAnomaly(anomalies, parsed, {
      anomalyType: "CURRENCY_MISMATCH",
      severity: AnomalySeverity.ERROR,
      fieldName: "currency",
      explanation: `Currency '${currencyCode}' is not INR and must not be treated like INR.`,
      suggestedAction: "Review currency policy; import only with explicit approval.",
      userApprovalRequired: true
    });
  }

  if (!notes || !category) {
    addAnomaly(anomalies, parsed, {
      anomalyType: "BLANK_NOTES_OR_CATEGORY_AMBIGUITY",
      severity: AnomalySeverity.WARNING,
      fieldName: !notes ? "notes" : "category",
      explanation: "Blank notes or category can make classification ambiguous.",
      suggestedAction: "Review row context before final import.",
      userApprovalRequired: false
    });
  }

  if (splitMethod && amountCents !== null && amountCents && participantNames.length > 0) {
    const splitMap = parseNameValueMap(splitsRaw);
    const participants = participantNames.map((name) => memberByName.get(name.toLowerCase())).filter(Boolean) as Member[];
    parsed.splitInputs = participants.map((member) => {
      const value = splitMap.get(member.user.name.toLowerCase());
      return {
        userId: member.userId,
        amountCents: splitMethod === SplitMethod.UNEQUAL && value !== undefined ? Math.round(value * 100) : undefined,
        percentage: splitMethod === SplitMethod.PERCENTAGE ? value : undefined,
        shares: splitMethod === SplitMethod.SHARES && value !== undefined ? Math.round(value) : undefined
      };
    });

    if (splitMethod !== SplitMethod.EQUAL && splitMap.size === 0) {
      addAnomaly(anomalies, parsed, {
        anomalyType: "SPLIT_TOTAL_NOT_MATCHING_EXPENSE_TOTAL",
        severity: AnomalySeverity.ERROR,
        fieldName: "splits",
        explanation: "Non-equal split rows need parseable split details.",
        suggestedAction: "Fix split details before import.",
        userApprovalRequired: true
      });
    } else if (participants.length > 0) {
      try {
        calculateSplits(amountCents, splitMethod, parsed.splitInputs);
      } catch (error) {
        addAnomaly(anomalies, parsed, {
          anomalyType: "SPLIT_TOTAL_NOT_MATCHING_EXPENSE_TOTAL",
          severity: AnomalySeverity.ERROR,
          fieldName: "splits",
          explanation: error instanceof Error ? error.message : "Split validation failed.",
          suggestedAction: "Fix split values or skip this row.",
          userApprovalRequired: true
        });
      }
    }
  }

  return { parsed, anomalies };
}

export async function createImportPreview(
  prisma: PrismaClient,
  input: { groupId: string; fileName: string; csvText: string; userId: string }
) {
  const group = await prisma.group.findUniqueOrThrow({
    where: { id: input.groupId },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } }
  });
  const memberByName = new Map(group.members.map((member) => [member.user.name.toLowerCase(), member as Member]));
  const { rows } = parseCsv(input.csvText);
  const parsedRows = rows.map((row) => parseRow(row.rowNumber, row.rawText, row.data, memberByName));
  const duplicateKeys = new Map<string, ParsedRow[]>();

  for (const row of parsedRows.map((item) => item.parsed)) {
    const key = `${row.date?.toISOString().slice(0, 10) || ""}|${row.description?.toLowerCase() || ""}|${row.payerName?.toLowerCase() || ""}|${row.participantNames.map((name) => name.toLowerCase()).sort().join(";")}`;
    if (!duplicateKeys.has(key)) duplicateKeys.set(key, []);
    duplicateKeys.get(key)!.push(row);
  }

  for (const rowsForKey of duplicateKeys.values()) {
    if (rowsForKey.length > 1) {
      const amounts = new Set(rowsForKey.map((row) => row.amountCents));
      for (const row of rowsForKey) {
        parsedRows.find((item) => item.parsed.rowNumber === row.rowNumber)!.anomalies.push({
          rowNumber: row.rowNumber,
          originalRowData: row.rawData,
          anomalyType: amounts.size > 1 ? "SAME_EXPENSE_DIFFERENT_AMOUNT" : "DUPLICATE_EXPENSE_ROW",
          severity: amounts.size > 1 ? AnomalySeverity.ERROR : AnomalySeverity.WARNING,
          explanation: amounts.size > 1 ? "Same expense appears with different amounts." : "Possible duplicate expense row.",
          suggestedAction: amounts.size > 1 ? "Review and choose the correct row." : "Confirm whether this duplicate should be skipped.",
          userApprovalRequired: amounts.size > 1,
          fieldName: "amount"
        });
      }
    }
  }

  const dateFormats = new Set(parsedRows.map((row) => row.parsed.dateFormat).filter(Boolean));
  if (dateFormats.size > 1) {
    for (const row of parsedRows) {
      row.anomalies.push({
        rowNumber: row.parsed.rowNumber,
        originalRowData: row.parsed.rawData,
        anomalyType: "MIXED_DATE_FORMATS",
        severity: AnomalySeverity.WARNING,
        explanation: `Multiple date formats detected in file: ${Array.from(dateFormats).join(", ")}.`,
        suggestedAction: "Review parsed dates in preview before final import.",
        userApprovalRequired: false,
        fieldName: "date"
      });
    }
  }

  return prisma.$transaction(async (tx) => {
    const batch = await tx.csvImportBatch.create({
      data: {
        groupId: input.groupId,
        fileName: input.fileName,
        originalCsv: input.csvText,
        totalRows: parsedRows.length,
        createdById: input.userId
      }
    });

    for (const item of parsedRows) {
      const row = await tx.csvRawRow.create({
        data: {
          importId: batch.id,
          rowNumber: item.parsed.rowNumber,
          rawData: item.parsed.rawData,
          rawText: item.parsed.rawText,
          parsedData: toStoredParsed(item.parsed)
        }
      });
      if (item.anomalies.length > 0) {
        await tx.importAnomaly.createMany({
          data: item.anomalies.map((anomaly) => ({
            importId: batch.id,
            rowId: row.id,
            rowNumber: anomaly.rowNumber,
            originalRowData: anomaly.originalRowData,
            anomalyType: anomaly.anomalyType,
            severity: anomaly.severity,
            explanation: anomaly.explanation,
            suggestedAction: anomaly.suggestedAction,
            userApprovalRequired: anomaly.userApprovalRequired,
            fieldName: anomaly.fieldName
          }))
        });
      }
    }

    return getImportBatch(tx as unknown as PrismaClient, batch.id);
  });
}

export async function getImportBatch(prisma: PrismaClient, importId: string) {
  return prisma.csvImportBatch.findUniqueOrThrow({
    where: { id: importId },
    include: {
      rows: { orderBy: { rowNumber: "asc" }, include: { anomalies: { orderBy: { createdAt: "asc" } } } },
      anomalies: { orderBy: [{ rowNumber: "asc" }, { createdAt: "asc" }] }
    }
  });
}

export async function updateAnomalyAction(
  prisma: PrismaClient,
  input: { anomalyId: string; finalActionTaken: string; userId: string }
) {
  const anomaly = await prisma.importAnomaly.update({
    where: { id: input.anomalyId },
    data: { finalActionTaken: input.finalActionTaken },
    include: { row: true }
  });
  await prisma.importDecision.create({
    data: {
      importId: anomaly.importId,
      rowId: anomaly.rowId,
      anomalyId: anomaly.id,
      decision: input.finalActionTaken,
      rationale: `Reviewer selected ${input.finalActionTaken} for ${anomaly.anomalyType}`,
      decidedById: input.userId
    }
  });
  return anomaly;
}

export async function finalizeImport(prisma: PrismaClient, importId: string, userId: string) {
  const batch = await getImportBatch(prisma, importId);
  const group = await prisma.group.findUniqueOrThrow({
    where: { id: batch.groupId },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } }
  });
  const memberByName = new Map(group.members.map((member) => [member.user.name.toLowerCase(), member as Member]));
  let importedRows = 0;
  let skippedRows = 0;
  let blockedRows = 0;

  for (const row of batch.rows) {
    const unresolvedError = row.anomalies.some(
      (anomaly) =>
        anomaly.severity === AnomalySeverity.ERROR &&
        (!anomaly.finalActionTaken || anomaly.finalActionTaken === "NEEDS_REVIEW")
    );
    const ignored = row.anomalies.some((anomaly) => anomaly.finalActionTaken === "IGNORE_ROW");
    if (ignored) {
      skippedRows += 1;
      await prisma.csvRawRow.update({ where: { id: row.id }, data: { status: ImportRowStatus.SKIPPED, finalAction: "IGNORE_ROW" } });
      continue;
    }
    if (unresolvedError) {
      blockedRows += 1;
      await prisma.csvRawRow.update({ where: { id: row.id }, data: { status: ImportRowStatus.BLOCKED } });
      continue;
    }

    const parsed = fromStoredParsed(row.parsedData);
    if (!parsed.date || !parsed.amountCents || !parsed.splitMethod || !parsed.payerName) {
      blockedRows += 1;
      await prisma.csvRawRow.update({ where: { id: row.id }, data: { status: ImportRowStatus.BLOCKED } });
      continue;
    }
    const payer = memberByName.get(parsed.payerName.toLowerCase());
    const participants = parsed.participantNames.map((name) => memberByName.get(name.toLowerCase())).filter(Boolean) as Member[];
    if (!payer || participants.length === 0) {
      blockedRows += 1;
      await prisma.csvRawRow.update({ where: { id: row.id }, data: { status: ImportRowStatus.BLOCKED } });
      continue;
    }

    const splitInputs = parsed.splitInputs.length > 0 ? parsed.splitInputs : participants.map((member) => ({ userId: member.userId }));
    let calculated: ReturnType<typeof calculateSplits>;
    try {
      calculated = calculateSplits(parsed.amountCents, parsed.splitMethod, splitInputs);
    } catch {
      blockedRows += 1;
      await prisma.csvRawRow.update({ where: { id: row.id }, data: { status: ImportRowStatus.BLOCKED, finalAction: "CALCULATION_FAILED" } });
      continue;
    }
    const expense = await prisma.expense.create({
      data: {
        groupId: batch.groupId,
        description: parsed.description || `Imported row ${row.rowNumber}`,
        amountCents: parsed.amountCents,
        originalAmountMinor: parsed.amountCents,
        originalCurrency: parsed.currencyCode || "INR",
        normalizedAmountInrCents: parsed.amountCents,
        currencyCode: parsed.currencyCode || "INR",
        paidById: payer.userId,
        splitMethod: parsed.splitMethod,
        expenseDate: new Date(parsed.date),
        notes: parsed.notes || parsed.category || null,
        createdById: userId,
        splits: {
          create: calculated.map((split) => ({
            userId: split.userId,
            owedCents: split.owedCents,
            normalizedOwedInrCents: split.owedCents,
            originalOwedMinor: split.owedCents,
            originalCurrency: parsed.currencyCode || "INR",
            inputAmountCents: split.amountCents ?? null,
            inputPercentage: split.percentage ?? null,
            inputShares: split.shares ?? null
          }))
        }
      }
    });
    importedRows += 1;
    await prisma.csvRawRow.update({
      where: { id: row.id },
      data: { status: ImportRowStatus.IMPORTED, expenseId: expense.id, finalAction: "IMPORTED" }
    });
  }

  const report = {
    importId,
    totalRows: batch.totalRows,
    importedRows,
    skippedRows,
    blockedRows,
    anomalyCount: batch.anomalies.length,
    generatedAt: new Date().toISOString()
  };
  return prisma.csvImportBatch.update({
    where: { id: importId },
    data: {
      importedRows,
      skippedRows,
      blockedRows,
      status: blockedRows > 0 ? ImportStatus.PARTIAL : ImportStatus.IMPORTED,
      report,
      completedAt: new Date()
    },
    include: {
      rows: { orderBy: { rowNumber: "asc" }, include: { anomalies: true } },
      anomalies: { orderBy: [{ rowNumber: "asc" }, { createdAt: "asc" }] }
    }
  });
}
