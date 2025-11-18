// src/routes/attendance.ts
import { Router } from "express";

const router = Router();

// middleware permissivo (placeholder)
const allow = (_req: any, _res: any, next: any) => next();

// GET /api/attendance/ranking?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/ranking", allow, async (req, res) => {
  res.json({
    data: [
      // deixe vazio por enquanto (UI não quebra)
      // { id: "u1", name: "Aluno 1", presencas: 43 },
      // { id: "u2", name: "Aluno 2", presencas: 41 },
    ],
    meta: {
      source: "stub",
      from: req.query.from ?? null,
      to: req.query.to ?? null,
    },
  });
});

export default router;
