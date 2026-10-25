export type BalanceUser = {
  id: string;
  name: string;
  email: string;
};

export type ExpenseForBalance = {
  paidById: string;
  splits: Array<{ userId: string; owedCents: number }>;
};

export type SettlementForBalance = {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
};

export type BalanceResult = {
  users: BalanceUser[];
  netByUser: Array<BalanceUser & { netCents: number }>;
  pairwise: Array<{
    fromUser: BalanceUser;
    toUser: BalanceUser;
    amountCents: number;
  }>;
};

function pairKey(fromUserId: string, toUserId: string) {
  return `${fromUserId}->${toUserId}`;
}

export function calculateBalances(
  users: BalanceUser[],
  expenses: ExpenseForBalance[],
  settlements: SettlementForBalance[]
): BalanceResult {
  const userMap = new Map(users.map((user) => [user.id, user]));
  const debts = new Map<string, number>();

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.userId === expense.paidById || split.owedCents === 0) continue;
      const key = pairKey(split.userId, expense.paidById);
      debts.set(key, (debts.get(key) || 0) + split.owedCents);
    }
  }

  for (const settlement of settlements) {
    const key = pairKey(settlement.fromUserId, settlement.toUserId);
    debts.set(key, (debts.get(key) || 0) - settlement.amountCents);
  }

  const normalized = new Map<string, number>();
  for (const [key, amount] of debts) {
    const [from, to] = key.split("->");
    const reverseKey = pairKey(to, from);
    if (normalized.has(key) || normalized.has(reverseKey)) continue;
    const reverse = debts.get(reverseKey) || 0;
    const net = amount - reverse;
    if (net > 0) normalized.set(key, net);
    if (net < 0) normalized.set(reverseKey, Math.abs(net));
  }

  const netTotals = new Map(users.map((user) => [user.id, 0]));
  const pairwise = Array.from(normalized.entries()).map(([key, amountCents]) => {
    const [fromUserId, toUserId] = key.split("->");
    netTotals.set(fromUserId, (netTotals.get(fromUserId) || 0) - amountCents);
    netTotals.set(toUserId, (netTotals.get(toUserId) || 0) + amountCents);
    return {
      fromUser: userMap.get(fromUserId)!,
      toUser: userMap.get(toUserId)!,
      amountCents
    };
  });

  return {
    users,
    netByUser: users.map((user) => ({ ...user, netCents: netTotals.get(user.id) || 0 })),
    pairwise
  };
}
