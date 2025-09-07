// src/env.ts
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1).default("dev"),

  // Credenciais de desenvolvimento para /auth/login (apenas para local/testes)
  DEMO_USER_EMAIL: z.string().email().default("gestor@insightflow.com"),
  DEMO_USER_PASSWORD: z.string().min(1).default("123456"),
  DEMO_USER_ID: z.string().default("u1"),
  DEMO_USER_ROLE: z.enum(["GESTOR", "COACH", "ALUNO"]).default("GESTOR"),
});

export const env = EnvSchema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
