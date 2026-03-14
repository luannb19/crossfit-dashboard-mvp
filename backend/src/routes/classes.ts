import { Router } from "express";
import { prisma } from "../lib/prisma";

export const classesRouter = Router();

// GET /api/classes — list (optional from, to for filtering by startAt)
classesRouter.get("/", async (req, res) => {
  try {
    const { from, to } = req.query;
    const where: { startAt?: { gte?: Date; lte?: Date } } = {};
    if (from && to) {
      const start = new Date(String(from));
      const end = new Date(String(to));
      end.setHours(23, 59, 59, 999);
      where.startAt = { gte: start, lte: end };
    }
    const classes = await prisma.class.findMany({
      where,
      orderBy: [{ startAt: "asc" }],
    });
    return res.json(classes);
  } catch (err) {
    console.error("GET /api/classes error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/classes/:id
classesRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cls = await prisma.class.findUnique({ where: { id } });
    if (!cls) {
      return res.status(404).json({ error: "Aula não encontrada" });
    }
    return res.json(cls);
  } catch (err) {
    console.error("GET /api/classes/:id error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/classes — body: title, startAt, capacity (endAt optional, default startAt + 1h)
classesRouter.post("/", async (req, res) => {
  try {
    const { title, startAt, capacity } = req.body;
    if (!title || startAt == null || capacity == null) {
      return res.status(400).json({
        error: "title, startAt e capacity são obrigatórios",
      });
    }
    const start = new Date(startAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const cls = await prisma.class.create({
      data: {
        title: String(title),
        startAt: start,
        endAt: end,
        capacity: Number(capacity) || 0,
      },
    });
    return res.status(201).json(cls);
  } catch (err) {
    console.error("POST /api/classes error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// PATCH /api/classes/:id — body: title?, startAt?, capacity?
classesRouter.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Aula não encontrada" });
    }
    const { title, startAt, capacity } = req.body;
    const data: {
      title?: string;
      startAt?: Date;
      endAt?: Date;
      capacity?: number;
    } = {};
    if (title != null) data.title = String(title);
    if (startAt != null) {
      const start = new Date(startAt);
      data.startAt = start;
      data.endAt = new Date(start.getTime() + 60 * 60 * 1000);
    }
    if (capacity != null) data.capacity = Number(capacity) || 0;
    const cls = await prisma.class.update({
      where: { id },
      data,
    });
    return res.json(cls);
  } catch (err) {
    console.error("PATCH /api/classes/:id error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/classes/:id
classesRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Aula não encontrada" });
    }
    await prisma.class.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error("DELETE /api/classes/:id error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});
