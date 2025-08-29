import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import ocupacaoRoutes from './routes/ocupacao.js';
import churnRoutes from './routes/churn.js';
import frequenciaRoutes from './routes/frequencia.js';
import classesRoutes from './routes/classes.js';
import treinosRoutes from './routes/treinos.js';
import { setupSwagger } from './swagger.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();
app.use(cors());
app.use(express.json());

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica se a API está de pé
 *     responses:
 *       200:
 *         description: OK
 */
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/ocupacao', ocupacaoRoutes);
app.use('/churn', churnRoutes);
app.use('/frequencia', frequenciaRoutes);
app.use('/classes', classesRoutes);
app.use('/treinos', treinosRoutes);
app.use(cors());
app.use(express.json());
app.use('/analytics', analyticsRoutes);

setupSwagger(app);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API InsightFlow rodando na porta ${port}`));
