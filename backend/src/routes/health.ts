import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/requireAuth";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({ ok: true });
});

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

healthRouter.get("/secure", requireAuth, (req, res) => {
  res.status(200).json({ ok: true, user: req.user ?? null });
});
