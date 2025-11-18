import { Router } from "express";
import type { Request } from "express"; // 👈 acrescenta isso
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/requireAuth";

export const healthRouter = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [health]
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/health:
 *   get:
 *     summary: Health check (espelho em /api)
 *     tags: [health]
 *     responses:
 *       200:
 *         description: OK
 */
healthRouter.get("/", (_req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * @swagger
 * /health/db:
 *   get:
 *     summary: Verifica conectividade com o banco
 *     tags: [health]
 *     responses:
 *       200:
 *         description: Status do DB
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 db:
 *                   type: object
 *                   properties:
 *                     available: { type: boolean, example: true }
 *                     reason: { type: string, nullable: true }
 *                     error: { type: string, nullable: true }
 *
 * /api/health/db:
 *   get:
 *     summary: Verifica conectividade com o banco (espelho em /api)
 *     tags: [health]
 *     responses:
 *       200:
 *         description: Status do DB
 */
healthRouter.get("/db", async (_req, res) => {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    return res.status(200).json({
      ok: true,
      db: { available: false, reason: "DATABASE_URL not set" },
    });
  }
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return res.status(200).json({ ok: true, db: { available: true } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(200).json({
      ok: true,
      db: { available: false, error: msg },
    });
  } finally {
    await prisma.$disconnect();
  }
});

/**
 * @swagger
 * /health/secure:
 *   get:
 *     summary: Health check protegido (retorna usuário autenticado)
 *     tags: [health]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK (com usuário)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 user: { type: object, nullable: true }
 *
 * /api/health/secure:
 *   get:
 *     summary: Health check protegido (espelho em /api)
 *     tags: [health]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK (com usuário)
 */
healthRouter.get("/secure", requireAuth, (req, res) => {
  const authedUser = (req as Request & { user?: unknown }).user ?? null;
  res.status(200).json({ ok: true, user: authedUser });
});
