import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ALUNO', 'COACH', 'GESTOR']).optional().default('ALUNO')
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
