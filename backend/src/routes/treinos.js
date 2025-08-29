import express from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Treinos
 *   description: Endpoints de criação e recomendação de treinos
 */

/**
 * @swagger
 * /treinos/recomendados:
 *   get:
 *     summary: Lista treinos recomendados para o aluno logado
 *     tags: [Treinos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de treinos recomendados
 */
router.get('/recomendados', auth(['ALUNO']), async (req, res) => {
  try {
    // futuramente podemos usar req.user.id para personalizar recomendações
    const treinos = await prisma.treino.findMany({
      where: { publico: true },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ treinos });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Erro ao buscar treinos recomendados' });
  }
});

/**
 * @swagger
 * /treinos:
 *   post:
 *     summary: Cria um treino (apenas COACH/GESTOR)
 *     tags: [Treinos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "WOD Força"
 *               description:
 *                 type: string
 *                 example: "Agachamento, terra e desenvolvimento"
 *               publico:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Treino criado
 */
router.post('/', auth(['COACH','GESTOR']), async (req, res) => {
  try {
    const { title, description, publico } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'title e description são obrigatórios' });
    }
    const treino = await prisma.treino.create({
      data: { title, description, publico: publico ?? true }
    });
    res.json({ ok: true, treino });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Erro ao criar treino' });
  }
});

/**
 * @swagger
 * /treinos:
 *   get:
 *     summary: Lista todos os treinos (apenas COACH/GESTOR)
 *     tags: [Treinos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de treinos
 */
router.get('/', auth(['COACH','GESTOR']), async (_req, res) => {
  const treinos = await prisma.treino.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json({ treinos });
});

/**
 * @swagger
 * /treinos/{id}:
 *   get:
 *     summary: Detalhe de um treino (COACH/GESTOR)
 *     tags: [Treinos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *         description: ID do treino
 *     responses:
 *       200: { description: Treino encontrado }
 *       404: { description: Treino não encontrado }
 */
router.get('/:id', auth(['COACH','GESTOR']), async (req, res) => {
  const treino = await prisma.treino.findUnique({ where: { id: req.params.id } });
  if (!treino) return res.status(404).json({ error: 'Treino não encontrado' });
  res.json({ treino });
});

/**
 * @swagger
 * /treinos/{id}:
 *   put:
 *     summary: Atualiza um treino (COACH/GESTOR)
 *     tags: [Treinos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *         description: ID do treino
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:       { type: string, example: "WOD Força (atualizado)" }
 *               description: { type: string, example: "Agachamento, terra e desenvolvimento" }
 *               publico:     { type: boolean, example: true }
 *     responses:
 *       200: { description: Treino atualizado }
 *       404: { description: Treino não encontrado }
 */
router.put('/:id', auth(['COACH','GESTOR']), async (req, res) => {
  const { title, description, publico } = req.body;
  try {
    const treino = await prisma.treino.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(publico !== undefined && { publico: Boolean(publico) }),
      },
    });
    res.json({ ok: true, treino });
  } catch (e) {
    // Prisma lança P2025 quando o registro não existe
    if (e.code === 'P2025') return res.status(404).json({ error: 'Treino não encontrado' });
    res.status(400).json({ error: e.message || 'Erro ao atualizar treino' });
  }
});

/**
 * @swagger
 * /treinos/{id}:
 *   delete:
 *     summary: Remove um treino (COACH/GESTOR)
 *     tags: [Treinos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *         description: ID do treino
 *     responses:
 *       200: { description: Treino removido }
 *       404: { description: Treino não encontrado }
 */
router.delete('/:id', auth(['COACH','GESTOR']), async (req, res) => {
  try {
    await prisma.treino.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Treino não encontrado' });
    res.status(400).json({ error: e.message || 'Erro ao remover treino' });
  }
});


export default router;

