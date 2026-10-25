import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { assertGroupMember, getGroupMemberIds } from "../groups/groupAccess.js";

const router = Router();
router.use(requireAuth);

const settlementSchema = z.object({
  groupId: z.string().min(1),
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  amountCents: z.number().int().positive(),
  note: z.string().trim().max(500).optional().nullable(),
  settledAt: z.string().datetime().optional()
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = settlementSchema.parse(req.body);
    await assertGroupMember(input.groupId, req.user!.id);
    if (input.fromUserId === input.toUserId) throw new HttpError(400, "Settlement users must be different");

    const memberIds = new Set(await getGroupMemberIds(input.groupId));
    if (!memberIds.has(input.fromUserId) || !memberIds.has(input.toUserId)) {
      throw new HttpError(400, "Settlement users must be group members");
    }

    const settlement = await prisma.settlement.create({
      data: {
        groupId: input.groupId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        amountCents: input.amountCents,
        originalAmountMinor: input.amountCents,
        originalCurrency: "INR",
        normalizedAmountInrCents: input.amountCents,
        note: input.note || null,
        settledAt: input.settledAt ? new Date(input.settledAt) : new Date(),
        createdById: req.user!.id
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(201).json({ settlement });
  })
);

export { router as settlementsRouter };
