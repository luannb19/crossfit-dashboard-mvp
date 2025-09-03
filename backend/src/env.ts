import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1).default("dev"),
});

export const env = EnvSchema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
