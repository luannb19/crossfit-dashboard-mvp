import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { registerSchema, loginSchema } from '../schemas/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const hash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { ...data, password: hash }
    });
    res.json({ id: user.id, email: user.email, role: user.role, name: user.name });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Invalid data' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Faz login e retorna um JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: aluno@insightflow.com }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: Token JWT e dados do usuário
 */

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Invalid data' });
  }
});

export default router;
