import { SplitMethod } from "@prisma/client";
import { HttpError } from "../../utils/http.js";

export type SplitInput = {
  userId: string;
  amountCents?: number;
  percentage?: number;
  shares?: number;
};

export type CalculatedSplit = SplitInput & {
  owedCents: number;
};

function assertPositiveAmount(amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new HttpError(400, "Amount must be a positive number of cents");
  }
}

function distributeByWeights(amountCents: number, splits: SplitInput[], weights: number[]) {
  const raw = weights.map((weight) => (amountCents * weight) / weights.reduce((sum, item) => sum + item, 0));
  const floors = raw.map(Math.floor);
  let remainder = amountCents - floors.reduce((sum, item) => sum + item, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const item of order) {
    if (remainder <= 0) break;
    floors[item.index] += 1;
    remainder -= 1;
  }

  return splits.map((split, index) => ({ ...split, owedCents: floors[index] }));
}

export function calculateSplits(
  amountCents: number,
  splitMethod: SplitMethod,
  splits: SplitInput[]
): CalculatedSplit[] {
  assertPositiveAmount(amountCents);
  if (splits.length === 0) throw new HttpError(400, "At least one participant is required");

  const uniqueUsers = new Set(splits.map((split) => split.userId));
  if (uniqueUsers.size !== splits.length) throw new HttpError(400, "Duplicate participants are not allowed");

  if (splitMethod === SplitMethod.EQUAL) {
    return distributeByWeights(amountCents, splits, splits.map(() => 1));
  }

  if (splitMethod === SplitMethod.UNEQUAL) {
    if (splits.some((split) => !Number.isInteger(split.amountCents) || split.amountCents! < 0)) {
      throw new HttpError(400, "Unequal splits require non-negative cent amounts");
    }
    const values = splits.map((split) => split.amountCents!);
    const total = values.reduce((sum, value) => sum + value!, 0);
    if (total !== amountCents) throw new HttpError(400, "Unequal split amounts must equal the expense total");
    return splits.map((split) => ({ ...split, owedCents: split.amountCents! }));
  }

  if (splitMethod === SplitMethod.PERCENTAGE) {
    if (splits.some((split) => typeof split.percentage !== "number" || split.percentage < 0)) {
      throw new HttpError(400, "Percentage splits require non-negative percentages");
    }
    const percentages = splits.map((split) => split.percentage!);
    const total = percentages.reduce((sum, value) => sum + value!, 0);
    if (Math.abs(total - 100) > 0.0001) throw new HttpError(400, "Percentages must total 100");
    return distributeByWeights(amountCents, splits, percentages);
  }

  if (splitMethod === SplitMethod.SHARES) {
    if (splits.some((split) => !Number.isInteger(split.shares) || split.shares! <= 0)) {
      throw new HttpError(400, "Share splits require positive whole-number shares");
    }
    const shares = splits.map((split) => split.shares!);
    return distributeByWeights(amountCents, splits, shares);
  }

  throw new HttpError(400, "Unsupported split method");
}
