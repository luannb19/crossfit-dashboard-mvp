import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export const healthRouter = Router();

// health básico
healthRouter.get("/", (_req, res) => {
  res.status(200).json({ ok: true });
});

// health do DB: tenta SELECT 1 se houver DATABASE_URL
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
    // SELECT 1 funciona para Postgres; para outros providers, vai falhar e cair no catch.
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
