import express from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /ocupacao:
 *   get:
 *     summary: Retorna a taxa de ocupação das aulas por dia
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ocupação diária
 */
router.get('/', auth(['GESTOR','COACH']), async (_req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: { _count: { select: { reservations: true } } },
      orderBy: { startAt: 'asc' }
    });

    const ocupacao = classes.map(c => ({
      id: c.id,
      title: c.title,
      startAt: c.startAt,
      endAt: c.endAt,
      capacity: c.capacity,
      reservas: c._count.reservations,
      taxa: (c._count.reservations / c.capacity).toFixed(2)
    }));

    res.json({ ocupacao });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro ao calcular ocupação' });
  }
});

export default router;
