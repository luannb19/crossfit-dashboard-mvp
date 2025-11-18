// src/routes/heatmap.ts
import { Router } from "express";

const router = Router();

// middleware permissivo (placeholder)
const allow = (_req: any, _res: any, next: any) => next();

// GET /api/heatmap/week-hour?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/week-hour", allow, async (req, res) => {
  const bins: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  res.json({
    data: { bins }, // 7x24
    meta: {
      source: "stub",
      timezone: "America/Sao_Paulo",
      from: req.query.from ?? null,
      to: req.query.to ?? null,
    },
  });
});

export default router;
