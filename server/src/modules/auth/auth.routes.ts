import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../prisma/client.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { clearSessionCookie, requireAuth, setSessionCookie, signSession } from "../../middleware/auth.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8)
});

const signupSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).max(80)
});

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const input = signupSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new HttpError(409, "Email is already registered");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: { id: true, name: true, email: true }
    });

    const token = signSession(user.id);
    setSessionCookie(res, token);
    res.status(201).json({ user, token });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = credentialsSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new HttpError(401, "Invalid email or password");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new HttpError(401, "Invalid email or password");

    const token = signSession(user.id);
    setSessionCookie(res, token);
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  })
);

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export { router as authRouter };
