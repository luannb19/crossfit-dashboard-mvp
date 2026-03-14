// src/routes/attendance.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /api/attendance?classId=xxx — list attendance for a class
router.get("/", async (req, res) => {
  try {
    const { classId } = req.query;
    if (!classId || typeof classId !== "string") {
      return res.status(400).json({ error: "classId é obrigatório" });
    }
    const list = await prisma.attendance.findMany({
      where: { classId },
      select: { id: true, userId: true, classId: true, attendedAt: true },
      orderBy: [{ attendedAt: "asc" }],
    });
    return res.json(list);
  } catch (err) {
    console.error("GET /api/attendance error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/attendance — body: { classId, userId }
router.post("/", async (req, res) => {
  try {
    const { classId, userId } = req.body;
    if (!classId || !userId) {
      return res
        .status(400)
        .json({ error: "classId e userId são obrigatórios" });
    }
    const existing = await prisma.attendance.findFirst({
      where: { classId, userId },
    });
    if (existing) {
      return res.status(201).json(existing);
    }
    const attendance = await prisma.attendance.create({
      data: { classId: String(classId), userId: String(userId) },
    });
    return res.status(201).json(attendance);
  } catch (err) {
    console.error("POST /api/attendance error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/attendance — body: { classId, userId }
router.delete("/", async (req, res) => {
  try {
    const { classId, userId } = req.body;
    if (!classId || !userId) {
      return res
        .status(400)
        .json({ error: "classId e userId são obrigatórios" });
    }
    await prisma.attendance.deleteMany({
      where: { classId: String(classId), userId: String(userId) },
    });
    return res.status(204).send();
  } catch (err) {
    console.error("DELETE /api/attendance error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// middleware permissivo (placeholder)
const allow = (_req: any, _res: any, next: any) => next();

// GET /api/attendance/ranking?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/ranking", allow, async (req, res) => {
  res.json({
    data: [],
    meta: {
      source: "stub",
      from: req.query.from ?? null,
      to: req.query.to ?? null,
    },
  });
});

export default router;
