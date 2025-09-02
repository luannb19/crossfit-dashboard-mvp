import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// healthcheck tipado
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// TODO: reativar rotas quando migrarmos/ajustarmos
// import authRoutes from './routes/auth';
// app.use('/auth', authRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`InsightFlow backend running on :${PORT}`);
});
