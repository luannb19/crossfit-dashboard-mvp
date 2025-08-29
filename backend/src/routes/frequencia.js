import express from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

/** Registrar presença (ALUNO) */
router.post('/:classId/presenca', auth(['ALUNO']), async (req, res) => {
  try {
    const { userId } = req.user; // vem do token
    const { classId } = req.params;

    const presence = await prisma.presence.create({
      data: {
        userId,
        classId
      }
    });

    res.json({ ok: true, presence });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Erro ao registrar presença' });
  }
});

/** Listar presenças por aluno (ALUNO/COACH/GESTOR) */
router.post('/', auth(['ALUNO','COACH','GESTOR']), async (req, res) => {
  const { classId } = req.body;
  if (!classId) return res.status(400).json({ error: 'classId required' });

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return res.status(404).json({ error: 'Aula não encontrada' });

  const count = await prisma.attendance.count({ where: { classId } });
  if (count >= cls.capacity) {
    return res.status(409).json({ error: 'Aula lotada' });
  }

  // evita check-in duplicado
  const already = await prisma.attendance.findFirst({
    where: { classId, userId: req.user.id }
  });
  if (already) return res.status(409).json({ error: 'Presença já registrada' });

  const attendance = await prisma.attendance.create({
    data: { classId, userId: req.user.id }
  });

  res.json({ ok: true, attendanceId: attendance.id });
});

export default router;
