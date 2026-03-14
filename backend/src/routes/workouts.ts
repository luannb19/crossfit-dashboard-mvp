import { Router } from "express";
import { prisma } from "../lib/prisma";
import { WorkoutCategory } from "@prisma/client";

export const workoutsRouter = Router();

// POST /api/workouts
workoutsRouter.post("/", async (req, res) => {
  try {
    const { boxId, date, title, description, category, videoUrl } = req.body;

    if (!boxId || !date || !title || !category) {
      return res.status(400).json({
        error: "boxId, date, title e category são obrigatórios",
      });
    }

    const workout = await prisma.workout.create({
      data: {
        boxId,
        date: new Date(date),
        title,
        description,
        category,
        videoUrl,
      },
    });

    return res.status(201).json(workout);
  } catch (err) {
    console.error("POST /api/workouts error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/workouts?from=YYYY-MM-DD&to=YYYY-MM-DD&boxId=XYZ
workoutsRouter.get("/", async (req, res) => {
  try {
    const { from, to, boxId } = req.query;

    if (!from || !to || !boxId) {
      return res
        .status(400)
        .json({ error: "from, to e boxId são obrigatórios" });
    }

    const start = new Date(String(from));
    const end = new Date(String(to));
    end.setHours(23, 59, 59, 999);

    const workouts = await prisma.workout.findMany({
      where: {
        boxId: String(boxId),
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [{ date: "asc" }],
    });

    return res.json(workouts);
  } catch (err) {
    console.error("GET /api/workouts error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/workouts/:id
workoutsRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const workout = await prisma.workout.findUnique({ where: { id } });
    if (!workout) {
      return res.status(404).json({ error: "Treino não encontrado" });
    }
    return res.json(workout);
  } catch (err) {
    console.error("GET /api/workouts/:id error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// PUT /api/workouts/:id
workoutsRouter.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { date, title, description, category, videoUrl } = req.body;

    const existing = await prisma.workout.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Treino não encontrado" });
    }

    if (!date || !title || !category) {
      return res.status(400).json({
        error: "date, title e category são obrigatórios",
      });
    }

    const workout = await prisma.workout.update({
      where: { id },
      data: {
        date: new Date(date),
        title: String(title),
        description: description != null ? String(description) : undefined,
        category: category as WorkoutCategory,
        videoUrl: videoUrl != null ? String(videoUrl) : undefined,
      },
    });
    return res.json(workout);
  } catch (err) {
    console.error("PUT /api/workouts/:id error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/workouts/:id
workoutsRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.workout.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Treino não encontrado" });
    }
    await prisma.workout.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error("DELETE /api/workouts/:id error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});
