import { Router } from "express";
import { SplitMethod } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { assertGroupMember, getGroupMemberIds } from "../groups/groupAccess.js";
import { calculateSplits } from "./splitCalculator.js";

const router = Router();
router.use(requireAuth);

const splitSchema = z.object({
  userId: z.string().min(1),
  amountCents: z.number().int().optional(),
  percentage: z.number().optional(),
  shares: z.number().int().optional()
});

const createExpenseSchema = z.object({
  groupId: z.string().min(1),
  description: z.string().trim().min(1).max(160),
  amountCents: z.number().int().positive(),
  paidById: z.string().min(1),
  splitMethod: z.nativeEnum(SplitMethod),
  expenseDate: z.string().datetime().optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  splits: z.array(splitSchema).min(1)
});

const updateExpenseSchema = createExpenseSchema.omit({ groupId: true });

const messageSchema = z.object({
  message: z.string().trim().min(1).max(1000)
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createExpenseSchema.parse(req.body);
    await assertGroupMember(input.groupId, req.user!.id);

    const memberIds = new Set(await getGroupMemberIds(input.groupId));
    if (!memberIds.has(input.paidById)) throw new HttpError(400, "Payer must be a group member");
    for (const split of input.splits) {
      if (!memberIds.has(split.userId)) throw new HttpError(400, "All split participants must be group members");
    }

    const calculated = calculateSplits(input.amountCents, input.splitMethod, input.splits);
    const expense = await prisma.expense.create({
      data: {
        groupId: input.groupId,
        description: input.description,
        amountCents: input.amountCents,
        originalAmountMinor: input.amountCents,
        originalCurrency: "INR",
        normalizedAmountInrCents: input.amountCents,
        paidById: input.paidById,
        splitMethod: input.splitMethod,
        expenseDate: input.expenseDate ? new Date(input.expenseDate) : new Date(),
        notes: input.notes || null,
        createdById: req.user!.id,
        splits: {
          create: calculated.map((split) => ({
            userId: split.userId,
            owedCents: split.owedCents,
            normalizedOwedInrCents: split.owedCents,
            originalOwedMinor: split.owedCents,
            originalCurrency: "INR",
            inputAmountCents: split.amountCents ?? null,
            inputPercentage: split.percentage ?? null,
            inputShares: split.shares ?? null
          }))
        }
      },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        splits: { include: { user: { select: { id: true, name: true, email: true } } } }
      }
    });

    res.status(201).json({ expense });
  })
);

router.get(
  "/:expenseId",
  asyncHandler(async (req, res) => {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.expenseId },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        splits: { include: { user: { select: { id: true, name: true, email: true } } } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true, email: true } } }
        }
      }
    });
    if (!expense) throw new HttpError(404, "Expense not found");
    await assertGroupMember(expense.groupId, req.user!.id);
    res.json({ expense });
  })
);

router.put(
  "/:expenseId",
  asyncHandler(async (req, res) => {
    const existing = await prisma.expense.findUnique({ where: { id: req.params.expenseId } });
    if (!existing) throw new HttpError(404, "Expense not found");
    await assertGroupMember(existing.groupId, req.user!.id);

    const input = updateExpenseSchema.parse(req.body);
    const memberIds = new Set(await getGroupMemberIds(existing.groupId));
    if (!memberIds.has(input.paidById)) throw new HttpError(400, "Payer must be a current group member");
    for (const split of input.splits) {
      if (!memberIds.has(split.userId)) {
        throw new HttpError(400, "All split participants must be current group members");
      }
    }

    const calculated = calculateSplits(input.amountCents, input.splitMethod, input.splits);
    const expense = await prisma.$transaction(async (tx) => {
      await tx.expenseSplit.deleteMany({ where: { expenseId: existing.id } });
      return tx.expense.update({
        where: { id: existing.id },
        data: {
          description: input.description,
          amountCents: input.amountCents,
          originalAmountMinor: input.amountCents,
          originalCurrency: "INR",
          normalizedAmountInrCents: input.amountCents,
          paidById: input.paidById,
          splitMethod: input.splitMethod,
          expenseDate: input.expenseDate ? new Date(input.expenseDate) : existing.expenseDate,
          notes: input.notes || null,
          splits: {
            create: calculated.map((split) => ({
              userId: split.userId,
              owedCents: split.owedCents,
              normalizedOwedInrCents: split.owedCents,
              originalOwedMinor: split.owedCents,
              originalCurrency: "INR",
              inputAmountCents: split.amountCents ?? null,
              inputPercentage: split.percentage ?? null,
              inputShares: split.shares ?? null
            }))
          }
        },
        include: {
          paidBy: { select: { id: true, name: true, email: true } },
          splits: { include: { user: { select: { id: true, name: true, email: true } } } },
          messages: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { id: true, name: true, email: true } } }
          }
        }
      });
    });

    res.json({ expense });
  })
);

router.delete(
  "/:expenseId",
  asyncHandler(async (req, res) => {
    const expense = await prisma.expense.findUnique({ where: { id: req.params.expenseId } });
    if (!expense) throw new HttpError(404, "Expense not found");
    await assertGroupMember(expense.groupId, req.user!.id);

    await prisma.expense.delete({ where: { id: expense.id } });
    res.status(204).send();
  })
);

router.post(
  "/:expenseId/messages",
  asyncHandler(async (req, res) => {
    const input = messageSchema.parse(req.body);
    const expense = await prisma.expense.findUnique({ where: { id: req.params.expenseId } });
    if (!expense) throw new HttpError(404, "Expense not found");
    await assertGroupMember(expense.groupId, req.user!.id);

    const message = await prisma.expenseMessage.create({
      data: { expenseId: expense.id, authorId: req.user!.id, message: input.message },
      include: { author: { select: { id: true, name: true, email: true } } }
    });
    res.status(201).json({ message });
  })
);

export { router as expensesRouter };
