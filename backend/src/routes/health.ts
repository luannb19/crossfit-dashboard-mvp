import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { env } from "../env";

export const healthRouter = Router();

// health básico
healthRouter.get("/", (_req, res) => {
  res.status(200).json({ ok: true });
});

// health do DB
healthRouter.get("/db", async (_req, res) => {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    return res
      .status(200)
      .json({
        ok: true,
        db: { available: false, reason: "DATABASE_URL not set" },
      });
  }
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return res.status(200).json({ ok: true, db: { available: true } });
  } catch (err) {
    return res
      .status(200)
      .json({
        ok: true,
        db: { available: false, error: (err as Error).message },
      });
  } finally {
    await prisma.$disconnect();
  }
});

// rota protegida (inline JWT)
healthRouter.get("/secure", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token)
    return res.status(401).json({ ok: false, error: "missing_token" });

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      sub: string;
      [k: string]: unknown;
    };
    return res.status(200).json({ ok: true, user: decoded });
  } catch {
    return res.status(401).json({ ok: false, error: "invalid_token" });
  }
});
