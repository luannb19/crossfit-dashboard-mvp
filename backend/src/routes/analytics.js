import express from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: KPIs e métricas gerenciais
 */

/**
 * @swagger
 * /analytics/snapshot:
 *   get:
 *     summary: KPIs (últimos 30 dias)
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: KPIs calculados
 */
router.get('/snapshot', auth(['GESTOR','COACH']), async (_req, res) => {
  const now = new Date();
  const from = new Date();
  from.setDate(now.getDate() - 30);

  // 1) Coletar entidades no período
  const [classes, totalAttendances, distinctUsers] = await Promise.all([
    prisma.class.findMany({
      where: { startAt: { gte: from, lte: now } },
      select: { id: true, title: true, startAt: true, capacity: true },
      orderBy: { startAt: 'asc' }
    }),
    prisma.attendance.count({ where: { attendedAt: { gte: from, lte: now } } }),
    prisma.attendance.findMany({
      where: { attendedAt: { gte: from, lte: now } },
      select: { userId: true },
      distinct: ['userId']
    })
  ]);

  // 2) Contagem de presenças por aula (groupBy)
  const grouped = await prisma.attendance.groupBy({
    by: ['classId'],
    where: { attendedAt: { gte: from, lte: now } },
    _count: { _all: true }
  });
  const byClassCount = new Map(grouped.map(g => [g.classId, g._count._all]));

  // 3) Ocupação média por aula (presenças/capacidade)
  const ratios = classes.map(c => {
    const n = byClassCount.get(c.id) ?? 0;
    return n / Math.max(1, c.capacity);
  });
  const ocupacaoMedia = ratios.length
    ? Number((ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(2))
    : 0;

  // 4) Top horários (média de ocupação por hora do dia)
  const byHour = {};
  for (const c of classes) {
    const n = byClassCount.get(c.id) ?? 0;
    const rate = n / Math.max(1, c.capacity);
    const hour = new Date(c.startAt).getUTCHours(); // TODO: ajustar p/ America/Sao_Paulo
    if (!byHour[hour]) byHour[hour] = { sum: 0, n: 0 };
    byHour[hour].sum += rate; byHour[hour].n += 1;
  }
  const topHorarios = Object.entries(byHour)
    .map(([h, v]) => ({ hour: Number(h), avg: Number((v.sum / v.n).toFixed(2)) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  res.json({
    periodo: { from, to: now },
    totalClasses: classes.length,
    totalAttendances,
    alunosAtivos: distinctUsers.length,
    ocupacaoMedia,   // 0..1
    topHorarios     // [{ hour (UTC), avg 0..1 }]
  });
});

/**
 * @swagger
 * /analytics/ocupacao-por-dia:
 *   get:
 *     summary: Ocupação média por dia
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *         required: true
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *         required: true
 *         description: Data final (YYYY-MM-DD)
 *     responses:
 *       200: { description: Série temporal de ocupação }
 */
router.get('/ocupacao-por-dia', auth(['GESTOR','COACH']), async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from e to são obrigatórios (YYYY-MM-DD)' });

  const start = new Date(`${from}T00:00:00Z`);
  const end   = new Date(`${to}T23:59:59Z`);

  const classes = await prisma.class.findMany({
    where: { startAt: { gte: start, lte: end } },
    select: { id: true, startAt: true, capacity: true }
  });

  const grouped = await prisma.attendance.groupBy({
    by: ['classId'],
    where: { attendedAt: { gte: start, lte: end } },
    _count: { _all: true }
  });
  const byClass = new Map(grouped.map(g => [g.classId, g._count._all]));

  const byDay = {};
  for (const c of classes) {
    const d = new Date(c.startAt).toISOString().slice(0, 10); // YYYY-MM-DD
    const count = byClass.get(c.id) ?? 0;
    const rate = count / Math.max(1, c.capacity);
    if (!byDay[d]) byDay[d] = { sum: 0, n: 0 };
    byDay[d].sum += rate; byDay[d].n += 1;
  }

  const series = Object.entries(byDay)
    .map(([date, v]) => ({ date, ocupacao: Number((v.sum / v.n).toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({ from, to, series });
});

/**
 * @swagger
 * /analytics/assiduidade-top:
 *   get:
 *     summary: Ranking de alunos mais assíduos
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Quantidade de alunos no ranking
 *     responses:
 *       200: { description: Ranking }
 */
router.get('/assiduidade-top', auth(['GESTOR','COACH']), async (req, res) => {
  const limit = parseInt(req.query.limit ?? '10', 10);

  // 1) Agrupa por userId e traz a contagem
  const grouped = await prisma.attendance.groupBy({
    by: ['userId'],
    _count: { _all: true }
    // Removemos o orderBy que usava _all para evitar o erro
  });

  // 2) Ordena em JS pelo _count._all (desc) e aplica o limit
  const top = grouped
    .sort((a, b) => (b._count._all - a._count._all))
    .slice(0, limit);

  // 3) Busca nomes/emails dos usuários do ranking
  const ids = top.map(g => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true }
  });
  const byId = new Map(users.map(u => [u.id, u]));

  // 4) Monta payload final
  const ranking = top.map(g => ({
    userId: g.userId,
    name: byId.get(g.userId)?.name ?? 'Sem nome',
    email: byId.get(g.userId)?.email,
    presencas: g._count._all
  }));

  res.json({ ranking });
});


/**
 * @swagger
 * /analytics/aulas:
 *   get:
 *     summary: Lista aulas no período com presenças e ocupação
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: OK
 */


// src/routes/analytics.js (adicione)
router.get('/aulas', auth(['GESTOR','COACH']), async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from e to obrigatórios (YYYY-MM-DD)' });
  const start = new Date(`${from}T00:00:00Z`), end = new Date(`${to}T23:59:59Z`);

  const classes = await prisma.class.findMany({
    where: { startAt: { gte: start, lte: end } },
    select: { id: true, title: true, startAt: true, capacity: true }
  });

  const grouped = await prisma.attendance.groupBy({
    by: ['classId'],
    where: { attendedAt: { gte: start, lte: end } },
    _count: { _all: true }
  });
  const byClass = new Map(grouped.map(g => [g.classId, g._count._all]));

  const aulas = classes.map(c => {
    const presencas = byClass.get(c.id) ?? 0;
    return {
      id: c.id,
      title: c.title,
      startAt: c.startAt,
      capacity: c.capacity,
      presencas,
      ocupacao: Number((presencas / Math.max(1, c.capacity)).toFixed(2))
    };
  }).sort((a,b)=>b.presencas - a.presencas);

  res.json({ from, to, total: aulas.length, aulas });
});

/**
 * @swagger
 * /analytics/horario-serie:
 *   get:
 *     summary: Ocupação média ao longo do tempo para um horário específico (hora do dia)
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final (YYYY-MM-DD)
 *       - in: query
 *         name: hour
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 23
 *         description: Hora do dia (0–23, UTC)
 *     responses:
 *       200:
 *         description: Série temporal
 */


router.get('/horario-serie', auth(['GESTOR','COACH']), async (req, res) => {
  const { from, to, hour } = req.query;
  if (!from || !to || hour === undefined) {
    return res.status(400).json({ error: 'from, to, hour são obrigatórios' });
  }
  const h = parseInt(hour, 10);
  const start = new Date(`${from}T00:00:00Z`), end = new Date(`${to}T23:59:59Z`);

  const classes = await prisma.class.findMany({
    where: { startAt: { gte: start, lte: end } },
    select: { id: true, startAt: true, capacity: true }
  });

  const filtered = classes.filter(c => new Date(c.startAt).getUTCHours() === h);

  const grouped = await prisma.attendance.groupBy({
    by: ['classId'],
    where: { attendedAt: { gte: start, lte: end } },
    _count: { _all: true }
  });
  const byClass = new Map(grouped.map(g => [g.classId, g._count._all]));

  const byDay = {};
  for (const c of filtered) {
    const d = new Date(c.startAt).toISOString().slice(0,10);
    const pres = byClass.get(c.id) ?? 0;
    const rate = pres / Math.max(1, c.capacity);
    if (!byDay[d]) byDay[d] = { sum: 0, n: 0 };
    byDay[d].sum += rate; byDay[d].n += 1;
  }
  const series = Object.entries(byDay)
    .map(([date, v]) => ({ date, ocupacao: Number((v.sum / v.n).toFixed(2)) }))
    .sort((a,b)=>a.date.localeCompare(b.date));

  res.json({ from, to, hour: h, series });
});

/**
 * @swagger
 * /analytics/weekday-media:
 *   get:
 *     summary: Ocupação média por dia da semana (comparativo)
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: OK
 */


router.get('/weekday-media', auth(['GESTOR','COACH']), async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from e to obrigatórios' });
  const start = new Date(`${from}T00:00:00Z`), end = new Date(`${to}T23:59:59Z`);

  const classes = await prisma.class.findMany({
    where: { startAt: { gte: start, lte: end } },
    select: { id: true, startAt: true, capacity: true }
  });
  const grouped = await prisma.attendance.groupBy({
    by: ['classId'],
    where: { attendedAt: { gte: start, lte: end } },
    _count: { _all: true }
  });
  const byClass = new Map(grouped.map(g => [g.classId, g._count._all]));

  const byWeekday = {}; // 0..6
  for (const c of classes) {
    const wd = new Date(c.startAt).getUTCDay();
    const pres = byClass.get(c.id) ?? 0;
    const rate = pres / Math.max(1, c.capacity);
    if (!byWeekday[wd]) byWeekday[wd] = { sum: 0, n: 0 };
    byWeekday[wd].sum += rate; byWeekday[wd].n += 1;
  }
  const mapNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; // (podemos traduzir depois)
  const medias = Object.entries(byWeekday)
    .map(([wd, v]) => ({ weekday: mapNames[wd], avg: Number((v.sum / v.n).toFixed(2)) }))
    .sort((a,b)=>mapNames.indexOf(a.weekday)-mapNames.indexOf(b.weekday));

  res.json({ from, to, medias });
});

/**
 * @swagger
 * /analytics/heatmap:
 *   get:
 *     summary: Mapa de calor (dia da semana x hora) da ocupação média
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: OK
 */


router.get('/heatmap', auth(['GESTOR','COACH']), async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from e to obrigatórios' });
  const start = new Date(`${from}T00:00:00Z`), end = new Date(`${to}T23:59:59Z`);

  const classes = await prisma.class.findMany({
    where: { startAt: { gte: start, lte: end } },
    select: { id: true, startAt: true, capacity: true }
  });
  const grouped = await prisma.attendance.groupBy({
    by: ['classId'],
    where: { attendedAt: { gte: start, lte: end } },
    _count: { _all: true }
  });
  const byClass = new Map(grouped.map(g => [g.classId, g._count._all]));

  // matriz weekday(0..6) x hour(0..23)
  const grid = {};
  for (const c of classes) {
    const d = new Date(c.startAt);
    const wd = d.getUTCDay();
    const hr = d.getUTCHours();
    const pres = byClass.get(c.id) ?? 0;
    const rate = pres / Math.max(1, c.capacity);
    const key = `${wd}-${hr}`;
    if (!grid[key]) grid[key] = { sum: 0, n: 0 };
    grid[key].sum += rate; grid[key].n += 1;
  }
  const heat = Object.entries(grid).map(([k, v]) => {
    const [weekday, hour] = k.split('-').map(Number);
    return { weekday, hour, avg: Number((v.sum / v.n).toFixed(2)) };
  });

  res.json({ from, to, heat });
});



export default router;
