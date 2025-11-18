import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// GET /api/admin/billing/payments?limit=20
router.get("/payments", requireAuth, async (req, res) => {
  const limit = Math.min(
    parseInt(String(req.query.limit || 20), 10) || 20,
    100,
  );
  const items = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json({ items });
});

// GET /api/admin/billing/subscriptions?limit=20
router.get("/subscriptions", requireAuth, async (req, res) => {
  const limit = Math.min(
    parseInt(String(req.query.limit || 20), 10) || 20,
    100,
  );
  const items = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json({ items });
});

export default router;
