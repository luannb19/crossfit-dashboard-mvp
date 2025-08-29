import express from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /classes:
 *   post:
 *     summary: Criar aula
 *     description: Permite que COACH ou GESTOR cadastrem uma nova aula.
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, startAt, endAt, capacity]
 *             properties:
 *               title:
 *                 type: string
 *               startAt:
 *                 type: string
 *                 format: date-time
 *               endAt:
 *                 type: string
 *                 format: date-time
 *               capacity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Aula criada com sucesso
 */
router.post('/', auth(['COACH','GESTOR']), async (req, res) => {
  try {
    const { title, startAt, endAt, capacity } = req.body;
    if (!title || !startAt || !endAt || !capacity) {
      return res.status(400).json({ error: 'title, startAt, endAt, capacity são obrigatórios' });
    }
    const cls = await prisma.class.create({
      data: {
        title,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        capacity: Number(capacity)
      }
    });
    res.json({ ok: true, class: cls });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Erro ao criar aula' });
  }
});

/**
 * @swagger
 * /classes/proximas:
 *   get:
 *     summary: Listar próximas aulas (2 semanas)
 *     description: Retorna todas as aulas dos próximos 14 dias.
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de aulas
 */
router.get('/proximas', auth(['ALUNO','COACH','GESTOR']), async (_req, res) => {
  const now = new Date();
  const to = new Date(now);
  to.setDate(now.getDate() + 14);
  const classes = await prisma.class.findMany({
    where: { startAt: { gte: now, lte: to } },
    orderBy: { startAt: 'asc' }
  });
  res.json({ classes });
});

/**
 * @swagger
 * /classes:
 *   get:
 *     summary: Listar aulas por dia
 *     description: Retorna todas as aulas de uma data específica (query param: date=YYYY-MM-DD).
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Data no formato YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Lista de aulas
 */
router.get('/', auth(['ALUNO','COACH','GESTOR']), async (req, res) => {
  const { date } = req.query;
  let where = {};
  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    where = { startAt: { gte: start, lte: end } };
  }
  const classes = await prisma.class.findMany({ where, orderBy: { startAt: 'asc' } });
  res.json({ classes });
});

/**
 * @swagger
 * /classes/{id}:
 *   get:
 *     summary: Detalhe da aula
 *     description: Retorna os detalhes de uma aula pelo seu ID.
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID da aula
 *     responses:
 *       200:
 *         description: Aula encontrada
 *       404:
 *         description: Aula não encontrada
 */
router.get('/:id', auth(['ALUNO','COACH','GESTOR']), async (req, res) => {
  const cls = await prisma.class.findUnique({ where: { id: req.params.id } });
  if (!cls) return res.status(404).json({ error: 'Aula não encontrada' });
  res.json({ class: cls });
});

/**
 * @swagger
 * /classes/{id}:
 *   put:
 *     summary: Atualiza uma aula (COACH/GESTOR)
 *     tags: [Classes]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:   { type: string }
 *               startAt: { type: string, format: date-time }
 *               endAt:   { type: string, format: date-time }
 *               capacity:{ type: integer }
 *     responses:
 *       200: { description: Aula atualizada }
 *       404: { description: Não encontrada }
 */
router.put('/:id', auth(['COACH','GESTOR']), async (req, res) => {
  const { title, startAt, endAt, capacity } = req.body;
  try {
    const cls = await prisma.class.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(startAt !== undefined && { startAt: new Date(startAt) }),
        ...(endAt !== undefined && { endAt: new Date(endAt) }),
        ...(capacity !== undefined && { capacity: Number(capacity) }),
      }
    });
    res.json({ ok: true, class: cls });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Aula não encontrada' });
    res.status(400).json({ error: e.message || 'Erro ao atualizar aula' });
  }
});

/**
 * @swagger
 * /classes:
 *   get:
 *     summary: Lista aulas (pode filtrar por data)
 *     description: Retorna todas as aulas. Use o parâmetro de query "date" (YYYY-MM-DD) para filtrar por uma data específica.
 *     tags:
 *       - Classes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Data no formato YYYY-MM-DD para filtrar as aulas do dia
 *     responses:
 *       200:
 *         description: Lista de aulas
 */

router.delete('/:id', auth(['COACH','GESTOR']), async (req, res) => {
  try {
    await prisma.class.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Aula não encontrada' });
    res.status(400).json({ error: e.message || 'Erro ao remover aula' });
  }
});


export default router;
