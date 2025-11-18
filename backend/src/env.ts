// src/env.ts
import "dotenv/config"; // garante que .env é carregado antes de ler process.env
import { z } from "zod";

const EnvSchema = z.object({
  // App
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1).default("dev"),

  // Front/Back URLs (usadas nos redirects do Stripe Checkout)
  APP_BASE_URL: z.string().url().default("http://localhost:5173"),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),

  // Credenciais de desenvolvimento para /auth/login (apenas local/testes)
  DEMO_USER_EMAIL: z.string().email().default("gestor@insightflow.com"),
  DEMO_USER_PASSWORD: z.string().min(1).default("123456"),
  DEMO_USER_ID: z.string().default("u1"),
  DEMO_USER_ROLE: z.enum(["GESTOR", "COACH", "ALUNO"]).default("GESTOR"),

  // Stripe (deixe vazio no código, mas preencha no .env para habilitar a integração)
  STRIPE_SECRET: z.string().optional(), // sk_test_...
  STRIPE_WEBHOOK_SECRET: z.string().optional(), // whsec_...
});

export const env = EnvSchema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
