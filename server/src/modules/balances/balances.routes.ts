import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler } from "../../utils/http.js";
import { assertGroupMember } from "../groups/groupAccess.js";
import { calculateBalances } from "./balance.service.js";

const router = Router();
router.use(requireAuth);

type BalanceUser = { id: string; name: string; email: string };

function collectBalanceUsers(group: {
  members: Array<{ user: BalanceUser }>;
  expenses: Array<{ paidBy?: BalanceUser; splits: Array<{ user?: BalanceUser }> }>;
  settlements: Array<{ fromUser?: BalanceUser; toUser?: BalanceUser }>;
}) {
  const usersById = new Map<string, BalanceUser>();
  for (const member of group.members) usersById.set(member.user.id, member.user);
  for (const expense of group.expenses) {
    if (expense.paidBy) usersById.set(expense.paidBy.id, expense.paidBy);
    for (const split of expense.splits) {
      if (split.user) usersById.set(split.user.id, split.user);
    }
  }
  for (const settlement of group.settlements) {
    if (settlement.fromUser) usersById.set(settlement.fromUser.id, settlement.fromUser);
    if (settlement.toUser) usersById.set(settlement.toUser.id, settlement.toUser);
  }
  return Array.from(usersById.values());
}

router.get(
  "/overall",
  asyncHandler(async (req, res) => {
    const groups = await prisma.group.findMany({
      where: { members: { some: { userId: req.user!.id } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true, email: true } },
            splits: { include: { user: { select: { id: true, name: true, email: true } } } }
          }
        },
        settlements: {
          include: {
            fromUser: { select: { id: true, name: true, email: true } },
            toUser: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    const usersById = new Map<string, BalanceUser>();
    for (const group of groups) {
      for (const user of collectBalanceUsers(group)) usersById.set(user.id, user);
    }

    const balance = calculateBalances(
      Array.from(usersById.values()),
      groups.flatMap((group) => group.expenses),
      groups.flatMap((group) => group.settlements)
    );

    res.json({ balance });
  })
);

router.get(
  "/groups/:groupId",
  asyncHandler(async (req, res) => {
    await assertGroupMember(req.params.groupId, req.user!.id);
    const group = await prisma.group.findUniqueOrThrow({
      where: { id: req.params.groupId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true, email: true } },
            splits: { include: { user: { select: { id: true, name: true, email: true } } } }
          }
        },
        settlements: {
          include: {
            fromUser: { select: { id: true, name: true, email: true } },
            toUser: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    const balance = calculateBalances(
      collectBalanceUsers(group),
      group.expenses,
      group.settlements
    );
    res.json({ balance });
  })
);

router.get(
  "/groups/:groupId/explanation/:userId",
  asyncHandler(async (req, res) => {
    await assertGroupMember(req.params.groupId, req.user!.id);
    const group = await prisma.group.findUniqueOrThrow({
      where: { id: req.params.groupId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        expenses: {
          orderBy: { expenseDate: "asc" },
          include: {
            paidBy: { select: { id: true, name: true, email: true } },
            splits: { include: { user: { select: { id: true, name: true, email: true } } } },
            importRow: { select: { rowNumber: true, rawData: true } }
          }
        },
        settlements: {
          orderBy: { settledAt: "asc" },
          include: {
            fromUser: { select: { id: true, name: true, email: true } },
            toUser: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    const users = collectBalanceUsers(group);
    const target = users.find((user) => user.id === req.params.userId);
    if (!target) {
      res.status(404).json({ error: { message: "User is not part of this balance history" } });
      return;
    }

    const expenseLines = group.expenses.flatMap((expense) => {
      const lines: Array<{
        type: "EXPENSE";
        expenseId: string;
        description: string;
        date: Date;
        paidBy: BalanceUser;
        amountCents: number;
        originalCurrency: string;
        originalAmountMinor: number | null;
        deltaCents: number;
        explanation: string;
        csvRowNumber?: number;
        rawCsvRow?: unknown;
      }> = [];
      const split = expense.splits.find((item) => item.userId === req.params.userId);
      if (expense.paidById === req.params.userId) {
        const othersOwe = expense.splits
          .filter((item) => item.userId !== req.params.userId)
          .reduce((sum, item) => sum + item.owedCents, 0);
        if (othersOwe !== 0) {
          lines.push({
            type: "EXPENSE",
            expenseId: expense.id,
            description: expense.description,
            date: expense.expenseDate,
            paidBy: expense.paidBy,
            amountCents: expense.amountCents,
            originalCurrency: expense.originalCurrency,
            originalAmountMinor: expense.originalAmountMinor,
            deltaCents: othersOwe,
            explanation: `${target.name} paid; others owe ${othersOwe} INR cents for their shares.`,
            csvRowNumber: expense.importRow?.rowNumber,
            rawCsvRow: expense.importRow?.rawData
          });
        }
      } else if (split) {
        lines.push({
          type: "EXPENSE",
          expenseId: expense.id,
          description: expense.description,
          date: expense.expenseDate,
          paidBy: expense.paidBy,
          amountCents: expense.amountCents,
          originalCurrency: expense.originalCurrency,
          originalAmountMinor: expense.originalAmountMinor,
          deltaCents: -split.owedCents,
          explanation: `${target.name} owes ${expense.paidBy.name} ${split.owedCents} INR cents for this split.`,
          csvRowNumber: expense.importRow?.rowNumber,
          rawCsvRow: expense.importRow?.rawData
        });
      }
      return lines;
    });

    const settlementLines = group.settlements
      .filter((settlement) => settlement.fromUserId === req.params.userId || settlement.toUserId === req.params.userId)
      .map((settlement) => {
        const paidByTarget = settlement.fromUserId === req.params.userId;
        return {
          type: "SETTLEMENT" as const,
          settlementId: settlement.id,
          date: settlement.settledAt,
          fromUser: settlement.fromUser,
          toUser: settlement.toUser,
          amountCents: settlement.amountCents,
          originalCurrency: settlement.originalCurrency,
          originalAmountMinor: settlement.originalAmountMinor,
          deltaCents: paidByTarget ? settlement.amountCents : -settlement.amountCents,
          explanation: paidByTarget
            ? `${target.name} paid ${settlement.toUser.name}, reducing what ${target.name} owes.`
            : `${settlement.fromUser.name} paid ${target.name}, reducing what others owe ${target.name}.`
        };
      });

    const lines = [...expenseLines, ...settlementLines].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const netCents = lines.reduce((sum, line) => sum + line.deltaCents, 0);
    res.json({ explanation: { user: target, netCents, lines } });
  })
);

router.get(
  "/groups/:groupId/recommendations",
  asyncHandler(async (req, res) => {
    await assertGroupMember(req.params.groupId, req.user!.id);
    const group = await prisma.group.findUniqueOrThrow({
      where: { id: req.params.groupId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true, email: true } },
            splits: { include: { user: { select: { id: true, name: true, email: true } } } }
          }
        },
        settlements: {
          include: {
            fromUser: { select: { id: true, name: true, email: true } },
            toUser: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });
    const balance = calculateBalances(collectBalanceUsers(group), group.expenses, group.settlements);
    res.json({
      recommendations: balance.pairwise.map((item) => ({
        fromUser: item.fromUser,
        toUser: item.toUser,
        amountCents: item.amountCents,
        explanation: `${item.fromUser.name} pays ${item.toUser.name} to settle the current normalized INR balance.`
      }))
    });
  })
);

export { router as balancesRouter };
