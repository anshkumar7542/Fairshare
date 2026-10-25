import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { assertGroupMember } from "./groupAccess.js";

const router = Router();
router.use(requireAuth);

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable()
});

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email()
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const groups = await prisma.group.findMany({
      where: { members: { some: { userId: req.user!.id } } },
      orderBy: { updatedAt: "desc" },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } }
      }
    });
    res.json({ groups });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createGroupSchema.parse(req.body);
    const group = await prisma.group.create({
      data: {
        name: input.name,
        description: input.description || null,
        createdById: req.user!.id,
        members: { create: { userId: req.user!.id, joinedAt: new Date() } }
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } }
    });
    res.status(201).json({ group });
  })
);

router.get(
  "/:groupId",
  asyncHandler(async (req, res) => {
    await assertGroupMember(req.params.groupId, req.user!.id);
    const group = await prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        expenses: {
          orderBy: { expenseDate: "desc" },
          include: {
            paidBy: { select: { id: true, name: true, email: true } },
            splits: { include: { user: { select: { id: true, name: true, email: true } } } }
          }
        },
        settlements: {
          orderBy: { settledAt: "desc" },
          include: {
            fromUser: { select: { id: true, name: true, email: true } },
            toUser: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });
    if (!group) throw new HttpError(404, "Group not found");
    res.json({ group });
  })
);

router.post(
  "/:groupId/members",
  asyncHandler(async (req, res) => {
    await assertGroupMember(req.params.groupId, req.user!.id);
    const input = addMemberSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, name: true, email: true }
    });
    if (!user) throw new HttpError(404, "No existing user found for that email");

    await prisma.groupMembership.upsert({
      where: { groupId_userId: { groupId: req.params.groupId, userId: user.id } },
      update: {},
      create: { groupId: req.params.groupId, userId: user.id, joinedAt: new Date() }
    });

    res.status(201).json({ member: user });
  })
);

router.delete(
  "/:groupId/members/:userId",
  asyncHandler(async (req, res) => {
    await assertGroupMember(req.params.groupId, req.user!.id);

    const membership = await prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId: req.params.groupId, userId: req.params.userId } }
    });
    if (!membership) throw new HttpError(404, "Group member not found");

    const memberCount = await prisma.groupMembership.count({ where: { groupId: req.params.groupId } });
    if (memberCount <= 1) throw new HttpError(400, "A group must keep at least one member");

    await prisma.groupMembership.delete({
      where: { groupId_userId: { groupId: req.params.groupId, userId: req.params.userId } }
    });

    res.status(204).send();
  })
);

export { router as groupsRouter };
