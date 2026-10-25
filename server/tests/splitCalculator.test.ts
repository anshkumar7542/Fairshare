import { SplitMethod } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateSplits } from "../src/modules/expenses/splitCalculator.js";

describe("calculateSplits", () => {
  it("splits equally and distributes remainder cents", () => {
    const result = calculateSplits(100, SplitMethod.EQUAL, [
      { userId: "a" },
      { userId: "b" },
      { userId: "c" }
    ]);
    expect(result.map((split) => split.owedCents)).toEqual([34, 33, 33]);
  });

  it("requires unequal amounts to sum to total", () => {
    expect(() =>
      calculateSplits(100, SplitMethod.UNEQUAL, [
        { userId: "a", amountCents: 70 },
        { userId: "b", amountCents: 20 }
      ])
    ).toThrow("Unequal split amounts must equal the expense total");
  });

  it("calculates percentage splits with deterministic rounding", () => {
    const result = calculateSplits(101, SplitMethod.PERCENTAGE, [
      { userId: "a", percentage: 50 },
      { userId: "b", percentage: 50 }
    ]);
    expect(result.map((split) => split.owedCents)).toEqual([51, 50]);
  });

  it("calculates share splits", () => {
    const result = calculateSplits(100, SplitMethod.SHARES, [
      { userId: "a", shares: 1 },
      { userId: "b", shares: 3 }
    ]);
    expect(result.map((split) => split.owedCents)).toEqual([25, 75]);
  });
});
