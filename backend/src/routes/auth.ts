// src/routes/auth.ts
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../env";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload",
      issues: parsed.error.flatten(),
    });
  }

  const { email, password } = parsed.data;

  if (email !== env.DEMO_USER_EMAIL || password !== env.DEMO_USER_PASSWORD) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { sub: env.DEMO_USER_ID, role: env.DEMO_USER_ROLE, email },
    env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  return res.status(200).json({ token });
});

// ⬇️ NOVO: rota protegida
authRouter.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({ user: req.user });
});
