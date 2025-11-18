// src/routes/auth.ts
import { Router } from "express";
import type { Request } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../env";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type AuthedUser =
  | {
      sub?: string;
      role?: string;
      email?: string;
    }
  | unknown;

type AuthedRequest = Request & { user?: AuthedUser };

/**
 * POST /auth/login  (espelhe como /api/auth/login no server.ts)
 * Retorna um JWT válido usando credenciais de demo do .env
 */
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
    { expiresIn: "1h", issuer: "insightflow" },
  );

  return res
    .status(200)
    .json({ token, token_type: "Bearer", expires_in: 3600 });
});

/**
 * GET /auth/me
 * Retorna o usuário autenticado (requireAuth deve validar o Bearer token e popular req.user)
 */
authRouter.get("/me", requireAuth, (req, res) => {
  const user = (req as AuthedRequest).user ?? null;
  return res.status(200).json({ user });
});

/**
 * POST /auth/dev-token  (SOMENTE DEV)
 * Gera um token sem precisar de credenciais — útil para testes locais e curl.
 * Ative apenas quando NODE_ENV !== 'production'.
 */
authRouter.post("/dev-token", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "forbidden in production" });
  }

  const userId = (req.body?.userId as string) || env.DEMO_USER_ID || "dev-user";
  const role = (req.body?.role as string) || env.DEMO_USER_ROLE || "admin";
  const email =
    (req.body?.email as string) ||
    env.DEMO_USER_EMAIL ||
    "dev@insightflow.test";

  const token = jwt.sign({ sub: userId, role, email }, env.JWT_SECRET, {
    expiresIn: "12h",
    issuer: "insightflow",
  });

  return res
    .status(200)
    .json({ token, token_type: "Bearer", expires_in: 12 * 3600 });
});

export default authRouter;
