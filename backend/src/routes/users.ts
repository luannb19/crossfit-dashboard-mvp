import { Router } from "express";
import { prisma } from "../lib/prisma";

export const usersRouter = Router();

// GET /api/users — list members (id, name, email, role) for attendance etc.
usersRouter.get("/", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }],
    });
    return res.json(users);
  } catch (err) {
    console.error("GET /api/users error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});
