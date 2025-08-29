import express from 'express';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/alertas', auth(['COACH','GESTOR']), async (_req, res) => {
  const alerts = [
    { userId: 'u1', name: 'Maria S.', daysWithoutTraining: 12, churnScore: 0.78 },
    { userId: 'u2', name: 'João P.',  daysWithoutTraining: 9,  churnScore: 0.66 }
  ];
  res.json({ alerts });
});

/**
 * @swagger
 * /churn/alertas:
 *   get:
 *     summary: Lista de alunos em risco de churn
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alertas de churn (mock)
 */

export default router;
