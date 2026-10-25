import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler, HttpError } from "../../utils/http.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/lookup",
  asyncHandler(async (req, res) => {
    const query = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.query);
    const user = await prisma.user.findUnique({
      where: { email: query.email },
      select: { id: true, name: true, email: true }
    });
    if (!user) throw new HttpError(404, "User not found");
    res.json({ user });
  })
);

export { router as usersRouter };
