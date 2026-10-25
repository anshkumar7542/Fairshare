import { describe, expect, it } from "vitest";
import { calculateBalances } from "../src/modules/balances/balance.service.js";

const users = [
  { id: "a", name: "Ava", email: "ava@example.com" },
  { id: "b", name: "Ben", email: "ben@example.com" },
  { id: "c", name: "Cara", email: "cara@example.com" }
];

describe("calculateBalances", () => {
  it("creates pairwise debts from expense splits", () => {
    const result = calculateBalances(
      users,
      [{ paidById: "a", splits: [{ userId: "a", owedCents: 1000 }, { userId: "b", owedCents: 1000 }] }],
      []
    );
    expect(result.pairwise).toEqual([
      { fromUser: users[1], toUser: users[0], amountCents: 1000 }
    ]);
    expect(result.netByUser.find((user) => user.id === "a")?.netCents).toBe(1000);
    expect(result.netByUser.find((user) => user.id === "b")?.netCents).toBe(-1000);
  });

  it("subtracts settlements from debt", () => {
    const result = calculateBalances(
      users,
      [{ paidById: "a", splits: [{ userId: "b", owedCents: 1000 }] }],
      [{ fromUserId: "b", toUserId: "a", amountCents: 400 }]
    );
    expect(result.pairwise[0].amountCents).toBe(600);
  });

  it("flips who owes whom when a settlement exceeds existing debt", () => {
    const result = calculateBalances(
      users,
      [{ paidById: "a", splits: [{ userId: "b", owedCents: 1000 }] }],
      [{ fromUserId: "b", toUserId: "a", amountCents: 1200 }]
    );

    expect(result.pairwise).toEqual([
      { fromUser: users[0], toUser: users[1], amountCents: 200 }
    ]);
  });

  it("normalizes opposing debts into one who-owes-whom row", () => {
    const result = calculateBalances(
      users,
      [
        { paidById: "a", splits: [{ userId: "b", owedCents: 1200 }] },
        { paidById: "b", splits: [{ userId: "a", owedCents: 500 }] }
      ],
      []
    );

    expect(result.pairwise).toEqual([
      { fromUser: users[1], toUser: users[0], amountCents: 700 }
    ]);
    expect(result.netByUser.find((user) => user.id === "a")?.netCents).toBe(700);
    expect(result.netByUser.find((user) => user.id === "b")?.netCents).toBe(-700);
  });
});
